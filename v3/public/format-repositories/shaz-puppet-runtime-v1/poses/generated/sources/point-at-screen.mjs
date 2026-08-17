#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  adjustedState,
  controlKey,
  generatedRecipe,
  sourceControlState,
  sourceDrawing,
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const POINT_RECIPE_PATH = fileURLToPath(new URL("../../authored/point.json", import.meta.url));
const POINT_OFFSET = 6;
const SCREEN_SHA256 = "cf15a5e725edcb3ef49f51cb299001d1d112b4951b6ea7e8a749bfe81159e9e1";

function framedState(state) {
  return adjustedState(state, {
    positionDelta: [1.25, 0.18, 0],
    scaleMultiply: [0.74, 0.74],
  });
}

async function buildPointAtScreen(manifest) {
  const point = JSON.parse(await fs.readFile(POINT_RECIPE_PATH, "utf8"));
  const controls = {};
  for (const [nodeName, keys] of Object.entries(point.controls)) {
    const initial = sourceControlState(manifest, nodeName, 1);
    controls[nodeName] = [
      controlKey(1, nodeName === "Shaz_Master-P" ? framedState(initial) : initial),
      ...keys.map((key) => controlKey(
        key.frame + POINT_OFFSET,
        nodeName === "Shaz_Master-P" ? framedState(key) : key,
        key.interpolation,
      )),
    ];
  }

  for (const nodeName of ["Left_Pupil", "Right_Pupil"]) {
    const neutral = sourceControlState(manifest, nodeName, 1);
    controls[nodeName] = [
      controlKey(1, neutral),
      controlKey(6, adjustedState(neutral, { positionDelta: [-0.025, 0, 0] })),
      controlKey(12, adjustedState(neutral, { positionDelta: [-0.04, 0, 0] })),
      controlKey(point.durationFrames + POINT_OFFSET, adjustedState(neutral, {
        positionDelta: [-0.04, 0, 0],
      })),
    ];
  }

  const drawings = Object.fromEntries(Object.entries(point.drawings).map(([nodeName, keys]) => [
    nodeName,
    [
      { frame: 1, drawing: sourceDrawing(manifest, nodeName, 1) },
      ...keys.map((key) => ({ ...key, frame: key.frame + POINT_OFFSET })),
    ],
  ]));

  return {
    ...generatedRecipe(manifest, {
      id: "point-at-screen",
      durationFrames: point.durationFrames + POINT_OFFSET,
      learnedFrom: [
        "authored/point: shoulder, elbow, wrist, and pointing-hand mechanics",
        "authored library: neutral-to-pose anticipation and head drag",
      ],
      controls,
      drawings,
    }),
    props: [{
      id: "screen",
      asset: "screen.svg",
      sha256: SCREEN_SHA256,
      layer: "behind",
      keys: [
        { frame: 1, position: [0.18, 0.53], width: 0.22, opacity: 0 },
        { frame: 6, position: [0.18, 0.53], width: 0.3, opacity: 100 },
        { frame: point.durationFrames + POINT_OFFSET, position: [0.18, 0.53], width: 0.3, opacity: 100 },
      ],
    }],
  };
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: point-at-screen.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, await buildPointAtScreen(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildPointAtScreen };
