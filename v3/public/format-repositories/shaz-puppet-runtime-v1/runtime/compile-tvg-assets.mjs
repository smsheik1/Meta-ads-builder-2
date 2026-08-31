#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
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
const SHA256 = /^[a-f0-9]{64}$/;
const DRAWING_ID = /^(?:0|[1-9]\d*)$/;
const FLAT_ASSET_FILENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z]+)?\.png$/;
const CANONICAL_CHARACTER_PREFIX = "Top/Shaz_Rig/";
const MAX_REQUESTED_FRAMES = 10_000;

function requiredValue(values, index, flag) {
  const value = values[index + 1];
  if (typeof value !== "string" || value === "" || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseNodePrefix(value) {
  if (typeof value !== "string" || !value.endsWith("/") || value.startsWith("/")
    || value.includes("\\")) {
    throw new Error("--node-prefix must be a safe Harmony node-path prefix ending in /");
  }
  const segments = value.slice(0, -1).split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("--node-prefix must be a safe Harmony node-path prefix ending in /");
  }
  return value;
}

export function parseCompileArgs(values) {
  const args = {
    manifest: null,
    rig: null,
    output: null,
    frames: null,
    range: null,
    drawings: null,
    nodePrefix: null,
    outlineSourceColor: null,
    outlineColor: null,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = requiredValue(values, index++, value);
    else if (value === "--rig") args.rig = requiredValue(values, index++, value);
    else if (value === "--output") args.output = requiredValue(values, index++, value);
    else if (value === "--frames") {
      args.frames = requiredValue(values, index++, value).split(",").map(Number);
      if (args.frames.some((frame) => !Number.isInteger(frame) || frame < 1)) {
        throw new Error("--frames must be a comma-separated list of positive integers");
      }
    } else if (value === "--range") {
      args.range = parseFrameRange(requiredValue(values, index++, value));
    } else if (value === "--drawings") {
      args.drawings = requiredValue(values, index++, value).split(",").map((entry) => {
        const [element, drawing, extra] = entry.split(":");
        if (!element || !drawing || extra !== undefined) {
          throw new Error("--drawings must be comma-separated Element:Drawing selectors");
        }
        return { element, drawing };
      });
    } else if (value === "--node-prefix") {
      args.nodePrefix = parseNodePrefix(requiredValue(values, index++, value));
    } else if (value === "--outline-source-color") {
      args.outlineSourceColor = parseColor(
        requiredValue(values, index++, value),
        "--outline-source-color",
      );
    } else if (value === "--outline-color") {
      args.outlineColor = parseColor(requiredValue(values, index++, value), "--outline-color");
    } else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.rig || !args.output) {
    throw new Error("usage: compile-tvg-assets.mjs --manifest runtime.json --rig scene-root --output assets [--frames 1,39 | --range 1-39 | --drawings Left_Hand:14] [--node-prefix Top/Puppet_Group/] [--outline-source-color 77,17,3,255 --outline-color 0,0,0,255]");
  }
  if ([args.frames, args.range, args.drawings].filter(Boolean).length > 1) {
    throw new Error("--frames, --range, and --drawings are mutually exclusive");
  }
  if (args.nodePrefix && !args.frames && !args.range) {
    throw new Error("--node-prefix requires --frames or --range");
  }
  if (Boolean(args.outlineSourceColor) !== Boolean(args.outlineColor)) {
    throw new Error("outline palette normalization requires both source and destination colors");
  }
  return args;
}

export function parseFrameRange(value) {
  const match = /^(\d+)-(\d+)$/.exec(String(value ?? ""));
  if (!match) throw new Error("--range must be START-END using positive integers");
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)
    || start < 1 || end < start) {
    throw new Error("--range must use positive integers with START less than or equal to END");
  }
  return { start, end };
}

export function validateFrameRange(range, scene) {
  if (!range) return;
  if (!Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end)
    || range.start < 1 || range.end < range.start) {
    throw new Error("requested range has invalid frame bounds");
  }
  const startFrame = scene?.startFrame;
  const stopFrame = scene?.stopFrame;
  if (!Number.isSafeInteger(startFrame) || !Number.isSafeInteger(stopFrame)
    || startFrame < 1 || stopFrame < startFrame) {
    throw new Error("manifest scene has invalid frame bounds");
  }
  if (range.start < startFrame || range.end > stopFrame) {
    throw new Error(`requested range is outside ${startFrame}-${stopFrame}`);
  }
  if (range.end - range.start + 1 > MAX_REQUESTED_FRAMES) {
    throw new Error(`requested range may contain at most ${MAX_REQUESTED_FRAMES} frames`);
  }
}

export function validateRequestedFrames(frames, scene) {
  if (!frames) return;
  if (frames.length > MAX_REQUESTED_FRAMES) {
    throw new Error(`--frames may contain at most ${MAX_REQUESTED_FRAMES} frames`);
  }
  const startFrame = scene?.startFrame;
  const stopFrame = scene?.stopFrame;
  if (!Number.isSafeInteger(startFrame) || !Number.isSafeInteger(stopFrame)
    || startFrame < 1 || stopFrame < startFrame) {
    throw new Error("manifest scene has invalid frame bounds");
  }
  if (frames.some((frame) => (
    !Number.isSafeInteger(frame) || frame < startFrame || frame > stopFrame
  ))) {
    throw new Error(`requested frame is outside ${startFrame}-${stopFrame}`);
  }
}

export function* enumerateFrameRange(range) {
  if (!range) return;
  for (let frame = range.start; frame <= range.end; frame += 1) yield frame;
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
  if (result.error) throw result.error;
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

function safeRelativeDirectory(value) {
  if (typeof value !== "string" || value.startsWith("/") || value.includes("\\")) return false;
  const segments = value.split("/");
  return segments.length > 0
    && segments.every((segment) => segment && segment !== "." && segment !== "..");
}

function safePathSegment(value) {
  return typeof value === "string"
    && value !== ""
    && value !== "."
    && value !== ".."
    && !/[\\/]/.test(value);
}

function normalizedDrawingId(value, context) {
  const drawing = String(value ?? "");
  const numeric = Number(drawing);
  if (!DRAWING_ID.test(drawing) || !Number.isSafeInteger(numeric)) {
    throw new Error(`${context} must use a canonical non-negative integer drawing id`);
  }
  return drawing;
}

function validatedDrawingRequest(element, drawingValue, context) {
  if (!element || !Number.isSafeInteger(element.id) || element.id < 1) {
    throw new Error(`${context} has an unsafe element id`);
  }
  if (typeof element.name !== "string" || !ELEMENT_ASSET_IDS[element.name]) {
    throw new Error(`${context} references an unsupported renderer element`);
  }
  if (!safeRelativeDirectory(element.rootFolder) || !safePathSegment(element.folder)) {
    throw new Error(`${context} has an unsafe TVG source path`);
  }
  if (!Array.isArray(element.drawings)) {
    throw new Error(`${context} has an invalid drawing inventory`);
  }
  const drawing = normalizedDrawingId(drawingValue, context);
  const declarations = element.drawings.filter((candidate) => String(candidate) === drawing);
  if (declarations.length !== 1) {
    throw new Error(`${context} does not uniquely declare drawing ${drawing}`);
  }
  const file = path.posix.join(
    element.rootFolder,
    element.folder,
    `${element.folder}-${drawing}.tvg`,
  );
  if (!safeRelativeDirectory(file) || !file.toLowerCase().endsWith(".tvg")) {
    throw new Error(`${context} has an unsafe TVG source path`);
  }
  return {
    elementId: element.id,
    element: element.name,
    drawing,
    file,
  };
}

function validatedResolvedDrawing(manifest, resolved, context) {
  if (!resolved) return null;
  const matches = (manifest.elements ?? []).filter((element) => element.id === resolved.elementId);
  if (matches.length !== 1 || matches[0].name !== resolved.element) {
    throw new Error(`${context} does not resolve to one manifest element`);
  }
  return validatedDrawingRequest(matches[0], resolved.drawing, context);
}

function rendererReadNode(scene, nodePath, nodePrefix) {
  const nodeName = path.posix.basename(nodePath);
  if (!nodePrefix) {
    const exactMatches = scene.nodes.filter(({ path: candidatePath }) => candidatePath === nodePath);
    if (exactMatches.length === 0) {
      const relocated = scene.nodes.some((node) => node.type === "READ" && node.name === nodeName);
      if (relocated) {
        throw new Error(`renderer READ ${nodeName} is outside canonical topology; --node-prefix is required`);
      }
      throw new Error(`renderer READ ${nodePath} is missing from the source manifest`);
    }
    if (exactMatches.length !== 1 || exactMatches[0].type !== "READ"
      || exactMatches[0].name !== nodeName) {
      throw new Error(`renderer READ ${nodePath} is not one unique READ node`);
    }
    return exactMatches[0];
  }

  if (!nodePath.startsWith(CANONICAL_CHARACTER_PREFIX)) {
    throw new Error(`renderer READ is outside ${CANONICAL_CHARACTER_PREFIX}: ${nodePath}`);
  }
  const boundaryReads = scene.nodes.filter((node) => (
    node.type === "READ" && node.path.startsWith(nodePrefix) && node.name === nodeName
  ));
  if (boundaryReads.length !== 1) {
    throw new Error(`renderer READ ${nodeName} is not unique within --node-prefix ${nodePrefix}`);
  }
  const expectedPath = `${nodePrefix}${nodePath.slice(CANONICAL_CHARACTER_PREFIX.length)}`;
  if (boundaryReads[0].path !== expectedPath) {
    throw new Error(`renderer READ ${nodeName} is not at the expected boundary path ${expectedPath}`);
  }
  return boundaryReads[0];
}

export function requestedDrawings(manifest, frames, drawingSelectors, nodePrefix = null) {
  const scene = manifest.scenes[0];
  if (!scene) throw new Error("manifest contains no scene");
  if (!Array.isArray(manifest.elements)) throw new Error("manifest has an invalid element inventory");
  const requests = new Map();

  if (drawingSelectors) {
    for (const selector of drawingSelectors) {
      const matches = manifest.elements.filter(({ name }) => name === selector.element);
      if (matches.length !== 1 || !Array.isArray(matches[0].drawings)
        || !matches[0].drawings.map(String).includes(String(selector.drawing))) {
        throw new Error(`unknown drawing selector ${selector.element}:${selector.drawing}`);
      }
      const request = validatedDrawingRequest(
        matches[0],
        selector.drawing,
        `drawing selector ${selector.element}:${selector.drawing}`,
      );
      requests.set(`${request.elementId}:${request.drawing}`, request);
    }
    return [...requests.values()];
  }

  if (!Array.isArray(scene.nodes) || !Array.isArray(scene.columns)) {
    throw new Error("manifest scene has an invalid runtime topology");
  }

  if (frames) {
    for (const frame of frames) {
      if (!Number.isSafeInteger(frame) || frame < scene.startFrame || frame > scene.stopFrame) {
        throw new Error(`requested frame is outside ${scene.startFrame}-${scene.stopFrame}`);
      }
      for (const nodePath of READ_PAINT_ORDER) {
        const node = rendererReadNode(scene, nodePath, nodePrefix);
        const drawing = validatedResolvedDrawing(
          manifest,
          resolveReadDrawing(manifest, scene, node, frame),
          `${node.path} frame ${frame}`,
        );
        if (drawing) requests.set(`${drawing.elementId}:${drawing.drawing}`, drawing);
      }
    }
    return [...requests.values()];
  }

  for (const nodePath of READ_PAINT_ORDER) {
    const matches = scene.nodes.filter(({ path: candidatePath }) => candidatePath === nodePath);
    if (matches.length > 1) throw new Error(`renderer READ ${nodePath} is not unique`);
    const node = matches[0];
    const columnName = attributeAtPath(node, "drawing.element")?.attributes?.col;
    const column = scene.columns.find((candidate) => candidate.name === columnName);
    const element = manifest.elements.find((candidate) => candidate.id === column?.elementId);
    if (!element || !ELEMENT_ASSET_IDS[element.name]) continue;
    for (const drawing of element.drawings) {
      const request = validatedDrawingRequest(
        element,
        drawing,
        `${nodePath} drawing ${drawing}`,
      );
      requests.set(`${request.elementId}:${request.drawing}`, request);
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

export function validateOutlinePaletteApplication(sourceColor, replacementCount) {
  if (sourceColor && replacementCount === 0) {
    throw new Error("outline source color was not found in any compiled artwork");
  }
}

function isPathInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

async function lstatOrMissing(filename, fileSystem) {
  try {
    return await fileSystem.lstat(filename);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function resolveRealRigRoot(rigRoot, fileSystem = fs) {
  const requested = path.resolve(rigRoot);
  const canonical = path.resolve(await fileSystem.realpath(requested));
  const stat = await fileSystem.lstat(canonical);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("--rig must resolve to a real directory");
  }
  return canonical;
}

export async function readTvgSourceWithinRig(
  canonicalRigRoot,
  relativeSource,
  fileSystem = fs,
) {
  if (!safeRelativeDirectory(relativeSource)
    || !relativeSource.toLowerCase().endsWith(".tvg")) {
    throw new Error(`unsafe TVG source path: ${relativeSource}`);
  }
  const lexicalSource = path.resolve(canonicalRigRoot, ...relativeSource.split("/"));
  if (!isPathInside(lexicalSource, canonicalRigRoot)) {
    throw new Error(`TVG source escapes --rig: ${relativeSource}`);
  }
  const lexicalStat = await fileSystem.lstat(lexicalSource);
  if (!lexicalStat.isFile() || lexicalStat.isSymbolicLink()) {
    throw new Error(`TVG source must be a real file: ${relativeSource}`);
  }
  const canonicalSource = path.resolve(await fileSystem.realpath(lexicalSource));
  if (!isPathInside(canonicalSource, canonicalRigRoot)) {
    throw new Error(`TVG source resolves outside --rig: ${relativeSource}`);
  }
  const canonicalStat = await fileSystem.lstat(canonicalSource);
  if (!canonicalStat.isFile() || canonicalStat.isSymbolicLink()) {
    throw new Error(`TVG source must resolve to a real file: ${relativeSource}`);
  }
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot safely open TVG sources without following symlinks");
  }
  const handle = await fileSystem.open(
    canonicalSource,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const openedStat = await handle.stat();
    if (!openedStat.isFile()
      || openedStat.dev !== canonicalStat.dev
      || openedStat.ino !== canonicalStat.ino) {
      throw new Error(`TVG source changed during containment validation: ${relativeSource}`);
    }
    return { bytes: await handle.readFile() };
  } finally {
    await handle.close();
  }
}

async function validateCompiledAssetTree(
  directory,
  { allowEmpty = false, fileSystem = fs } = {},
) {
  const directoryStat = await fileSystem.lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new Error(`compiled output must be a real directory: ${directory}`);
  }
  const entries = await fileSystem.readdir(directory, { withFileTypes: true });
  if (entries.length === 0 && allowEmpty) {
    return { empty: true, receipt: null, treeSha256: sha256(Buffer.from("[]")) };
  }
  if (entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())) {
    throw new Error("compiled output must contain only real flat files");
  }
  const receiptEntry = entries.find(({ name }) => name === "receipt.json");
  if (!receiptEntry) throw new Error("compiled output is missing receipt.json");
  const receiptBytes = await fileSystem.readFile(path.join(directory, "receipt.json"));
  const receipt = JSON.parse(receiptBytes.toString("utf8"));
  if (receipt?.schemaVersion !== "shaz-tvg-asset-receipt-v2"
    || !SHA256.test(receipt.sourceXstageSha256 ?? "")
    || receipt.sourceArchiveBundled !== false
    || receipt.artistRenderedFramesUsed !== false
    || !Array.isArray(receipt.assets)
    || receipt.assets.length === 0) {
    throw new Error("compiled output has an invalid receipt");
  }
  const expected = new Map();
  for (const asset of receipt.assets) {
    if (!asset || !FLAT_ASSET_FILENAME.test(asset.filename ?? "")
      || expected.has(asset.filename)
      || !Number.isSafeInteger(asset.elementId) || asset.elementId < 1
      || !ELEMENT_ASSET_IDS[asset.element]
      || normalizedDrawingId(asset.drawing, `receipt asset ${asset.filename}`) !== asset.drawing
      || !safeRelativeDirectory(asset.source)
      || !asset.source.toLowerCase().endsWith(".tvg")
      || !SHA256.test(asset.sourceSha256 ?? "")
      || !SHA256.test(asset.outputSha256 ?? "")
      || !["main", "color", "overlay"].includes(asset.variant)) {
      throw new Error("compiled output has an unsafe asset receipt");
    }
    expected.set(asset.filename, asset.outputSha256);
  }
  const actualNames = entries.map(({ name }) => name).sort();
  const expectedNames = ["receipt.json", ...expected.keys()].sort();
  if (actualNames.length !== expectedNames.length
    || actualNames.some((name, index) => name !== expectedNames[index])) {
    throw new Error("compiled output does not exactly match its receipt");
  }
  for (const [filename, expectedSha256] of expected) {
    const bytes = await fileSystem.readFile(path.join(directory, filename));
    if (sha256(bytes) !== expectedSha256) {
      throw new Error(`compiled output checksum mismatch: ${filename}`);
    }
  }
  const treeRecords = [
    { filename: "receipt.json", sha256: sha256(receiptBytes) },
    ...[...expected].map(([filename, outputSha256]) => ({ filename, sha256: outputSha256 })),
  ].sort((left, right) => left.filename.localeCompare(right.filename));
  return {
    empty: false,
    receipt,
    treeSha256: sha256(Buffer.from(JSON.stringify(treeRecords))),
  };
}

async function validateDisposableCompiledBackup(directory, fileSystem) {
  const directoryStat = await fileSystem.lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new Error("compiled output backup must be a real directory");
  }
  const entries = await fileSystem.readdir(directory, { withFileTypes: true });
  if (entries.some((entry) => (
    !entry.isFile()
    || entry.isSymbolicLink()
    || (entry.name !== "receipt.json" && !FLAT_ASSET_FILENAME.test(entry.name))
  ))) {
    throw new Error("compiled output backup is not a safe flat asset tree");
  }
}

async function prepareCompiledOutput(outputRoot, fileSystem) {
  const requestedOutput = path.resolve(outputRoot);
  const outputName = path.basename(requestedOutput);
  if (!safePathSegment(outputName) || requestedOutput === path.parse(requestedOutput).root) {
    throw new Error("--output must name a non-root directory");
  }
  const requestedParent = path.dirname(requestedOutput);
  await fileSystem.mkdir(requestedParent, { recursive: true });
  const requestedParentStat = await fileSystem.lstat(requestedParent);
  if (!requestedParentStat.isDirectory() || requestedParentStat.isSymbolicLink()) {
    throw new Error("--output parent must be a real directory, not a symlink");
  }
  const canonicalParent = path.resolve(await fileSystem.realpath(requestedParent));
  const target = path.join(canonicalParent, outputName);
  const identity = crypto.createHash("sha256").update(target).digest("hex").slice(0, 16);
  const backup = path.join(canonicalParent, `.shaz-tvg-backup-${identity}`);

  const backupStat = await lstatOrMissing(backup, fileSystem);
  const targetStat = await lstatOrMissing(target, fileSystem);
  if (backupStat) {
    if (!targetStat) {
      await validateCompiledAssetTree(backup, { allowEmpty: true, fileSystem });
      await fileSystem.rename(backup, target);
    } else {
      await validateCompiledAssetTree(target, { fileSystem });
      await validateDisposableCompiledBackup(backup, fileSystem);
      await fileSystem.rm(backup, { recursive: true, force: true });
    }
  }
  const installedTarget = await lstatOrMissing(target, fileSystem)
    ? await validateCompiledAssetTree(target, { allowEmpty: true, fileSystem })
    : null;
  return {
    target,
    backup,
    stagePrefix: path.join(canonicalParent, `.shaz-tvg-stage-${identity}-`),
    expectedTargetSha256: installedTarget?.treeSha256 ?? null,
  };
}

async function installStagedCompiledOutput(
  stage,
  target,
  backup,
  expectedTargetSha256,
  fileSystem,
) {
  const targetStat = await lstatOrMissing(target, fileSystem);
  if (expectedTargetSha256 === null ? targetStat : !targetStat) {
    throw new Error("compiled output changed while the replacement was being built");
  }
  if (targetStat) {
    const currentTarget = await validateCompiledAssetTree(target, {
      allowEmpty: true,
      fileSystem,
    });
    if (currentTarget.treeSha256 !== expectedTargetSha256) {
      throw new Error("compiled output changed while the replacement was being built");
    }
  }
  if (await lstatOrMissing(backup, fileSystem)) {
    throw new Error("compiled output backup appeared during commit");
  }
  let movedExisting = false;
  try {
    if (targetStat) {
      await fileSystem.rename(target, backup);
      movedExisting = true;
      const movedTarget = await validateCompiledAssetTree(backup, {
        allowEmpty: true,
        fileSystem,
      });
      if (movedTarget.treeSha256 !== expectedTargetSha256) {
        throw new Error("compiled output changed during replacement");
      }
    }
    await fileSystem.rename(stage, target);
  } catch (error) {
    if (!movedExisting) throw error;
    try {
      if (await lstatOrMissing(target, fileSystem)) {
        throw new Error("compiled output target appeared before rollback");
      }
      await fileSystem.rename(backup, target);
    } catch (recoveryError) {
      throw new AggregateError(
        [error, recoveryError],
        "compiled output installation failed and rollback was incomplete",
      );
    }
    throw error;
  }
  if (movedExisting) {
    try {
      await fileSystem.rm(backup, { recursive: true, force: true });
    } catch (error) {
      throw new Error(
        "compiled output installed but backup cleanup failed; the next invocation will recover it",
        { cause: error },
      );
    }
  }
}

export async function withStagedCompiledOutput(
  outputRoot,
  build,
  { fileSystem = fs } = {},
) {
  const {
    target,
    backup,
    stagePrefix,
    expectedTargetSha256,
  } = await prepareCompiledOutput(outputRoot, fileSystem);
  const stage = await fileSystem.mkdtemp(stagePrefix);
  let operationError = null;
  try {
    await build(stage);
    await validateCompiledAssetTree(stage, { fileSystem });
    await installStagedCompiledOutput(
      stage,
      target,
      backup,
      expectedTargetSha256,
      fileSystem,
    );
  } catch (error) {
    operationError = error;
  }
  try {
    await fileSystem.rm(stage, { recursive: true, force: true });
  } catch (cleanupError) {
    if (operationError) {
      throw new AggregateError(
        [operationError, cleanupError],
        "compiled output failed and staging cleanup was incomplete",
      );
    }
    throw cleanupError;
  }
  if (operationError) throw operationError;
  return { outputRoot: target };
}

async function main() {
  const args = parseCompileArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const scene = manifest.scenes?.[0];
  if (!scene) throw new Error("manifest contains no scene");
  if (!SHA256.test(manifest.source?.sha256 ?? "")) {
    throw new Error("manifest requires a lowercase SHA-256 source hash");
  }
  validateFrameRange(args.range, scene);
  validateRequestedFrames(args.frames, scene);
  const frames = args.frames ?? (args.range ? enumerateFrameRange(args.range) : null);
  const drawings = requestedDrawings(manifest, frames, args.drawings, args.nodePrefix);
  const rigRoot = await resolveRealRigRoot(args.rig);

  const installed = await withStagedCompiledOutput(args.output, async (outputRoot) => {
    const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-tvg-assets-v2-"));
    const receiptAssets = [];
    const outputFilenames = new Set();
    let totalOutlineColorReplacements = 0;
    try {
      for (let drawingIndex = 0; drawingIndex < drawings.length; drawingIndex += 1) {
        const drawing = drawings[drawingIndex];
        const assetId = ELEMENT_ASSET_IDS[drawing.element];
        if (!assetId) throw new Error(`no asset id for ${drawing.element}`);
        const { bytes: sourceBytes } = await readTvgSourceWithinRig(rigRoot, drawing.file);
        const sourceCopy = path.join(scratch, `source-${drawingIndex}.tvg`);
        await fs.writeFile(sourceCopy, sourceBytes);
        const spec = JSON.parse(run(exporter, [sourceCopy]));
        const variants = [
          ["main", spec],
          ["color", spec.art_layers?.color],
          ["overlay", spec.art_layers?.overlay],
        ];
        for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
          const [variant, variantSpec] = variants[variantIndex];
          if (!hasDrawingData(variantSpec)) continue;
          const outlineColorReplacementCount = normalizeOutlinePalette(
            variantSpec,
            args.outlineSourceColor,
            args.outlineColor,
          );
          totalOutlineColorReplacements += outlineColorReplacementCount;
          const bounds = drawingBounds(variantSpec);
          const specPath = path.join(scratch, `spec-${drawingIndex}-${variantIndex}.json`);
          const suffix = variant === "main" ? "" : `--${variant}`;
          const filename = `${assetId}-${drawing.drawing.padStart(2, "0")}${suffix}.png`;
          if (!FLAT_ASSET_FILENAME.test(filename) || outputFilenames.has(filename)) {
            throw new Error(`compiled asset filename is unsafe or duplicated: ${filename}`);
          }
          outputFilenames.add(filename);
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

      validateOutlinePaletteApplication(
        args.outlineSourceColor,
        totalOutlineColorReplacements,
      );

      const receipt = {
        schemaVersion: "shaz-tvg-asset-receipt-v2",
        sourceXstageSha256: manifest.source.sha256,
        sourceArchiveBundled: false,
        artistRenderedFramesUsed: false,
        rasterMarginModelUnits: RASTER_MARGIN,
        assets: receiptAssets.sort((left, right) => left.filename.localeCompare(right.filename)),
      };
      await fs.writeFile(
        path.join(outputRoot, "receipt.json"),
        `${JSON.stringify(receipt, null, 2)}\n`,
      );
    } finally {
      await fs.rm(scratch, { recursive: true, force: true });
    }
  });
  process.stdout.write(`${path.join(installed.outputRoot, "receipt.json")}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
