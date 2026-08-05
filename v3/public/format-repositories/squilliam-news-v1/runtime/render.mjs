import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

function withinRoot(file) {
  const resolved = path.resolve(file);
  if (resolved !== formatRoot && !resolved.startsWith(`${formatRoot}${path.sep}`)) {
    throw new Error(`Renderer input is outside the Format Repo: ${file}`);
  }
  return resolved;
}

function mimeType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".dae": "model/vnd.collada+xml",
    ".wav": "audio/wav",
  })[path.extname(file).toLowerCase()] || "application/octet-stream";
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
      const file = withinRoot(path.join(formatRoot, pathname));
      const info = await stat(file);
      if (!info.isFile()) throw new Error("Not a file");
      response.writeHead(200, { "Content-Type": mimeType(file), "Cache-Control": "no-store" });
      createReadStream(file).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

function publicPath(file) {
  return `/${path.relative(formatRoot, withinRoot(file)).split(path.sep).join("/")}`;
}

const args = parseArgs(process.argv.slice(2));
for (const required of ["content", "motion", "audio", "output", "work-dir"]) {
  if (!args[required]) throw new Error(`Missing --${required}`);
}
const contentPath = withinRoot(args.content);
const motionPath = withinRoot(args.motion);
const audioPath = withinRoot(args.audio);
const outputPath = withinRoot(args.output);
const workDirectory = withinRoot(args["work-dir"]);
const smoke = args.smoke === true;
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const fingerprint = createHash("sha256");
for (const file of [
  contentPath,
  motionPath,
  audioPath,
  path.join(formatRoot, "runtime/renderer/index.html"),
  path.join(formatRoot, "runtime/renderer/app.js"),
  path.join(formatRoot, "assets/character/chr_squilliam_bindpose.dae"),
]) {
  fingerprint.update(await readFile(file));
}
const frameDirectory = path.join(workDirectory, `frames-${fingerprint.digest("hex").slice(0, 12)}`);
await mkdir(frameDirectory, { recursive: true });
await mkdir(path.dirname(outputPath), { recursive: true });

const server = await startServer();
const address = server.address();
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const query = new URLSearchParams({
    capture: "1",
    content: publicPath(contentPath),
    motion: publicPath(motionPath),
    audio: publicPath(audioPath),
  });
  await page.goto(`http://127.0.0.1:${address.port}/runtime/renderer/index.html?${query}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__SNN_READY__ === true, null, { timeout: 30_000 });
  const info = await page.evaluate(() => window.motionInfo);
  if (info.frameCount !== 900 || Math.abs(info.duration - 30) > 0.01) {
    throw new Error(`Expected a 900-frame, 30-second plan; got ${JSON.stringify(info)}`);
  }

  const sourceIndices = smoke
    ? [45, 135, 225, 300, 375, 465, 585, 705, 825]
    : Array.from({ length: info.frameCount }, (_, index) => index);
  for (let order = 0; order < sourceIndices.length; order += 1) {
    const sourceIndex = sourceIndices[order];
    const outputIndex = smoke ? order : sourceIndex;
    const filename = path.join(frameDirectory, `frame-${String(outputIndex).padStart(4, "0")}.png`);
    try {
      const existing = await stat(filename);
      if (existing.size > 20_000) continue;
    } catch {
      // Resuming an interrupted render is intentional.
    }
    await page.evaluate((frame) => window.renderFrame(frame), sourceIndex);
    await page.screenshot({ path: filename, type: "png" });
    if (sourceIndex % 60 === 0 || smoke) console.log(`Rendered source frame ${sourceIndex}`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await run("ffmpeg", [
  "-y",
  "-framerate", smoke ? "1" : "30",
  "-i", path.join(frameDirectory, "frame-%04d.png"),
  "-i", audioPath,
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "18",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-b:a", "192k",
  "-t", smoke ? "9" : "30",
  "-movflags", "+faststart",
  outputPath,
]);

console.log(outputPath);
