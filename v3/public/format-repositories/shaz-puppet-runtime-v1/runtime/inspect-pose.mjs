#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  createPoseRuntime,
  loadPoseRecipe,
} from "./pose-recipe.mjs";
import {
  loadManifest,
  READ_PAINT_PLAN,
  renderRigFrame,
} from "./rig-v2-renderer.mjs";

const ALPHA_THRESHOLD = 24;
const MIN_COMPONENT_PIXELS = 12;

function parseArgs(values) {
  const args = {
    manifest: null,
    assets: null,
    propAssets: null,
    recipe: null,
    output: null,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = values[++index];
    else if (value === "--assets") args.assets = values[++index];
    else if (value === "--prop-assets") args.propAssets = values[++index];
    else if (value === "--recipe") args.recipe = values[++index];
    else if (value === "--output") args.output = values[++index];
    else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.assets || !args.recipe || !args.output) {
    throw new Error("usage: inspect-pose.mjs --manifest runtime.json --assets assets [--prop-assets props] --recipe pose.json --output inspection.json");
  }
  return args;
}

async function alphaStats(buffer, analysisWidth = 640) {
  const { data, info } = await sharp(buffer)
    .resize({ width: analysisWidth })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let weightedX = 0;
  let weightedY = 0;
  let alphaSum = 0;
  let opaquePixels = 0;
  const mask = new Uint8Array(info.width * info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixel = y * info.width + x;
      const alpha = data[pixel * info.channels + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      mask[pixel] = 1;
      opaquePixels += 1;
      alphaSum += alpha;
      weightedX += x * alpha;
      weightedY += y * alpha;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (opaquePixels === 0) return { empty: true, width: info.width, height: info.height };

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  const components = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let size = 0;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const pixel = queue[head++];
      size += 1;
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextX >= info.width || nextY < 0 || nextY >= info.height) continue;
          const next = nextY * info.width + nextX;
          if (!mask[next] || visited[next]) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    if (size >= MIN_COMPONENT_PIXELS) components.push(size);
  }
  components.sort((left, right) => right - left);
  return {
    empty: false,
    width: info.width,
    height: info.height,
    bbox: { minX, minY, maxX, maxY },
    centroid: { x: weightedX / alphaSum, y: weightedY / alphaSum },
    opaquePixels,
    componentPixels: components,
  };
}

function paintPlanKey(entry) {
  return `${entry.nodePath}:${entry.variant}`;
}

function paintOrderValid(layers) {
  const indexes = new Map(READ_PAINT_PLAN.map((entry, index) => [paintPlanKey(entry), index]));
  let previous = -1;
  for (const layer of layers) {
    const index = indexes.get(paintPlanKey(layer));
    if (index === undefined || index <= previous) return false;
    previous = index;
  }
  return true;
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function expectedEdgesForFrame(recipe, frame) {
  const policies = recipe.quality?.sourceApprovedEdgeContacts ?? [];
  if (policies.length > 0
    && recipe.sourceAction?.generatedFrom !== "xstage-control-channels-and-drawing-exposures") {
    throw new Error("edge-contact exceptions are allowed only for Xstage calibration recipes");
  }
  return new Set(policies.filter((policy) => (
    Array.isArray(policy.frames)
    && policy.frames.length === 2
    && frame >= policy.frames[0]
    && frame <= policy.frames[1]
  )).map((policy) => policy.edge));
}

async function inspectPose({ manifest, assetRoot, propRoot = null, recipe }) {
  const poseRuntime = createPoseRuntime(manifest, recipe);
  const failures = [];
  const approvedEdgeContacts = [];
  const frameReports = [];
  const previousFace = new Map();
  const assetCache = new Map();
  const propCache = new Map();

  for (let frame = 1; frame <= recipe.durationFrames; frame += 1) {
    const rendered = await renderRigFrame({
      manifest,
      frame,
      assetRoot,
      propRoot,
      poseRuntime,
      assetCache,
      propCache,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      includeLayerBuffers: true,
    });
    if (rendered.receipt.artistRenderedFramesUsed !== false
      || rendered.receipt.poseRecipeSha256 !== poseRuntime.recipeSha256) {
      failures.push({ frame, gate: "provenance", detail: "frame receipt lost recipe provenance" });
    }
    if (!paintOrderValid(rendered.receipt.layers)) {
      failures.push({ frame, gate: "layer-order", detail: "frame layers do not follow READ_PAINT_PLAN" });
    }

    const characterBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(rendered.analysisLayers.map(({ input }) => ({ input }))).png().toBuffer();
    const character = await alphaStats(characterBuffer);
    const sceneStats = await alphaStats(rendered.buffer);
    if (character.empty) {
      failures.push({ frame, gate: "visible-character", detail: "frame is empty" });
    } else {
      const edgeMargins = {
        left: sceneStats.bbox.minX,
        top: sceneStats.bbox.minY,
        right: sceneStats.width - 1 - sceneStats.bbox.maxX,
        bottom: sceneStats.height - 1 - sceneStats.bbox.maxY,
      };
      const expectedEdges = expectedEdgesForFrame(recipe, frame);
      for (const [edge, margin] of Object.entries(edgeMargins)) {
        if (margin >= 2) continue;
        if (expectedEdges.has(edge)) {
          approvedEdgeContacts.push({ frame, edge, margin });
        } else {
          failures.push({ frame, gate: "clipping", detail: `${edge} alpha margin is ${margin}px` });
        }
      }
      if (character.componentPixels.length !== 1) {
        failures.push({
          frame,
          gate: "joint-continuity",
          detail: `${character.componentPixels.length} significant alpha components`,
        });
      }
    }

    const expectedPropIds = poseRuntime.propsAtFrame(frame)
      .filter(({ opacity }) => opacity > 0)
      .map(({ id }) => id)
      .sort();
    const renderedPropIds = rendered.receipt.props.map(({ id }) => id).sort();
    if (JSON.stringify(expectedPropIds) !== JSON.stringify(renderedPropIds)) {
      failures.push({ frame, gate: "prop-presence", detail: "visible recipe props were not rendered exactly once" });
    }

    const faceLayers = rendered.analysisLayers.filter((layer) => (
      layer.nodePath.includes("/Head_Group/")
      && !layer.nodePath.endsWith("/OL_Hand")
      && layer.variant === "main"
    ));
    const faceStats = await Promise.all(faceLayers.map(async (layer) => ({
      key: `${layer.nodePath}:${layer.variant}`,
      drawing: String(layer.drawing.drawing),
      stats: await alphaStats(layer.input),
    })));
    const headBase = faceStats.find(({ key }) => key.includes("/Head_Base:"));
    if (!headBase || headBase.stats.empty) {
      failures.push({ frame, gate: "facial-pop", detail: "head base disappeared" });
    } else {
      for (const layer of faceStats.filter(({ stats }) => !stats.empty)) {
        const relative = {
          x: layer.stats.centroid.x - headBase.stats.centroid.x,
          y: layer.stats.centroid.y - headBase.stats.centroid.y,
        };
        const previous = previousFace.get(layer.key);
        if (previous && distance(relative, previous.relative) > 48) {
          failures.push({
            frame,
            gate: "facial-pop",
            detail: `${layer.key} jumped ${distance(relative, previous.relative).toFixed(1)}px relative to the head`,
          });
        }
        if (previous && previous.drawing === layer.drawing) {
          const ratio = layer.stats.opaquePixels / previous.opaquePixels;
          if (ratio > 4 || ratio < 0.25) {
            failures.push({
              frame,
              gate: "facial-pop",
              detail: `${layer.key} area changed by ${ratio.toFixed(2)}x without a drawing substitution`,
            });
          }
        }
        previousFace.set(layer.key, {
          drawing: layer.drawing,
          opaquePixels: layer.stats.opaquePixels,
          relative,
        });
      }
    }

    frameReports.push({
      frame,
      alphaBounds: character.empty ? null : character.bbox,
      significantComponents: character.componentPixels?.length ?? 0,
      layerCount: rendered.receipt.layers.length,
      propCount: rendered.receipt.props.length,
    });
  }

  return {
    schemaVersion: "shaz-pose-inspection-v1",
    status: failures.length === 0 ? "pass" : "fail",
    sourceXstageSha256: manifest.source.sha256,
    poseRecipeId: recipe.id,
    poseRecipeSha256: poseRuntime.recipeSha256,
    artistRenderedFramesUsed: false,
    gates: [
      "provenance",
      "layer-order",
      "clipping",
      "joint-continuity",
      "facial-pop",
      "prop-presence",
    ],
    failures,
    approvedEdgeContacts,
    frames: frameReports,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(path.resolve(args.manifest));
  const recipe = await loadPoseRecipe(path.resolve(args.recipe));
  const report = await inspectPose({
    manifest,
    assetRoot: path.resolve(args.assets),
    propRoot: args.propAssets ? path.resolve(args.propAssets) : null,
    recipe,
  });
  const output = path.resolve(args.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${report.status.toUpperCase()} ${recipe.id}: ${report.failures.length} failure(s)\n${output}\n`);
  if (report.status !== "pass") process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  alphaStats,
  expectedEdgesForFrame,
  inspectPose,
  paintOrderValid,
};
