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

const OPEN_WIDE_REFERENCE = Object.freeze({
  candidateNumber: "04",
  sourceName: "0826.mov",
  sourceSha256: "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127",
  sourceStartSeconds: 23.2,
  sourceEndSeconds: 25.85,
  clipSha256: "a67b799cc733ea2f8296f5f388bf064bac5c2e38e352b37c85215b7b1dce5592",
});

const SOURCE_FRAMES = Object.freeze(Array.from({ length: 31 }, (_, index) => 67 + index));
const OPEN_WEIGHT = Object.freeze([
  0, 0.35, 0.75, 1,
  0.96, 0.93, 0.9, 0.88, 0.87, 0.86,
  0.86, 0.86, 0.86, 0.86, 0.86, 0.86, 0.86, 0.86, 0.86, 0.86,
  0.88, 0.9, 0.92, 0.94, 0.96,
  0.82, 0.62, 0.4, 0.2, 0, 0,
]);
const SOURCE_CONTROLS = Object.freeze([
  "Arms_Master-P",
  "Back_Hair-P",
  "Collar-P",
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
]);
const CENTERED_CONTROLS = new Set([
  "Back_Hair-P",
  "Head_Movement-P",
  "Shaz_Master-P",
  "Shaz_Rig-P",
]);

function mix(left, right, weight) {
  return left + ((right - left) * weight);
}

function blendState(source, target, weight) {
  return {
    position: source.position.map((value, index) => mix(value, target.position[index], weight)),
    rotation: mix(source.rotation, target.rotation, weight),
    scale: source.scale.map((value, index) => mix(value, target.scale[index], weight)),
    skew: mix(source.skew, target.skew, weight),
    opacity: mix(source.opacity, target.opacity, weight),
    flipHorizontal: weight >= 0.5 ? target.flipHorizontal : source.flipHorizontal,
    flipVertical: weight >= 0.5 ? target.flipVertical : source.flipVertical,
  };
}

function adjustment(nodeName, weight) {
  if (nodeName === "Left_Forearm_Pivot-P") return { rotationDelta: 45 * weight };
  if (nodeName === "Right_Forearm_Pivot-P") return { rotationDelta: -45 * weight };
  if (nodeName === "Left_Hand-P") return { rotationDelta: -35 * weight };
  if (nodeName === "Right_Hand-P") return { rotationDelta: 60 * weight };
  return {};
}

function drawingTimeline(manifest, nodeName) {
  const keys = [];
  let previous = Symbol("unset");
  SOURCE_FRAMES.forEach((sourceFrame, index) => {
    const drawing = sourceDrawing(manifest, nodeName, sourceFrame);
    if (drawing !== previous) {
      keys.push({ frame: index + 1, drawing });
      previous = drawing;
    }
  });
  return keys;
}

function buildOpenWide(manifest) {
  const controls = Object.fromEntries(SOURCE_CONTROLS.map((nodeName) => [
    nodeName,
    SOURCE_FRAMES.map((sourceFrame, index) => {
      const weight = OPEN_WEIGHT[index];
      const source = sourceControlState(manifest, nodeName, sourceFrame);
      const centered = CENTERED_CONTROLS.has(nodeName)
        ? blendState(source, sourceControlState(manifest, nodeName, 32), weight)
        : source;
      return controlKey(index + 1, adjustedState(centered, adjustment(nodeName, weight)));
    }),
  ]));

  return generatedRecipe(manifest, {
    id: "open-wide",
    durationFrames: 31,
    controls,
    drawings: {
      Left_Hand: drawingTimeline(manifest, "Left_Hand"),
      Right_Hand: drawingTimeline(manifest, "Right_Hand"),
    },
    learnedFrom: [
      "authored/shrug: complete bilateral native-rig entry, hold, afterbeat, and release",
      "Candidate 04 acceptance silhouette: straight open forearms, outward palms, centered torso",
      "body/face separation: inherit the neutral face so expression and lip-sync remain independent tracks",
    ],
    deformationFrames: SOURCE_FRAMES,
    quality: {
      maximumIdenticalFrames: 3,
      armCompositeMode: "native-rig",
      authoredOpenHandCuffs: ["Left", "Right"],
    },
  });
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: open-wide.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, buildOpenWide(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildOpenWide, OPEN_WIDE_REFERENCE };
