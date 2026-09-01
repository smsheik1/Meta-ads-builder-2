#!/usr/bin/env node

import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { validateCompiledAssetTree } from "./compile-tvg-assets.mjs";
import {
  retainedCanonicalBackupPath,
  withCanonicalAssetIdentityLease,
  withCompatibleRegistrationLease,
} from "./register-compatible-tvg-assets.mjs";
import { assetFilename, loadAssetRegistration } from "./rig-v2-renderer.mjs";

const SHA256 = /^[a-f0-9]{64}$/;
const scriptPath = fileURLToPath(import.meta.url);

function requiredValue(values, index, flag) {
  const value = values[index + 1];
  if (typeof value !== "string" || value === "" || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseCanonicalRefreshArgs(values) {
  const args = {
    manifest: null,
    baseAssets: null,
    compiledAssets: null,
    registrationStateDirectory: null,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = requiredValue(values, index++, value);
    else if (value === "--base-assets") {
      args.baseAssets = requiredValue(values, index++, value);
    } else if (value === "--compiled-assets") {
      args.compiledAssets = requiredValue(values, index++, value);
    } else if (value === "--registration-state-dir") {
      args.registrationStateDirectory = requiredValue(values, index++, value);
    } else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.baseAssets || !args.compiledAssets) {
    throw new Error(
      "usage: refresh-canonical-tvg-assets.mjs --manifest rig-v2/runtime.json --base-assets rig-v2/assets --compiled-assets compiled-assets [--registration-state-dir directory]",
    );
  }
  return args;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function lstatOrMissing(filename, fileSystem) {
  try {
    return await fileSystem.lstat(filename);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function realDirectoryIdentity(requested, label, fileSystem) {
  const lexical = path.resolve(requested);
  const stat = await fileSystem.lstat(lexical);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} must remain a real directory, not a symlink`);
  }
  const canonical = path.resolve(await fileSystem.realpath(lexical));
  if (canonical !== lexical) {
    throw new Error(`${label} changed its canonical path`);
  }
  const canonicalStat = await fileSystem.lstat(canonical);
  if (!canonicalStat.isDirectory()
    || canonicalStat.isSymbolicLink()
    || canonicalStat.dev !== stat.dev
    || canonicalStat.ino !== stat.ino) {
    throw new Error(`${label} changed during identity validation`);
  }
  return { dev: stat.dev, ino: stat.ino };
}

async function assertDirectoryIdentity(requested, expected, label, fileSystem) {
  const actual = await realDirectoryIdentity(requested, label, fileSystem);
  if (!sameDirectoryIdentity(actual, expected)) {
    throw new Error(`${label} was replaced after validation`);
  }
}

async function removeOwnedDirectory(requested, expected, label, fileSystem) {
  const stat = await lstatOrMissing(requested, fileSystem);
  if (!stat) return;
  await assertDirectoryIdentity(requested, expected, label, fileSystem);
  const parent = path.dirname(requested);
  const tombstone = path.join(
    parent,
    `.${path.basename(requested)}.retired-${crypto.randomUUID()}`,
  );
  if (await lstatOrMissing(tombstone, fileSystem)) {
    throw new Error(`${label} cleanup tombstone already exists`);
  }
  await assertDirectoryIdentity(requested, expected, label, fileSystem);
  await fileSystem.rename(requested, tombstone);
  await syncRealPath(parent, "directory", `${label} parent`, fileSystem);
  await assertDirectoryIdentity(tombstone, expected, `${label} retired tombstone`, fileSystem);
  await fileSystem.rm(tombstone, { recursive: true, force: true });
  await syncRealPath(parent, "directory", `${label} parent`, fileSystem);
}

async function realDirectory(requested, label, fileSystem) {
  const lexical = path.resolve(requested);
  const lexicalStat = await fileSystem.lstat(lexical);
  if (!lexicalStat.isDirectory() || lexicalStat.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory, not a symlink`);
  }
  const canonical = path.resolve(await fileSystem.realpath(lexical));
  const canonicalStat = await fileSystem.lstat(canonical);
  if (!canonicalStat.isDirectory()
    || canonicalStat.isSymbolicLink()
    || canonicalStat.dev !== lexicalStat.dev
    || canonicalStat.ino !== lexicalStat.ino) {
    throw new Error(`${label} changed while resolving its real directory`);
  }
  return canonical;
}

async function syncRealPath(filename, expectedKind, label, fileSystem) {
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot durably sync authoring paths without following symlinks");
  }
  const stat = await fileSystem.lstat(filename);
  const expectedType = expectedKind === "directory" ? stat.isDirectory() : stat.isFile();
  if (!expectedType || stat.isSymbolicLink()) {
    throw new Error(`${label} must remain a real ${expectedKind}`);
  }
  const handle = await fileSystem.open(
    filename,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const openedStat = await handle.stat();
    const openedType = expectedKind === "directory"
      ? openedStat.isDirectory()
      : openedStat.isFile();
    if (!openedType || openedStat.dev !== stat.dev || openedStat.ino !== stat.ino) {
      throw new Error(`${label} changed before durable sync`);
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncDirectoryTree(directory, fileSystem) {
  const entries = await fileSystem.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await syncDirectoryTree(path.join(directory, entry.name), fileSystem);
    }
  }
  await syncRealPath(directory, "directory", "canonical refresh staged directory", fileSystem);
}

async function readRealFile(filename, label, fileSystem) {
  const stat = await fileSystem.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a real file, not a symlink`);
  }
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot safely open authoring inputs without following symlinks");
  }
  const handle = await fileSystem.open(
    filename,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  try {
    const openedStat = await handle.stat();
    if (!openedStat.isFile() || openedStat.dev !== stat.dev || openedStat.ino !== stat.ino) {
      throw new Error(`${label} changed during validation`);
    }
    return handle.readFile();
  } finally {
    await handle.close();
  }
}

async function assertRealTree(directory, label, fileSystem) {
  const entries = await fileSystem.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    const stat = await fileSystem.lstat(target);
    if (stat.isSymbolicLink()) throw new Error(`${label} contains a symlink: ${entry.name}`);
    if (stat.isDirectory()) await assertRealTree(target, label, fileSystem);
    else if (!stat.isFile()) throw new Error(`${label} contains an unsupported entry: ${entry.name}`);
  }
}

function parseJson(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function assetIdentity(asset) {
  return `${asset.element}:${String(asset.drawing)}:${asset.variant}`;
}

function expectedCanonicalFilename(asset) {
  try {
    return assetFilename({
      element: asset.element,
      drawing: String(asset.drawing),
    }, asset.variant);
  } catch {
    return null;
  }
}

function selectedCanonicalUpdates({ baseReceipt, compiledReceipt, runtimeSource }) {
  if (baseReceipt.schemaVersion !== "shaz-tvg-asset-receipt-v3") {
    throw new Error("canonical refresh requires an existing v3 asset receipt");
  }
  if (baseReceipt.runtimeXstageSha256 !== runtimeSource) {
    throw new Error("base asset receipt and runtime manifest reference different Xstage sources");
  }
  if (compiledReceipt.schemaVersion !== "shaz-tvg-asset-receipt-v2"
    || compiledReceipt.sourceXstageSha256 !== runtimeSource) {
    throw new Error("compiled receipt must be v2 and match the runtime Xstage source");
  }
  if (compiledReceipt.rasterMarginModelUnits !== baseReceipt.rasterMarginModelUnits) {
    throw new Error("compiled receipt uses a different raster margin");
  }

  const canonicalByIdentity = new Map();
  for (const asset of baseReceipt.assets) {
    if (asset.sourceXstageSha256 !== runtimeSource) continue;
    const key = assetIdentity(asset);
    const matches = canonicalByIdentity.get(key) ?? [];
    matches.push(asset);
    canonicalByIdentity.set(key, matches);
  }

  const compiledIdentities = new Set();
  const replacements = new Map();
  for (const compiled of compiledReceipt.assets) {
    const key = assetIdentity(compiled);
    if (compiledIdentities.has(key)) {
      throw new Error(`compiled receipt repeats drawing identity ${key}`);
    }
    compiledIdentities.add(key);
    const matches = canonicalByIdentity.get(key) ?? [];
    if (matches.length !== 1) {
      throw new Error(`compiled drawing does not uniquely match a canonical-source asset: ${key}`);
    }
    const current = matches[0];
    const expectedFilename = expectedCanonicalFilename(compiled);
    if (!expectedFilename
      || compiled.filename !== expectedFilename
      || current.filename !== expectedFilename
      || compiled.elementId !== current.elementId
      || compiled.source !== current.source
      || compiled.sourceSha256 !== current.sourceSha256
      || !isDeepStrictEqual(
        compiled.paletteNormalization,
        current.paletteNormalization,
      )
      || (compiled.sourceXstageSha256 !== undefined
        && compiled.sourceXstageSha256 !== runtimeSource)) {
      throw new Error(`compiled drawing does not exactly match canonical registration ${key}`);
    }
    replacements.set(current.filename, {
      ...compiled,
      sourceXstageSha256: runtimeSource,
    });
  }
  if (replacements.size === 0) throw new Error("compiled receipt contains no canonical updates");
  return replacements;
}

function assertCompilerAssetGeometry(record, rasterMarginModelUnits) {
  const canvas = record.canvas;
  if (!canvas
    || !Number.isInteger(canvas.width)
    || canvas.width <= 0
    || !Number.isInteger(canvas.height)
    || canvas.height <= 0) {
    throw new Error(`compiled canonical asset has invalid canvas geometry: ${record.filename}`);
  }
  const bounds = record.drawingBounds;
  const values = [
    record.modelOrigin?.x,
    record.modelOrigin?.y,
    bounds?.minX,
    bounds?.minY,
    bounds?.maxX,
    bounds?.maxY,
    rasterMarginModelUnits,
  ];
  if (values.some((value) => !Number.isFinite(value))
    || rasterMarginModelUnits < 0
    || bounds.minX > bounds.maxX
    || bounds.minY > bounds.maxY) {
    throw new Error(`compiled canonical asset has invalid model geometry: ${record.filename}`);
  }
  const expectedOrigin = {
    x: bounds.minX - rasterMarginModelUnits,
    y: bounds.minY - rasterMarginModelUnits,
  };
  const expectedCanvas = {
    width: Math.round(Math.ceil(
      (bounds.maxX - bounds.minX + rasterMarginModelUnits * 2) * 2,
    ) / 2),
    height: Math.round(Math.ceil(
      (bounds.maxY - bounds.minY + rasterMarginModelUnits * 2) * 2,
    ) / 2),
  };
  const nearlyEqual = (left, right) => Math.abs(left - right) <= 1e-6;
  if (!nearlyEqual(record.modelOrigin.x, expectedOrigin.x)
    || !nearlyEqual(record.modelOrigin.y, expectedOrigin.y)
    || canvas.width !== expectedCanvas.width
    || canvas.height !== expectedCanvas.height) {
    throw new Error(`compiled canonical asset violates compiler geometry invariants: ${record.filename}`);
  }
}

async function assertDecodableCanonicalPng(record, bytes, rasterMarginModelUnits) {
  assertCompilerAssetGeometry(record, rasterMarginModelUnits);
  let metadata;
  let decoded;
  try {
    [metadata, decoded] = await Promise.all([
      sharp(bytes, { failOn: "error" }).metadata(),
      sharp(bytes, { failOn: "error" }).ensureAlpha().raw()
        .toBuffer({ resolveWithObject: true }),
    ]);
  } catch (error) {
    throw new Error(`compiled canonical asset is not a decodable PNG: ${record.filename}`, {
      cause: error,
    });
  }
  if (metadata.format !== "png"
    || metadata.width !== record.canvas.width
    || metadata.height !== record.canvas.height
    || decoded.info.width !== record.canvas.width
    || decoded.info.height !== record.canvas.height) {
    throw new Error(`compiled canonical asset PNG dimensions do not match its receipt: ${record.filename}`);
  }
}

async function writeExactStagedTree({
  stage,
  baseAssets,
  compiledAssets,
  baseReceipt,
  replacements,
  runtimeSource,
  fileSystem,
}) {
  const nextAssets = [];
  for (const current of baseReceipt.assets) {
    const replacement = replacements.get(current.filename);
    const record = replacement ?? current;
    const sourceRoot = replacement ? compiledAssets : baseAssets;
    const source = path.join(sourceRoot, ...record.filename.split("/"));
    const destination = path.join(stage, ...record.filename.split("/"));
    const bytes = await readRealFile(source, `asset ${record.filename}`, fileSystem);
    if (sha256(bytes) !== record.outputSha256) {
      throw new Error(`asset checksum mismatch: ${record.filename}`);
    }
    if (replacement) {
      await assertDecodableCanonicalPng(
        record,
        bytes,
        baseReceipt.rasterMarginModelUnits,
      );
    }
    await fileSystem.mkdir(path.dirname(destination), { recursive: true });
    await fileSystem.writeFile(destination, bytes, { flag: "wx" });
    await syncRealPath(destination, "file", `staged asset ${record.filename}`, fileSystem);
    nextAssets.push(record);
  }
  const receipt = { ...baseReceipt, assets: nextAssets };
  await fileSystem.writeFile(
    path.join(stage, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    { flag: "wx" },
  );
  await syncRealPath(
    path.join(stage, "receipt.json"),
    "file",
    "staged canonical asset receipt",
    fileSystem,
  );
  await syncDirectoryTree(stage, fileSystem);
  await loadAssetRegistration(stage, runtimeSource);
  return receipt;
}

async function installStagedTree({
  stage,
  stageIdentity,
  target,
  backup,
  expectedReceiptSha256,
  runtimeSource,
  assertLease,
  fileSystem,
}) {
  await assertLease();
  await assertDirectoryIdentity(stage, stageIdentity, "canonical refresh stage", fileSystem);
  const targetIdentity = await realDirectoryIdentity(
    target,
    "canonical asset target",
    fileSystem,
  );
  const currentReceipt = await readRealFile(
    path.join(target, "receipt.json"),
    "current asset receipt",
    fileSystem,
  );
  if (sha256(currentReceipt) !== expectedReceiptSha256) {
    throw new Error("canonical asset receipt changed while the refresh was staged");
  }
  await loadAssetRegistration(target, runtimeSource);
  if (await lstatOrMissing(backup, fileSystem)) {
    throw new Error("canonical refresh backup already exists; inspect it before retrying");
  }

  let movedTarget = false;
  let installedStage = false;
  try {
    const targetParent = path.dirname(target);
    await syncRealPath(targetParent, "directory", "canonical asset parent", fileSystem);
    await assertDirectoryIdentity(target, targetIdentity, "canonical asset target", fileSystem);
    await assertDirectoryIdentity(stage, stageIdentity, "canonical refresh stage", fileSystem);
    await fileSystem.rename(target, backup);
    movedTarget = true;
    await syncRealPath(targetParent, "directory", "canonical asset parent", fileSystem);
    await assertDirectoryIdentity(
      backup,
      targetIdentity,
      "canonical refresh backup",
      fileSystem,
    );
    const movedReceipt = await readRealFile(
      path.join(backup, "receipt.json"),
      "canonical refresh backup receipt",
      fileSystem,
    );
    if (sha256(movedReceipt) !== expectedReceiptSha256) {
      throw new Error("canonical asset receipt changed during installation");
    }
    await assertDirectoryIdentity(stage, stageIdentity, "canonical refresh stage", fileSystem);
    await fileSystem.rename(stage, target);
    installedStage = true;
    await syncRealPath(targetParent, "directory", "canonical asset parent", fileSystem);
    await assertDirectoryIdentity(target, stageIdentity, "installed canonical asset target", fileSystem);
    await loadAssetRegistration(target, runtimeSource);
    await assertDirectoryIdentity(target, stageIdentity, "installed canonical asset target", fileSystem);
    await assertDirectoryIdentity(
      backup,
      targetIdentity,
      "canonical refresh backup",
      fileSystem,
    );
  } catch (error) {
    if (!movedTarget) throw error;
    try {
      if (installedStage) await fileSystem.rename(target, stage);
      if (await lstatOrMissing(target, fileSystem)) {
        throw new Error("canonical asset target appeared before rollback");
      }
      await fileSystem.rename(backup, target);
      await syncRealPath(
        path.dirname(target),
        "directory",
        "canonical asset parent",
        fileSystem,
      );
      await assertDirectoryIdentity(
        target,
        targetIdentity,
        "rolled-back canonical asset target",
        fileSystem,
      );
      await loadAssetRegistration(target, runtimeSource);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "canonical asset installation failed and rollback was incomplete",
      );
    }
    throw error;
  }

  try {
    await removeOwnedDirectory(
      backup,
      targetIdentity,
      "canonical refresh backup",
      fileSystem,
    );
    await syncRealPath(
      path.dirname(target),
      "directory",
      "canonical asset parent",
      fileSystem,
    );
  } catch (error) {
    throw new Error(
      "canonical assets installed but backup cleanup failed; inspect the retained backup",
      { cause: error },
    );
  }
}

async function refreshUnderLease({
  manifestPath,
  compiledAssets,
  lockedState,
  expectedBaseIdentity,
  fileSystem,
}) {
  const manifestBytes = await readRealFile(
    path.resolve(manifestPath),
    "runtime manifest",
    fileSystem,
  );
  const manifest = parseJson(manifestBytes, "runtime manifest");
  const runtimeSource = manifest.source?.sha256;
  if (!SHA256.test(runtimeSource ?? "")) {
    throw new Error("runtime manifest requires a lowercase SHA-256 source hash");
  }

  const canonicalBaseAssets = lockedState.resolvedBaseAssets;
  await assertDirectoryIdentity(
    canonicalBaseAssets,
    expectedBaseIdentity,
    "canonical asset target",
    fileSystem,
  );
  const canonicalCompiledAssets = await realDirectory(
    compiledAssets,
    "--compiled-assets",
    fileSystem,
  );
  await Promise.all([
    assertRealTree(canonicalBaseAssets, "base asset tree", fileSystem),
    assertRealTree(canonicalCompiledAssets, "compiled asset tree", fileSystem),
  ]);
  const baseReceiptPath = path.join(canonicalBaseAssets, "receipt.json");
  const baseReceiptBytes = await readRealFile(
    baseReceiptPath,
    "base asset receipt",
    fileSystem,
  );
  const [{ receipt: baseReceipt }, compiledValidation] = await Promise.all([
    loadAssetRegistration(canonicalBaseAssets, runtimeSource),
    validateCompiledAssetTree(canonicalCompiledAssets, { fileSystem }),
  ]);
  const receiptAfterValidation = await readRealFile(
    baseReceiptPath,
    "base asset receipt",
    fileSystem,
  );
  if (sha256(receiptAfterValidation) !== sha256(baseReceiptBytes)) {
    throw new Error("canonical asset receipt changed during validation");
  }
  const replacements = selectedCanonicalUpdates({
    baseReceipt,
    compiledReceipt: compiledValidation.receipt,
    runtimeSource,
  });

  const targetParent = path.dirname(canonicalBaseAssets);
  const identityHash = sha256(Buffer.from(canonicalBaseAssets)).slice(0, 16);
  const backup = retainedCanonicalBackupPath(canonicalBaseAssets);
  if (await lstatOrMissing(backup, fileSystem)) {
    throw new Error("canonical refresh backup already exists; inspect it before retrying");
  }
  const stage = await fileSystem.mkdtemp(
    path.join(targetParent, `.shaz-canonical-stage-${identityHash}-`),
  );
  const stageIdentity = await realDirectoryIdentity(
    stage,
    "canonical refresh stage",
    fileSystem,
  );
  let operationError = null;
  try {
    await writeExactStagedTree({
      stage,
      baseAssets: canonicalBaseAssets,
      compiledAssets: canonicalCompiledAssets,
      baseReceipt,
      replacements,
      runtimeSource,
      fileSystem,
    });
    await assertDirectoryIdentity(stage, stageIdentity, "canonical refresh stage", fileSystem);
    await installStagedTree({
      stage,
      stageIdentity,
      target: canonicalBaseAssets,
      backup,
      expectedReceiptSha256: sha256(baseReceiptBytes),
      runtimeSource,
      assertLease: lockedState.assertLease,
      fileSystem,
    });
  } catch (error) {
    operationError = error;
  }
  try {
    await removeOwnedDirectory(
      stage,
      stageIdentity,
      "canonical refresh stage",
      fileSystem,
    );
  } catch (cleanupError) {
    if (operationError) {
      throw new AggregateError(
        [operationError, cleanupError],
        "canonical asset refresh failed and staging cleanup was incomplete",
      );
    }
    throw cleanupError;
  }
  if (operationError) throw operationError;
  return {
    receipt: path.join(canonicalBaseAssets, "receipt.json"),
    runtimeXstageSha256: runtimeSource,
    updatedAssets: [...replacements.keys()].sort(),
  };
}

export async function refreshCanonicalTvgAssets({
  manifest,
  baseAssets,
  compiledAssets,
  registrationStateDirectory = null,
  fileSystem = fs,
  lockHooks = {},
}) {
  if (!manifest || !baseAssets || !compiledAssets) {
    throw new Error("canonical refresh requires manifest, baseAssets, and compiledAssets");
  }
  const requestedBaseAssets = path.resolve(baseAssets);
  let baseStat;
  try {
    baseStat = await fileSystem.lstat(requestedBaseAssets);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return withCanonicalAssetIdentityLease({
      baseAssets: requestedBaseAssets,
      fileSystem,
      lockHooks,
    }, async (lockedState) => {
      await lockedState.assertLease();
      const canonicalMissingTarget = lockedState.resolvedBaseAssets;
      const [targetStat, backupStat] = await Promise.all([
        lstatOrMissing(canonicalMissingTarget, fileSystem),
        lstatOrMissing(
          retainedCanonicalBackupPath(canonicalMissingTarget),
          fileSystem,
        ),
      ]);
      await lockedState.assertLease();
      if (targetStat) {
        throw new Error(
          "canonical asset target reappeared while its identity lease was acquired; retry the refresh",
        );
      }
      if (backupStat) {
        const retainedBackup = retainedCanonicalBackupPath(canonicalMissingTarget);
        if (!backupStat.isDirectory() || backupStat.isSymbolicLink()) {
          throw new Error(
            `canonical asset target is missing and its retained backup is not a real directory: ${retainedBackup}`,
          );
        }
        throw new Error(
          `canonical asset target is missing while its retained backup exists; `
          + `manually rename ${retainedBackup} back to ${requestedBaseAssets}, validate the tree, then retry`,
        );
      }
      throw new Error(
        `canonical asset target is missing and no retained backup exists: ${requestedBaseAssets}`,
        { cause: error },
      );
    });
  }
  if (!baseStat.isDirectory() || baseStat.isSymbolicLink()) {
    throw new Error("--base-assets must be a real directory, not a symlink");
  }
  return withCompatibleRegistrationLease({
    baseAssets: requestedBaseAssets,
    transactionParent: registrationStateDirectory,
    fileSystem,
    lockHooks,
  }, (lockedState) => refreshUnderLease({
    manifestPath: manifest,
    compiledAssets,
    lockedState,
    expectedBaseIdentity: { dev: baseStat.dev, ino: baseStat.ino },
    fileSystem,
  }));
}

async function main() {
  const args = parseCanonicalRefreshArgs(process.argv.slice(2));
  const result = await refreshCanonicalTvgAssets(args);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
