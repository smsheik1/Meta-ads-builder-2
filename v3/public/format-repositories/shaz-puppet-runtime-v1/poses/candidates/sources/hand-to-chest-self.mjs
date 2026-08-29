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

const THINK_RECIPE_PATH = fileURLToPath(new URL("../../authored/think.json", import.meta.url));
const THINK_RECIPE_SHA256 = "6fc21c25dd49a6bf18eae49886c6ebb95a41367461a792655d450377ddb16d12";
const CONFIDENT_RECIPE_PATH = fileURLToPath(new URL("../../authored/confident.json", import.meta.url));
const CONFIDENT_RECIPE_SHA256 = "53496ec22e505fa44673260935ccaa4edc9ea87796b99a1c79031b825c804c1c";
const REFERENCE_SOURCE_SHA256 = "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127";
const REFERENCE_CLIP_SHA256 = "b1ba1e99f92915cf7f75b34c3a8288b5a15387e249212b3abfde0df3634aacfc";
const SOURCE_PHASE_FRAMES = Object.freeze([3, 4, 5]);
const DURATION_FRAMES = 27;

const FACE_CONTROLS = new Set(["Eyebrows", "Left_Pupil", "Right_Pupil"]);
const ARM_CONTROL_SUFFIXES = Object.freeze([
  "Arm-P",
  "Arm_MOVE-P",
  "Arm_Pivot-P",
  "Forearm-P",
  "Forearm_Pivot-P",
  "Hand-P",
]);

async function loadLockedThink() {
  const bytes = await fs.readFile(THINK_RECIPE_PATH);
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== THINK_RECIPE_SHA256) {
    throw new Error(`locked source recipe changed: think.json ${actual}`);
  }
  return JSON.parse(bytes.toString("utf8"));
}

async function loadLockedConfident() {
  const bytes = await fs.readFile(CONFIDENT_RECIPE_PATH);
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== CONFIDENT_RECIPE_SHA256) {
    throw new Error(`locked source recipe changed: confident.json ${actual}`);
  }
  return JSON.parse(bytes.toString("utf8"));
}

function drawingAt(keys, sourceFrame) {
  return keys.reduce((drawing, key) => (
    key.frame <= sourceFrame ? key.drawing : drawing
  ), null);
}

function remapDrawings(keys) {
  const remapped = SOURCE_PHASE_FRAMES.map((sourceFrame, index) => ({
    frame: index + 1,
    drawing: drawingAt(keys, sourceFrame),
  }));
  return remapped.filter((key, index) => (
    index === 0 || key.drawing !== remapped[index - 1].drawing
  ));
}

function sampledControlState(runtime, node, frame) {
  return controlStateForNode(runtime.sampleNodeAtFrame(node, null, frame));
}

function mirroredControlState(sourceBase, source, targetBase) {
  const sourceScaleRatio = source.scale.map((value, index) => (
    value / sourceBase.scale[index]
  ));
  return {
    position: [
      targetBase.position[0] - (source.position[0] - sourceBase.position[0]),
      targetBase.position[1] + (source.position[1] - sourceBase.position[1]),
      targetBase.position[2] + (source.position[2] - sourceBase.position[2]),
    ],
    rotation: targetBase.rotation - (source.rotation - sourceBase.rotation),
    scale: targetBase.scale.map((value, index) => value * sourceScaleRatio[index]),
    skew: targetBase.skew - (source.skew - sourceBase.skew),
    opacity: source.opacity,
    flipHorizontal: targetBase.flipHorizontal,
    flipVertical: targetBase.flipVertical,
  };
}

function chestAdjustedState(suffix, state) {
  if (suffix !== "Arm_MOVE-P") return state;
  return {
    ...state,
    position: [state.position[0], state.position[1] + 0.7, state.position[2]],
  };
}

function mirroredArmControls(thinkRuntime, nodesByName, sourceSide, targetSide) {
  return Object.fromEntries(ARM_CONTROL_SUFFIXES.map((suffix) => {
    const sourceNode = nodesByName.get(`${sourceSide}_${suffix}`);
    const targetNode = nodesByName.get(`${targetSide}_${suffix}`);
    if (!sourceNode || !targetNode) {
      throw new Error(`paired rig control is missing for ${sourceSide}/${targetSide} ${suffix}`);
    }
    const sourceBase = sampledControlState(thinkRuntime, sourceNode, 1);
    const targetBase = sampledControlState(thinkRuntime, targetNode, 1);
    return [
      targetNode.name,
      SOURCE_PHASE_FRAMES.map((sourceFrame, index) => controlKey(
        index + 1,
        chestAdjustedState(
          suffix,
          suffix === "Hand-P"
            ? targetBase
            : mirroredControlState(
              sourceBase,
              sampledControlState(thinkRuntime, sourceNode, sourceFrame),
              targetBase,
            ),
        ),
      )),
    ];
  }));
}

function exactArmControls(runtime, nodesByName, side) {
  return Object.fromEntries(ARM_CONTROL_SUFFIXES.map((suffix) => {
    const node = nodesByName.get(`${side}_${suffix}`);
    if (!node) throw new Error(`rig control is missing for ${side} ${suffix}`);
    return [
      node.name,
      SOURCE_PHASE_FRAMES.map((sourceFrame, index) => controlKey(
        index + 1,
        sampledControlState(runtime, node, sourceFrame),
      )),
    ];
  }));
}

async function buildHandToChestSelf(manifest) {
  const [think, confident] = await Promise.all([
    loadLockedThink(),
    loadLockedConfident(),
  ]);
  const thinkRuntime = createPoseRuntime(manifest, think);
  const confidentRuntime = createPoseRuntime(manifest, confident);
  const nodesByName = new Map(manifest.scenes[0].nodes.map((node) => [node.name, node]));
  const bodyControls = Object.fromEntries(Object.entries(think.controls)
    .filter(([nodeName]) => (
      !FACE_CONTROLS.has(nodeName)
      && !nodeName.startsWith("Left_")
      && !nodeName.startsWith("Right_")
      && nodeName !== "OL_Hand-P"
    ))
    .map(([nodeName]) => [
      nodeName,
      SOURCE_PHASE_FRAMES.map((sourceFrame, index) => (
        controlKey(
          index + 1,
          controlStateForNode(thinkRuntime.sampleNodeAtFrame(
            nodesByName.get(nodeName),
            null,
            sourceFrame,
          )),
        )
      )),
    ]));
  const controls = {
    ...bodyControls,
    ...mirroredArmControls(thinkRuntime, nodesByName, "Left", "Right"),
    ...exactArmControls(confidentRuntime, nodesByName, "Left"),
  };
  const drawings = {
    Shaz_Model8: remapDrawings(think.drawings.Shaz_Model8),
    Right_Forearm: remapDrawings(think.drawings.Left_Forearm),
    Right_Hand: [
      ...remapDrawings(think.drawings.Left_Hand),
      { frame: 3, drawing: "2" },
    ],
    Left_Forearm: [{ frame: 1, drawing: "1" }],
    Left_Hand: remapDrawings(confident.drawings.Left_Hand),
    OL_Hand: [{ frame: 1, drawing: null }],
  };

  return {
    ...generatedRecipe(manifest, {
      id: "hand-to-chest-self",
      durationFrames: DURATION_FRAMES,
      learnedFrom: [
        `authored/think@${THINK_RECIPE_SHA256.slice(0, 8)}: checksum-locked chest-entry grammar from local frames ${SOURCE_PHASE_FRAMES.join(", ")}, reflected only across paired right-arm controls and native counterpart drawings`,
        `authored/confident@${CONFIDENT_RECIPE_SHA256.slice(0, 8)}: checksum-locked native left-hand-on-hip brace from local frames ${SOURCE_PHASE_FRAMES.join(", ")}`,
        `0826.mov@${REFERENCE_SOURCE_SHA256.slice(0, 8)} 00:11.967-00:13.067: semantic direction, three-frame entry, and source-held destination; reference pixels are comparison-only`,
      ],
      controls,
      drawings,
      quality: {
        armCompositeMode: "native-rig",
        maximumIdenticalFrames: 25,
      },
    }),
    sourceAction: {
      startFrame: 117,
      endFrame: 121,
      selectedLocalFrames: SOURCE_PHASE_FRAMES,
      generatedFrom: "checksum-locked-native-counterpart-composition",
    },
    reference: {
      candidate: 2,
      sourceSha256: REFERENCE_SOURCE_SHA256,
      clipSha256: REFERENCE_CLIP_SHA256,
      startSeconds: 11.967,
      endSeconds: 13.067,
      sourceFps: 30,
      cameraMotionUsed: false,
      facialMotionUsed: false,
      artistRenderedFramesUsed: false,
      boundary: "hands-on-hips setup to held chest contact; no authored release in the selected clip",
    },
    promotion: {
      status: "blocked",
      blockedAt: "mechanical-inspection",
      attemptLimitReached: 3,
      blocker: "The held native right-hand drawing measures a 0.594 hand-to-sleeve alpha-area ratio, above the fixed 0.56 on-model limit, on frames 3-27.",
      resumeCondition: "Authorize a new bounded candidate that reduces both right-wrist scale axes by exactly 3% (multiply Candidate 3 values by 0.97), then rerun complete 27-frame inspection and normal-speed review without changing the proportion gate.",
    },
  };
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: hand-to-chest-self.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, await buildHandToChestSelf(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildHandToChestSelf };
