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

const THINK_RECIPE_PATH = fileURLToPath(new URL("../../authored/think.json", import.meta.url));
const OFFSET = 6;

function adjustmentFor(nodeName, sourceKey) {
  const settled = sourceKey.frame >= 7;
  if (nodeName === "Shaz_Master-P") {
    return {
      positionDelta: [0, settled ? 0.04 : 0.1, 0],
      rotationDelta: settled ? -3 : 0,
      scaleMultiply: [0.88, 0.88],
    };
  }
  if (nodeName === "Head_Movement-P" && settled) return { rotationDelta: -5 };
  if (nodeName === "OL_Hand-P" && settled) return { positionDelta: [0.08, 0.06, 0] };
  return {};
}

async function buildFacepalmFrustrated(manifest) {
  const think = JSON.parse(await fs.readFile(THINK_RECIPE_PATH, "utf8"));
  const controls = {};
  for (const [nodeName, keys] of Object.entries(think.controls)) {
    const initial = sourceControlState(manifest, nodeName, 1);
    controls[nodeName] = [
      controlKey(1, adjustedState(initial, nodeName === "Shaz_Master-P"
        ? { positionDelta: [0, 0.1, 0], scaleMultiply: [0.88, 0.88] }
        : {})),
      ...keys.map((key) => controlKey(
        key.frame + OFFSET,
        adjustedState(key, adjustmentFor(nodeName, key)),
        key.interpolation,
      )),
    ];
  }

  const drawings = Object.fromEntries(Object.entries(think.drawings).map(([nodeName, keys]) => [
    nodeName,
    [
      { frame: 1, drawing: sourceDrawing(manifest, nodeName, 1) },
      ...keys.map((key) => ({ ...key, frame: key.frame + OFFSET })),
    ],
  ]));

  return generatedRecipe(manifest, {
    id: "facepalm-frustrated",
    durationFrames: think.durationFrames + OFFSET,
    learnedFrom: [
      "authored/think: connected hand-to-face arm mechanics and facial substitution timing",
      "authored library: anticipation, head drag, torso slump, hair follow-through, and held settle",
    ],
    controls,
    drawings,
  });
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: facepalm-frustrated.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, await buildFacepalmFrustrated(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildFacepalmFrustrated };
