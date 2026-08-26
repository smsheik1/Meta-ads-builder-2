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

const SOURCE_FRAMES = Array.from({ length: 31 }, (_, index) => 67 + index);

// Preserve the artist's measured 31-frame grammar: short setup, a one-frame
// accent at local frame 4, six-frame settle, long readable hold, secondary
// facial afterbeat, and quick release. This envelope changes only the semantic
// height of the celebration; the underlying rig timing remains frame-exact.
const CELEBRATION_WEIGHT = Object.freeze([
  0, 0.12, 0.55, 1,
  0.9, 0.75, 0.63, 0.56, 0.52, 0.5,
  0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
  0.52, 0.55, 0.58, 0.62, 0.68,
  0.56, 0.42, 0.27, 0.12, 0, 0,
]);

const SOURCE_CONTROLS = [
  "Arms_Master-P",
  "Back_Hair-P",
  "Collar-P",
  "Eyebrows",
  "Head_Movement-P",
  "Left_Arm_MOVE-P",
  "Left_Arm_Pivot-P",
  "Left_Forearm-P",
  "Left_Forearm_Pivot-P",
  "Left_Hand-P",
  "OL_Hand-P",
  "Pouch-P",
  "Right_Arm_MOVE-P",
  "Right_Arm_Pivot-P",
  "Right_Forearm_Pivot-P",
  "Right_Hand-P",
  "Shaz_Master-P",
  "Shaz_Rig-P",
  "Strings-P",
];

function stateKeys(manifest, nodeName, adjustmentForKey = () => ({})) {
  return SOURCE_FRAMES.map((sourceFrame, index) => controlKey(
    index + 1,
    adjustedState(
      sourceControlState(
        manifest,
        nodeName,
        sourceFrame,
      ),
      adjustmentForKey({ frame: index + 1, sourceFrame, weight: CELEBRATION_WEIGHT[index] }),
    ),
  ));
}

function buildExcitedCelebration(manifest) {
  const controls = Object.fromEntries(SOURCE_CONTROLS.map((nodeName) => [
    nodeName,
    stateKeys(manifest, nodeName, ({ weight }) => {
      if (nodeName === "Left_Arm_Pivot-P") return { rotationDelta: -48 * weight };
      if (nodeName === "Right_Arm_Pivot-P") return { rotationDelta: 48 * weight };
      if (nodeName === "Arms_Master-P") return { positionDelta: [0, 0.08 * weight, 0] };
      if (nodeName === "Head_Movement-P") return { rotationDelta: -2 * weight };
      return {};
    }),
  ]));

  const drawingAt = (nodeName, frame) => sourceDrawing(manifest, nodeName, frame);
  return generatedRecipe(manifest, {
    id: "excited-celebration",
    durationFrames: 31,
    learnedFrom: [
      "authored/shrug: complete 31-frame cadence, bilateral arm mechanics, overlap, and release",
      "authored/aha: open-mouth facial substitution",
      "registered left-hand-10 and right-hand-10 drawings: clenched victory fists kept on the authored Shrug wrist controls without unrelated-frame substitution or extra scaling",
      "human shrug audit: one-frame accent, six-frame settle, long hold, and facial afterbeat",
    ],
    controls,
    drawings: {
      Left_Hand: [
        { frame: 1, drawing: drawingAt("Left_Hand", 67) },
        { frame: 3, drawing: "10" },
        { frame: 29, drawing: drawingAt("Left_Hand", 95) },
        { frame: 30, drawing: drawingAt("Left_Hand", 96) },
      ],
      Right_Hand: [
        { frame: 1, drawing: drawingAt("Right_Hand", 67) },
        { frame: 3, drawing: "10" },
        { frame: 29, drawing: drawingAt("Right_Hand", 95) },
        { frame: 30, drawing: drawingAt("Right_Hand", 96) },
      ],
      Mouth: [
        { frame: 1, drawing: drawingAt("Mouth", 1) },
        { frame: 4, drawing: drawingAt("Mouth", 193) },
        { frame: 30, drawing: drawingAt("Mouth", 1) },
      ],
      Left_Eye: [
        { frame: 1, drawing: drawingAt("Left_Eye", 67) },
        { frame: 3, drawing: drawingAt("Left_Eye", 69) },
        { frame: 4, drawing: drawingAt("Left_Eye", 193) },
        { frame: 25, drawing: drawingAt("Left_Eye", 91) },
        { frame: 29, drawing: drawingAt("Left_Eye", 95) },
      ],
      Right_Eye: [
        { frame: 1, drawing: drawingAt("Right_Eye", 67) },
        { frame: 3, drawing: drawingAt("Right_Eye", 69) },
        { frame: 4, drawing: drawingAt("Right_Eye", 193) },
        { frame: 25, drawing: drawingAt("Right_Eye", 91) },
        { frame: 29, drawing: drawingAt("Right_Eye", 95) },
      ],
      Left_Pupil: [
        { frame: 1, drawing: null },
        { frame: 3, drawing: drawingAt("Left_Pupil", 69) },
        { frame: 4, drawing: drawingAt("Left_Pupil", 193) },
        { frame: 25, drawing: null },
        { frame: 29, drawing: drawingAt("Left_Pupil", 95) },
      ],
      Right_Pupil: [
        { frame: 1, drawing: null },
        { frame: 3, drawing: drawingAt("Right_Pupil", 69) },
        { frame: 4, drawing: drawingAt("Right_Pupil", 193) },
        { frame: 25, drawing: null },
        { frame: 29, drawing: drawingAt("Right_Pupil", 95) },
      ],
    },
    deformationFrames: SOURCE_FRAMES,
    quality: {
      maximumIdenticalFrames: 3,
      armCompositeMode: "native-rig",
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
