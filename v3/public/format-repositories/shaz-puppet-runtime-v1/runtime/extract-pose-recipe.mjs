#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  indexColumns,
  resolveReadDrawing,
  sampleNode,
} from "./vendor/runtime_channels.mjs";
import {
  controlStateForNode,
  poseRecipeSha256,
} from "./pose-recipe.mjs";
import { loadManifest } from "./rig-v2-renderer.mjs";

const EPSILON = 1e-10;

function parseArgs(values) {
  const args = {
    manifest: null,
    id: null,
    start: null,
    end: null,
    baseFrame: 1,
    output: null,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = values[++index];
    else if (value === "--id") args.id = values[++index];
    else if (value === "--start") args.start = Number(values[++index]);
    else if (value === "--end") args.end = Number(values[++index]);
    else if (value === "--base-frame") args.baseFrame = Number(values[++index]);
    else if (value === "--output") args.output = values[++index];
    else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.id || !args.output
    || !Number.isInteger(args.start) || !Number.isInteger(args.end)
    || args.start < 1 || args.end < args.start
    || !Number.isInteger(args.baseFrame) || args.baseFrame < 1) {
    throw new Error("usage: extract-pose-recipe.mjs --manifest runtime.json --id pose-id --start N --end N --base-frame N --output recipe.json");
  }
  return args;
}

function numericValues(state) {
  return [
    ...state.position,
    state.rotation,
    ...state.scale,
    state.skew,
    state.opacity,
  ];
}

function statesEqual(left, right, epsilon = EPSILON) {
  if (left.flipHorizontal !== right.flipHorizontal || left.flipVertical !== right.flipVertical) {
    return false;
  }
  const leftValues = numericValues(left);
  const rightValues = numericValues(right);
  return leftValues.every((value, index) => Math.abs(value - rightValues[index]) <= epsilon);
}

function linearStateError(actual, left, right, progress) {
  if (actual.flipHorizontal !== left.flipHorizontal
    || actual.flipVertical !== left.flipVertical) return Infinity;
  const actualValues = numericValues(actual);
  const leftValues = numericValues(left);
  const rightValues = numericValues(right);
  return Math.max(...actualValues.map((value, index) => Math.abs(
    value - (leftValues[index] + (rightValues[index] - leftValues[index]) * progress),
  )));
}

function simplifyControlFrames(frames) {
  if (frames.length <= 2) return frames;
  const keep = new Set([0, frames.length - 1]);
  function split(leftIndex, rightIndex) {
    if (rightIndex - leftIndex <= 1) return;
    const left = frames[leftIndex];
    const right = frames[rightIndex];
    let worstIndex = -1;
    let worstError = -1;
    for (let index = leftIndex + 1; index < rightIndex; index += 1) {
      const progress = (frames[index].frame - left.frame) / (right.frame - left.frame);
      const error = linearStateError(frames[index].state, left.state, right.state, progress);
      if (error > worstError) {
        worstError = error;
        worstIndex = index;
      }
    }
    if (worstError > EPSILON) {
      keep.add(worstIndex);
      split(leftIndex, worstIndex);
      split(worstIndex, rightIndex);
    }
  }
  split(0, frames.length - 1);
  return [...keep].sort((left, right) => left - right).map((index) => frames[index]);
}

function keyFromState(frame, state) {
  return {
    frame,
    position: state.position,
    rotation: state.rotation,
    scale: state.scale,
    skew: state.skew,
    opacity: state.opacity,
    flipHorizontal: state.flipHorizontal,
    flipVertical: state.flipVertical,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(path.resolve(args.manifest));
  const scene = manifest.scenes[0];
  if (!scene) throw new Error("manifest contains no scene");
  if (args.end > scene.stopFrame) throw new Error(`source range exceeds frame ${scene.stopFrame}`);
  const columns = indexColumns(scene);
  const durationFrames = args.end - args.start + 1;
  const controls = {};
  const drawings = {};

  for (const node of scene.nodes.filter((candidate) => (
    candidate.type === "PEG" || candidate.type === "READ"
  ))) {
    const baseState = controlStateForNode(sampleNode(node, columns, args.baseFrame));
    const sampledFrames = [];
    for (let sourceFrame = args.start; sourceFrame <= args.end; sourceFrame += 1) {
      sampledFrames.push({
        frame: sourceFrame - args.start + 1,
        state: controlStateForNode(sampleNode(node, columns, sourceFrame)),
      });
    }
    if (sampledFrames.some(({ state }) => !statesEqual(state, baseState))) {
      controls[node.name] = simplifyControlFrames(sampledFrames)
        .map(({ frame, state }) => keyFromState(frame, state));
    }

    if (node.type !== "READ") continue;
    const baseDrawing = resolveReadDrawing(manifest, scene, node, args.baseFrame)?.drawing ?? null;
    const drawingKeys = [];
    let previous = Symbol("unset");
    for (let sourceFrame = args.start; sourceFrame <= args.end; sourceFrame += 1) {
      const drawing = resolveReadDrawing(manifest, scene, node, sourceFrame)?.drawing ?? null;
      if (drawing !== previous) {
        drawingKeys.push({ frame: sourceFrame - args.start + 1, drawing });
        previous = drawing;
      }
    }
    if (drawingKeys.length > 1 || drawingKeys[0]?.drawing !== baseDrawing) {
      drawings[node.name] = drawingKeys;
    }
  }

  const recipe = {
    schemaVersion: "shaz-pose-recipe-v1",
    id: args.id,
    fps: 24,
    durationFrames,
    baseFrame: args.baseFrame,
    sourceXstageSha256: manifest.source.sha256,
    artistRenderedFramesUsed: false,
    sourceAction: {
      startFrame: args.start,
      endFrame: args.end,
      generatedFrom: "xstage-control-channels-and-drawing-exposures",
    },
    controls,
    drawings,
  };
  const output = path.resolve(args.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(recipe, null, 2)}\n`);
  process.stdout.write(`${output}\n${poseRecipeSha256(recipe)}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { simplifyControlFrames, statesEqual };
