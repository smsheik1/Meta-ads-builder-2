#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  controlKey,
  generatedRecipe,
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import {
  controlStateForNode,
  createPoseRuntime,
} from "../../../runtime/pose-recipe.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const PHONE_PATH = fileURLToPath(new URL("../look-at-phone.json", import.meta.url));
const PHONE_SHA256 = "5610a09d190d234e5b6d5f1bccf17e491088608eda0d1d9cdb4864808190cd08";
const BRIDGE_END = 25;
const PHONE_OFFSET = BRIDGE_END;
const DURATION_FRAMES = BRIDGE_END + 55;
const SUBSTITUTED_ARM_NODES = Object.freeze([
  "Left_Arm",
  "Left_Forearm",
  "Left_Hand",
  "Right_Arm",
  "Right_Forearm",
  "Right_Hand",
]);

const ASSETS = Object.freeze({
  leftSleeve: ["crossed-left-sleeve.png", "66d4c48a8656d36fa99ac68cd59272f25f249d170d9c8ef2f6f8279ffa38ddef"],
  rightSleeve: ["crossed-right-sleeve.png", "6825bd9502845dfee7f44700488d25469fd15a3fddafc8aa5c007ae8ef3d29ba"],
  leftHand: ["crossed-left-hand.png", "e393634f96b9d607f96af9ce01c288d5e3bf8a43ca3cd05e5d67cebe89cab5c2"],
  rightHand: ["crossed-right-hand.png", "1ca56cff2c194949889c10e6b5f1d07e9d64ca4837a76db086966f79baaa429d"],
  phone: ["phone.svg", "aadcadb428f4f63ad54ed9575e5120a8519a3520af3b2460714a337a1fd21975"],
  tapHand: ["phone-tap-hand.png", "907148751d2ab6f23f9ce4707185cd5eb1059d306243200840dca24c8d184ddb"],
});

async function loadLocked(file, expected) {
  const bytes = await fs.readFile(file);
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`locked recipe changed: ${path.basename(file)} ${actual}`);
  return JSON.parse(bytes.toString("utf8"));
}

function mixState(from, to, weight) {
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

function smoothstep(value) {
  return value * value * (3 - (2 * value));
}

function prop(id, [asset, sha256], keys) {
  return { id, asset, sha256, layer: "front", keys };
}

function hidden(frame, position, width, scale = [1, 1]) {
  return { frame, position, width, scale, rotation: 0, opacity: 0, interpolation: "hold" };
}

function drawingChanges(values) {
  const changes = [];
  for (let index = 0; index < values.length; index += 1) {
    if (index === 0 || values[index] !== values[index - 1]) {
      changes.push({ frame: index + 1, drawing: values[index] });
    }
  }
  return changes;
}

async function buildPhoneUseSequence(manifest) {
  const phone = await loadLocked(PHONE_PATH, PHONE_SHA256);
  const phoneRuntime = createPoseRuntime(manifest, phone);
  const scene = manifest.scenes[0];
  const nodes = new Map(scene.nodes.map((node) => [node.name, node]));
  const controlNames = [...new Set([
    ...Object.keys(phone.controls),
    ...SUBSTITUTED_ARM_NODES,
  ])].sort();

  const controls = Object.fromEntries(controlNames.map((nodeName) => {
    const node = nodes.get(nodeName);
    const isSubstitutedArm = SUBSTITUTED_ARM_NODES.includes(nodeName);
    const withSubstitutionVisibility = (state, frame) => {
      if (!isSubstitutedArm) return state;
      if (frame >= 9 && frame <= 23) return { ...state, opacity: 0 };
      return state;
    };
    const pickupEnd = controlStateForNode(phoneRuntime.sampleNodeAtFrame(node, null, 19));
    const phoneStart = controlStateForNode(phoneRuntime.sampleNodeAtFrame(node, null, 1));
    const keys = [];
    for (let frame = 1; frame <= 19; frame += 1) {
      keys.push(controlKey(frame, withSubstitutionVisibility(controlStateForNode(
        phoneRuntime.sampleNodeAtFrame(node, null, frame),
      ), frame)));
    }
    for (let frame = 20; frame <= BRIDGE_END; frame += 1) {
      const weight = smoothstep((frame - 19) / (BRIDGE_END - 19));
      keys.push(controlKey(frame, withSubstitutionVisibility(
        mixState(pickupEnd, phoneStart, weight),
        frame,
      )));
    }
    for (let localFrame = 1; localFrame <= phone.durationFrames; localFrame += 1) {
      keys.push(controlKey(localFrame + PHONE_OFFSET, controlStateForNode(
        phoneRuntime.sampleNodeAtFrame(node, null, localFrame),
      )));
    }
    return [nodeName, keys];
  }));

  const drawingNames = [...new Set([
    ...Object.keys(phone.drawings),
  ])].sort();
  const drawings = Object.fromEntries(drawingNames.map((nodeName) => {
    const node = nodes.get(nodeName);
    const pickupEnd = phoneRuntime.resolveDrawing(node, 19)?.drawing ?? null;
    const phoneStart = phoneRuntime.resolveDrawing(node, 1)?.drawing ?? null;
    const values = [];
    for (let frame = 1; frame <= 19; frame += 1) {
      values.push(phoneRuntime.resolveDrawing(node, frame)?.drawing ?? null);
    }
    for (let frame = 20; frame <= BRIDGE_END; frame += 1) {
      values.push(frame <= 22 ? pickupEnd : phoneStart);
    }
    for (let localFrame = 1; localFrame <= phone.durationFrames; localFrame += 1) {
      values.push(phoneRuntime.resolveDrawing(node, localFrame)?.drawing ?? null);
    }
    return [nodeName, drawingChanges(values)];
  }));

  return {
    ...generatedRecipe(manifest, {
      id: "phone-use-sequence",
      durationFrames: DURATION_FRAMES,
      learnedFrom: [
        "registered crossed-arm sleeve and hand drawings: two-sided phone contact without inventing new character artwork",
        "generated/look-at-phone@5610a09d: focused phone lift, registered tap contact, and complete head/hair settle",
        "storyboard 386f0081: two-handed hold, one-handed raise, and screen-tapping phase order",
      ],
      controls,
      drawings,
      quality: {
        maximumIdenticalFrames: 3,
        armCompositeMode: "registered-phone-sequence",
      },
    }),
    props: [
      prop("phone-sequence-right-sleeve", ASSETS.rightSleeve, [
        hidden(1, [0.52, 0.67], 0.095, [0.64, 1.15]),
        hidden(8, [0.52, 0.67], 0.095, [0.64, 1.15]),
        { frame: 9, position: [0.52, 0.67], width: 0.095, scale: [0.64, 1.15], rotation: 0, opacity: 100 },
        { frame: 12, position: [0.49, 0.655], width: 0.092, scale: [0.64, 1.12], rotation: -20, opacity: 100 },
        { frame: 16, position: [0.46, 0.645], width: 0.09, scale: [0.63, 1.08], rotation: -32, opacity: 100 },
        { frame: 19, position: [0.45, 0.64], width: 0.09, scale: [0.62, 1.06], rotation: -35, opacity: 100 },
        { frame: 23, position: [0.42, 0.69], width: 0.075, scale: [0.62, 1.06], rotation: -18, opacity: 100 },
        hidden(24, [0.405, 0.72], 0.072, [0.62, 1.06]),
        hidden(BRIDGE_END, [0.39, 0.75], 0.07, [0.62, 1.06]),
        hidden(DURATION_FRAMES, [0.39, 0.75], 0.07, [0.62, 1.06]),
      ]),
      prop("phone-sequence-right-hand", ASSETS.rightHand, [
        hidden(1, [0.39, 0.73], 0.05),
        hidden(8, [0.39, 0.73], 0.05),
        { frame: 9, position: [0.39, 0.73], width: 0.05, rotation: 0, opacity: 100 },
        { frame: 12, position: [0.47, 0.64], width: 0.051, rotation: 0, opacity: 100 },
        { frame: 16, position: [0.445, 0.6], width: 0.051, rotation: 0, opacity: 100 },
        { frame: 19, position: [0.44, 0.595], width: 0.05, rotation: 0, opacity: 100 },
        { frame: 23, position: [0.405, 0.67], width: 0.045, rotation: 0, opacity: 100 },
        hidden(24, [0.397, 0.71], 0.042),
        hidden(BRIDGE_END, [0.39, 0.75], 0.04),
        hidden(DURATION_FRAMES, [0.39, 0.75], 0.04),
      ]),
      prop("phone-sequence-left-sleeve", ASSETS.leftSleeve, [
        hidden(1, [0.48, 0.67], 0.095, [0.64, 1.15]),
        hidden(8, [0.48, 0.67], 0.095, [0.64, 1.15]),
        { frame: 9, position: [0.48, 0.67], width: 0.095, scale: [0.64, 1.15], rotation: 0, opacity: 100 },
        { frame: 12, position: [0.475, 0.655], width: 0.092, scale: [0.64, 1.12], rotation: 20, opacity: 100 },
        { frame: 16, position: [0.475, 0.645], width: 0.09, scale: [0.63, 1.08], rotation: 32, opacity: 100 },
        { frame: 19, position: [0.48, 0.64], width: 0.09, scale: [0.62, 1.06], rotation: 35, opacity: 100 },
        { frame: 23, position: [0.47, 0.69], width: 0.075, scale: [0.62, 1.06], rotation: 18, opacity: 100 },
        hidden(24, [0.465, 0.72], 0.072, [0.62, 1.06]),
        hidden(BRIDGE_END, [0.46, 0.75], 0.07, [0.62, 1.06]),
        hidden(DURATION_FRAMES, [0.46, 0.75], 0.07, [0.62, 1.06]),
      ]),
      prop("phone-sequence-left-hand", ASSETS.leftHand, [
        hidden(1, [0.54, 0.73], 0.05),
        hidden(8, [0.54, 0.73], 0.05),
        { frame: 9, position: [0.54, 0.73], width: 0.05, rotation: 0, opacity: 100 },
        { frame: 12, position: [0.46, 0.64], width: 0.051, rotation: 0, opacity: 100 },
        { frame: 16, position: [0.485, 0.6], width: 0.051, rotation: 0, opacity: 100 },
        { frame: 19, position: [0.49, 0.595], width: 0.05, rotation: 0, opacity: 100 },
        { frame: 23, position: [0.47, 0.67], width: 0.045, rotation: 0, opacity: 100 },
        hidden(24, [0.46, 0.71], 0.042),
        hidden(BRIDGE_END, [0.45, 0.75], 0.04),
        hidden(DURATION_FRAMES, [0.45, 0.75], 0.04),
      ]),
      prop("phone", ASSETS.phone, [
        { frame: 1, position: [0.465, 0.78], width: 0.052, rotation: 0, opacity: 100, interpolation: "hold" },
        { frame: 8, position: [0.465, 0.78], width: 0.052, rotation: 0, opacity: 100, interpolation: "hold" },
        { frame: 9, position: [0.465, 0.72], width: 0.052, rotation: 0, opacity: 100 },
        { frame: 12, position: [0.465, 0.62], width: 0.052, rotation: 0, opacity: 100 },
        { frame: 16, position: [0.465, 0.585], width: 0.052, rotation: 0, opacity: 100 },
        { frame: 19, position: [0.465, 0.56], width: 0.052, rotation: 0, opacity: 100 },
        { frame: BRIDGE_END, position: [0.355, 0.8], width: 0.055, rotation: 8, opacity: 100 },
        { frame: PHONE_OFFSET + 1, position: [0.355, 0.8], width: 0.055, rotation: 8, opacity: 100, interpolation: "hold" },
        { frame: PHONE_OFFSET + 7, position: [0.355, 0.535], width: 0.048, rotation: -2, opacity: 100 },
        { frame: PHONE_OFFSET + 13, position: [0.35, 0.525], width: 0.048, rotation: 1, opacity: 100 },
        { frame: DURATION_FRAMES, position: [0.35, 0.525], width: 0.048, rotation: 1, opacity: 100 },
      ]),
      prop("phone-tap-hand", ASSETS.tapHand, [
        hidden(1, [0.37, 0.415], 0.052),
        hidden(PHONE_OFFSET + 6, [0.37, 0.415], 0.052),
        { frame: PHONE_OFFSET + 7, position: [0.37, 0.405], width: 0.052, rotation: 0, opacity: 100 },
        { frame: PHONE_OFFSET + 13, position: [0.365, 0.4], width: 0.052, rotation: 2, opacity: 100 },
        { frame: DURATION_FRAMES, position: [0.365, 0.4], width: 0.052, rotation: 2, opacity: 100 },
      ]),
    ],
  };
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: phone-use-sequence.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, await buildPhoneUseSequence(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildPhoneUseSequence };
