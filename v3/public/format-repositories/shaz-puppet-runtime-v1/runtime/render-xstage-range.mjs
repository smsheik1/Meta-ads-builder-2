#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

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

function run(program, values) {
  const result = spawnSync(program, values, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${program} failed:\n${result.stderr || result.stdout}`);
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
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-xstage-range-"));
  const assetCache = new Map();
  const propCache = new Map();
  const frameReceipts = [];
  try {
    for (let sourceFrame = start; sourceFrame <= end; sourceFrame += 1) {
      const rendered = await renderRigFrame({
        manifest,
        frame: sourceFrame,
        assetRoot: path.resolve(args.assets),
        propRoot: args.propAssets ? path.resolve(args.propAssets) : null,
        assetCache,
        propCache,
        poseRuntime,
      });
      const outputFrame = sourceFrame - start + 1;
      await fs.writeFile(
        path.join(scratch, `frame-${String(outputFrame).padStart(4, "0")}.png`),
        rendered.buffer,
      );
      frameReceipts.push(rendered.receipt);
    }
    await fs.mkdir(path.dirname(output), { recursive: true });
    run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-framerate", String(args.fps),
      "-i", path.join(scratch, "frame-%04d.png"),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      output,
    ]);
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
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
