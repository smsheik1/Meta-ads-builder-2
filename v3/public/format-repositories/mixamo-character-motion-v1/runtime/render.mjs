import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "./static-server.mjs";

const formatRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(values) {
  const result = {};
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const [key, ...parts] = value.slice(2).split("=");
    result[key] = parts.length ? parts.join("=") : true;
  }
  return result;
}

function execute(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${program} exited ${code}`)));
  });
}

function insideRoot(file) {
  const resolved = path.resolve(file);
  if (resolved !== formatRoot && !resolved.startsWith(`${formatRoot}${path.sep}`)) {
    throw new Error(`Path must stay inside the Format Repo: ${file}`);
  }
  return resolved;
}

function publicPath(file) {
  return `/${path.relative(formatRoot, insideRoot(file)).split(path.sep).join("/")}`;
}

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

function extent(vectors) {
  const axes = [0, 1, 2].map((axis) => {
    const values = vectors.map((vector) => vector[axis]);
    return Math.max(...values) - Math.min(...values);
  });
  return { axes, magnitude: Math.hypot(...axes) };
}

function planarMagnitude(extents) {
  return Math.hypot(extents.axes[0], extents.axes[2]);
}

function evenlySpacedFrames(frameCount, count = 9) {
  return [...new Set(Array.from({ length: Math.min(frameCount, count) }, (_, index) => (
    Math.round(index * (frameCount - 1) / (Math.min(frameCount, count) - 1 || 1))
  )))];
}

const args = parseArgs(process.argv.slice(2));
for (const required of ["input", "output", "work-dir"]) {
  if (!args[required]) throw new Error(`Missing --${required}`);
}
const inputPath = insideRoot(args.input);
const outputPath = insideRoot(args.output);
const workDirectory = insideRoot(args["work-dir"]);
const reportPath = insideRoot(args.report || path.join(workDirectory, "motion-report.json"));
const smoke = args.smoke === true;
const input = JSON.parse(await readFile(inputPath, "utf8"));
const manifest = JSON.parse(await readFile(path.join(formatRoot, "assets/motions/manifest.json"), "utf8"));
const motionRecord = manifest.motions.find((motion) => motion.id === input.motionId);
if (!motionRecord) throw new Error(`Unknown motion: ${input.motionId}`);
const motionPath = insideRoot(path.join(formatRoot, motionRecord.file));
const normalizedMotion = JSON.parse(await readFile(motionPath, "utf8"));
const characterCatalogPath = path.join(formatRoot, "assets/character-packs.json");
const catalog = JSON.parse(await readFile(characterCatalogPath, "utf8"));
const characterPack = catalog.packs.find((candidate) => candidate.id === input.characterId);
if (!characterPack) throw new Error(`Unknown character: ${input.characterId}`);
const characterDirectory = path.dirname(path.join(formatRoot, characterPack.model));

const fingerprint = createHash("sha256");
for (const file of [
  inputPath,
  motionPath,
  characterCatalogPath,
  path.join(formatRoot, "runtime/renderer/index.html"),
  path.join(formatRoot, "runtime/renderer/app.js"),
  path.join(formatRoot, "runtime/renderer/mixamo-retarget.js"),
  ...await filesUnder(characterDirectory),
]) fingerprint.update(await readFile(file));
const frameDirectory = path.join(workDirectory, `frames-${fingerprint.digest("hex").slice(0, 12)}${smoke ? "-smoke" : ""}`);
await mkdir(frameDirectory, { recursive: true });
await mkdir(path.dirname(outputPath), { recursive: true });

const server = await startStaticServer(formatRoot);
const diagnostics = [];
let info;
let browser;
try {
  const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on("console", (message) => {
    if (message.type() === "error") console.error(`Browser: ${message.text()}`);
  });
  page.on("pageerror", (error) => console.error(`Browser page error: ${error.stack || error.message}`));
  const query = new URLSearchParams({ input: publicPath(inputPath), motion: publicPath(motionPath) });
  await page.goto(`http://127.0.0.1:${server.address().port}/runtime/renderer/index.html?${query}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__MIXAMO_MOTION_READY__ === true, null, { timeout: 30_000 });
  info = await page.evaluate(() => window.motionInfo);
  if (info.frameCount !== motionRecord.frameCount || info.fps !== 30) {
    throw new Error(`Renderer timing disagrees with manifest: ${JSON.stringify(info)}`);
  }

  const sourceFrames = smoke ? evenlySpacedFrames(info.frameCount) : Array.from({ length: info.frameCount }, (_, index) => index);
  for (let order = 0; order < sourceFrames.length; order += 1) {
    const sourceFrame = sourceFrames[order];
    const result = await page.evaluate((frame) => window.renderFrame(frame), sourceFrame);
    diagnostics.push(result);
    const filename = path.join(frameDirectory, `frame-${String(order).padStart(4, "0")}.png`);
    let reusable = false;
    try {
      reusable = (await stat(filename)).size > 20_000;
    } catch {
      // Missing frames are rendered below.
    }
    if (!reusable) await page.screenshot({ path: filename, type: "png" });
    if (smoke || order % 30 === 0) console.log(`Rendered ${order + 1}/${sourceFrames.length} (source frame ${sourceFrame})`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const outputFps = smoke ? 3 : info.fps;
const outputFrames = diagnostics.length;
await execute("ffmpeg", [
  "-y",
  "-framerate", String(outputFps),
  "-i", path.join(frameDirectory, "frame-%04d.png"),
  "-frames:v", String(outputFrames),
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "18",
  "-pix_fmt", "yuv420p",
  "-an",
  "-movflags", "+faststart",
  outputPath,
]);

const requestedExtent = extent(diagnostics.map((frame) => frame.requestedRoot));
const appliedExtent = extent(diagnostics.map((frame) => frame.appliedRoot));
const maximumPoseErrorFrame = diagnostics.reduce((maximum, frame) => (
  frame.preConstraintMappedWorldAngularError > maximum.preConstraintMappedWorldAngularError ? frame : maximum
));
const requestedPlanarTravel = planarMagnitude(requestedExtent);
const appliedPlanarTravel = planarMagnitude(appliedExtent);
const rootGain = characterPack.motionProfile.rootMotionGain || [1, 1, 1];
const maximumRootScaleError = Math.max(...diagnostics.flatMap((frame) => {
  const offset = frame.frame * 3;
  return [0, 1, 2].map((axis) => Math.abs(
    frame.requestedRoot[axis]
    - normalizedMotion.root.positions[offset + axis] * frame.motionScale * rootGain[axis]
  ));
}));
const report = {
  schemaVersion: 1,
  renderer: "runtime/renderer/app.js",
  retargeter: "runtime/renderer/mixamo-retarget.js",
  characterId: input.characterId,
  motionId: input.motionId,
  source: motionRecord,
  smoke,
  output: {
    file: path.relative(formatRoot, outputPath),
    width: 1280,
    height: 720,
    fps: outputFps,
    frameCount: outputFrames,
    durationSeconds: outputFrames / outputFps,
  },
  timing: {
    sourceFrameCount: info.frameCount,
    sourceFps: info.fps,
    sourceDurationSeconds: info.durationSeconds,
    exactOnePass: !smoke && outputFrames === info.frameCount && outputFps === info.fps,
  },
  retarget: {
    mappedBoneCount: Math.min(...diagnostics.map((frame) => frame.mappedBoneCount)),
    minimumMappedBones: characterPack.motionProfile.minimumMappedBones,
    motionScale: diagnostics[0].motionScale,
    requestedRootExtent: requestedExtent,
    appliedRootExtent: appliedExtent,
    rootTravelRetention: requestedPlanarTravel > 1e-9 ? appliedPlanarTravel / requestedPlanarTravel : 1,
    maximumRootScaleError,
    maximumFootPenetration: Math.max(...diagnostics.map((frame) => frame.feet.penetration)),
    maximumProtectedTransformDeviation: Math.max(...diagnostics.map((frame) => frame.protectedTransformDeviation)),
    maximumProtectedScaleDeviation: Math.max(...diagnostics.map((frame) => frame.protectedScaleDeviation)),
    maximumPreConstraintMappedWorldAngularError: Math.max(...diagnostics.map((frame) => frame.preConstraintMappedWorldAngularError)),
    maximumAllowedPreConstraintMappedWorldAngularError: characterPack.motionProfile.maximumMappedPoseErrorRadians,
    maximumPreConstraintMappedWorldAngularErrorBone: maximumPoseErrorFrame.preConstraintMappedWorldAngularErrorBone,
    maximumContactVerticalError: Math.max(...diagnostics.flatMap((frame) => [
      frame.contactVerticalErrors.left,
      frame.contactVerticalErrors.right,
    ])),
    maximumContactGroundClearance: Math.max(...diagnostics.flatMap((frame) => [
      frame.contactGroundClearances.left,
      frame.contactGroundClearances.right,
    ])),
    maximumFootTargetError: Math.max(...diagnostics.flatMap((frame) => [
      frame.footTargetErrors.left,
      frame.footTargetErrors.right,
    ])),
    maximumFootReachRatio: Math.max(...diagnostics.flatMap((frame) => [
      frame.footReachRatios.left,
      frame.footReachRatios.right,
    ])),
    verticalRootGrounding: {
      enabled: (characterPack.motionProfile.maximumVerticalRootCorrection || 0) > 0,
      maximumAllowed: characterPack.motionProfile.maximumVerticalRootCorrection || 0,
      maximumRequired: Math.max(...diagnostics.map((frame) => frame.requiredVerticalRootCorrection)),
      maximumApplied: Math.max(...diagnostics.map((frame) => frame.verticalRootCorrection)),
    },
    contactFrames: {
      left: diagnostics.filter((frame) => frame.contacts.left).length,
      right: diagnostics.filter((frame) => frame.contacts.right).length,
    },
  },
  frames: diagnostics,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, report: reportPath, frames: outputFrames, rootTravelRetention: report.retarget.rootTravelRetention }, null, 2));
