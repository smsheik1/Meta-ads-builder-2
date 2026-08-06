import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(values) {
  const result = {};
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const [key, ...parts] = value.slice(2).split("=");
    result[key] = parts.length ? parts.join("=") : true;
  }
  return result;
}

function execute(program, args, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    let output = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(`${program} exited ${code}${output ? `\n${output}` : ""}`)));
  });
}

const args = parseArgs(process.argv.slice(2));
for (const required of ["video", "report", "quality", "contact-sheet", "quality-contract"]) {
  if (!args[required]) throw new Error(`Missing --${required}`);
}
const videoPath = path.resolve(args.video);
const motionReport = JSON.parse(await readFile(path.resolve(args.report), "utf8"));
const contract = JSON.parse(await readFile(path.resolve(args["quality-contract"]), "utf8"));
const automatic = contract.automatic;

const probe = JSON.parse(await execute("ffprobe", [
  "-v", "error",
  "-count_frames",
  "-show_entries", "format=duration:stream=index,codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames",
  "-of", "json",
  videoPath,
], true));
const video = probe.streams.find((stream) => stream.codec_type === "video");
const audio = probe.streams.find((stream) => stream.codec_type === "audio");
const duration = Number(probe.format.duration);
const frameCount = Number(video?.nb_read_frames);
const expectedDuration = motionReport.timing.sourceDurationSeconds;
const checks = {
  width: { pass: video?.width === 1280, actual: video?.width, expected: 1280 },
  height: { pass: video?.height === 720, actual: video?.height, expected: 720 },
  codec: { pass: video?.codec_name === "h264", actual: video?.codec_name, expected: "h264" },
  silent: { pass: !audio, actual: audio?.codec_name || null, expected: null },
  frameRate: { pass: video?.avg_frame_rate === "30/1", actual: video?.avg_frame_rate, expected: "30/1" },
  exactFrameCount: {
    pass: motionReport.timing.exactOnePass && frameCount === motionReport.timing.sourceFrameCount,
    actual: frameCount,
    expected: motionReport.timing.sourceFrameCount,
  },
  duration: {
    pass: Math.abs(duration - expectedDuration) <= (1 / 30 + 0.005),
    actual: duration,
    expected: expectedDuration,
  },
  mappedBones: {
    pass: motionReport.retarget.mappedBoneCount >= automatic.minimumMappedBones,
    actual: motionReport.retarget.mappedBoneCount,
    minimum: automatic.minimumMappedBones,
  },
  footPenetration: {
    pass: motionReport.retarget.maximumFootPenetration <= automatic.maximumFootPenetration,
    actual: motionReport.retarget.maximumFootPenetration,
    maximum: automatic.maximumFootPenetration,
  },
  protectedTransform: {
    pass: motionReport.retarget.maximumProtectedTransformDeviation <= automatic.maximumProtectedTransformDeviation,
    actual: motionReport.retarget.maximumProtectedTransformDeviation,
    maximum: automatic.maximumProtectedTransformDeviation,
  },
  protectedScale: {
    pass: motionReport.retarget.maximumProtectedScaleDeviation <= automatic.maximumProtectedScaleDeviation,
    actual: motionReport.retarget.maximumProtectedScaleDeviation,
    maximum: automatic.maximumProtectedScaleDeviation,
  },
  mappedPoseFidelity: {
    pass: motionReport.retarget.maximumPreConstraintMappedWorldAngularError <= automatic.maximumPreConstraintMappedWorldAngularError,
    actual: motionReport.retarget.maximumPreConstraintMappedWorldAngularError,
    maximum: automatic.maximumPreConstraintMappedWorldAngularError,
  },
  contactFootVerticalError: {
    pass: motionReport.retarget.maximumContactVerticalError <= automatic.maximumContactVerticalError,
    actual: motionReport.retarget.maximumContactVerticalError,
    maximum: automatic.maximumContactVerticalError,
  },
  contactFootGroundClearance: {
    pass: motionReport.retarget.maximumContactGroundClearance <= automatic.maximumContactGroundClearance,
    actual: motionReport.retarget.maximumContactGroundClearance,
    maximum: automatic.maximumContactGroundClearance,
  },
  footTargetError: {
    pass: motionReport.retarget.maximumFootTargetError <= automatic.maximumFootTargetError,
    actual: motionReport.retarget.maximumFootTargetError,
    maximum: automatic.maximumFootTargetError,
  },
  physicalFootReach: {
    pass: motionReport.retarget.maximumFootReachRatio <= automatic.maximumFootReachRatio,
    actual: motionReport.retarget.maximumFootReachRatio,
    maximum: automatic.maximumFootReachRatio,
  },
  rootScale: {
    pass: motionReport.retarget.maximumRootScaleError <= automatic.maximumRootScaleError,
    actual: motionReport.retarget.maximumRootScaleError,
    maximum: automatic.maximumRootScaleError,
  },
  rootTravel: {
    pass: motionReport.retarget.rootTravelRetention >= automatic.minimumRootTravelRetention
      && motionReport.retarget.rootTravelRetention <= automatic.maximumRootTravelRetention,
    actual: motionReport.retarget.rootTravelRetention,
    minimum: automatic.minimumRootTravelRetention,
    maximum: automatic.maximumRootTravelRetention,
  },
};
const failures = Object.entries(checks).filter(([, check]) => !check.pass).map(([name]) => name);

await execute("ffmpeg", [
  "-y",
  "-i", videoPath,
  "-vf", `fps=${(9 / Math.max(duration, 0.1)).toFixed(6)},scale=424:238:force_original_aspect_ratio=decrease,pad=424:238:(ow-iw)/2:(oh-ih)/2:color=black,tile=3x3:padding=3:margin=3:color=#061b2d`,
  "-frames:v", "1",
  "-update", "1",
  path.resolve(args["contact-sheet"]),
]);

const quality = {
  schemaVersion: 1,
  status: failures.length ? "fail" : "automatic-pass-human-pending",
  inspectedAt: new Date().toISOString(),
  video: {
    file: path.basename(videoPath),
    durationSeconds: duration,
    frameCount,
    width: video?.width,
    height: video?.height,
    codec: video?.codec_name,
    audio: audio?.codec_name || null,
  },
  checks,
  failures,
  humanReview: {
    status: "pending",
    criteria: contract.human,
  },
};
await writeFile(path.resolve(args.quality), `${JSON.stringify(quality, null, 2)}\n`);
console.log(JSON.stringify({ quality: args.quality, status: quality.status, failures }, null, 2));
if (failures.length) process.exitCode = 1;
