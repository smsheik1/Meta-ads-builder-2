#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  attributeAtPath,
  resolveReadDrawing,
} from "./vendor/runtime_channels.mjs";
import {
  ELEMENT_ASSET_IDS,
  READ_PAINT_ORDER,
} from "./rig-v2-renderer.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const runtimeRoot = path.dirname(scriptPath);
const converterRoot = path.resolve(runtimeRoot, "../../animal-conversations-v1/converter");
const exporter = path.join(converterRoot, "source/target/debug/examples/export_spec");
const tvgRenderer = path.join(converterRoot, "render_tvg.cjs");
const moduleRoot = path.resolve(converterRoot, "..");
const RASTER_MARGIN = 50;

export function parseCompileArgs(values) {
  const args = {
    manifest: null,
    rig: null,
    output: null,
    frames: null,
    drawings: null,
    outlineSourceColor: null,
    outlineColor: null,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = values[++index];
    else if (value === "--rig") args.rig = values[++index];
    else if (value === "--output") args.output = values[++index];
    else if (value === "--frames") {
      args.frames = values[++index].split(",").map(Number);
      if (args.frames.some((frame) => !Number.isInteger(frame) || frame < 1)) {
        throw new Error("--frames must be a comma-separated list of positive integers");
      }
    } else if (value === "--drawings") {
      args.drawings = values[++index].split(",").map((entry) => {
        const [element, drawing, extra] = entry.split(":");
        if (!element || !drawing || extra !== undefined) {
          throw new Error("--drawings must be comma-separated Element:Drawing selectors");
        }
        return { element, drawing };
      });
    } else if (value === "--outline-source-color") {
      args.outlineSourceColor = parseColor(values[++index], "--outline-source-color");
    } else if (value === "--outline-color") {
      args.outlineColor = parseColor(values[++index], "--outline-color");
    } else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.rig || !args.output) {
    throw new Error("usage: compile-tvg-assets.mjs --manifest runtime.json --rig scene-root --output assets [--frames 1,39 | --drawings Left_Hand:14] [--outline-source-color 77,17,3,255 --outline-color 0,0,0,255]");
  }
  if (args.frames && args.drawings) throw new Error("--frames and --drawings are mutually exclusive");
  if (Boolean(args.outlineSourceColor) !== Boolean(args.outlineColor)) {
    throw new Error("outline palette normalization requires both source and destination colors");
  }
  return args;
}

export function parseColor(value, context) {
  const color = String(value).split(",").map(Number);
  if (color.length !== 4 || color.some((entry) => !Number.isInteger(entry) || entry < 0 || entry > 255)) {
    throw new Error(`${context} must be four comma-separated bytes`);
  }
  return color;
}

function run(program, args) {
  const result = spawnSync(program, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${program} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function drawingBounds(spec) {
  const paths = [
    ...spec.boundaries,
    ...spec.fills.map((item) => item.d),
    ...spec.strokes.map((item) => item.d),
  ];
  const values = paths.flatMap((drawingPath) => (
    drawingPath.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []
  ).map(Number));
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let index = 0; index + 1 < values.length; index += 2) {
    const x = values[index];
    const y = values[index + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  }
  if (!Object.values(bounds).every(Number.isFinite)) throw new Error("drawing has no finite bounds");
  return bounds;
}

function hasDrawingData(spec) {
  return spec && [spec.boundaries, spec.fills, spec.strokes]
    .some((records) => Array.isArray(records) && records.length > 0);
}

export function requestedDrawings(manifest, frames, drawingSelectors) {
  const scene = manifest.scenes[0];
  if (!scene) throw new Error("manifest contains no scene");
  const nodes = new Map(scene.nodes.map((node) => [node.path, node]));
  const requests = new Map();

  if (drawingSelectors) {
    for (const selector of drawingSelectors) {
      const element = manifest.elements.find(({ name }) => name === selector.element);
      if (!element || !element.drawings.map(String).includes(String(selector.drawing))) {
        throw new Error(`unknown drawing selector ${selector.element}:${selector.drawing}`);
      }
      requests.set(`${element.id}:${selector.drawing}`, {
        elementId: element.id,
        element: element.name,
        drawing: String(selector.drawing),
        file: `${element.rootFolder}/${element.folder}/${element.folder}-${selector.drawing}.tvg`,
      });
    }
    return [...requests.values()];
  }

  if (frames) {
    for (const frame of frames) {
      for (const nodePath of READ_PAINT_ORDER) {
        const drawing = resolveReadDrawing(manifest, scene, nodes.get(nodePath), frame);
        if (drawing) requests.set(`${drawing.elementId}:${drawing.drawing}`, drawing);
      }
    }
    return [...requests.values()];
  }

  for (const nodePath of READ_PAINT_ORDER) {
    const node = nodes.get(nodePath);
    const columnName = attributeAtPath(node, "drawing.element")?.attributes?.col;
    const column = scene.columns.find((candidate) => candidate.name === columnName);
    const element = manifest.elements.find((candidate) => candidate.id === column?.elementId);
    if (!element || !ELEMENT_ASSET_IDS[element.name]) continue;
    for (const drawing of element.drawings) {
      requests.set(`${element.id}:${drawing}`, {
        elementId: element.id,
        element: element.name,
        drawing,
        file: `${element.rootFolder}/${element.folder}/${element.folder}-${drawing}.tvg`,
      });
    }
  }
  return [...requests.values()];
}

export function normalizeOutlinePalette(spec, sourceColor, destinationColor) {
  if (!sourceColor || !destinationColor || !spec) return 0;
  let replacements = 0;
  for (const stroke of spec.strokes ?? []) {
    if (JSON.stringify(stroke.color) !== JSON.stringify(sourceColor)) continue;
    stroke.color = [...destinationColor];
    replacements += 1;
  }
  return replacements;
}

export function normalizeRequestedOutlinePalette({
  spec,
  sourceColor,
  destinationColor,
  variant,
  element,
  drawing,
}) {
  const replacementCount = normalizeOutlinePalette(spec, sourceColor, destinationColor);
  if (sourceColor && destinationColor && variant === "main" && replacementCount === 0) {
    throw new Error(`outline source color was not found in ${element}:${drawing} main artwork`);
  }
  return replacementCount;
}

async function main() {
  const args = parseCompileArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest);
  const rigRoot = path.resolve(args.rig);
  const outputRoot = path.resolve(args.output);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-tvg-assets-v2-"));
  const receiptAssets = [];

  await fs.mkdir(outputRoot, { recursive: true });
  try {
    for (const drawing of requestedDrawings(manifest, args.frames, args.drawings)) {
      const assetId = ELEMENT_ASSET_IDS[drawing.element];
      if (!assetId) throw new Error(`no asset id for ${drawing.element}`);
      const source = path.join(rigRoot, drawing.file);
      const sourceBytes = await fs.readFile(source);
      const spec = JSON.parse(run(exporter, [source]));
      const variants = [
        ["main", spec],
        ["color", spec.art_layers?.color],
        ["overlay", spec.art_layers?.overlay],
      ];
      for (const [variant, variantSpec] of variants) {
        if (!hasDrawingData(variantSpec)) continue;
        const outlineColorReplacementCount = normalizeRequestedOutlinePalette({
          spec: variantSpec,
          sourceColor: args.outlineSourceColor,
          destinationColor: args.outlineColor,
          variant,
          element: drawing.element,
          drawing: drawing.drawing,
        });
        const bounds = drawingBounds(variantSpec);
        const specPath = path.join(
          scratch,
          `${drawing.elementId}-${drawing.drawing}-${variant}.json`,
        );
        const suffix = variant === "main" ? "" : `--${variant}`;
        const filename = `${assetId}-${String(drawing.drawing).padStart(2, "0")}${suffix}.png`;
        const output = path.join(outputRoot, filename);
        await fs.writeFile(specPath, `${JSON.stringify(variantSpec)}\n`);
        const rendered = JSON.parse(run(process.execPath, [
          tvgRenderer,
          specPath,
          output,
          moduleRoot,
        ]));
        const outputBytes = await fs.readFile(output);
        receiptAssets.push({
          filename,
          variant,
          elementId: drawing.elementId,
          element: drawing.element,
          drawing: drawing.drawing,
          source: drawing.file,
          sourceSha256: sha256(sourceBytes),
          outputSha256: sha256(outputBytes),
          canvas: { width: rendered.width, height: rendered.height },
          modelOrigin: {
            x: bounds.minX - RASTER_MARGIN,
            y: bounds.minY - RASTER_MARGIN,
          },
          drawingBounds: bounds,
          ...(outlineColorReplacementCount > 0 ? {
            paletteNormalization: {
              schemaVersion: "shaz-outline-palette-normalization-v1",
              sourceColor: args.outlineSourceColor,
              destinationColor: args.outlineColor,
              replacementCount: outlineColorReplacementCount,
            },
          } : {}),
        });
      }
    }

    const receipt = {
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: manifest.source.sha256,
      sourceArchiveBundled: false,
      artistRenderedFramesUsed: false,
      rasterMarginModelUnits: RASTER_MARGIN,
      assets: receiptAssets.sort((left, right) => left.filename.localeCompare(right.filename)),
    };
    await fs.writeFile(path.join(outputRoot, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
    process.stdout.write(`${path.join(outputRoot, "receipt.json")}\n`);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
