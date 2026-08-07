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

async function meanVolume(videoPath, [start, end]) {
  const output = await execute("ffmpeg", [
    "-hide_banner", "-ss", String(start), "-t", String(end - start), "-i", videoPath,
    "-vn", "-af", "volumedetect", "-f", "null", "-",
  ], { capture: true });
  const match = output.match(/mean_volume:\s+(-?[\d.]+|-inf)\s+dB/);
  if (!match) throw new Error(`Could not measure audio window ${start}-${end}.`);
  return match[1] === "-inf" ? -Infinity : Number(match[1]);
}

async function frameHash(videoPath, time, crop) {
  const output = await execute("ffmpeg", [
    "-v", "error", "-ss", String(time), "-i", videoPath,
    ...(crop ? ["-vf", `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`] : []),
    "-frames:v", "1", "-f", "hash", "-hash", "sha256", "-",
  ], { capture: true });
  const match = output.match(/SHA256=([a-f0-9]+)/i);
  if (!match) throw new Error(`Could not fingerprint the frame at ${time}s.`);
  return match[1];
}

async function freezeEvents(videoPath, crop, start, duration, { noise, holdSeconds }) {
  const output = await execute("ffmpeg", [
    "-hide_banner", "-ss", String(start), "-t", String(duration), "-i", videoPath,
    "-vf", `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},freezedetect=n=${noise}:d=${holdSeconds}`,
    "-an", "-f", "null", "-",
  ], { capture: true });
  return [...output.matchAll(/freeze_(start|end|duration):\s+([\d.]+)/g)].map((match) => ({ type: match[1], seconds: Number(match[2]) }));
}

async function loopSeamSimilarity(videoPath, runDirectory, [endTime, startTime]) {
  const endFrame = path.join(runDirectory, "loop-seam-end.png");
  const startFrame = path.join(runDirectory, "loop-seam-start.png");
  await Promise.all([
    execute("ffmpeg", ["-y", "-v", "error", "-ss", String(endTime), "-i", videoPath, "-frames:v", "1", endFrame]),
    execute("ffmpeg", ["-y", "-v", "error", "-ss", String(startTime), "-i", videoPath, "-frames:v", "1", startFrame]),
  ]);
  const output = await execute("ffmpeg", [
    "-hide_banner", "-i", endFrame, "-i", startFrame,
    "-lavfi", "[0:v][1:v]ssim", "-f", "null", "-",
  ], { capture: true });
  const match = output.match(/All:([\d.]+)/);
  if (!match) throw new Error("Could not measure the replay seam similarity.");
  return { score: Number(match[1]), endFrame: path.basename(endFrame), startFrame: path.basename(startFrame) };
}

export async function inspectVideo({ videoPath, runDirectory, qualityContractPath }) {
  const probe = JSON.parse(await execute("ffprobe", [
    "-v", "error", "-show_streams", "-show_format", "-of", "json", videoPath,
  ], { capture: true }));
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  const contract = JSON.parse(await readFile(qualityContractPath, "utf8"));
  const renderReport = JSON.parse(await readFile(path.join(runDirectory, "render-report.json"), "utf8"));
  const automatic = contract.automatic;
  const fpsParts = String(video?.avg_frame_rate || "0/1").split("/").map(Number);
  const fps = fpsParts[1] ? fpsParts[0] / fpsParts[1] : 0;
  const duration = Number(probe.format.duration);
  const beepVolumes = await Promise.all(automatic.beepWindows.map((window) => meanVolume(videoPath, window)));
  const inset = automatic.measurementInsetSeconds;
  const songWindows = renderReport.timeline.events.filter((event) => event.song).map((event) => [event.start + inset, event.end - inset]);
  const dialogueWindows = renderReport.timeline.events.filter((event) => ["opening", "taunt", "closing"].includes(event.type)).map((event) => [event.start + 0.03, event.end - 0.03]);
  const songVolumes = await Promise.all(songWindows.map((window) => meanVolume(videoPath, window)));
  const dialogueVolumes = await Promise.all(dialogueWindows.map((window) => meanVolume(videoPath, window)));
  const silentVolumes = await Promise.all(automatic.silentWindows.map((window) => meanVolume(videoPath, window)));
  const closing = renderReport.timeline.events.find((event) => event.type === "closing");
  const panelCrops = [
    { x: 20, y: 250, width: 510, height: 635 },
    { x: 550, y: 250, width: 510, height: 635 },
    { x: 20, y: 885, width: 510, height: 635 },
    { x: 550, y: 885, width: 510, height: 635 },
  ];
  const squilliamCrop = panelCrops.at(-1);
  const closingFrameHashes = await Promise.all([closing.start + 0.4, Math.min(closing.end - 0.25, closing.start + 1.6)].map((time) => frameHash(videoPath, time, squilliamCrop)));
  const finaleDuration = renderReport.timeline.finale.end - renderReport.timeline.finale.start;
  const finaleFreezeEvents = await Promise.all(panelCrops.map((crop) => freezeEvents(
    videoPath,
    crop,
    renderReport.timeline.finale.start,
    finaleDuration,
    { noise: automatic.finaleFreezeNoise, holdSeconds: automatic.maximumFinaleHoldSeconds },
  )));
  const loopSeamTimes = [
    renderReport.timeline.loopBridge.end - 0.05,
    0.05,
  ];
  const loopSeam = await loopSeamSimilarity(videoPath, runDirectory, loopSeamTimes);
  const checks = {
    width: video?.width === automatic.width,
    height: video?.height === automatic.height,
    fps: Math.abs(fps - automatic.fps) < 0.01,
    duration: Math.abs(duration - automatic.durationSeconds) <= automatic.durationToleranceSeconds,
    audio: Boolean(audio),
    countdownBeeps: beepVolumes.every((volume) => volume >= automatic.minimumActiveAudioMeanDb),
    danceMusic: songVolumes.every((volume) => volume >= automatic.minimumActiveAudioMeanDb),
    dialogueVoices: dialogueVolumes.every((volume) => volume >= automatic.minimumActiveAudioMeanDb),
    countdownGapsSilent: silentVolumes.every((volume) => volume <= automatic.maximumSilentWindowMeanDb),
    fiveSecondSolos: renderReport.timeline.rounds.every((round) => round.danceEnd - round.danceStart >= 5),
    nineSecondGroupFinale: Math.abs(renderReport.timeline.finale.end - renderReport.timeline.finale.start - 9) < 0.01,
    uninterruptedFinaleSources: renderReport.characters.every((character) => character.finaleMotionId && character.finaleRenderedClipSha256),
    finaleMotionContinuity: finaleFreezeEvents.every((events) => events.length === 0),
    squilliamMovesDuringCta: closingFrameHashes[0] !== closingFrameHashes[1],
    seamlessReplayFrame: loopSeam.score >= automatic.minimumLoopSeamSsim,
  };
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(`Automatic inspection failed: ${JSON.stringify({ checks, duration, fps, video, audio }, null, 2)}`);
  }
  const contactSheet = path.join(runDirectory, "contact-sheet.png");
  await execute("ffmpeg", [
    "-y", "-i", videoPath,
    "-vf", "fps=1/4,scale=180:320:flags=lanczos,tile=6x2:padding=8:margin=8:color=0x061829",
    "-frames:v", "1", contactSheet,
  ]);
  const report = {
    status: "automatic-pass-human-pending",
    inspectedAt: new Date().toISOString(),
    checks,
    measured: {
      width: video.width,
      height: video.height,
      fps,
      durationSeconds: duration,
      audioCodec: audio.codec_name,
      audioSampleRate: Number(audio.sample_rate),
      beepWindowMeanDb: beepVolumes,
      songWindowMeanDb: songVolumes,
      dialogueWindowMeanDb: dialogueVolumes,
      silentWindowMeanDb: silentVolumes,
      closingMotionFrameHashes: closingFrameHashes,
      finaleFreezeEvents,
      loopSeamTimes,
      loopSeam,
    },
    humanReview: { status: "pending", criteria: contract.human },
    contactSheet: path.basename(contactSheet),
  };
  await writeFile(path.join(runDirectory, "quality-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
