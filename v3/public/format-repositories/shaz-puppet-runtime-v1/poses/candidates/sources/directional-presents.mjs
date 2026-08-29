#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  controlKey,
  generatedRecipe,
  sourceControlState,
  sourceDrawing,
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const SOURCE_SHA256 = "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127";
const DIRECTIONAL_PRESENT_REFERENCES = Object.freeze({
  left: Object.freeze({
    candidateNumber: "06",
    sourceName: "0826.mov",
    sourceSha256: SOURCE_SHA256,
    sourceStartSeconds: 47.25,
    sourceEndSeconds: 50.75,
    clipSha256: "f48bb751f215006cfcde078efd5a179715a849bca5d8145eb157ee3d30ff60a9",
  }),
  right: Object.freeze({
    candidateNumber: "11",
    sourceName: "0826.mov",
    sourceSha256: SOURCE_SHA256,
    sourceStartSeconds: 118.35,
    sourceEndSeconds: 121.85,
    clipSha256: "dc531adc7c95039cf21339427d3b6b1a42109555cac6bb51b65e5a19ae4bf3e1",
  }),
});

function drawingTimeline(manifest, nodeName, sourceFrames) {
  const keys = [];
  let previous = Symbol("unset");
  sourceFrames.forEach((sourceFrame, index) => {
    const drawing = sourceDrawing(manifest, nodeName, sourceFrame);
    if (drawing !== previous) {
      keys.push({ frame: index + 1, drawing });
      previous = drawing;
    }
  });
  return keys;
}

function controlTimeline(manifest, nodeName, sourceFrames) {
  return sourceFrames.map((sourceFrame, index) => (
    controlKey(index + 1, sourceControlState(manifest, nodeName, sourceFrame))
  ));
}

function neutralFaceDrawings(manifest) {
  return Object.fromEntries([
    "Left_Eye",
    "Right_Eye",
    "Left_Pupil",
    "Right_Pupil",
    "Mouth",
  ].map((nodeName) => [
    nodeName,
    [{ frame: 1, drawing: sourceDrawing(manifest, nodeName, 32) }],
  ]));
}

function buildDirectionalPresent(manifest, {
  id,
  sourceFrames,
  controlNames,
  drawingNames,
  learnedFrom,
  authoredOpenHandCuffs,
  extraControls = {},
  maximumIdenticalFrames = 3,
  sourceAction = null,
  sourceApprovedEdgeContacts = null,
}) {
  const recipe = generatedRecipe(manifest, {
    id,
    durationFrames: sourceFrames.length,
    controls: {
      ...Object.fromEntries(controlNames.map((nodeName) => [
        nodeName,
        controlTimeline(manifest, nodeName, sourceFrames),
      ])),
      ...extraControls,
    },
    drawings: {
      ...Object.fromEntries(drawingNames.map((nodeName) => [
        nodeName,
        drawingTimeline(manifest, nodeName, sourceFrames),
      ])),
      ...neutralFaceDrawings(manifest),
    },
    learnedFrom,
    deformationFrames: sourceFrames,
    quality: {
      maximumIdenticalFrames,
      armCompositeMode: "native-rig",
      authoredOpenHandCuffs,
      ...(sourceApprovedEdgeContacts ? { sourceApprovedEdgeContacts } : {}),
    },
  });
  recipe.baseFrame = 32;
  if (sourceAction) recipe.sourceAction = sourceAction;
  return recipe;
}

function buildPresentScreenLeft(manifest) {
  return buildDirectionalPresent(manifest, {
    id: "present-screen-left",
    sourceFrames: Array.from({ length: 19 }, (_, index) => 37 + index),
    controlNames: [
      "Left_Arm-P",
      "Left_Arm_MOVE-P",
      "Left_Arm_Pivot-P",
      "Left_Forearm-P",
      "Left_Forearm_Pivot-P",
      "Left_Hand-P",
      "OL_Hand-P",
    ],
    drawingNames: ["Left_Hand"],
    learnedFrom: [
      "authored/present source frames 37-55: complete left open-palm entry and settle",
      "Candidate 06 acceptance silhouette: leftward offer with the opposite arm relaxed",
    ],
    authoredOpenHandCuffs: ["Left"],
    sourceAction: {
      startFrame: 37,
      endFrame: 55,
      generatedFrom: "xstage-control-channels-and-drawing-exposures",
    },
    sourceApprovedEdgeContacts: [{
      edge: "bottom",
      frames: [1, 19],
      reason: "The untouched opposite-side neutral hand from source frame 32 continues beyond the calibration canvas; the fixed performance stage view restores the full fingertips",
    }],
  });
}

function buildPresentScreenRight(manifest) {
  return buildDirectionalPresent(manifest, {
    id: "present-screen-right",
    sourceFrames: Array.from({ length: 31 }, (_, index) => 67 + index),
    controlNames: [
      "Right_Arm-P",
      "Right_Arm_MOVE-P",
      "Right_Arm_Pivot-P",
      "Right_Forearm-P",
      "Right_Forearm_Pivot-P",
      "Right_Hand-P",
    ],
    drawingNames: ["Right_Forearm", "Right_Hand"],
    learnedFrom: [
      "authored/shrug source frames 67-97: complete right open-palm entry, hold, and release",
      "Candidate 11 acceptance silhouette: rightward offer with the opposite arm relaxed",
    ],
    authoredOpenHandCuffs: ["Right"],
    maximumIdenticalFrames: 10,
  });
}

async function main() {
  const [manifestPath, leftOutputPath, rightOutputPath] = process.argv.slice(2);
  if (!manifestPath || !leftOutputPath || !rightOutputPath) {
    throw new Error("usage: directional-presents.mjs runtime.json left.json right.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  await writePoseRecipe(leftOutputPath, buildPresentScreenLeft(manifest));
  await writePoseRecipe(rightOutputPath, buildPresentScreenRight(manifest));
  process.stdout.write(`${path.resolve(leftOutputPath)}\n${path.resolve(rightOutputPath)}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildPresentScreenLeft,
  buildPresentScreenRight,
  DIRECTIONAL_PRESENT_REFERENCES,
};
