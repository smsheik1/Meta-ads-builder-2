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
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import {
  controlStateForNode,
  createPoseRuntime,
} from "../../../runtime/pose-recipe.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const PRESENT_RECIPE_PATH = fileURLToPath(new URL("../../authored/present.json", import.meta.url));
const POINT_RECIPE_PATH = fileURLToPath(new URL("../../authored/point.json", import.meta.url));
const PRESENT_RECIPE_SHA256 = "b2f8e2066d30b7aadac1c11f1149940ac438ee08835e88caea4a380c5af81d2f";
const POINT_RECIPE_SHA256 = "fcc7f489498683514104d7612dc4fbf5be22243b1f867b6190db74c8e9225a39";
const PRESENT_END = 19;
const POINT_TARGET_FRAME = 40;
const DURATION_FRAMES = 36;

const ARM_CONTROLS = new Set([
  "Arms_Master-P",
  "Left_Arm-P",
  "Left_Arm_MOVE-P",
  "Left_Arm_Pivot-P",
  "Left_Forearm-P",
  "Left_Forearm_Pivot-P",
  "Left_Hand-P",
]);
const HEAD_CONTROLS = new Set([
  "Back_Hair-P",
  "Eyebrows",
  "Head_Movement-P",
]);

async function loadExactRecipe(recipePath, expectedSha256) {
  const bytes = await fs.readFile(recipePath);
  const actualSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== expectedSha256) {
    throw new Error(`locked source recipe changed: ${path.basename(recipePath)} ${actualSha256}`);
  }
  return JSON.parse(bytes.toString("utf8"));
}

function mixedState(from, to, weight) {
  const mix = (a, b) => a + ((b - a) * weight);
  return {
    position: from.position.map((value, index) => mix(value, to.position[index])),
    rotation: mix(from.rotation, to.rotation),
    scale: from.scale.map((value, index) => mix(value, to.scale[index])),
    skew: mix(from.skew, to.skew),
    opacity: mix(from.opacity, to.opacity),
    flipHorizontal: weight >= 0.5 ? to.flipHorizontal : from.flipHorizontal,
    flipVertical: weight >= 0.5 ? to.flipVertical : from.flipVertical,
  };
}

function targetAdjustment(nodeName, state) {
  if (nodeName === "Left_Arm_MOVE-P") return adjustedState(state, { rotationDelta: -55 });
  if (nodeName === "Head_Movement-P") return adjustedState(state, { rotationDelta: -2 });
  return state;
}

function mirroredMasterState(state) {
  return adjustedState(state, {
    position: [-state.position[0], state.position[1], state.position[2]],
    rotation: -state.rotation,
    skew: -state.skew,
    flipHorizontal: true,
  });
}

function phaseKeys(nodeName, from, target) {
  if (ARM_CONTROLS.has(nodeName)) {
    return [
      controlKey(20, from),
      controlKey(23, mixedState(from, target, 0.18)),
      controlKey(28, mixedState(from, target, 1.08)),
      controlKey(32, target),
      controlKey(35, adjustedState(target, nodeName === "Left_Arm_MOVE-P"
        ? { rotationDelta: 1.4 }
        : {})),
      controlKey(36, target),
    ];
  }
  if (HEAD_CONTROLS.has(nodeName)) {
    return [
      controlKey(21, from),
      controlKey(25, mixedState(from, target, 0.16)),
      controlKey(29, mixedState(from, target, 1.06)),
      controlKey(33, target),
      controlKey(36, adjustedState(target, nodeName === "Head_Movement-P"
        ? { rotationDelta: 0.8 }
        : {})),
    ];
  }
  return [
    controlKey(22, from),
    controlKey(26, mixedState(from, target, 0.12)),
    controlKey(30, mixedState(from, target, 1.04)),
    controlKey(34, target),
    controlKey(36, nodeName === "Shaz_Master-P"
      ? adjustedState(target, { positionDelta: [0, 0.02, 0] })
      : target),
  ];
}

async function buildPointAtScreen(manifest) {
  const [present, point] = await Promise.all([
    loadExactRecipe(PRESENT_RECIPE_PATH, PRESENT_RECIPE_SHA256),
    loadExactRecipe(POINT_RECIPE_PATH, POINT_RECIPE_SHA256),
  ]);
  const scene = manifest.scenes[0];
  const nodes = new Map(scene.nodes.map((node) => [node.name, node]));
  const presentRuntime = createPoseRuntime(manifest, present);
  const pointRuntime = createPoseRuntime(manifest, point);

  const controls = {};
  for (const nodeName of Object.keys(present.controls)) {
    const node = nodes.get(nodeName);
    const presentEnd = controlStateForNode(presentRuntime.sampleNodeAtFrame(node, null, PRESENT_END));
    const pointTarget = targetAdjustment(
      nodeName,
      controlStateForNode(pointRuntime.sampleNodeAtFrame(node, null, POINT_TARGET_FRAME)),
    );
    controls[nodeName] = [
      ...present.controls[nodeName].map((key) => controlKey(
        key.frame,
        nodeName === "Shaz_Master-P"
          ? mirroredMasterState(key)
          : key,
        key.interpolation,
      )),
      ...phaseKeys(
        nodeName,
        nodeName === "Shaz_Master-P"
          ? mirroredMasterState(presentEnd)
          : presentEnd,
        nodeName === "Shaz_Master-P"
          ? mirroredMasterState(pointTarget)
          : pointTarget,
      ),
    ];
  }

  for (const nodeName of ["Left_Pupil", "Right_Pupil"]) {
    const node = nodes.get(nodeName);
    const presentEnd = controlStateForNode(presentRuntime.sampleNodeAtFrame(node, null, PRESENT_END));
    controls[nodeName] = [
      controlKey(1, presentEnd),
      controlKey(22, presentEnd),
      controlKey(27, adjustedState(presentEnd, { positionDelta: [-0.025, 0.018, 0] })),
      controlKey(31, adjustedState(presentEnd, { positionDelta: [-0.045, 0.03, 0] })),
      controlKey(35, adjustedState(presentEnd, { positionDelta: [-0.04, 0.027, 0] })),
      controlKey(36, adjustedState(presentEnd, { positionDelta: [-0.043, 0.029, 0] })),
    ];
  }

  const drawings = structuredClone(present.drawings);
  const pointDrawing = (nodeName) => (
    pointRuntime.resolveDrawing(nodes.get(nodeName), POINT_TARGET_FRAME)?.drawing ?? null
  );
  drawings.Left_Hand.push({ frame: 24, drawing: pointDrawing("Left_Hand") });
  drawings.Right_Hand.push({ frame: 25, drawing: pointDrawing("Right_Hand") });
  drawings.Mouth.push({ frame: 27, drawing: pointDrawing("Mouth") });
  drawings.Left_Eye.push({ frame: 23, drawing: "1" });
  drawings.Right_Eye.push({ frame: 23, drawing: "1" });
  drawings.Left_Pupil.push({ frame: 23, drawing: "1" });
  drawings.Right_Pupil.push({ frame: 23, drawing: "1" });

  return generatedRecipe(manifest, {
    id: "point-at-screen",
    durationFrames: DURATION_FRAMES,
    learnedFrom: [
      "authored/present@b2f8e206: open-palm setup and full secondary choreography",
      "authored/point@fcc7f489: pointing hand, shoulder-to-wrist mechanics, grin, and hip-hand settle",
      "storyboard ebbf669f: off-canvas upper-right point without a literal screen prop",
    ],
    controls,
    drawings,
    quality: {
      maximumIdenticalFrames: 2,
    },
  });
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
