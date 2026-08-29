#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  adjustedState,
  controlKey,
  sourceControlState,
  sourceDrawing,
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const REFERENCE_SOURCE_SHA256 = "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127";
const REFERENCE_CLIP_SHA256 = "20056ed75665b64ef628bff8522f3fe17d3e1b2d6a4b03fa884881bf4dc6506d";
const SOURCE_FRAME = 95;
const DURATION_FRAMES = 48;
const PHASE_FRAMES = Object.freeze([1, 13, 25, 37, 48]);

const HELD_ROTATION_DELTAS = Object.freeze({
  "Left_Forearm_Pivot-P": 210,
  "Right_Forearm_Pivot-P": -210,
  "Left_Hand-P": -90,
  "Right_Hand-P": 0,
});

const ROOT_POSITION_DELTAS = Object.freeze([
  [0, 0, 0],
  [0.005, 0.008, 0],
  [-0.004, 0.004, 0],
  [0.003, 0.009, 0],
  [0, 0, 0],
]);
const ROOT_ROTATION_DELTAS = Object.freeze([0, 0.22, -0.15, 0.18, 0]);
const HEAD_ROTATION_DELTAS = Object.freeze([0, -0.45, 0.3, -0.25, 0]);

function heldNativeControls(manifest) {
  return Object.fromEntries(Object.entries(HELD_ROTATION_DELTAS).map(([
    nodeName,
    rotationDelta,
  ]) => {
    const source = sourceControlState(manifest, nodeName, SOURCE_FRAME);
    const scaleMultiply = nodeName === "Left_Hand-P" ? [0.72, 0.72] : undefined;
    const state = adjustedState(source, { rotationDelta, scaleMultiply });
    return [nodeName, [
      controlKey(1, state, "hold"),
      controlKey(DURATION_FRAMES, state, "hold"),
    ]];
  }));
}

function breathingControls(manifest) {
  const root = sourceControlState(manifest, "Shaz_Master-P", SOURCE_FRAME);
  const head = sourceControlState(manifest, "Head_Movement-P", SOURCE_FRAME);
  return {
    "Shaz_Master-P": PHASE_FRAMES.map((frame, index) => controlKey(
      frame,
      adjustedState(root, {
        positionDelta: ROOT_POSITION_DELTAS[index],
        rotationDelta: ROOT_ROTATION_DELTAS[index],
      }),
    )),
    "Head_Movement-P": PHASE_FRAMES.map((frame, index) => controlKey(
      frame,
      adjustedState(head, { rotationDelta: HEAD_ROTATION_DELTAS[index] }),
    )),
  };
}

function buildHeartfeltChestClaspHold(manifest) {
  return {
    schemaVersion: "shaz-pose-recipe-v1",
    id: "heartfelt-chest-clasp-hold",
    fps: 24,
    durationFrames: DURATION_FRAMES,
    baseFrame: SOURCE_FRAME,
    sourceXstageSha256: manifest.source.sha256,
    artistRenderedFramesUsed: false,
    authorship: {
      method: "semantic-native-rig-control-composition",
      learnedFrom: [
        `0826 Candidate 08 clip@${REFERENCE_CLIP_SHA256}: bilateral elbow-out chest contact and a warm held beat; artist pixels are comparison-only`,
        `recovered Xstage frame ${SOURCE_FRAME}: native bilateral sleeve, cuff, and open-hand vocabulary`,
        "three bounded native-rig attempts: the final pass keeps the mechanically clean scaled lower hand and removes the diagnostic blink from the body recipe",
        "honest scope is the clasp hold only; the frozen source contains neither an authentic entry from neutral nor a release",
      ],
      artistRenderedFramesUsed: false,
    },
    bodyLanguageIsolation: {
      mouth: "neutral-base-frame",
      eyes: "neutral-base-frame",
      reason: "Dialogue mouth shapes, blinks, camera motion, and background motion remain separate from the body-language recipe",
    },
    controls: {
      ...heldNativeControls(manifest),
      ...breathingControls(manifest),
    },
    drawings: {
      Left_Hand: [{ frame: 1, drawing: "2" }],
      Right_Hand: [{ frame: 1, drawing: "9" }],
      Mouth: [{ frame: 1, drawing: sourceDrawing(manifest, "Mouth", SOURCE_FRAME) }],
    },
    deformationFrames: Array.from({ length: DURATION_FRAMES }, () => SOURCE_FRAME),
    quality: {
      armCompositeMode: "native-rig",
      armPaintOrder: "both-front-left-under-right",
    },
    sourceAction: {
      generatedFrom: "native-rig-controls-and-drawing-exposures",
      sourceFrame: SOURCE_FRAME,
      referenceHoldLocalFrames: [8, 96],
    },
    reference: {
      candidate: 8,
      label: "Heartfelt",
      sourceName: "0826.mov",
      sourceSha256: REFERENCE_SOURCE_SHA256,
      clipName: "08-heartfelt.mp4",
      clipSha256: REFERENCE_CLIP_SHA256,
      startSeconds: 68.2,
      endSeconds: 71.6,
      sourceFps: 30,
      clipFrameCount: 102,
      cameraMotionUsed: false,
      facialMotionUsed: false,
      artistRenderedFramesUsed: false,
      boundary: "Local frames 8-96 provide the two-hand chest-clasp hold; frames 1-7 are inherited lead-in and frames 97-102 are a hard edit, so no authentic entry or release is claimed.",
    },
  };
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: heartfelt-chest-clasp-hold.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(
    outputPath,
    buildHeartfeltChestClaspHold(manifest),
  )}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildHeartfeltChestClaspHold };
