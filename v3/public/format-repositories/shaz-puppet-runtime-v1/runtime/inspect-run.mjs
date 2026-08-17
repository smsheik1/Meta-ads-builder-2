import path from "node:path";

import { inspectPose } from "./inspect-pose.mjs";
import { execute, exists, readJson, sha256, validateRun, writeJson } from "./run-common.mjs";

function probeVideo(file) {
  const data = JSON.parse(execute("ffprobe", [
    "-v", "error", "-count_frames",
    "-select_streams", "v:0",
    "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames:format=duration",
    "-of", "json", file,
  ]));
  return { ...data.streams?.[0], duration: Number(data.format?.duration) };
}

async function inspectRun({ root, runDirectory }) {
  const validated = await validateRun({ root, runDirectory });
  const finalVideo = path.join(runDirectory, "final.mp4");
  const renderReportPath = path.join(runDirectory, "render-report.json");
  if (!(await exists(finalVideo)) || !(await exists(renderReportPath))) {
    throw new Error("render the run before inspection");
  }
  const renderReport = await readJson(renderReportPath);
  const outputSha256 = await sha256(finalVideo);
  const failures = [];
  if (renderReport.inputSha256 !== validated.receipt.inputSha256) failures.push("render report input checksum is stale");
  if (renderReport.outputSha256 !== outputSha256) failures.push("render report output checksum is stale");
  if (renderReport.totalFrames !== validated.timeline.totalFrames) failures.push("render report frame count does not match validation");
  if (renderReport.artistRenderedFramesUsed !== false) failures.push("render report lost artist-frame exclusion provenance");

  const probe = probeVideo(finalVideo);
  if (probe.codec_name !== "h264") failures.push(`video codec is ${probe.codec_name}, expected h264`);
  if (probe.width !== 1280 || probe.height !== 720) failures.push(`video is ${probe.width}x${probe.height}, expected 1280x720`);
  if (probe.pix_fmt !== "yuv420p") failures.push(`video pixel format is ${probe.pix_fmt}, expected yuv420p`);
  if (probe.r_frame_rate !== "24/1") failures.push(`video frame rate is ${probe.r_frame_rate}, expected 24/1`);
  if (Number(probe.nb_read_frames) !== validated.timeline.totalFrames) {
    failures.push(`decoded ${probe.nb_read_frames} frames, expected ${validated.timeline.totalFrames}`);
  }
  if (Math.abs(probe.duration - validated.timeline.durationSeconds) > 0.01) {
    failures.push(`video duration is ${probe.duration}, expected ${validated.timeline.durationSeconds}`);
  }

  const poseReports = [];
  const uniquePoseIds = [...new Set(validated.timeline.entries.map((entry) => entry.poseId))];
  for (const poseId of uniquePoseIds) {
    const pose = validated.registry.byId.get(poseId);
    const report = await inspectPose({
      manifest: validated.manifest,
      assetRoot: path.join(root, "rig-v2", "assets"),
      propRoot: path.join(root, "assets", "props"),
      recipe: pose.recipe,
    });
    poseReports.push({
      poseId,
      status: report.status,
      poseRecipeSha256: report.poseRecipeSha256,
      framesInspected: report.frames.length,
      failures: report.failures,
    });
    if (report.status !== "pass") failures.push(`pose inspection failed for ${poseId}`);
  }

  const contactSheet = path.join(runDirectory, "contact-sheet.jpg");
  const sampledSegments = renderReport.segments.length <= 12
    ? renderReport.segments
    : Array.from({ length: 12 }, (_, index) => (
      renderReport.segments[Math.round(index * (renderReport.segments.length - 1) / 11)]
    ));
  const sampleFrames = sampledSegments.map((segment) => Math.floor(
    (segment.outputStartFrame + segment.outputEndFrame) / 2,
  ) - 1);
  const select = sampleFrames.map((frame) => `eq(n\\,${frame})`).join("+");
  execute("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", finalVideo,
    "-vf", `select='${select}',scale=320:-1,tile=4x3:nb_frames=12:padding=4:margin=4:color=white`,
    "-frames:v", "1", contactSheet,
  ]);
  const humanReviewPath = path.join(runDirectory, "human-review.json");
  if (!(await exists(humanReviewPath))) {
    await writeJson(humanReviewPath, {
      schemaVersion: 1,
      status: "pending",
      reviewedOutputSha256: outputSha256,
      reviewer: null,
      notes: "Watch final.mp4 completely, then set status to approved or rejected without changing reviewedOutputSha256.",
    });
  }
  const report = {
    schemaVersion: 1,
    status: failures.length === 0 ? "pass" : "fail",
    inspectedAt: new Date().toISOString(),
    inputSha256: validated.receipt.inputSha256,
    outputSha256,
    artistRenderedFramesUsed: false,
    measured: {
      width: probe.width,
      height: probe.height,
      codec: probe.codec_name,
      pixelFormat: probe.pix_fmt,
      fps: probe.r_frame_rate,
      frames: Number(probe.nb_read_frames),
      durationSeconds: probe.duration,
    },
    poseReports,
    failures,
    contactSheet: "contact-sheet.jpg",
    contactSheetSampleFrames: sampleFrames,
    humanReview: "human-review.json",
  };
  await writeJson(path.join(runDirectory, "quality-report.json"), report);
  return report;
}

export { inspectRun, probeVideo };
