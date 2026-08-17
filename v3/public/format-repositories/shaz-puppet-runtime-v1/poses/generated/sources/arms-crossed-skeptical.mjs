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

const CONFIDENT_RECIPE_PATH = fileURLToPath(new URL("../../authored/confident.json", import.meta.url));
const OFFSET = 6;
const SUBSTITUTION_ARM_SHA256 = "c23081378f579d84b9a686729a3a657de8052e46f7d7e94cebaf5c8f8a75271f";
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

async function buildArmsCrossedSkeptical(manifest) {
  const confident = JSON.parse(await fs.readFile(CONFIDENT_RECIPE_PATH, "utf8"));
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
  for (const nodeName of [
    "Left_Arm",
    "Left_Forearm",
    "Left_Hand",
    "Right_Arm",
    "Right_Forearm",
    "Right_Hand",
  ]) {
    const hidden = adjustedState(sourceControlState(manifest, nodeName, 1), { opacity: 0 });
    controls[nodeName] = [
      controlKey(1, hidden),
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
    drawings[nodeName] = [{ frame: 1, drawing: sourceDrawing(manifest, nodeName, 1) }];
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
        "authored/confident: bilateral elbow bend, planted stance, anticipation, and overshoot mechanics",
        "authored/think: skeptical brow, mouth, eye-direction, and head-drag vocabulary",
        "minimal substitution redraw: crossed forearms required by the source rig's fixed paint topology",
      ],
      controls,
      drawings,
    }),
    props: [
      {
        id: "left-arm-substitution",
        asset: "substitution-arm.svg",
        sha256: SUBSTITUTION_ARM_SHA256,
        layer: "front",
        keys: [
          { frame: 1, position: [0.418, 0.638], width: 0.056, rotation: 0, opacity: 100 },
          { frame: 4, position: [0.363, 0.636], width: 0.056, rotation: 5, opacity: 100 },
          { frame: 7, position: [0.376, 0.656], width: 0.056, rotation: -20, opacity: 100 },
          { frame: 11, position: [0.458, 0.526], width: 0.056, rotation: -76, opacity: 100 },
          { frame: 14, position: [0.461, 0.548], width: 0.056, rotation: -68, opacity: 100 },
          { frame: confident.durationFrames + OFFSET, position: [0.461, 0.548], width: 0.056, rotation: -68, opacity: 100 },
        ],
      },
      {
        id: "right-arm-substitution",
        asset: "substitution-arm.svg",
        sha256: SUBSTITUTION_ARM_SHA256,
        layer: "front",
        keys: [
          { frame: 1, position: [0.543, 0.638], width: 0.056, rotation: 0, opacity: 100 },
          { frame: 4, position: [0.516, 0.636], width: 0.056, rotation: -5, opacity: 100 },
          { frame: 7, position: [0.46, 0.656], width: 0.056, rotation: 20, opacity: 100 },
          { frame: 11, position: [0.456, 0.526], width: 0.056, rotation: 76, opacity: 100 },
          { frame: 14, position: [0.445, 0.548], width: 0.056, rotation: 68, opacity: 100 },
          { frame: confident.durationFrames + OFFSET, position: [0.445, 0.548], width: 0.056, rotation: 68, opacity: 100 },
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
