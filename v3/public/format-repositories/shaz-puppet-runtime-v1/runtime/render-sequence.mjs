import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";

import { execute, sha256, validateRun, writeJson } from "./run-common.mjs";
import { renderRigFrame } from "./rig-v2-renderer.mjs";

async function renderSequence({ root, runDirectory }) {
  const validated = await validateRun({ root, runDirectory });
  const output = path.join(runDirectory, "final.mp4");
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-sequence-"));
  const assetCache = new Map();
  const propCache = new Map();
  const segments = [];
  const whiteFrame = await sharp({
    create: { width: 1280, height: 720, channels: 4, background: "#ffffff" },
  }).png().toBuffer();
  let outputFrame = 0;
  try {
    for (const entry of validated.timeline.entries) {
      const startFrame = outputFrame + 1;
      let lastBuffer = null;
      let firstReceipt = null;
      let lastReceipt = null;
      for (let recipeFrame = 1; recipeFrame <= entry.pose.recipe.durationFrames; recipeFrame += 1) {
        const rendered = await renderRigFrame({
          manifest: validated.manifest,
          frame: recipeFrame,
          assetRoot: path.join(root, "rig-v2", "assets"),
          propRoot: path.join(root, "assets", "props"),
          assetCache,
          propCache,
          poseRuntime: entry.pose.poseRuntime,
        });
        outputFrame += 1;
        lastBuffer = rendered.buffer;
        firstReceipt ??= rendered.receipt;
        lastReceipt = rendered.receipt;
        await fs.writeFile(path.join(scratch, `frame-${String(outputFrame).padStart(6, "0")}.png`), lastBuffer);
      }
      for (let frame = 0; frame < entry.holdFrames; frame += 1) {
        outputFrame += 1;
        await fs.writeFile(path.join(scratch, `frame-${String(outputFrame).padStart(6, "0")}.png`), lastBuffer);
      }
      for (let frame = 0; frame < entry.gapFrames; frame += 1) {
        outputFrame += 1;
        await fs.writeFile(path.join(scratch, `frame-${String(outputFrame).padStart(6, "0")}.png`), whiteFrame);
      }
      segments.push({
        index: entry.index,
        poseId: entry.poseId,
        recipeFrames: entry.pose.recipe.durationFrames,
        holdFrames: entry.holdFrames,
        gapFrames: entry.gapFrames,
        outputStartFrame: startFrame,
        outputEndFrame: outputFrame,
        poseRecipeSha256: entry.pose.poseRuntime.recipeSha256,
        firstFrameReceipt: {
          sourceXstageSha256: firstReceipt.sourceXstageSha256,
          artistRenderedFramesUsed: firstReceipt.artistRenderedFramesUsed,
          layerCount: firstReceipt.layers.length,
          propCount: firstReceipt.props.length,
        },
        lastFrameReceipt: {
          sourceXstageSha256: lastReceipt.sourceXstageSha256,
          artistRenderedFramesUsed: lastReceipt.artistRenderedFramesUsed,
          layerCount: lastReceipt.layers.length,
          propCount: lastReceipt.props.length,
        },
      });
    }
    if (outputFrame !== validated.timeline.totalFrames) {
      throw new Error(`renderer wrote ${outputFrame} frames, expected ${validated.timeline.totalFrames}`);
    }
    execute("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-framerate", "24",
      "-i", path.join(scratch, "frame-%06d.png"),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      output,
    ]);
    const report = {
      schemaVersion: 1,
      status: "rendered",
      renderedAt: new Date().toISOString(),
      inputSha256: validated.receipt.inputSha256,
      sourceXstageSha256: validated.receipt.sourceXstageSha256,
      artistRenderedFramesUsed: false,
      renderer: "runtime/rig-v2-renderer.mjs#renderRigFrame",
      finalVideo: "final.mp4",
      outputSha256: await sha256(output),
      totalFrames: outputFrame,
      durationSeconds: outputFrame / 24,
      segments,
      providerCalls: 0,
      cost: "$0",
    };
    await writeJson(path.join(runDirectory, "render-report.json"), report);
    return { output, report };
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

export { renderSequence };
