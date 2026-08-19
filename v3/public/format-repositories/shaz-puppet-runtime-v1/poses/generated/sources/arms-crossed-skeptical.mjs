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
  sourceControlState,
  sourceDrawing,
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const CONFIDENT_RECIPE_PATH = fileURLToPath(new URL("../../authored/confident.json", import.meta.url));
const CONFIDENT_RECIPE_SHA256 = "53496ec22e505fa44673260935ccaa4edc9ea87796b99a1c79031b825c804c1c";
const OFFSET = 6;
const CROSS_ARM_ASSETS = Object.freeze({
  leftSleeve: ["crossed-left-sleeve.png", "66d4c48a8656d36fa99ac68cd59272f25f249d170d9c8ef2f6f8279ffa38ddef"],
  rightSleeve: ["crossed-right-sleeve.png", "6825bd9502845dfee7f44700488d25469fd15a3fddafc8aa5c007ae8ef3d29ba"],
  leftHand: ["crossed-left-hand.png", "e393634f96b9d607f96af9ce01c288d5e3bf8a43ca3cd05e5d67cebe89cab5c2"],
  rightHand: ["crossed-right-hand.png", "1ca56cff2c194949889c10e6b5f1d07e9d64ca4837a76db086966f79baaa429d"],
});
const FACE_DRAWINGS = new Set([
  "Eyebrows",
  "Left_Eye",
  "Right_Eye",
  "Left_Pupil",
  "Right_Pupil",
  "Mouth",
]);

function isRigArmNode(nodeName) {
  return nodeName === "Arms_Master-P" || /^(Left|Right)_(Arm|Forearm|Hand)/.test(nodeName);
}

function adjustedKey(nodeName, key) {
  const progress = Math.max(0, Math.min(1, (key.frame - 1) / 12));
  if (nodeName === "Shaz_Master-P") {
    return adjustedState(key, {
      positionDelta: [0, 0.1, 0],
      rotationDelta: progress * 2,
      scaleMultiply: [0.86, 0.86],
    });
  }
  if (nodeName === "Head_Movement-P") {
    return adjustedState(key, { rotationDelta: progress * 6 });
  }
  return key;
}

async function loadLockedConfident() {
  const bytes = await fs.readFile(CONFIDENT_RECIPE_PATH);
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== CONFIDENT_RECIPE_SHA256) {
    throw new Error(`locked source recipe changed: confident.json ${actual}`);
  }
  return JSON.parse(bytes.toString("utf8"));
}

function substitutionProp(id, [asset, sha256], keys) {
  return { id, asset, sha256, layer: "front", keys };
}

const hiddenKey = (frame, position, width, scale = [1, 1]) => ({
  frame,
  position,
  width,
  scale,
  rotation: 0,
  opacity: 0,
  interpolation: "hold",
});

async function buildArmsCrossedSkeptical(manifest) {
  const confident = await loadLockedConfident();
  const controls = {};
  for (const [nodeName, keys] of Object.entries(confident.controls)) {
    if (isRigArmNode(nodeName)) continue;
    const initial = sourceControlState(manifest, nodeName, 1);
    controls[nodeName] = [
      controlKey(1, adjustedState(initial, nodeName === "Shaz_Master-P"
        ? { positionDelta: [0, 0.1, 0], scaleMultiply: [0.86, 0.86] }
        : {})),
      ...keys.map((key) => controlKey(
        key.frame + OFFSET,
        adjustedKey(nodeName, key),
        key.interpolation,
      )),
    ];
  }

  for (const nodeName of ["Left_Pupil", "Right_Pupil"]) {
    const neutral = sourceControlState(manifest, nodeName, 1);
    const sideEye = adjustedState(neutral, { positionDelta: [0.025, 0, 0] });
    controls[nodeName] = [
      controlKey(1, neutral),
      controlKey(11, sideEye),
      controlKey(confident.durationFrames + OFFSET, sideEye),
    ];
  }
  // Keep the real rig arms visible through the anticipation. Swap to the
  // minimal crossed-arm substitutions only at contact; animating those redraws
  // independently from frame one made them read as random detached objects.
  for (const nodeName of ["Left_Forearm", "Left_Hand", "Right_Forearm", "Right_Hand"]) {
    const visible = sourceControlState(manifest, nodeName, 1);
    const hidden = adjustedState(visible, { opacity: 0 });
    controls[nodeName] = [
      controlKey(1, visible),
      controlKey(8, visible, "hold"),
      controlKey(9, hidden, "hold"),
      controlKey(confident.durationFrames + OFFSET, hidden),
    ];
  }

  const drawings = Object.fromEntries(Object.entries(confident.drawings)
    .filter(([nodeName]) => !FACE_DRAWINGS.has(nodeName) && !isRigArmNode(nodeName))
    .map(([nodeName, keys]) => [nodeName, [
      { frame: 1, drawing: sourceDrawing(manifest, nodeName, 1) },
      ...keys.map((key) => ({ ...key, frame: key.frame + OFFSET })),
    ]]));
  drawings.Eyebrows = [
    { frame: 1, drawing: sourceDrawing(manifest, "Eyebrows", 1) },
    { frame: 11, drawing: sourceDrawing(manifest, "Eyebrows", 123) },
  ];
  for (const nodeName of ["Left_Eye", "Right_Eye", "Left_Pupil", "Right_Pupil"]) {
    drawings[nodeName] = [
      { frame: 1, drawing: sourceDrawing(manifest, nodeName, 1) },
      { frame: 11, drawing: nodeName.endsWith("Eye") ? "2" : "1" },
    ];
  }
  drawings.Mouth = [
    { frame: 1, drawing: sourceDrawing(manifest, "Mouth", 1) },
    { frame: 11, drawing: sourceDrawing(manifest, "Mouth", 121) },
  ];

  return {
    ...generatedRecipe(manifest, {
      id: "arms-crossed-skeptical",
      durationFrames: confident.durationFrames + OFFSET,
      learnedFrom: [
        "authored/confident@53496ec2: bilateral elbow bend, planted stance, anticipation, and overshoot mechanics",
        "authored/think: skeptical brow, mouth, eye-direction, and head-drag vocabulary",
        "registered rig forearm and hand drawings promoted as contact-only front substitutions for the fixed crossover depth topology",
      ],
      controls,
      drawings,
      quality: {
        maximumIdenticalFrames: 2,
        armCompositeMode: "registered-crossed-rig-substitution",
      },
    }),
    props: [
      substitutionProp("crossed-right-sleeve", CROSS_ARM_ASSETS.rightSleeve, [
        hiddenKey(1, [0.52, 0.63], 0.1, [0.68, 1.25]),
        hiddenKey(8, [0.52, 0.63], 0.1, [0.68, 1.25]),
        { frame: 9, position: [0.52, 0.63], width: 0.1, scale: [0.68, 1.25], rotation: 0, opacity: 100 },
        { frame: 12, position: [0.49, 0.63], width: 0.098, scale: [0.68, 1.25], rotation: 46, opacity: 100 },
        { frame: 16, position: [0.465, 0.635], width: 0.096, scale: [0.66, 1.28], rotation: 82, opacity: 100 },
        { frame: confident.durationFrames + OFFSET, position: [0.46, 0.64], width: 0.094, scale: [0.64, 1.26], rotation: 86, opacity: 100 },
      ]),
      substitutionProp("crossed-right-hand", CROSS_ARM_ASSETS.rightHand, [
        hiddenKey(1, [0.53, 0.68], 0.05),
        hiddenKey(8, [0.53, 0.68], 0.05),
        { frame: 9, position: [0.53, 0.68], width: 0.05, rotation: 0, opacity: 100 },
        { frame: 12, position: [0.49, 0.62], width: 0.052, rotation: 0, opacity: 100 },
        { frame: 16, position: [0.42, 0.585], width: 0.052, rotation: 0, opacity: 100 },
        { frame: confident.durationFrames + OFFSET, position: [0.405, 0.59], width: 0.05, rotation: 0, opacity: 100 },
      ]),
      substitutionProp("crossed-left-sleeve", CROSS_ARM_ASSETS.leftSleeve, [
        hiddenKey(1, [0.48, 0.655], 0.1, [0.68, 1.48]),
        hiddenKey(8, [0.48, 0.655], 0.1, [0.68, 1.48]),
        { frame: 9, position: [0.48, 0.655], width: 0.1, scale: [0.68, 1.48], rotation: 0, opacity: 100 },
        { frame: 12, position: [0.475, 0.655], width: 0.098, scale: [0.68, 1.28], rotation: -50, opacity: 100 },
        { frame: 16, position: [0.46, 0.65], width: 0.096, scale: [0.66, 1.3], rotation: -88, opacity: 100 },
        { frame: confident.durationFrames + OFFSET, position: [0.46, 0.65], width: 0.094, scale: [0.64, 1.28], rotation: -94, opacity: 100 },
      ]),
      substitutionProp("crossed-left-hand", CROSS_ARM_ASSETS.leftHand, [
        hiddenKey(1, [0.47, 0.69], 0.05),
        hiddenKey(8, [0.47, 0.69], 0.05),
        { frame: 9, position: [0.47, 0.69], width: 0.05, rotation: 0, opacity: 100 },
        { frame: 12, position: [0.47, 0.62], width: 0.052, rotation: 0, opacity: 100 },
        { frame: 16, position: [0.51, 0.585], width: 0.052, rotation: 0, opacity: 100 },
        { frame: confident.durationFrames + OFFSET, position: [0.525, 0.59], width: 0.05, rotation: 0, opacity: 100 },
      ]),
    ],
  };
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: arms-crossed-skeptical.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, await buildArmsCrossedSkeptical(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildArmsCrossedSkeptical };
