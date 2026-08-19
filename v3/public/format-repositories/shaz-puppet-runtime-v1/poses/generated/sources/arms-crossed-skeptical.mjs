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
const CROSS_ASSEMBLY_SHA256 = "ccee1620caa3c42ab5028913665e6be9f61001236df10b0ae9eb9044aa95947c";
const CROSS_CONTACT_FRAME = 14;
const FACE_DRAWINGS = new Set([
  "Eyebrows",
  "Left_Eye",
  "Right_Eye",
  "Left_Pupil",
  "Right_Pupil",
  "Mouth",
]);

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
  if (nodeName === "Left_Forearm_Pivot-P") {
    return adjustedState(key, { rotationDelta: progress * 74 });
  }
  if (nodeName === "Right_Forearm_Pivot-P") {
    return adjustedState(key, { rotationDelta: progress * -74 });
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

async function buildArmsCrossedSkeptical(manifest) {
  const confident = await loadLockedConfident();
  const controls = {};
  for (const [nodeName, keys] of Object.entries(confident.controls)) {
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
  for (const nodeName of [
    "Arms_Master-P",
    "Left_Arm_MOVE-P",
    "Left_Arm_Pivot-P",
    "Left_Forearm-P",
    "Left_Forearm_Pivot-P",
    "Left_Hand-P",
    "Right_Arm_MOVE-P",
    "Right_Arm_Pivot-P",
    "Right_Forearm_Pivot-P",
    "Right_Hand-P",
  ]) {
    const neutral = sourceControlState(manifest, nodeName, 1);
    controls[nodeName] = [
      ...controls[nodeName].filter((key) => key.frame < CROSS_CONTACT_FRAME),
      controlKey(CROSS_CONTACT_FRAME, neutral, "hold"),
      controlKey(confident.durationFrames + OFFSET, neutral),
    ];
  }
  for (const nodeName of [
    "Left_Forearm",
    "Left_Hand",
    "Right_Forearm",
    "Right_Hand",
  ]) {
    const visible = sourceControlState(manifest, nodeName, 1);
    const hidden = adjustedState(visible, { opacity: 0 });
    controls[nodeName] = [
      controlKey(1, visible),
      controlKey(CROSS_CONTACT_FRAME - 1, visible, "hold"),
      controlKey(CROSS_CONTACT_FRAME, hidden, "hold"),
      controlKey(confident.durationFrames + OFFSET, hidden),
    ];
  }
  const drawings = Object.fromEntries(Object.entries(confident.drawings)
    .filter(([nodeName]) => !FACE_DRAWINGS.has(nodeName))
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
        "native rig arm chains carry the anticipation; one checksum-locked torso-local crossover assembly resolves the contact depth without independently floating limb pieces",
      ],
      controls,
      drawings,
      quality: {
        maximumIdenticalFrames: 2,
        armCompositeMode: "registered-crossed-rig-assembly",
      },
    }),
    props: [
      {
        id: "crossed-arms-assembly",
        asset: "crossed-arms-assembly.png",
        sha256: CROSS_ASSEMBLY_SHA256,
        layer: "front",
        keys: [
          {
            frame: 1,
            position: [0.5, 0.5],
            width: 1,
            rotation: 0,
            opacity: 0,
            interpolation: "hold",
          },
          {
            frame: CROSS_CONTACT_FRAME - 1,
            position: [0.5, 0.5],
            width: 1,
            rotation: 0,
            opacity: 0,
            interpolation: "hold",
          },
          {
            frame: CROSS_CONTACT_FRAME,
            position: [0.5, 0.5],
            width: 1,
            rotation: 0,
            opacity: 100,
            interpolation: "hold",
          },
          {
            frame: confident.durationFrames + OFFSET,
            position: [0.5, 0.5],
            width: 1,
            rotation: 0,
            opacity: 100,
          },
        ],
      },
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
