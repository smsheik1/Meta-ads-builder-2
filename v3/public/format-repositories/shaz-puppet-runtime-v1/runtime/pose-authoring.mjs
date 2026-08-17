import fs from "node:fs/promises";
import path from "node:path";

import {
  indexColumns,
  resolveReadDrawing,
  sampleNode,
} from "../../animal-conversations-v1/converter/runtime_channels.mjs";
import { controlStateForNode } from "./pose-recipe.mjs";

function authorableNodes(scene) {
  return new Map(scene.nodes.filter((node) => (
    node.type === "PEG" || node.type === "READ"
  )).map((node) => [node.name, node]));
}

function sourceControlState(manifest, nodeName, sourceFrame) {
  const scene = manifest.scenes[0];
  const node = authorableNodes(scene).get(nodeName);
  if (!node) throw new Error(`unknown authorable node ${nodeName}`);
  return controlStateForNode(sampleNode(node, indexColumns(scene), sourceFrame));
}

function sourceDrawing(manifest, nodeName, sourceFrame) {
  const scene = manifest.scenes[0];
  const node = authorableNodes(scene).get(nodeName);
  if (!node || node.type !== "READ") throw new Error(`unknown drawing node ${nodeName}`);
  return resolveReadDrawing(manifest, scene, node, sourceFrame)?.drawing ?? null;
}

function adjustedState(source, adjustments = {}) {
  const state = structuredClone(source);
  if (adjustments.position) state.position = [...adjustments.position];
  if (adjustments.positionDelta) {
    state.position = state.position.map((value, index) => (
      value + (adjustments.positionDelta[index] ?? 0)
    ));
  }
  if (adjustments.rotation !== undefined) state.rotation = adjustments.rotation;
  if (adjustments.rotationDelta !== undefined) state.rotation += adjustments.rotationDelta;
  if (adjustments.scale) state.scale = [...adjustments.scale];
  if (adjustments.scaleMultiply) {
    state.scale = state.scale.map((value, index) => (
      value * (adjustments.scaleMultiply[index] ?? 1)
    ));
  }
  if (adjustments.skew !== undefined) state.skew = adjustments.skew;
  if (adjustments.opacity !== undefined) state.opacity = adjustments.opacity;
  if (adjustments.flipHorizontal !== undefined) {
    state.flipHorizontal = Boolean(adjustments.flipHorizontal);
  }
  if (adjustments.flipVertical !== undefined) {
    state.flipVertical = Boolean(adjustments.flipVertical);
  }
  return state;
}

function controlKey(frame, state, interpolation) {
  return {
    frame,
    position: state.position,
    rotation: state.rotation,
    scale: state.scale,
    skew: state.skew,
    opacity: state.opacity,
    flipHorizontal: state.flipHorizontal,
    flipVertical: state.flipVertical,
    ...(interpolation ? { interpolation } : {}),
  };
}

function generatedRecipe(manifest, {
  id,
  durationFrames,
  controls,
  drawings = {},
  learnedFrom = [],
}) {
  return {
    schemaVersion: "shaz-pose-recipe-v1",
    id,
    fps: 24,
    durationFrames,
    baseFrame: 1,
    sourceXstageSha256: manifest.source.sha256,
    artistRenderedFramesUsed: false,
    authorship: {
      method: "semantic-rig-control-composition",
      learnedFrom,
      artistRenderedFramesUsed: false,
    },
    controls,
    drawings,
  };
}

async function writePoseRecipe(outputPath, recipe) {
  const output = path.resolve(outputPath);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(recipe, null, 2)}\n`);
  return output;
}

export {
  adjustedState,
  controlKey,
  generatedRecipe,
  sourceControlState,
  sourceDrawing,
  writePoseRecipe,
};
