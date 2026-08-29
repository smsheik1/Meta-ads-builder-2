#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  adjustedState,
  controlKey,
  generatedRecipe,
  sourceDrawing,
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const SHRUG_RECIPE_PATH = fileURLToPath(new URL("../../authored/shrug.json", import.meta.url));
const SHRUG_RECIPE_SHA256 = "9cba89c6393a43580c25eb6059132a39ef30490958936d7f375071faf2f451b1";
const REFERENCE_SOURCE_SHA256 = "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127";
const REFERENCE_CLIP_SHA256 = "07972d6a4143d576fa6f2f37fa279efa357deba03cfb9e2c00988ecfaad29b41";

// Keep the checksum-locked Shrug calibration's complete native bilateral cadence while changing
// the destination silhouette from bent elbows to a wide overhead V. This is
// deliberately independent of the rejected excited-celebration recipe.
const EMPHASIS_WEIGHT = Object.freeze([
  0, 0.2, 0.68, 1,
  0.96, 0.9, 0.86, 0.84, 0.82, 0.82,
  0.82, 0.82, 0.82, 0.82, 0.82, 0.82, 0.82, 0.82, 0.82, 0.82,
  0.84, 0.87, 0.9, 0.94, 0.98,
  0.88, 0.72, 0.48, 0.24, 0, 0,
]);

const ROTATION_DELTAS = Object.freeze({
  "Left_Arm_Pivot-P": -80,
  "Right_Arm_Pivot-P": 80,
  "Left_Forearm_Pivot-P": 85,
  "Right_Forearm_Pivot-P": -85,
  "Left_Hand-P": -5,
  "Right_Hand-P": 5,
});

async function loadLockedShrug() {
  const bytes = await fs.readFile(SHRUG_RECIPE_PATH);
  const actualSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== SHRUG_RECIPE_SHA256) {
    throw new Error(`locked source recipe changed: shrug.json ${actualSha256}`);
  }
  return JSON.parse(bytes.toString("utf8"));
}

function adjustedKeys(nodeName, keys) {
  const rotationDelta = ROTATION_DELTAS[nodeName] ?? 0;
  return keys.map((key) => {
    const weight = EMPHASIS_WEIGHT[key.frame - 1];
    if (weight === undefined) throw new Error(`${nodeName} has an unexpected frame ${key.frame}`);
    const adjusted = adjustedState(key, {
      ...(rotationDelta !== 0 ? { rotationDelta: rotationDelta * weight } : {}),
      ...(nodeName === "Arms_Master-P" ? { positionDelta: [0, 0.07 * weight, 0] } : {}),
    });
    return controlKey(key.frame, adjusted, key.interpolation);
  });
}

async function buildBigEmphasis(manifest) {
  const shrug = await loadLockedShrug();
  if (shrug.durationFrames !== EMPHASIS_WEIGHT.length) {
    throw new Error(`locked Shrug duration changed: ${shrug.durationFrames}`);
  }
  const controls = Object.fromEntries(Object.entries(shrug.controls).map(([nodeName, keys]) => [
    nodeName,
    adjustedKeys(nodeName, keys),
  ]));
  const drawings = structuredClone(shrug.drawings);

  // Big Emphasis faces the audience. Mouth motion remains replaceable by the
  // separate lip-sync track, but the review-only body candidate must not read
  // as the Shrug's side-eye expression when rendered without audio.
  delete drawings.Left_Eye;
  delete drawings.Left_Pupil;
  delete drawings.Right_Eye;
  delete drawings.Right_Pupil;
  drawings.Mouth = [
    { frame: 1, drawing: sourceDrawing(manifest, "Mouth", 1) },
    { frame: 4, drawing: sourceDrawing(manifest, "Mouth", 193) },
    { frame: 29, drawing: sourceDrawing(manifest, "Mouth", 1) },
  ];

  const recipe = generatedRecipe(manifest, {
    id: "big-emphasis",
    durationFrames: shrug.durationFrames,
    learnedFrom: [
      `authored/shrug@${SHRUG_RECIPE_SHA256}: complete native bilateral entry, living hold, open-palm drawings, and neutral release`,
      "0826 Candidate 10: fast anticipation into a clean overhead open-palm V with a long readable hold",
      "three bounded native-rig silhouette passes: candidate 3 retained the wide V without the rejected behind-the-head celebration mechanics",
    ],
    controls,
    drawings,
    deformationFrames: structuredClone(shrug.deformationFrames),
    quality: {
      maximumIdenticalFrames: 3,
      armCompositeMode: "native-rig",
    },
  });
  recipe.promotionReference = {
    candidateNumber: "10",
    label: "Big emphasis",
    sourceName: "0826.mov",
    sourceSha256: REFERENCE_SOURCE_SHA256,
    sourceStartSeconds: 92.7,
    sourceEndSeconds: 94.55,
    clipName: "10-big-emphasis.mp4",
    clipSha256: REFERENCE_CLIP_SHA256,
  };
  return recipe;
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: big-emphasis.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, await buildBigEmphasis(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildBigEmphasis };
