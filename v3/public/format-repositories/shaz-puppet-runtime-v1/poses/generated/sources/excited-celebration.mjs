#!/usr/bin/env node

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

const KEY_SOURCES = [
  { frame: 1, sourceFrame: 1 },
  { frame: 4, sourceFrame: 67 },
  { frame: 6, sourceFrame: 69 },
  { frame: 8, sourceFrame: 70 },
  { frame: 10, sourceFrame: 72 },
  { frame: 13, sourceFrame: 74 },
  { frame: 17, sourceFrame: 67 },
  { frame: 19, sourceFrame: 69 },
  { frame: 21, sourceFrame: 70 },
  { frame: 23, sourceFrame: 72 },
  { frame: 26, sourceFrame: 74 },
  { frame: 30, sourceFrame: 70 },
];

const ARM_CONTROLS = [
  "Left_Arm_MOVE-P",
  "Left_Arm_Pivot-P",
  "Left_Forearm_Pivot-P",
  "Left_Hand-P",
  "Right_Arm_MOVE-P",
  "Right_Arm_Pivot-P",
  "Right_Forearm_Pivot-P",
  "Right_Hand-P",
];

function stateKeys(manifest, nodeName, adjustmentForKey = () => ({})) {
  return KEY_SOURCES.map((key) => controlKey(
    key.frame,
    adjustedState(
      sourceControlState(manifest, nodeName, key.sourceFrame),
      adjustmentForKey(key),
    ),
  ));
}

function buildExcitedCelebration(manifest) {
  const controls = Object.fromEntries(ARM_CONTROLS.map((nodeName) => [
    nodeName,
    stateKeys(manifest, nodeName, ({ frame }) => {
      const peak = frame === 8 || frame === 21 || frame === 30;
      const settle = frame === 10 || frame === 13 || frame === 23 || frame === 26;
      if (nodeName === "Left_Arm_Pivot-P" && peak) return { rotation: -32 };
      if (nodeName === "Right_Arm_Pivot-P" && peak) return { rotation: 52 };
      if (nodeName === "Left_Arm_Pivot-P" && settle) return { rotation: -22 };
      if (nodeName === "Right_Arm_Pivot-P" && settle) return { rotation: 44 };
      return {};
    }),
  ]));

  controls["Arms_Master-P"] = stateKeys(manifest, "Arms_Master-P", ({ frame }) => ({
    positionDelta: [0, ({
      1: 0,
      4: 0,
      6: 0.08,
      8: 0.18,
      10: 0.12,
      13: 0.06,
      17: 0,
      19: 0.08,
      21: 0.18,
      23: 0.12,
      26: 0.06,
      30: 0.12,
    })[frame], 0],
  }));

  const masterAdjustments = {
    1: { rotation: 0, position: [0, 0.22, 0], scaleMultiply: [0.92, 0.92] },
    4: { rotation: -4, position: [0, -0.08, 0], scaleMultiply: [0.96, 0.88] },
    6: { rotation: 3, position: [0, 0.12, 0], scaleMultiply: [0.91, 0.94] },
    8: { rotation: 8, position: [0, 0.22, 0], scaleMultiply: [0.9, 0.95] },
    10: { rotation: 5, position: [0, 0.12, 0], scaleMultiply: [0.92, 0.92] },
    13: { rotation: 4, position: [0, 0.08, 0], scaleMultiply: [0.93, 0.91] },
    17: { rotation: 3, position: [0, -0.02, 0], scaleMultiply: [0.95, 0.89] },
    19: { rotation: -3, position: [0, 0.12, 0], scaleMultiply: [0.91, 0.94] },
    21: { rotation: -7, position: [0, 0.2, 0], scaleMultiply: [0.9, 0.95] },
    23: { rotation: -5, position: [0, 0.11, 0], scaleMultiply: [0.92, 0.92] },
    26: { rotation: -3, position: [0, 0.07, 0], scaleMultiply: [0.93, 0.91] },
    30: { rotation: 0, position: [0, 0.08, 0], scaleMultiply: [0.92, 0.92] },
  };
  controls["Shaz_Master-P"] = stateKeys(
    manifest,
    "Shaz_Master-P",
    ({ frame }) => masterAdjustments[frame],
  );

  const headRotations = {
    1: 0,
    4: 5,
    6: -2,
    8: -5,
    10: -3,
    13: -2,
    17: -3,
    19: 2,
    21: 5,
    23: 3,
    26: 2,
    30: 0,
  };
  controls["Head_Movement-P"] = stateKeys(
    manifest,
    "Head_Movement-P",
    ({ frame }) => ({ rotation: headRotations[frame] }),
  );

  const drawingAt = (nodeName, frame) => sourceDrawing(manifest, nodeName, frame);
  return generatedRecipe(manifest, {
    id: "excited-celebration",
    durationFrames: 30,
    learnedFrom: [
      "authored/shrug: bilateral palm-up arm mechanics",
      "authored/idea: open-mouth facial substitution",
      "authored library: anticipation, overshoot, counter-tilt, and settle timing",
    ],
    controls,
    drawings: {
      Left_Hand: [
        { frame: 1, drawing: drawingAt("Left_Hand", 1) },
        { frame: 6, drawing: drawingAt("Left_Hand", 70) },
      ],
      Right_Hand: [
        { frame: 1, drawing: drawingAt("Right_Hand", 1) },
        { frame: 6, drawing: drawingAt("Right_Hand", 70) },
      ],
      Mouth: [
        { frame: 1, drawing: drawingAt("Mouth", 1) },
        { frame: 6, drawing: drawingAt("Mouth", 193) },
      ],
      Left_Eye: [
        { frame: 1, drawing: drawingAt("Left_Eye", 1) },
        { frame: 4, drawing: drawingAt("Left_Eye", 67) },
        { frame: 6, drawing: drawingAt("Left_Eye", 193) },
      ],
      Right_Eye: [
        { frame: 1, drawing: drawingAt("Right_Eye", 1) },
        { frame: 4, drawing: drawingAt("Right_Eye", 67) },
        { frame: 6, drawing: drawingAt("Right_Eye", 193) },
      ],
      Left_Pupil: [
        { frame: 1, drawing: drawingAt("Left_Pupil", 1) },
        { frame: 4, drawing: null },
        { frame: 6, drawing: drawingAt("Left_Pupil", 193) },
      ],
      Right_Pupil: [
        { frame: 1, drawing: drawingAt("Right_Pupil", 1) },
        { frame: 4, drawing: null },
        { frame: 6, drawing: drawingAt("Right_Pupil", 193) },
      ],
    },
  });
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: excited-celebration.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, buildExcitedCelebration(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildExcitedCelebration };
