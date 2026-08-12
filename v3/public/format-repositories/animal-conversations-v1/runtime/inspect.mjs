import path from "node:path";
import { execute, hashValue, probe, readJson, sha256, writeJson } from "./common.mjs";

function frameRate(value) {
  const [numerator, denominator] = String(value || "0/1").split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

export async function inspectRun({ runDirectory }) {
  const input = await readJson(path.join(runDirectory, "input.json"));
  const validation = await readJson(path.join(runDirectory, ".validation.json"));
  const renderReport = await readJson(path.join(runDirectory, "render-report.json"));
  const output = path.join(runDirectory, "final.mp4");
  const media = await probe(output);
  const video = media.streams.find((stream) => stream.codec_type === "video");
  const audio = media.streams.find((stream) => stream.codec_type === "audio");
  const durationSeconds = Number(media.format.duration);
  const fps = frameRate(video?.avg_frame_rate);
  const loudnessOutput = await execute("ffmpeg", ["-i", output, "-vn", "-af", "volumedetect", "-f", "null", "-"], { capture: true });
  const meanVolumeDb = Number(loudnessOutput.match(/mean_volume:\s*(-?[0-9.]+) dB/)?.[1] ?? -Infinity);
  const measured = {
    width: video?.width,
    height: video?.height,
    fps,
    durationSeconds,
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name || null,
    meanVolumeDb,
    camerasUsed: [...new Set(input.timeline.map((beat) => beat.camera))],
    speakerModesUsed: [...new Set(input.timeline.map((beat) => beat.speaker))],
    speakerAssignment: validation.speakerAssignment,
    inputHash: hashValue(input),
    captionedBeatCount: input.timeline.filter((beat) => beat.caption.trim()).length,
    speechActivity: renderReport.speechActivity,
    mouthAnimation: renderReport.mouthAnimation,
    outputSha256: await sha256(output),
  };
  const gates = {
    width: measured.width === 1080,
    height: measured.height === 1920,
    fps: Math.abs(measured.fps - 24) <= 0.01,
    duration: Math.abs(measured.durationSeconds - validation.audio.durationSeconds) <= 0.08,
    videoCodec: measured.videoCodec === "h264",
    audioCodec: measured.audioCodec === "aac",
    audibleAudio: Number.isFinite(meanVolumeDb) && meanVolumeDb > -55,
    approvedCamerasOnly: measured.camerasUsed.every((camera) => ["two-shot", "cat-close", "bunny-close"].includes(camera)),
    speakerAssignmentConfirmed: measured.speakerAssignment?.reviewedBeats === input.timeline.length,
    stableVoiceCastingConfirmed: measured.speakerAssignment?.voiceBoundBeats === (measured.speakerAssignment?.evidenceCounts?.["local-audio-analysis"] || 0),
    simultaneousSpeechConfirmed: measured.speakerAssignment?.confirmedOverlapBeats === input.timeline.filter((beat) => beat.speaker === "both").length,
    renderMatchesInput: renderReport.inputHash === measured.inputHash,
    captionsPresent: measured.captionedBeatCount > 0,
    speechActivityAnalyzed: Number.isFinite(measured.speechActivity?.thresholdDb),
    mouthAnimationAnalyzed: measured.mouthAnimation?.method === "audio-envelope-hysteresis" && measured.mouthAnimation?.openFrames > 0,
    pauseClosuresStable: measured.speechActivity?.inactiveSpeakingFrameRanges?.every(
      ([start, end]) => start === 0 || end === renderReport.frameCount - 1 || end - start + 1 >= 3,
    ) === true,
  };
  const status = Object.values(gates).every(Boolean) ? "pass" : "fail";
  const report = { schemaVersion: 1, status, inspectedAt: new Date().toISOString(), measured, gates };
  await writeJson(path.join(runDirectory, "quality-report.json"), report);

  await execute("ffmpeg", [
    "-y", "-i", output,
    "-vf", `fps=9/${durationSeconds},scale=270:480,tile=3x3:padding=4:margin=4`,
    "-frames:v", "1",
    "-update", "1",
    path.join(runDirectory, "contact-sheet.png"),
  ]);
  if (status !== "pass") {
    const failures = Object.entries(gates).filter(([, passed]) => !passed).map(([id]) => id);
    throw new Error(`Inspection failed: ${failures.join(", ")}`);
  }
  return report;
}
