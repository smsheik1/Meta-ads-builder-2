#!/usr/bin/env node

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

import {
  attributeAtPath,
  indexColumns,
  resolveReadDrawing,
  sampleNode,
} from "./vendor/runtime_channels.mjs";
import {
  controlStateForNode,
  createPoseRuntime,
  poseRecipeSha256,
} from "./pose-recipe.mjs";
import {
  fieldGridForManifest,
  loadAssetRegistration,
  loadManifest,
  READ_PAINT_ORDER,
} from "./rig-v2-renderer.mjs";
import { buildTransformGraph } from "./vendor/scene_transforms.mjs";

const EPSILON = 1e-10;
const SHA256 = /^[a-f0-9]{64}$/;
const DEFORMATION_NODE_TYPES = new Set([
  "BendyBoneModule",
  "CurveModule",
  "DeformationCompositeModule",
  "OffsetModule",
]);
const CANONICAL_CHARACTER_PREFIX = "Top/Shaz_Rig/";
const COMPATIBLE_IMPORT_OWNER_SCHEMA = "shaz-compatible-import-owner-v1";
const COMPATIBLE_IMPORT_JOURNAL_SCHEMA = "shaz-compatible-import-journal-v1";
const COMPATIBLE_IMPORT_TRANSACTION_PREFIX = "compatible-import-";

function requiredValue(values, index, flag) {
  const value = values[index + 1];
  if (typeof value !== "string" || value === "" || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseOuterMasterMapping(value) {
  const parts = String(value).split("=");
  if (parts.length !== 2 || parts.some((part) => part.trim() === "" || /[\\/]/.test(part))) {
    throw new Error("--outer-master-map must be SOURCE_NODE=TARGET_NODE using node names");
  }
  return { sourceName: parts[0], targetName: parts[1] };
}

function parseArgs(values) {
  const args = {
    compatibleSource: false,
    manifest: null,
    targetManifest: null,
    compatibleAssets: null,
    targetAssets: null,
    id: null,
    start: null,
    end: null,
    baseFrame: 1,
    exposureChangeFrames: null,
    nodePrefix: null,
    sourceArchiveSha256: null,
    sourceArchiveName: null,
    sourceArchive: null,
    sourceXstagePath: null,
    auditOutput: null,
    omitNodes: [],
    targetBaseNodes: [],
    outerMasterMappings: [],
    output: null,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--compatible-source") args.compatibleSource = true;
    else if (value === "--manifest") args.manifest = requiredValue(values, index++, value);
    else if (value === "--target-manifest") args.targetManifest = requiredValue(values, index++, value);
    else if (value === "--compatible-assets") args.compatibleAssets = requiredValue(values, index++, value);
    else if (value === "--target-assets") args.targetAssets = requiredValue(values, index++, value);
    else if (value === "--id") args.id = requiredValue(values, index++, value);
    else if (value === "--start") args.start = Number(values[++index]);
    else if (value === "--end") args.end = Number(values[++index]);
    else if (value === "--base-frame") args.baseFrame = Number(values[++index]);
    else if (value === "--exposure-change-frames") {
      args.exposureChangeFrames = values[++index].split(",").map(Number);
    }
    else if (value === "--node-prefix") {
      const nodePrefix = requiredValue(values, index++, value);
      args.nodePrefix = nodePrefix;
    }
    else if (value === "--source-archive-sha256") {
      args.sourceArchiveSha256 = requiredValue(values, index++, value);
    }
    else if (value === "--source-archive-name") {
      args.sourceArchiveName = requiredValue(values, index++, value);
    }
    else if (value === "--source-archive") {
      args.sourceArchive = requiredValue(values, index++, value);
    }
    else if (value === "--source-xstage-path") {
      args.sourceXstagePath = requiredValue(values, index++, value);
    }
    else if (value === "--audit-output") args.auditOutput = requiredValue(values, index++, value);
    else if (value === "--omit-node") args.omitNodes.push(requiredValue(values, index++, value));
    else if (value === "--target-base-node") {
      args.targetBaseNodes.push(requiredValue(values, index++, value));
    }
    else if (value === "--outer-master-map") {
      args.outerMasterMappings.push(parseOuterMasterMapping(requiredValue(values, index++, value)));
    }
    else if (value === "--output") args.output = requiredValue(values, index++, value);
    else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.id || !args.output
    || !Number.isInteger(args.start) || !Number.isInteger(args.end)
    || args.start < 1 || args.end < args.start
    || !Number.isInteger(args.baseFrame) || args.baseFrame < 1) {
    throw new Error("usage: extract-pose-recipe.mjs --manifest runtime.json --id pose-id --start N --end N --base-frame N [--exposure-change-frames 1,3,...] [--node-prefix Top/Rig/] --output recipe.json");
  }
  const compatibleOnlyValues = [
    args.targetManifest,
    args.compatibleAssets,
    args.targetAssets,
    args.sourceArchiveSha256,
    args.sourceArchiveName,
    args.sourceArchive,
    args.sourceXstagePath,
    args.auditOutput,
    ...args.omitNodes,
    ...args.targetBaseNodes,
    ...args.outerMasterMappings,
  ];
  if (!args.compatibleSource && compatibleOnlyValues.some(Boolean)) {
    throw new Error("compatible-source arguments require explicit --compatible-source mode");
  }
  if (args.compatibleSource) {
    const required = [
      [args.targetManifest, "--target-manifest"],
      [args.compatibleAssets, "--compatible-assets"],
      [args.targetAssets, "--target-assets"],
      [args.sourceArchiveSha256, "--source-archive-sha256"],
      [args.sourceArchiveName, "--source-archive-name"],
      [args.sourceArchive, "--source-archive"],
      [args.sourceXstagePath, "--source-xstage-path"],
      [args.auditOutput, "--audit-output"],
      [args.nodePrefix, "--node-prefix"],
    ];
    const missing = required.filter(([entry]) => !entry).map(([, flag]) => flag);
    if (missing.length > 0) {
      throw new Error(`compatible-source mode requires ${missing.join(", ")}`);
    }
    if (args.exposureChangeFrames !== null) {
      throw new Error("compatible-source mode samples exact source frames and does not accept --exposure-change-frames");
    }
    if (path.resolve(args.auditOutput) === path.resolve(args.output)) {
      throw new Error("--audit-output must be separate from --output");
    }
  }
  return args;
}

function numericValues(state) {
  return [
    ...state.position,
    state.rotation,
    ...state.scale,
    state.skew,
    state.opacity,
  ];
}

function statesEqual(left, right, epsilon = EPSILON) {
  if (left.flipHorizontal !== right.flipHorizontal || left.flipVertical !== right.flipVertical) {
    return false;
  }
  const leftValues = numericValues(left);
  const rightValues = numericValues(right);
  return leftValues.every((value, index) => Math.abs(value - rightValues[index]) <= epsilon);
}

function linearStateError(actual, left, right, progress) {
  if (actual.flipHorizontal !== left.flipHorizontal
    || actual.flipVertical !== left.flipVertical) return Infinity;
  const actualValues = numericValues(actual);
  const leftValues = numericValues(left);
  const rightValues = numericValues(right);
  return Math.max(...actualValues.map((value, index) => Math.abs(
    value - (leftValues[index] + (rightValues[index] - leftValues[index]) * progress),
  )));
}

function simplifyControlFrames(frames) {
  if (frames.length <= 2) return frames;
  const keep = new Set([0, frames.length - 1]);
  function split(leftIndex, rightIndex) {
    if (rightIndex - leftIndex <= 1) return;
    const left = frames[leftIndex];
    const right = frames[rightIndex];
    let worstIndex = -1;
    let worstError = -1;
    for (let index = leftIndex + 1; index < rightIndex; index += 1) {
      const progress = (frames[index].frame - left.frame) / (right.frame - left.frame);
      const error = linearStateError(frames[index].state, left.state, right.state, progress);
      if (error > worstError) {
        worstError = error;
        worstIndex = index;
      }
    }
    if (worstError > EPSILON) {
      keep.add(worstIndex);
      split(leftIndex, worstIndex);
      split(worstIndex, rightIndex);
    }
  }
  split(0, frames.length - 1);
  return [...keep].sort((left, right) => left - right).map((index) => frames[index]);
}

function keyFromState(frame, state) {
  return {
    frame,
    position: state.position,
    rotation: state.rotation,
    scale: state.scale,
    skew: state.skew,
    opacity: state.opacity,
    flipHorizontal: state.flipHorizontal,
    flipVertical: state.flipVertical,
  };
}

function validateExposureChangeFrames(frames, durationFrames) {
  if (frames === null) return null;
  if (!Array.isArray(frames) || frames.length === 0
    || frames[0] !== 1 || frames.at(-1) !== durationFrames
    || frames.some((frame) => !Number.isInteger(frame) || frame < 1 || frame > durationFrames)
    || frames.some((frame, index) => index > 0 && frame <= frames[index - 1])) {
    throw new Error(`exposure change frames must be strictly increasing from 1 through ${durationFrames}`);
  }
  return frames;
}

function deformationFramesForExposureChanges(startFrame, durationFrames, changeFrames) {
  if (!changeFrames) {
    return Array.from({ length: durationFrames }, (_, index) => startFrame + index);
  }
  let current = changeFrames[0];
  return Array.from({ length: durationFrames }, (_, index) => {
    const localFrame = index + 1;
    if (changeFrames.includes(localFrame)) current = localFrame;
    return startFrame + current - 1;
  });
}

function safeBasename(value, extension) {
  return typeof value === "string"
    && value.length > extension.length
    && !/[\\/]/.test(value)
    && value.toLowerCase().endsWith(extension);
}

function safeArchiveRelativePath(value) {
  if (typeof value !== "string" || value.includes("\\") || path.posix.isAbsolute(value)
    || /[\0-\x1f\x7f]/.test(value)) {
    return false;
  }
  const segments = value.split("/");
  return segments.length > 0
    && segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function safeZipEntryName(name, directory) {
  const candidate = directory && name.endsWith("/") ? name.slice(0, -1) : name;
  return candidate.length > 0 && safeArchiveRelativePath(candidate);
}

async function sha256File(file, fileSystem = fs) {
  const handle = await fileSystem.open(file, "r");
  const hash = crypto.createHash("sha256");
  try {
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      hash.update(chunk);
    }
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

function infoZipEnvironment() {
  const environment = { ...process.env };
  delete environment.UNZIP;
  delete environment.UNZIPOPT;
  delete environment.ZIPINFO;
  delete environment.ZIPINFOOPT;
  return environment;
}

async function runInfoZip(args, context, consumeStdout = async (stdout) => {
  for await (const _chunk of stdout) {
    // Drain output without retaining it.
  }
}) {
  const child = spawn("unzip", args, {
    env: infoZipEnvironment(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let diagnostics = "";
  const stderrTask = (async () => {
    for await (const chunk of child.stderr) {
      if (diagnostics.length < 8_192) diagnostics += chunk.toString("utf8");
    }
  })();
  const exitTask = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  try {
    const [status, output] = await Promise.all([
      exitTask,
      consumeStdout(child.stdout),
      stderrTask,
    ]);
    if (status.code !== 0) {
      const detail = diagnostics.trim() || `exit ${status.code ?? status.signal ?? "unknown"}`;
      throw new Error(`${context}: ${detail}`);
    }
    return output;
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await Promise.allSettled([exitTask, stderrTask]);
    throw error;
  }
}

async function listZipEntries(archivePath) {
  return runInfoZip(
    ["-Z1", "--", archivePath],
    "--source-archive ZIP listing failed",
    async (stdout) => {
      const entries = new Map();
      const lines = createInterface({ input: stdout, crlfDelay: Infinity });
      for await (const name of lines) {
        const directory = name.endsWith("/");
        if (!safeZipEntryName(name, directory)) {
          throw new Error(`ZIP contains an unsafe entry path: ${JSON.stringify(name)}`);
        }
        if (entries.has(name)) throw new Error(`ZIP contains duplicate entry ${name}`);
        entries.set(name, { name, directory });
      }
      return entries;
    },
  );
}

function exactInfoZipMemberPattern(name) {
  return name.replace(/[*?[\]\\]/g, "\\$&");
}

async function sha256ZipMember(archivePath, memberPath) {
  const hash = crypto.createHash("sha256");
  await runInfoZip(
    ["-p", "--", archivePath, exactInfoZipMemberPattern(memberPath)],
    `failed to read exact ZIP member ${memberPath}`,
    async (stdout) => {
      for await (const chunk of stdout) hash.update(chunk);
    },
  );
  return hash.digest("hex");
}

function validateCompatibleProvenance(args, sourceManifest, targetManifest) {
  const sourceHash = sourceManifest.source?.sha256;
  const targetHash = targetManifest.source?.sha256;
  const sourceFile = path.posix.basename(args.sourceXstagePath);
  if (!SHA256.test(sourceHash ?? "") || !SHA256.test(targetHash ?? "")) {
    throw new Error("compatible and target manifests require lowercase SHA-256 source hashes");
  }
  if (sourceHash === targetHash) {
    throw new Error("compatible-source mode requires distinct source and target manifests");
  }
  if (!SHA256.test(args.sourceArchiveSha256 ?? "")) {
    throw new Error("--source-archive-sha256 must be a lowercase SHA-256");
  }
  if (!safeBasename(args.sourceArchiveName, ".zip")) {
    throw new Error("--source-archive-name must be a safe .zip basename");
  }
  if (!safeBasename(path.basename(args.sourceArchive), ".zip")
    || path.basename(args.sourceArchive) !== args.sourceArchiveName) {
    throw new Error("--source-archive-name must exactly match the --source-archive basename");
  }
  if (!safeArchiveRelativePath(args.sourceXstagePath)
    || !safeBasename(sourceFile, ".xstage")
    || sourceManifest.source?.file !== sourceFile) {
    throw new Error("--source-xstage-path must be a safe archive-relative path ending in the manifest Xstage basename");
  }
  if (!args.nodePrefix.endsWith("/")) {
    throw new Error("compatible --node-prefix must end with /");
  }
  return sourceFile;
}

async function verifyCompatibleSourceArchive(args, sourceManifest, sourceAssets, fileSystem = fs) {
  const archivePath = path.resolve(args.sourceArchive);
  const archiveStat = await fileSystem.lstat(archivePath);
  if (!archiveStat.isFile()) throw new Error("--source-archive must be a regular ZIP file");
  const archiveSha256 = await sha256File(archivePath, fileSystem);
  if (archiveSha256 !== args.sourceArchiveSha256) {
    throw new Error("--source-archive-sha256 does not match --source-archive bytes");
  }
  await runInfoZip(
    ["-tqq", "--", archivePath],
    "--source-archive failed ZIP integrity verification",
  );
  const entries = await listZipEntries(archivePath);
  const xstageEntry = entries.get(args.sourceXstagePath);
  if (!xstageEntry || xstageEntry.directory) {
    throw new Error("--source-xstage-path is not an exact regular-file entry in --source-archive");
  }
  const xstageSha256 = await sha256ZipMember(archivePath, args.sourceXstagePath);
  if (xstageSha256 !== sourceManifest.source.sha256) {
    throw new Error("archived Xstage checksum does not match the compatible manifest source");
  }

  const xstageDirectory = path.posix.dirname(args.sourceXstagePath);
  const verifiedTvgEntries = [];
  const tvgHashes = new Map();
  for (const record of sourceAssets.records) {
    if (!safeArchiveRelativePath(record.source)
      || !record.source.toLowerCase().endsWith(".tvg")) {
      throw new Error(`compiled asset has an unsafe TVG source path: ${record.filename}`);
    }
    const entryPath = xstageDirectory === "."
      ? record.source
      : path.posix.join(xstageDirectory, record.source);
    if (!safeArchiveRelativePath(entryPath)) {
      throw new Error(`compiled asset resolves outside the source archive: ${record.filename}`);
    }
    const entry = entries.get(entryPath);
    if (!entry || entry.directory) {
      throw new Error(`compiled TVG is missing from the source archive: ${entryPath}`);
    }
    let sourceSha256 = tvgHashes.get(entryPath);
    if (!sourceSha256) {
      sourceSha256 = await sha256ZipMember(archivePath, entryPath);
      tvgHashes.set(entryPath, sourceSha256);
    }
    if (sourceSha256 !== record.sourceSha256) {
      throw new Error(`archived TVG checksum mismatch for ${entryPath}`);
    }
    verifiedTvgEntries.push({
      assetFilename: record.filename,
      archivePath: entryPath,
      sourceSha256,
    });
  }
  if (await sha256File(archivePath, fileSystem) !== archiveSha256) {
    throw new Error("--source-archive changed during verification");
  }
  return {
    archivePath,
    archiveName: args.sourceArchiveName,
    archiveSha256,
    xstagePath: args.sourceXstagePath,
    xstageSha256,
    entryCount: entries.size,
    verifiedTvgEntries,
  };
}

function validateArchiveProof(args, sourceManifest, sourceAssets, archiveProof) {
  const expectedTvgProofs = sourceAssets.records.map((record) => ({
    assetFilename: record.filename,
    sourceSha256: record.sourceSha256,
  })).sort((left, right) => left.assetFilename.localeCompare(right.assetFilename));
  const actualTvgProofs = [...(archiveProof?.verifiedTvgEntries ?? [])].map((record) => ({
    assetFilename: record.assetFilename,
    sourceSha256: record.sourceSha256,
  })).sort((left, right) => left.assetFilename.localeCompare(right.assetFilename));
  if (!archiveProof
    || archiveProof.archiveName !== args.sourceArchiveName
    || archiveProof.archiveSha256 !== args.sourceArchiveSha256
    || archiveProof.xstagePath !== args.sourceXstagePath
    || archiveProof.xstageSha256 !== sourceManifest.source.sha256
    || JSON.stringify(actualTvgProofs) !== JSON.stringify(expectedTvgProofs)) {
    throw new Error("compatible import requires a complete verified source-archive proof");
  }
  return archiveProof;
}

function uniqueNodesByName(nodes, context) {
  const byName = new Map();
  for (const node of nodes) {
    if (byName.has(node.name)) {
      throw new Error(`${context} PEG/READ name is not unique: ${node.name}`);
    }
    byName.set(node.name, node);
  }
  return byName;
}

function resolveDeclaredNode(value, nodes, byName, context) {
  const pathMatch = nodes.find((node) => node.path === value);
  const node = pathMatch ?? byName.get(value);
  if (!node) throw new Error(`${context} does not exist: ${value}`);
  return node;
}

function assertUniqueDeclarations(values, context) {
  if (new Set(values).size !== values.length) {
    throw new Error(`${context} declarations must be unique`);
  }
}

function vectorsEqual(left, right, epsilon = EPSILON) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - right[index]) <= epsilon);
}

function pivotForSample(sample, context) {
  const pivot = [Number(sample.attrs?.pivot?.x ?? 0), Number(sample.attrs?.pivot?.y ?? 0)];
  if (pivot.some((value) => !Number.isFinite(value))) {
    throw new Error(`${context} has a non-finite renderer pivot`);
  }
  return pivot;
}

function directBoundaryNode(node, nodePrefix) {
  return node.path === `${nodePrefix}${node.name}`;
}

function directTargetOuterNode(node) {
  return node.path === `Top/${node.name}`;
}

function auditCompatibleTopology({
  sourceManifest,
  targetManifest,
  nodePrefix,
  omitNodes = [],
  targetBaseNodes = [],
  outerMasterMappings = [],
  paintOrder = READ_PAINT_ORDER,
  startFrame,
  endFrame,
  baseFrame,
}) {
  const sourceScene = sourceManifest.scenes?.[0];
  const targetScene = targetManifest.scenes?.[0];
  if (!sourceScene || !targetScene) throw new Error("source and target manifests require one scene");
  const sourceNodes = sourceScene.nodes.filter((node) => (
    node.path.startsWith(nodePrefix) && (node.type === "PEG" || node.type === "READ")
  ));
  if (sourceNodes.length === 0) {
    throw new Error(`--node-prefix ${JSON.stringify(nodePrefix)} matched zero PEG/READ nodes; extraction aborted`);
  }
  const targetNodes = targetScene.nodes.filter((node) => (
    node.type === "PEG" || node.type === "READ"
  ));
  const sourceByName = uniqueNodesByName(sourceNodes, "compatible source boundary");
  const targetByName = uniqueNodesByName(targetNodes, "target manifest");
  if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) || endFrame < startFrame
    || !Number.isInteger(baseFrame)) {
    throw new Error("topology audit requires exact source and target base-frame ranges");
  }
  const sourceFieldGrid = fieldGridForManifest(sourceManifest);
  const targetFieldGrid = fieldGridForManifest(targetManifest);
  if (!vectorsEqual(
    [sourceFieldGrid.x, sourceFieldGrid.y],
    [targetFieldGrid.x, targetFieldGrid.y],
  )) {
    throw new Error("compatible and target renderer field grids do not match");
  }
  assertUniqueDeclarations(omitNodes, "--omit-node");
  assertUniqueDeclarations(targetBaseNodes, "--target-base-node");

  const omitted = new Map(omitNodes.map((value) => {
    const node = resolveDeclaredNode(value, sourceNodes, sourceByName, "--omit-node");
    return [node.path, node];
  }));
  const targetBase = new Map(targetBaseNodes.map((value) => {
    const node = resolveDeclaredNode(value, targetNodes, targetByName, "--target-base-node");
    return [node.path, node];
  }));
  if (omitted.size !== omitNodes.length || targetBase.size !== targetBaseNodes.length) {
    throw new Error("node declarations must not name the same node by both path and name");
  }
  for (const node of omitted.values()) {
    if (!directBoundaryNode(node, nodePrefix)) {
      throw new Error(`--omit-node may name only direct boundary outer nodes: ${node.path}`);
    }
    const targetNode = targetByName.get(node.name);
    if (!targetNode || !targetBase.has(targetNode.path)
      || !directTargetOuterNode(targetNode) || targetNode.type !== node.type) {
      throw new Error(`--omit-node requires a same-name, same-type direct Top --target-base-node: ${node.path}`);
    }
  }
  for (const node of targetBase.values()) {
    if (!directTargetOuterNode(node)) {
      throw new Error(`--target-base-node may name only direct Top outer nodes: ${node.path}`);
    }
    const sourceNode = sourceByName.get(node.name);
    if (sourceNode && !omitted.has(sourceNode.path)) {
      throw new Error(`--target-base-node conflicts with an unomitted compatible node: ${node.path}`);
    }
  }
  const sourceColumns = indexColumns(sourceScene);
  const omittedControlEvidence = [];
  for (const node of omitted.values()) {
    const firstState = controlStateForNode(sampleNode(node, sourceColumns, startFrame));
    for (let frame = startFrame + 1; frame <= endFrame; frame += 1) {
      const state = controlStateForNode(sampleNode(node, sourceColumns, frame));
      if (!statesEqual(firstState, state)) {
        throw new Error(`--omit-node control is animated within the source range: ${node.path}`);
      }
    }
    omittedControlEvidence.push({
      sourcePath: node.path,
      targetPath: targetByName.get(node.name).path,
      sourceRange: [startFrame, endFrame],
      staticControlState: firstState,
    });
  }
  const mappings = [];
  const mappedSource = new Set();
  const mappedTarget = new Set();

  for (const targetNode of targetNodes.filter(({ path: nodePath }) => (
    nodePath.startsWith(CANONICAL_CHARACTER_PREFIX)
  ))) {
    const suffix = targetNode.path.slice(CANONICAL_CHARACTER_PREFIX.length);
    const expectedSourcePath = `${nodePrefix}${suffix}`;
    const sourceNode = sourceNodes.find(({ path: nodePath }) => nodePath === expectedSourcePath);
    if (!sourceNode) {
      if (targetBase.has(targetNode.path)) continue;
      throw new Error(`canonical target node has no exact compatible source path: ${targetNode.path}`);
    }
    if (omitted.has(sourceNode.path)) continue;
    if (sourceNode.name !== targetNode.name) {
      throw new Error(`canonical topology name mismatch: ${sourceNode.path} -> ${targetNode.path}`);
    }
    if (sourceNode.type !== targetNode.type) {
      throw new Error(`topology type mismatch for ${targetNode.name}: ${sourceNode.type} != ${targetNode.type}`);
    }
    mappings.push({ sourceNode, targetNode, mappingKind: "canonical-relative-path" });
    mappedSource.add(sourceNode.path);
    mappedTarget.add(targetNode.path);
  }

  const outerKeys = outerMasterMappings.map(({ sourceName, targetName }) => (
    `${sourceName}=${targetName}`
  ));
  assertUniqueDeclarations(outerKeys, "--outer-master-map");
  for (const declared of outerMasterMappings) {
    const sourceNode = resolveDeclaredNode(
      declared.sourceName,
      sourceNodes,
      sourceByName,
      "--outer-master-map source",
    );
    const targetNode = resolveDeclaredNode(
      declared.targetName,
      targetNodes,
      targetByName,
      "--outer-master-map target",
    );
    if (sourceNode.path !== `${nodePrefix}${sourceNode.name}`
      || targetNode.path !== `Top/${targetNode.name}`
      || targetNode.path.startsWith(CANONICAL_CHARACTER_PREFIX)) {
      throw new Error("--outer-master-map may map only explicitly named direct outer-master nodes");
    }
    if (omitted.has(sourceNode.path) || targetBase.has(targetNode.path)
      || mappedSource.has(sourceNode.path) || mappedTarget.has(targetNode.path)) {
      throw new Error("outer-master mapping conflicts with an omission, target base node, or existing mapping");
    }
    if (sourceNode.type !== targetNode.type) {
      throw new Error(`topology type mismatch for outer master ${targetNode.name}`);
    }
    mappings.push({ sourceNode, targetNode, mappingKind: "explicit-outer-master" });
    mappedSource.add(sourceNode.path);
    mappedTarget.add(targetNode.path);
  }

  const unaccountedSource = sourceNodes.filter((node) => (
    !mappedSource.has(node.path) && !omitted.has(node.path)
  ));
  if (unaccountedSource.length > 0) {
    throw new Error(`unmapped compatible source nodes: ${unaccountedSource.map(({ path: nodePath }) => nodePath).join(", ")}`);
  }
  const unaccountedTarget = targetNodes.filter((node) => (
    !mappedTarget.has(node.path) && !targetBase.has(node.path)
  ));
  if (unaccountedTarget.length > 0) {
    throw new Error(`target-only nodes require --target-base-node: ${unaccountedTarget.map(({ path: nodePath }) => nodePath).join(", ")}`);
  }
  const mappedTargetBase = [...targetBase.values()].filter((node) => mappedTarget.has(node.path));
  if (mappedTargetBase.length > 0) {
    throw new Error(`--target-base-node must name only unmapped target nodes: ${mappedTargetBase.map(({ path: nodePath }) => nodePath).join(", ")}`);
  }

  const mappingByTargetPath = new Map(mappings.map((entry) => [entry.targetNode.path, entry]));
  const renderedReadMappings = paintOrder.map((targetPath) => {
    const targetNode = targetScene.nodes.find(({ path: nodePath }) => nodePath === targetPath);
    const mapping = mappingByTargetPath.get(targetPath);
    if (!targetNode || targetNode.type !== "READ" || !mapping || mapping.sourceNode.type !== "READ") {
      throw new Error(`renderer READ does not map exactly through the compatible boundary: ${targetPath}`);
    }
    return mapping;
  });

  const targetDeformations = targetScene.nodes.filter(({ type }) => (
    DEFORMATION_NODE_TYPES.has(type)
  ));
  const sourceDeformations = sourceScene.nodes.filter((node) => (
    node.path.startsWith(nodePrefix) && DEFORMATION_NODE_TYPES.has(node.type)
  ));
  const deformationMappings = targetDeformations.map((targetNode) => {
    if (!targetNode.path.startsWith(CANONICAL_CHARACTER_PREFIX)) {
      throw new Error(`canonical deformation path is outside ${CANONICAL_CHARACTER_PREFIX}: ${targetNode.path}`);
    }
    const expectedSourcePath = `${nodePrefix}${targetNode.path.slice(CANONICAL_CHARACTER_PREFIX.length)}`;
    const matches = sourceDeformations.filter(({ path: nodePath }) => nodePath === expectedSourcePath);
    if (matches.length !== 1) {
      throw new Error(`canonical deformation path must exist exactly once in source: ${targetNode.path}`);
    }
    const sourceNode = matches[0];
    if (sourceNode.type !== targetNode.type) {
      throw new Error(`deformation type mismatch for ${targetNode.path}`);
    }
    return { sourceNode, targetNode };
  });
  const mappedSourceDeformations = new Set(deformationMappings.map(({ sourceNode }) => sourceNode.path));
  const extraSourceDeformations = sourceDeformations.filter(({ path: nodePath }) => (
    !mappedSourceDeformations.has(nodePath)
  ));
  if (extraSourceDeformations.length > 0) {
    throw new Error(`unmapped compatible deformation nodes: ${extraSourceDeformations.map(({ path: nodePath }) => nodePath).join(", ")}`);
  }

  const sourceGraph = buildTransformGraph(sourceScene);
  const targetGraph = buildTransformGraph(targetScene);
  const mappingBySourcePath = new Map(mappings.map((entry) => [entry.sourceNode.path, entry]));
  const omittedParentTargets = new Map([...omitted.values()].map((sourceNode) => [
    sourceNode.path,
    targetByName.get(sourceNode.name).path,
  ]));
  const parentGraph = mappings.map(({ sourceNode, targetNode }) => {
    const sourceParentPath = sourceGraph.parentPath(sourceNode.path);
    const targetParentPath = targetGraph.parentPath(targetNode.path);
    let expectedTargetParentPath = null;
    let mappingKind = "root";
    if (sourceParentPath !== null) {
      const parentMapping = mappingBySourcePath.get(sourceParentPath);
      if (parentMapping) {
        expectedTargetParentPath = parentMapping.targetNode.path;
        mappingKind = "mapped-parent";
      } else if (omittedParentTargets.has(sourceParentPath)) {
        expectedTargetParentPath = omittedParentTargets.get(sourceParentPath);
        mappingKind = "static-outer-normalization";
      } else if (!sourceParentPath.startsWith(nodePrefix)
        && directBoundaryNode(sourceNode, nodePrefix)) {
        mappingKind = "source-boundary-cut";
      } else {
        throw new Error(`mapped node has an unaudited compatible parent: ${sourceNode.path} <- ${sourceParentPath}`);
      }
    }
    if (targetParentPath !== expectedTargetParentPath) {
      throw new Error(`mapped parent graph mismatch: ${sourceNode.path} -> ${targetNode.path}`);
    }
    return {
      sourcePath: sourceNode.path,
      targetPath: targetNode.path,
      sourceParentPath,
      targetParentPath,
      mappingKind,
    };
  });

  const targetColumns = indexColumns(targetScene);
  const staticBasis = mappings.map(({ sourceNode, targetNode }) => {
    const targetPivot = pivotForSample(
      sampleNode(targetNode, targetColumns, baseFrame),
      targetNode.path,
    );
    for (let frame = startFrame; frame <= endFrame; frame += 1) {
      const sourcePivot = pivotForSample(
        sampleNode(sourceNode, sourceColumns, frame),
        sourceNode.path,
      );
      if (!vectorsEqual(sourcePivot, targetPivot)) {
        throw new Error(`renderer pivot mismatch for mapped node ${targetNode.path}`);
      }
    }
    return {
      sourcePath: sourceNode.path,
      targetPath: targetNode.path,
      sourceRange: [startFrame, endFrame],
      sourcePivot: [...targetPivot],
      targetBaseFrame: baseFrame,
      targetPivot,
    };
  });

  return {
    mappings,
    renderedReadMappings,
    deformationMappings,
    audit: {
      sourceNodeCount: sourceNodes.length,
      targetNodeCount: targetNodes.length,
      mappings: mappings.map(({ sourceNode, targetNode, mappingKind }) => ({
        sourceName: sourceNode.name,
        sourcePath: sourceNode.path,
        targetName: targetNode.name,
        targetPath: targetNode.path,
        type: targetNode.type,
        mappingKind,
      })),
      omittedSourceNodes: [...omitted.values()].map(({ name, path: nodePath, type }) => ({
        name,
        path: nodePath,
        type,
      })),
      targetBaseNodes: [...targetBase.values()].map(({ name, path: nodePath, type }) => ({
        name,
        path: nodePath,
        type,
      })),
      renderedReadMappings: renderedReadMappings.map(({ sourceNode, targetNode }) => ({
        sourcePath: sourceNode.path,
        targetPath: targetNode.path,
      })),
      deformationMappings: deformationMappings.map(({ sourceNode, targetNode }) => ({
        sourcePath: sourceNode.path,
        targetPath: targetNode.path,
        type: targetNode.type,
      })),
      rendererBasis: {
        sourceFieldGrid,
        targetFieldGrid,
        equal: true,
        staticPivotMappings: staticBasis,
      },
      parentGraph,
      omittedControlEvidence,
      preservedInternalChoreography: true,
    },
  };
}

async function fileSha256(filename) {
  return crypto.createHash("sha256").update(await fs.readFile(filename)).digest("hex");
}

function validatePaletteEvidence(record) {
  const evidence = record.paletteNormalization;
  if (evidence === undefined) return;
  const byteColor = (color) => Array.isArray(color)
    && color.length === 4
    && color.every((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 255);
  if (evidence.schemaVersion !== "shaz-outline-palette-normalization-v1"
    || !byteColor(evidence.sourceColor)
    || !byteColor(evidence.destinationColor)
    || !Number.isInteger(evidence.replacementCount)
    || evidence.replacementCount < 1) {
    throw new Error(`invalid palette-normalization evidence for ${record.filename}`);
  }
}

async function verifyCompiledAssetRoot(assetRoot, manifest) {
  const root = path.resolve(assetRoot);
  const sourceHash = manifest.source?.sha256;
  const registration = await loadAssetRegistration(root, sourceHash);
  const sourceRecords = [];
  for (const record of registration.assets.values()) {
    if (await fileSha256(path.join(root, record.filename)) !== record.outputSha256) {
      throw new Error(`compiled asset checksum mismatch for ${record.filename}`);
    }
    validatePaletteEvidence(record);
    if (record.sourceXstageSha256 !== sourceHash) continue;
    if (!SHA256.test(record.sourceSha256 ?? "")) {
      throw new Error(`compiled asset has an invalid source checksum: ${record.filename}`);
    }
    const element = manifest.elements.find((candidate) => (
      String(candidate.id) === String(record.elementId) && candidate.name === record.element
    ));
    if (!element || !element.drawings.map(String).includes(String(record.drawing))) {
      throw new Error(`compiled asset does not resolve through its source manifest: ${record.filename}`);
    }
    sourceRecords.push(record);
  }
  if (sourceRecords.length === 0) {
    throw new Error("compiled asset receipt contains no artwork for its manifest source");
  }
  const groups = new Map();
  for (const record of sourceRecords) {
    const key = `${record.element}:${record.drawing}`;
    const variants = groups.get(key) ?? new Map();
    if (variants.has(record.variant)) {
      throw new Error(`compiled asset receipt duplicates ${key}:${record.variant}`);
    }
    variants.set(record.variant, record);
    groups.set(key, variants);
  }
  for (const [key, variants] of groups) {
    if (!variants.has("main")) throw new Error(`compiled asset receipt has no main variant for ${key}`);
  }
  return {
    root,
    receipt: registration.receipt,
    records: sourceRecords,
    groups,
  };
}

function drawingElementForNode(manifest, scene, node) {
  const columnName = attributeAtPath(node, "drawing.element")?.attributes?.col;
  const column = scene.columns.find((candidate) => candidate.name === columnName);
  const element = manifest.elements.find((candidate) => candidate.id === column?.elementId);
  if (!element) throw new Error(`${node.path} does not resolve to a drawing element`);
  return element;
}

function variantAudit(variants) {
  return [...variants.values()].sort((left, right) => left.variant.localeCompare(right.variant)).map((record) => ({
    variant: record.variant,
    filename: record.filename,
    outputSha256: record.outputSha256,
    sourceSha256: record.sourceSha256,
    canvas: { width: record.canvas.width, height: record.canvas.height },
    modelOrigin: { x: record.modelOrigin.x, y: record.modelOrigin.y },
    paletteNormalization: record.paletteNormalization ?? null,
  }));
}

function sameNormalizedVariants(sourceVariants, targetVariants) {
  const source = [...sourceVariants.entries()].sort(([left], [right]) => left.localeCompare(right));
  const target = [...targetVariants.entries()].sort(([left], [right]) => left.localeCompare(right));
  return source.length === target.length && source.every(([variant, record], index) => (
    variant === target[index][0]
      && record.outputSha256 === target[index][1].outputSha256
      && record.canvas.width === target[index][1].canvas.width
      && record.canvas.height === target[index][1].canvas.height
      && record.modelOrigin.x === target[index][1].modelOrigin.x
      && record.modelOrigin.y === target[index][1].modelOrigin.y
  ));
}

function inventoryCompatibleDrawings({
  sourceManifest,
  targetManifest,
  topology,
  sourceAssets,
  targetAssets,
  startFrame,
  endFrame,
}) {
  const sourceScene = sourceManifest.scenes[0];
  const targetScene = targetManifest.scenes[0];
  const sourceColumns = indexColumns(sourceScene);
  const durationFrames = endFrame - startFrame + 1;
  const drawings = {};
  const inventory = new Map();

  for (const { sourceNode, targetNode } of topology.renderedReadMappings) {
    const targetElement = drawingElementForNode(targetManifest, targetScene, targetNode);
    const keys = [];
    let previous = Symbol("unset");
    for (let localFrame = 1; localFrame <= durationFrames; localFrame += 1) {
      const sourceFrame = startFrame + localFrame - 1;
      const resolved = resolveReadDrawing(sourceManifest, sourceScene, sourceNode, sourceFrame);
      const drawing = resolved?.drawing === undefined ? null : String(resolved.drawing);
      if (drawing !== previous) {
        keys.push({ frame: localFrame, drawing });
        previous = drawing;
      }
      if (!resolved) continue;
      if (resolved.element !== targetElement.name) {
        throw new Error(`mapped READ element mismatch for ${targetNode.path}: ${resolved.element} != ${targetElement.name}`);
      }
      const pairKey = `${targetNode.path}:${drawing}`;
      if (!inventory.has(pairKey)) {
        inventory.set(pairKey, {
          sourceNode,
          targetNode,
          sourceElement: resolved.element,
          targetElement,
          drawing,
        });
      }
    }
    drawings[targetNode.name] = keys;
  }

  const drawingSources = {};
  const pairs = [];
  const counts = {
    "canonical-identical": 0,
    "absent-from-canonical": 0,
    "same-id-different-artwork": 0,
  };
  for (const entry of [...inventory.values()].sort((left, right) => (
    `${left.targetNode.path}:${left.drawing}`.localeCompare(`${right.targetNode.path}:${right.drawing}`)
  ))) {
    const sourceVariants = sourceAssets.groups.get(`${entry.sourceElement}:${entry.drawing}`);
    if (!sourceVariants) {
      throw new Error(`used source artwork was not compiled: ${entry.sourceElement}:${entry.drawing}`);
    }
    const targetDeclaresDrawing = entry.targetElement.drawings.map(String).includes(entry.drawing);
    const targetVariants = targetAssets.groups.get(`${entry.targetElement.name}:${entry.drawing}`);
    let classification;
    if (!targetDeclaresDrawing) {
      classification = "absent-from-canonical";
    } else {
      if (!targetVariants) {
        throw new Error(`canonical artwork was not compiled for comparison: ${entry.targetElement.name}:${entry.drawing}`);
      }
      classification = sameNormalizedVariants(sourceVariants, targetVariants)
        ? "canonical-identical"
        : "same-id-different-artwork";
    }
    counts[classification] += 1;
    const sourceBound = classification !== "canonical-identical";
    if (sourceBound) {
      drawingSources[entry.targetNode.name] ??= {};
      drawingSources[entry.targetNode.name][entry.drawing] = sourceManifest.source.sha256;
    }
    pairs.push({
      sourceReadName: entry.sourceNode.name,
      sourceReadPath: entry.sourceNode.path,
      targetReadName: entry.targetNode.name,
      targetReadPath: entry.targetNode.path,
      drawing: entry.drawing,
      classification,
      sourceBound,
      sourceVariants: variantAudit(sourceVariants),
      targetVariants: targetVariants ? variantAudit(targetVariants) : [],
    });
  }
  return { drawings, drawingSources, pairs, counts };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function deduplicateDeformationSamples(samples) {
  const unique = [];
  const frameSamples = [];
  const indices = new Map();
  for (const sample of samples) {
    const identity = JSON.stringify(canonicalize(sample));
    let index = indices.get(identity);
    if (index === undefined) {
      index = unique.length;
      indices.set(identity, index);
      unique.push(sample);
    }
    frameSamples.push(index);
  }
  return { samples: unique, frameSamples };
}

function buildCompatibleImport({
  args,
  sourceManifest,
  targetManifest,
  sourceAssets,
  targetAssets,
  archiveProof,
  paintOrder = READ_PAINT_ORDER,
}) {
  const sourceFile = validateCompatibleProvenance(args, sourceManifest, targetManifest);
  const verifiedArchive = validateArchiveProof(args, sourceManifest, sourceAssets, archiveProof);
  const sourceScene = sourceManifest.scenes[0];
  const targetScene = targetManifest.scenes[0];
  if (args.start < sourceScene.startFrame || args.end > sourceScene.stopFrame) {
    throw new Error(`source range must stay within ${sourceScene.startFrame}-${sourceScene.stopFrame}`);
  }
  if (args.baseFrame < targetScene.startFrame || args.baseFrame > targetScene.stopFrame) {
    throw new Error(`target base frame must stay within ${targetScene.startFrame}-${targetScene.stopFrame}`);
  }
  const topology = auditCompatibleTopology({
    sourceManifest,
    targetManifest,
    nodePrefix: args.nodePrefix,
    omitNodes: args.omitNodes,
    targetBaseNodes: args.targetBaseNodes,
    outerMasterMappings: args.outerMasterMappings,
    paintOrder,
    startFrame: args.start,
    endFrame: args.end,
    baseFrame: args.baseFrame,
  });
  const drawingAudit = inventoryCompatibleDrawings({
    sourceManifest,
    targetManifest,
    topology,
    sourceAssets,
    targetAssets,
    startFrame: args.start,
    endFrame: args.end,
  });
  const sourceColumns = indexColumns(sourceScene);
  const durationFrames = args.end - args.start + 1;
  const controls = {};
  for (const { sourceNode, targetNode } of topology.mappings) {
    controls[targetNode.name] = Array.from({ length: durationFrames }, (_, index) => ({
      ...keyFromState(
        index + 1,
        controlStateForNode(sampleNode(sourceNode, sourceColumns, args.start + index)),
      ),
      interpolation: "hold",
    }));
  }
  const deformationSamples = {};
  for (const { sourceNode, targetNode } of topology.deformationMappings) {
    const sampled = Array.from({ length: durationFrames }, (_, index) => ({
      ...sampleNode(sourceNode, sourceColumns, args.start + index),
      path: targetNode.path,
      type: targetNode.type,
    }));
    deformationSamples[targetNode.path] = {
      nodeType: targetNode.type,
      sampleIndexBase: 0,
      ...deduplicateDeformationSamples(sampled),
    };
  }
  const omittedSourceNodes = topology.audit.omittedSourceNodes.map(({ path: nodePath }) => nodePath);
  const targetBaseNodes = topology.audit.targetBaseNodes.map(({ path: nodePath }) => nodePath);
  const outerMasterMappings = topology.audit.mappings.filter(({ mappingKind }) => (
    mappingKind === "explicit-outer-master"
  ));
  const recipe = {
    schemaVersion: "shaz-pose-recipe-v1",
    id: args.id,
    fps: 24,
    durationFrames,
    baseFrame: args.baseFrame,
    sourceXstageSha256: targetManifest.source.sha256,
    artistRenderedFramesUsed: false,
    sourceAction: {
      sourceFile,
      sourceXstageSha256: sourceManifest.source.sha256,
      sourceArchiveName: args.sourceArchiveName,
      sourceArchiveSha256: args.sourceArchiveSha256,
      sourceXstagePath: args.sourceXstagePath,
      startFrame: args.start,
      endFrame: args.end,
      generatedFrom: "xstage-control-channels-drawing-exposures-and-deformation-samples",
      extractionBoundary: {
        type: "node-path-prefix",
        nodePrefix: args.nodePrefix,
        omittedSourceNodes,
      },
      shotControlsOmitted: topology.audit.omittedSourceNodes.map(({ name }) => name),
    },
    stagingNormalization: {
      operation: "compatible-xstage-topology-audited-import",
      omittedSourceNodes,
      targetBaseNodes,
      outerMasterMappings: outerMasterMappings.map((mapping) => ({
        sourceNode: mapping.sourcePath,
        targetNode: mapping.targetPath,
      })),
      targetBaseManifestSha256: targetManifest.source.sha256,
      targetBaseFrame: args.baseFrame,
      preservedInternalChoreography: topology.audit.preservedInternalChoreography,
    },
    controls,
    drawings: drawingAudit.drawings,
    drawingSources: drawingAudit.drawingSources,
    deformationSamples,
    deformationFrames: Array.from(
      { length: durationFrames },
      (_, index) => args.start + index,
    ),
  };
  createPoseRuntime(targetManifest, recipe);
  const audit = {
    schemaVersion: "shaz-compatible-xstage-import-audit-v1",
    source: {
      manifestSha256: sourceManifest.source.sha256,
      xstageFile: sourceFile,
      xstagePath: args.sourceXstagePath,
      archiveName: args.sourceArchiveName,
      archiveSha256: args.sourceArchiveSha256,
      archiveVerification: "full-archive-and-exact-member-sha256",
      verifiedArchiveEntryCount: verifiedArchive.entryCount,
      verifiedTvgAssetRecordCount: verifiedArchive.verifiedTvgEntries.length,
      verifiedTvgArchiveMemberCount: new Set(
        verifiedArchive.verifiedTvgEntries.map(({ archivePath }) => archivePath),
      ).size,
      assetReceiptSchemaVersion: sourceAssets.receipt.schemaVersion,
    },
    target: {
      manifestSha256: targetManifest.source.sha256,
      baseFrame: args.baseFrame,
      assetReceiptSchemaVersion: targetAssets.receipt.schemaVersion,
    },
    range: {
      startFrame: args.start,
      endFrame: args.end,
      durationFrames,
      fps: 24,
    },
    boundary: recipe.sourceAction.extractionBoundary,
    topology: topology.audit,
    drawings: {
      pairs: drawingAudit.pairs,
      counts: drawingAudit.counts,
      sourceBoundDrawingMap: recipe.drawingSources,
    },
    paletteNormalization: {
      comparisonBasis: "compiler-normalized-output-sha256-canvas-and-model-origin-by-complete-variant-set",
      sourceEvidenceCount: drawingAudit.pairs.flatMap(({ sourceVariants }) => sourceVariants)
        .filter(({ paletteNormalization }) => paletteNormalization !== null).length,
      targetEvidenceCount: drawingAudit.pairs.flatMap(({ targetVariants }) => targetVariants)
        .filter(({ paletteNormalization }) => paletteNormalization !== null).length,
    },
    recipeSha256: poseRecipeSha256(recipe),
  };
  return { recipe, audit };
}

function compatibleImportTransactionPaths(output, auditOutput) {
  const recipePath = path.resolve(output);
  const auditPath = path.resolve(auditOutput);
  if (recipePath === auditPath) throw new Error("compatible import outputs must be separate");
  const pairId = sha256Bytes(Buffer.from(`${recipePath}\0${auditPath}`)).slice(0, 20);
  const stateRoot = path.join(path.dirname(recipePath), ".wiggly-authoring-state");
  const transactionDirectory = path.join(
    stateRoot,
    `${COMPATIBLE_IMPORT_TRANSACTION_PREFIX}${pairId}`,
  );
  return {
    recipePath,
    auditPath,
    pairId,
    stateRoot,
    transactionDirectory,
    ownerPath: path.join(transactionDirectory, "owner.json"),
    journalPath: path.join(transactionDirectory, "journal.json"),
  };
}

async function readRegularFileOrMissing(filename, fileSystem) {
  try {
    const stat = await fileSystem.lstat(filename);
    if (!stat.isFile()) throw new Error(`compatible import output must be a regular file: ${filename}`);
    const bytes = await fileSystem.readFile(filename);
    return { exists: true, bytes, sha256: sha256Bytes(bytes) };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false, bytes: null, sha256: null };
    throw error;
  }
}

async function writeJournalAtomically(paths, journal, fileSystem) {
  const next = path.join(
    paths.transactionDirectory,
    `.journal-next-${crypto.randomUUID()}.json`,
  );
  await fileSystem.writeFile(next, `${JSON.stringify(journal, null, 2)}\n`, { flag: "wx" });
  await fileSystem.rename(next, paths.journalPath);
}

async function installBytesAtomically(filename, bytes, pairId, fileSystem) {
  const next = path.join(path.dirname(filename), `.${path.basename(filename)}.${pairId}.next`);
  await fileSystem.rm(next, { force: true });
  await fileSystem.writeFile(next, bytes, { flag: "wx" });
  await fileSystem.rename(next, filename);
  return next;
}

function validatePairRecord(record, expectedPath, context, paths) {
  const expectedStaged = `staged-${context}.json`;
  const expectedBackup = `backup-${context}.json`;
  const expectedNext = path.join(
    path.dirname(expectedPath),
    `.${path.basename(expectedPath)}.${paths.pairId}.next`,
  );
  if (!record || record.path !== expectedPath || typeof record.hadBefore !== "boolean"
    || (record.hadBefore ? !SHA256.test(record.beforeSha256 ?? "") : record.beforeSha256 !== null)
    || !SHA256.test(record.afterSha256 ?? "")
    || record.stagedFile !== expectedStaged || record.backupFile !== expectedBackup
    || record.nextPath !== expectedNext) {
    throw new Error(`unsafe compatible import ${context} journal record`);
  }
}

async function classifyPairOutput(record, fileSystem) {
  const current = await readRegularFileOrMissing(record.path, fileSystem);
  if (!current.exists) return record.hadBefore ? "unknown" : "before";
  if (current.sha256 === record.afterSha256) return "after";
  if (record.hadBefore && current.sha256 === record.beforeSha256) return "before";
  return "unknown";
}

async function validateTransactionFile(filename, expectedSha256, context, fileSystem) {
  const state = await readRegularFileOrMissing(filename, fileSystem);
  if (!state.exists || state.sha256 !== expectedSha256) {
    throw new Error(`compatible import ${context} checksum mismatch`);
  }
  return state.bytes;
}

async function recoverCompatibleImportPair({
  output,
  auditOutput,
  fileSystem = fs,
}) {
  const paths = compatibleImportTransactionPaths(output, auditOutput);
  let owner;
  try {
    owner = JSON.parse(await fileSystem.readFile(paths.ownerPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      try {
        const stat = await fileSystem.lstat(paths.transactionDirectory);
        if (!stat.isDirectory()) {
          throw new Error(`compatible import transaction is not a directory: ${paths.transactionDirectory}`);
        }
      } catch (statError) {
        if (statError?.code === "ENOENT") return { kind: "none", ...paths };
        throw statError;
      }
      const entries = await fileSystem.readdir(paths.transactionDirectory);
      if (entries.length === 0) {
        await fileSystem.rmdir(paths.transactionDirectory);
        return { kind: "abandoned-empty-transaction", ...paths };
      }
      throw new Error(`ownerless compatible import transaction: ${paths.transactionDirectory}`);
    }
    throw error;
  }
  if (owner?.schemaVersion !== COMPATIBLE_IMPORT_OWNER_SCHEMA
    || owner.pairId !== paths.pairId
    || owner.recipePath !== paths.recipePath
    || owner.auditPath !== paths.auditPath) {
    throw new Error(`unsafe compatible import transaction owner: ${paths.transactionDirectory}`);
  }

  let journal;
  try {
    journal = JSON.parse(await fileSystem.readFile(paths.journalPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await fileSystem.rm(paths.transactionDirectory, { recursive: true, force: true });
    return { kind: "abandoned-staging", ...paths };
  }
  if (journal?.schemaVersion !== COMPATIBLE_IMPORT_JOURNAL_SCHEMA
    || journal.pairId !== paths.pairId
    || !["prepared", "audit-installed", "committed"].includes(journal.phase)) {
    throw new Error(`unsafe compatible import journal: ${paths.transactionDirectory}`);
  }
  validatePairRecord(journal.recipe, paths.recipePath, "recipe", paths);
  validatePairRecord(journal.audit, paths.auditPath, "audit", paths);
  const records = [journal.recipe, journal.audit];
  for (const record of records) {
    await validateTransactionFile(
      path.join(paths.transactionDirectory, record.stagedFile),
      record.afterSha256,
      "staged output",
      fileSystem,
    );
    if (record.hadBefore) {
      await validateTransactionFile(
        path.join(paths.transactionDirectory, record.backupFile),
        record.beforeSha256,
        "output backup",
        fileSystem,
      );
    }
  }
  const states = await Promise.all(records.map((record) => classifyPairOutput(record, fileSystem)));
  if (states.includes("unknown")) {
    throw new Error("current compatible import outputs contain bytes not recognized by their journal");
  }
  if (states.every((state) => state === "after")) {
    for (const record of records) await fileSystem.rm(record.nextPath, { force: true });
    await fileSystem.rm(paths.transactionDirectory, { recursive: true, force: true });
    return { kind: "committed-cleanup", ...paths };
  }

  for (const record of records) {
    if (record.hadBefore) {
      const backup = await fileSystem.readFile(
        path.join(paths.transactionDirectory, record.backupFile),
      );
      await installBytesAtomically(record.path, backup, paths.pairId, fileSystem);
    } else {
      await fileSystem.rm(record.path, { force: true });
    }
    await fileSystem.rm(record.nextPath, { force: true });
  }
  await fileSystem.rm(paths.transactionDirectory, { recursive: true, force: true });
  return { kind: "rolled-back", ...paths };
}

async function writeCompatibleImportPair({
  output,
  auditOutput,
  recipeBytes,
  auditBytes,
  fileSystem = fs,
}) {
  const paths = compatibleImportTransactionPaths(output, auditOutput);
  await recoverCompatibleImportPair({ output, auditOutput, fileSystem });
  await Promise.all([
    fileSystem.mkdir(path.dirname(paths.recipePath), { recursive: true }),
    fileSystem.mkdir(path.dirname(paths.auditPath), { recursive: true }),
    fileSystem.mkdir(paths.stateRoot, { recursive: true }),
  ]);
  const [recipeBefore, auditBefore] = await Promise.all([
    readRegularFileOrMissing(paths.recipePath, fileSystem),
    readRegularFileOrMissing(paths.auditPath, fileSystem),
  ]);
  const normalizedRecipeBytes = Buffer.isBuffer(recipeBytes) ? recipeBytes : Buffer.from(recipeBytes);
  const normalizedAuditBytes = Buffer.isBuffer(auditBytes) ? auditBytes : Buffer.from(auditBytes);
  await fileSystem.mkdir(paths.transactionDirectory);
  let journalWritten = false;
  try {
    await fileSystem.writeFile(paths.ownerPath, `${JSON.stringify({
      schemaVersion: COMPATIBLE_IMPORT_OWNER_SCHEMA,
      pairId: paths.pairId,
      recipePath: paths.recipePath,
      auditPath: paths.auditPath,
    }, null, 2)}\n`, { flag: "wx" });
    const records = [
      {
        label: "recipe",
        path: paths.recipePath,
        before: recipeBefore,
        bytes: normalizedRecipeBytes,
        stagedFile: "staged-recipe.json",
        backupFile: "backup-recipe.json",
      },
      {
        label: "audit",
        path: paths.auditPath,
        before: auditBefore,
        bytes: normalizedAuditBytes,
        stagedFile: "staged-audit.json",
        backupFile: "backup-audit.json",
      },
    ].map((record) => ({
      ...record,
      nextPath: path.join(
        path.dirname(record.path),
        `.${path.basename(record.path)}.${paths.pairId}.next`,
      ),
    }));
    for (const record of records) {
      await fileSystem.writeFile(
        path.join(paths.transactionDirectory, record.stagedFile),
        record.bytes,
        { flag: "wx" },
      );
      if (record.before.exists) {
        await fileSystem.writeFile(
          path.join(paths.transactionDirectory, record.backupFile),
          record.before.bytes,
          { flag: "wx" },
        );
      }
    }
    const journal = {
      schemaVersion: COMPATIBLE_IMPORT_JOURNAL_SCHEMA,
      pairId: paths.pairId,
      phase: "prepared",
      recipe: null,
      audit: null,
    };
    for (const record of records) {
      journal[record.label] = {
        path: record.path,
        hadBefore: record.before.exists,
        beforeSha256: record.before.sha256,
        afterSha256: sha256Bytes(record.bytes),
        stagedFile: record.stagedFile,
        backupFile: record.backupFile,
        nextPath: record.nextPath,
      };
    }
    await writeJournalAtomically(paths, journal, fileSystem);
    journalWritten = true;
    if (await classifyPairOutput(journal.recipe, fileSystem) !== "before"
      || await classifyPairOutput(journal.audit, fileSystem) !== "before") {
      throw new Error("compatible import outputs changed while the transaction was prepared");
    }
    await installBytesAtomically(paths.auditPath, normalizedAuditBytes, paths.pairId, fileSystem);
    journal.phase = "audit-installed";
    await writeJournalAtomically(paths, journal, fileSystem);
    await installBytesAtomically(paths.recipePath, normalizedRecipeBytes, paths.pairId, fileSystem);
    journal.phase = "committed";
    await writeJournalAtomically(paths, journal, fileSystem);
    await fileSystem.rm(paths.transactionDirectory, { recursive: true, force: true });
    return { ...paths, recipeSha256: journal.recipe.afterSha256, auditSha256: journal.audit.afterSha256 };
  } catch (error) {
    if (!journalWritten) {
      await fileSystem.rm(paths.transactionDirectory, { recursive: true, force: true });
      throw error;
    }
    let recovery;
    try {
      recovery = await recoverCompatibleImportPair({ output, auditOutput, fileSystem });
    } catch (recoveryError) {
      throw new AggregateError(
        [error, recoveryError],
        "compatible import failed and rollback was incomplete",
      );
    }
    if (recovery.kind === "committed-cleanup") {
      return {
        ...paths,
        recipeSha256: sha256Bytes(normalizedRecipeBytes),
        auditSha256: sha256Bytes(normalizedAuditBytes),
      };
    }
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.compatibleSource) {
    await recoverCompatibleImportPair({
      output: args.output,
      auditOutput: args.auditOutput,
    });
  }
  const manifest = await loadManifest(path.resolve(args.manifest));
  if (args.compatibleSource) {
    const targetManifest = await loadManifest(path.resolve(args.targetManifest));
    validateCompatibleProvenance(args, manifest, targetManifest);
    const [sourceAssets, targetAssets] = await Promise.all([
      verifyCompiledAssetRoot(args.compatibleAssets, manifest),
      verifyCompiledAssetRoot(args.targetAssets, targetManifest),
    ]);
    const archiveProof = await verifyCompatibleSourceArchive(
      args,
      manifest,
      sourceAssets,
    );
    const { recipe, audit } = buildCompatibleImport({
      args,
      sourceManifest: manifest,
      targetManifest,
      sourceAssets,
      targetAssets,
      archiveProof,
    });
    const output = path.resolve(args.output);
    const auditOutput = path.resolve(args.auditOutput);
    await writeCompatibleImportPair({
      output,
      auditOutput,
      recipeBytes: `${JSON.stringify(recipe, null, 2)}\n`,
      auditBytes: `${JSON.stringify(audit, null, 2)}\n`,
    });
    process.stdout.write(`${output}\n${auditOutput}\n${poseRecipeSha256(recipe)}\n`);
    return;
  }
  const scene = manifest.scenes[0];
  if (!scene) throw new Error("manifest contains no scene");
  if (args.end > scene.stopFrame) throw new Error(`source range exceeds frame ${scene.stopFrame}`);
  const columns = indexColumns(scene);
  const durationFrames = args.end - args.start + 1;
  const exposureChangeFrames = validateExposureChangeFrames(
    args.exposureChangeFrames,
    durationFrames,
  );
  const sampledLocalFrames = exposureChangeFrames ?? Array.from(
    { length: durationFrames },
    (_, index) => index + 1,
  );
  const extractableNodes = scene.nodes.filter((candidate) => (
    candidate.type === "PEG" || candidate.type === "READ"
  ));
  const selectedNodes = extractableNodes.filter((candidate) => (
    args.nodePrefix === null || candidate.path.startsWith(args.nodePrefix)
  ));
  if (args.nodePrefix !== null && selectedNodes.length === 0) {
    throw new Error(
      `--node-prefix ${JSON.stringify(args.nodePrefix)} matched zero PEG/READ nodes; extraction aborted`,
    );
  }
  const controls = {};
  const drawings = {};

  for (const node of selectedNodes) {
    const baseState = controlStateForNode(sampleNode(node, columns, args.baseFrame));
    const sampledFrames = [];
    for (const localFrame of sampledLocalFrames) {
      const sourceFrame = args.start + localFrame - 1;
      sampledFrames.push({
        frame: localFrame,
        state: controlStateForNode(sampleNode(node, columns, sourceFrame)),
      });
    }
    if (sampledFrames.some(({ state }) => !statesEqual(state, baseState))) {
      const selectedFrames = exposureChangeFrames
        ? sampledFrames
        : simplifyControlFrames(sampledFrames);
      controls[node.name] = selectedFrames.map(({ frame, state }) => ({
        ...keyFromState(frame, state),
        ...(exposureChangeFrames ? { interpolation: "hold" } : {}),
      }));
    }

    if (node.type !== "READ") continue;
    const baseDrawing = resolveReadDrawing(manifest, scene, node, args.baseFrame)?.drawing ?? null;
    const drawingKeys = [];
    let previous = Symbol("unset");
    for (const localFrame of sampledLocalFrames) {
      const sourceFrame = args.start + localFrame - 1;
      const drawing = resolveReadDrawing(manifest, scene, node, sourceFrame)?.drawing ?? null;
      if (drawing !== previous) {
        drawingKeys.push({ frame: localFrame, drawing });
        previous = drawing;
      }
    }
    if (drawingKeys.length > 1 || drawingKeys[0]?.drawing !== baseDrawing) {
      drawings[node.name] = drawingKeys;
    }
  }

  const recipe = {
    schemaVersion: "shaz-pose-recipe-v1",
    id: args.id,
    fps: 24,
    durationFrames,
    baseFrame: args.baseFrame,
    sourceXstageSha256: manifest.source.sha256,
    artistRenderedFramesUsed: false,
    sourceAction: {
      startFrame: args.start,
      endFrame: args.end,
      generatedFrom: "xstage-control-channels-and-drawing-exposures",
      extractionBoundary: args.nodePrefix === null
        ? { type: "entire-scene" }
        : { type: "node-path-prefix", nodePrefix: args.nodePrefix },
    },
    controls,
    drawings,
    deformationFrames: deformationFramesForExposureChanges(
      args.start,
      durationFrames,
      exposureChangeFrames,
    ),
    ...(exposureChangeFrames ? {
      quality: {
        maximumIdenticalFrames: Math.max(
          ...exposureChangeFrames.slice(1).map((frame, index) => (
            frame - exposureChangeFrames[index]
          )),
          durationFrames - exposureChangeFrames.at(-1) + 1,
        ),
        sourceExposureChangeFrames: exposureChangeFrames,
      },
      authoringCorrections: [{
        control: "all-runtime-controls-and-deformations",
        field: "exposure-cadence",
        operation: "artist-authored-step-exposures",
        reason: "Preserve measured artist presentation cadence instead of inventing linear in-betweens",
      }],
    } : {}),
  };
  const output = path.resolve(args.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(recipe, null, 2)}\n`);
  process.stdout.write(`${output}\n${poseRecipeSha256(recipe)}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  auditCompatibleTopology,
  buildCompatibleImport,
  deduplicateDeformationSamples,
  deformationFramesForExposureChanges,
  inventoryCompatibleDrawings,
  parseArgs as parseExtractArgs,
  recoverCompatibleImportPair,
  simplifyControlFrames,
  statesEqual,
  validateExposureChangeFrames,
  validateCompatibleProvenance,
  verifyCompatibleSourceArchive,
  verifyCompiledAssetRoot,
  writeCompatibleImportPair,
};
