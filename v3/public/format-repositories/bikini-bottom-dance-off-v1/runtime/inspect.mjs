import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function execute(program, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    let output = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(`${program} exited ${code}\n${output.slice(-8000)}`)));
  });
}

export async function inspectVideo({ videoPath, runDirectory, qualityContractPath }) {
  const probe = JSON.parse(await execute("ffprobe", [
    "-v", "error", "-show_streams", "-show_format", "-of", "json", videoPath,
  ], { capture: true }));
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  const contract = JSON.parse(await readFile(qualityContractPath, "utf8"));
  const automatic = contract.automatic;
  const fpsParts = String(video?.avg_frame_rate || "0/1").split("/").map(Number);
  const fps = fpsParts[1] ? fpsParts[0] / fpsParts[1] : 0;
  const duration = Number(probe.format.duration);
  const checks = {
    width: video?.width === automatic.width,
    height: video?.height === automatic.height,
    fps: Math.abs(fps - automatic.fps) < 0.01,
    duration: Math.abs(duration - automatic.durationSeconds) <= automatic.durationToleranceSeconds,
    audio: Boolean(audio),
  };
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(`Automatic inspection failed: ${JSON.stringify({ checks, duration, fps, video, audio }, null, 2)}`);
  }
  const contactSheet = path.join(runDirectory, "contact-sheet.png");
  await execute("ffmpeg", [
    "-y", "-i", videoPath,
    "-vf", "fps=1/3,scale=216:384:flags=lanczos,tile=5x2:padding=8:margin=8:color=0x061829",
    "-frames:v", "1", contactSheet,
  ]);
  const report = {
    status: "automatic-pass-human-pending",
    inspectedAt: new Date().toISOString(),
    checks,
    measured: { width: video.width, height: video.height, fps, durationSeconds: duration, audioCodec: audio.codec_name },
    humanReview: { status: "pending", criteria: contract.human },
    contactSheet: path.basename(contactSheet),
  };
  await writeFile(path.join(runDirectory, "quality-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
