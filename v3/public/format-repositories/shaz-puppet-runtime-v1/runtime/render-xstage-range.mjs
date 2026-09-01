#!/usr/bin/env node

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import {
  createPoseRuntime,
  loadPoseRecipe,
} from "./pose-recipe.mjs";
import { loadManifest, renderRigFrame } from "./rig-v2-renderer.mjs";

function parseArgs(values) {
  const args = {
    manifest: null,
    assets: null,
    propAssets: null,
    recipe: null,
    start: null,
    end: null,
    output: null,
    receipt: null,
    fps: 24,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = values[++index];
    else if (value === "--assets") args.assets = values[++index];
    else if (value === "--prop-assets") args.propAssets = values[++index];
    else if (value === "--recipe") args.recipe = values[++index];
    else if (value === "--start") args.start = Number(values[++index]);
    else if (value === "--end") args.end = Number(values[++index]);
    else if (value === "--output") args.output = values[++index];
    else if (value === "--receipt") args.receipt = values[++index];
    else if (value === "--fps") args.fps = Number(values[++index]);
    else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.assets || !args.output
    || !Number.isFinite(args.fps) || args.fps <= 0) {
    throw new Error("usage: render-xstage-range.mjs --manifest runtime.json --assets assets [--prop-assets props] [--recipe pose.json] [--start N --end N] --output clip.mp4 [--fps 24] [--receipt receipt.json]");
  }
  if (!args.recipe && (!Number.isInteger(args.start) || !Number.isInteger(args.end))) {
    throw new Error("Xstage calibration renders require --start and --end");
  }
  return args;
}

async function streamPngFramesToFfmpeg({
  frames,
  fps,
  output,
  spawnProcess = spawn,
}) {
  const child = spawnProcess("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe",
    "-framerate", String(fps),
    "-i", "pipe:0",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    output,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const completed = new Promise((resolve) => {
    let settled = false;
    const settle = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    child.once("error", (error) => settle({ error }));
    child.once("close", (code, signal) => settle({ code, signal }));
  });

  let frameError = null;
  async function* trackedFrames() {
    try {
      for await (const frame of frames) yield frame;
    } catch (error) {
      frameError = error;
      throw error;
    }
  }
  let streamError = null;
  try {
    await pipeline(trackedFrames(), child.stdin);
  } catch (error) {
    streamError = error;
    if (frameError
      || (error?.code !== "EPIPE" && error?.code !== "ERR_STREAM_PREMATURE_CLOSE")) {
      child.kill();
    }
  }

  const result = await completed;
  if (frameError) throw frameError;
  if (result.error) {
    throw new Error(`ffmpeg failed:\n${stderr || result.error.message}`, { cause: result.error });
  }
  if (result.code !== 0) {
    const detail = stderr || (result.signal ? `terminated by ${result.signal}` : "unknown error");
    throw new Error(`ffmpeg failed:\n${detail}`);
  }
  if (streamError) throw streamError;
}

export async function renderFrameRange({
  start,
  end,
  fps,
  output,
  renderFrame,
  spawnProcess = spawn,
  fileSystem = fs,
  temporaryId = () => crypto.randomUUID(),
}) {
  const finalOutput = path.resolve(output);
  const extension = path.extname(finalOutput) || ".mp4";
  const basename = path.basename(finalOutput, path.extname(finalOutput));
  const stagedOutput = path.join(
    path.dirname(finalOutput),
    `.${basename}.stage-${temporaryId()}${extension}`,
  );
  const frameReceipts = [];
  async function* frames() {
    for (let sourceFrame = start; sourceFrame <= end; sourceFrame += 1) {
      const rendered = await renderFrame(sourceFrame);
      frameReceipts.push(rendered.receipt);
      yield rendered.buffer;
    }
  }
  let committed = false;
  let operationError = null;
  try {
    await streamPngFramesToFfmpeg({
      frames: frames(),
      fps,
      output: stagedOutput,
      spawnProcess,
    });
    await fileSystem.rename(stagedOutput, finalOutput);
    committed = true;
  } catch (error) {
    operationError = error;
  }
  if (!committed) {
    try {
      await fileSystem.rm(stagedOutput, { force: true });
    } catch (cleanupError) {
      if (operationError) {
        throw new AggregateError(
          [operationError, cleanupError],
          "range render failed and its staged encode could not be removed",
        );
      }
      throw cleanupError;
    }
  }
  if (operationError) throw operationError;
  return frameReceipts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(path.resolve(args.manifest));
  const poseRuntime = args.recipe
    ? createPoseRuntime(manifest, await loadPoseRecipe(path.resolve(args.recipe)))
    : null;
  const start = args.start ?? 1;
  const end = args.end ?? poseRuntime?.recipe.durationFrames;
  if (!Number.isInteger(start) || !Number.isInteger(end)
    || start < 1 || end < start
    || (poseRuntime && end > poseRuntime.recipe.durationFrames)) {
    throw new Error(`render range ${start}-${end} is invalid`);
  }
  const output = path.resolve(args.output);
  const assetCache = new Map();
  const propCache = new Map();
  await fs.mkdir(path.dirname(output), { recursive: true });
  const frameReceipts = await renderFrameRange({
    start,
    end,
    fps: args.fps,
    output,
    renderFrame: (sourceFrame) => renderRigFrame({
      manifest,
      frame: sourceFrame,
      assetRoot: path.resolve(args.assets),
      propRoot: args.propAssets ? path.resolve(args.propAssets) : null,
      assetCache,
      propCache,
      poseRuntime,
    }),
  });
  if (args.receipt) {
    const receiptPath = path.resolve(args.receipt);
    await fs.mkdir(path.dirname(receiptPath), { recursive: true });
    await fs.writeFile(receiptPath, `${JSON.stringify({
      schemaVersion: "shaz-rig-v2-range-receipt-v1",
      sourceXstageSha256: manifest.source.sha256,
      mode: poseRuntime ? "pose-recipe" : "xstage-calibration",
      startFrame: start,
      endFrame: end,
      fps: args.fps,
      artistRenderedFramesUsed: false,
      ...(poseRuntime ? {
        poseRecipeId: poseRuntime.recipe.id,
        poseRecipeSha256: poseRuntime.recipeSha256,
      } : {}),
      frames: frameReceipts,
    }, null, 2)}\n`);
  }
  process.stdout.write(`${output}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
