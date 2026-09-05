import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { rename, rm } from "node:fs/promises";
import { execute, hashValue, probe, readJson, sha256, writeJson } from "./common.mjs";
import { qualityPolicyIdentity } from "./identity.mjs";
import { assertRenderFresh, loadQualityPolicy } from "./quality.mjs";
import { validateRun } from "./validate.mjs";

function frameRate(value) {
  const [numerator, denominator] = String(value || "0/1").split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

export function pauseClosuresStable(speechActivity, frameCount) {
  return speechActivity?.inactiveSpeakingFrameRanges?.every(
    ([start, end]) => start === 0 || end === frameCount - 1 || end - start + 1 >= 3,
  ) === true;
}

export async function inspectRun({ root = fileURLToPath(new URL("..", import.meta.url)), runDirectory }) {
  await validateRun({ root, runDirectory });
  const currentRender = await assertRenderFresh({ root, runDirectory });
  const policy = await loadQualityPolicy(root);
  const automatic = policy.automatic;
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
    scriptApproval: validation.scriptApproval,
    inputHash: hashValue(input),
    captionedBeatCount: input.timeline.filter((beat) => beat.caption.trim()).length,
    nonverbalBeatCount: input.timeline.filter((beat) => typeof beat.vocalization === "string" && beat.vocalization.trim()).length,
    speechActivity: renderReport.speechActivity,
    mouthAnimation: renderReport.mouthAnimation,
    outputSha256: await sha256(output),
  };
  const gates = {
    width: measured.width === automatic.width,
    height: measured.height === automatic.height,
    fps: Math.abs(measured.fps - automatic.fps) <= 0.01,
    duration: Math.abs(measured.durationSeconds - validation.audio.durationSeconds) <= automatic.durationToleranceSeconds,
    videoCodec: measured.videoCodec === automatic.videoCodec,
    audioCodec: measured.audioCodec === automatic.audioCodec,
    audibleAudio: Number.isFinite(meanVolumeDb) && meanVolumeDb > automatic.minimumMeanVolumeDb,
    approvedCamerasOnly: measured.camerasUsed.every((camera) => ["two-shot", "cat-close", "bunny-close"].includes(camera)),
    completeScriptApproved: measured.scriptApproval?.method === "explicit-complete-script-approval" && measured.scriptApproval?.reviewedBeats === input.timeline.length,
    nonverbalEventsApproved: measured.scriptApproval?.nonverbalBeats === measured.nonverbalBeatCount,
    stableVoiceCastingConfirmed: measured.scriptApproval?.voiceBoundBeats === measured.scriptApproval?.diarizedBeats,
    simultaneousSpeechConfirmed: measured.scriptApproval?.confirmedOverlapBeats === input.timeline.filter((beat) => beat.speaker === "both").length,
    renderMatchesInput: renderReport.inputHash === measured.inputHash,
    captionsPresent: measured.captionedBeatCount > 0,
    speechActivityAnalyzed: Number.isFinite(measured.speechActivity?.thresholdDb),
    mouthAnimationAnalyzed: measured.mouthAnimation?.method === "audio-envelope-hysteresis" && measured.mouthAnimation?.openFrames > 0,
    pauseClosuresStable: pauseClosuresStable(measured.speechActivity, renderReport.frameCount),
  };
  const status = policy.requiredTechnicalGates.every((id) => gates[id] === true) && Object.values(gates).every(Boolean) ? "pass" : "fail";
  const report = {
    schemaVersion: 2, status, inspectedAt: new Date().toISOString(), measured, gates,
    renderIdentityHash: currentRender.renderIdentityHash,
    qualityPolicyHash: await qualityPolicyIdentity(root),
  };
  // Publish inspection evidence last. An interrupted sheet generation must not
  // replace the previous sheet or make an unfinished inspection look complete.
  const temporarySheet = path.join(runDirectory, `.contact-sheet-${randomUUID()}.png`);
  try {
    await execute("ffmpeg", [
      "-y", "-i", output,
      "-vf", `fps=9/${durationSeconds},scale=270:480,tile=3x3:padding=4:margin=4`,
      "-frames:v", "1",
      "-update", "1",
      temporarySheet,
    ]);
    report.contactSheetSha256 = await sha256(temporarySheet);
    await rename(temporarySheet, path.join(runDirectory, "contact-sheet.png"));
    await writeJson(path.join(runDirectory, "quality-report.json"), report);
  } finally {
    await rm(temporarySheet, { force: true });
  }
  if (status !== "pass") {
    const failures = Object.entries(gates).filter(([, passed]) => !passed).map(([id]) => id);
    throw new Error(`Inspection failed: ${failures.join(", ")}`);
  }
  return report;
}
