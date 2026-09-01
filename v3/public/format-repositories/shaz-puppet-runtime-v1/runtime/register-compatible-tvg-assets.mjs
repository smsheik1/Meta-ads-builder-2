#!/usr/bin/env node

import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assetFilename, loadAssetRegistration } from "./rig-v2-renderer.mjs";
import { attributeAtPath, indexColumns } from "./vendor/runtime_channels.mjs";

const SHA256 = /^[a-f0-9]{64}$/;
const FLAT_ASSET_FILENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z]+)?\.png$/;
const REGISTRATION_OWNER_ID = /^[a-f0-9]{32}$/;
const REGISTRATION_OWNER_SCHEMA = "shaz-compatible-registration-owner-v1";
const REGISTRATION_JOURNAL_SCHEMA = "shaz-compatible-registration-journal-v1";
const REGISTRATION_ATOMIC_INSTALL_PROTOCOL = "same-parent-atomic-v1";
const REGISTRATION_TRANSACTION_PREFIX = "registration-";
const REGISTRATION_TRANSACTION_RETIRED_PREFIX = "registration-retired-";
const REGISTRATION_JOURNAL_LOCATOR_SCHEMA = "shaz-compatible-registration-locator-v1";
const REGISTRATION_JOURNAL_LOCATOR_FILE = "active-journal.json";
const REGISTRATION_JOURNAL_LOCATOR_NEXT_PREFIX = ".journal-locator-next-";
const REGISTRATION_JOURNAL_LOCATOR_TOMBSTONE_PREFIX = ".journal-locator-tombstone-";
const REGISTRATION_LOCK_SCHEMA = "shaz-compatible-registration-lock-v1";
const REGISTRATION_LOCK_DIRECTORY = "active.lock";
const REGISTRATION_TRANSITION_MUTEX_SCHEMA = "shaz-compatible-registration-transition-v1";
const REGISTRATION_TRANSITION_MUTEX_DIRECTORY = "active.transition.lock";
const REGISTRATION_TRANSITION_TOMBSTONE_PREFIX = ".transition-tombstone-";
const REGISTRATION_LOCK_CANDIDATE_PREFIX = ".lock-candidate-";
const REGISTRATION_LOCK_TOMBSTONE_PREFIX = ".lock-tombstone-";
const REGISTRATION_SOURCE_NEXT_PREFIX = ".registration-source-next-";
const REGISTRATION_SOURCE_PRIOR_PREFIX = ".registration-source-prior-";
const REGISTRATION_RECEIPT_NEXT_PREFIX = ".registration-receipt-next-";
const DEFAULT_LEASE_DURATION_MS = 30_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 5_000;
const DEFAULT_TRANSITION_RETRY_ATTEMPTS = 40;
const DEFAULT_TRANSITION_RETRY_DELAY_MS = 5;
const scriptPath = fileURLToPath(import.meta.url);

function isSafeSourceBasename(value, extension) {
  return typeof value === "string"
    && value.length > extension.length
    && !/[\\/]/.test(value)
    && value.toLowerCase().endsWith(extension);
}

function isSafeRelativeTvgSourcePath(value) {
  if (typeof value !== "string" || value.startsWith("/") || value.includes("\\")) return false;
  const segments = value.split("/");
  return segments.length > 1
    && segments.every((segment) => segment && segment !== "." && segment !== "..")
    && segments.at(-1).toLowerCase().endsWith(".tvg");
}

async function sha256(file, fileSystem = fs) {
  return crypto.createHash("sha256").update(await fileSystem.readFile(file)).digest("hex");
}

function isPathInside(candidate, parent) {
  return candidate === parent || candidate.startsWith(`${parent}${path.sep}`);
}

function inferredPackageRoot(baseAssets) {
  const resolvedBaseAssets = path.resolve(baseAssets);
  const rigDirectory = path.dirname(resolvedBaseAssets);
  if (path.basename(resolvedBaseAssets) === "assets"
    && path.basename(rigDirectory) === "rig-v2") {
    return path.dirname(rigDirectory);
  }
  return path.dirname(resolvedBaseAssets);
}

export function defaultCompatibleRegistrationStateParent(baseAssets) {
  return defaultRegistrationStateParentForCanonicalAssets(path.resolve(baseAssets));
}

export function retainedCanonicalBackupPath(canonicalBaseAssets) {
  const resolved = path.resolve(canonicalBaseAssets);
  const identity = crypto.createHash("sha256")
    .update(resolved)
    .digest("hex")
    .slice(0, 16);
  return path.join(path.dirname(resolved), `.shaz-canonical-backup-${identity}`);
}

async function assertNoRetainedCanonicalBackup(canonicalBaseAssets, fileSystem) {
  const backup = retainedCanonicalBackupPath(canonicalBaseAssets);
  try {
    await fileSystem.lstat(backup);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    `retained canonical refresh backup requires explicit operator recovery before asset registration: ${backup}`,
  );
}

export async function withCompatibleRegistrationLease({
  baseAssets,
  transactionParent = null,
  fileSystem = fs,
  lockHooks = {},
}, callback) {
  if (typeof callback !== "function") {
    throw new Error("compatible registration lease requires a callback");
  }
  const registrationState = await resolveRegistrationState({
    baseAssets,
    transactionParent,
    fileSystem,
  });
  return withCanonicalAssetIdentityLease({
    baseAssets: registrationState.canonicalBaseAssets,
    fileSystem,
    lockHooks,
  },
    async (lockedState) => {
      const journalState = {
        ...registrationState,
        canonicalLockStateParent: lockedState.canonicalTransactionParent,
        lockOwnerId: lockedState.lockOwnerId,
        assertLease: lockedState.assertLease,
      };
      await journalState.assertLease();
      await assertNoRetainedCanonicalBackup(
        journalState.canonicalBaseAssets,
        fileSystem,
      );
      await recoverLocatedCompatibleAssetRegistrationJournal({
        registrationState: journalState,
        fileSystem,
      });
      await cleanupRegistrationJournalLocatorTemps(journalState, fileSystem);
      await recoverCompatibleAssetRegistrationJournals({
        registrationState: journalState,
        fileSystem,
      });
      await assertNoRetainedCanonicalBackup(
        journalState.canonicalBaseAssets,
        fileSystem,
      );
      return callback(journalState);
    });
}

export async function withCanonicalAssetIdentityLease({
  baseAssets,
  fileSystem = fs,
  lockHooks = {},
}, callback) {
  if (typeof callback !== "function") {
    throw new Error("canonical asset identity lease requires a callback");
  }
  const lockState = await resolveRegistrationState({
    baseAssets,
    transactionParent: null,
    fileSystem,
    allowMissingBaseAssets: true,
  });
  return withRegistrationLock({ state: lockState, fileSystem, lockHooks }, callback);
}

function defaultRegistrationStateParentForCanonicalAssets(canonicalBaseAssets) {
  const identity = crypto.createHash("sha256")
    .update(canonicalBaseAssets)
    .digest("hex")
    .slice(0, 16);
  const packageRoot = inferredPackageRoot(canonicalBaseAssets);
  return path.join(
    path.dirname(packageRoot),
    ".wiggly-authoring-state",
    `shaz-compatible-${identity}`,
  );
}

function parseArgs(values) {
  const args = {
    baseAssets: null,
    compatibleAssets: null,
    manifest: null,
    sourceXstageSha256: null,
    sourceXstageName: null,
    sourceArchiveSha256: null,
    sourceArchiveName: null,
    registrationStateDirectory: null,
    recipes: [],
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--base-assets") args.baseAssets = values[++index];
    else if (value === "--compatible-assets") args.compatibleAssets = values[++index];
    else if (value === "--manifest") args.manifest = values[++index];
    else if (value === "--source-xstage-sha256") args.sourceXstageSha256 = values[++index];
    else if (value === "--source-xstage-name") args.sourceXstageName = values[++index];
    else if (value === "--source-archive-sha256") args.sourceArchiveSha256 = values[++index];
    else if (value === "--source-archive-name") args.sourceArchiveName = values[++index];
    else if (value === "--registration-state-dir") args.registrationStateDirectory = values[++index];
    else if (value === "--recipe") args.recipes.push(values[++index]);
    else throw new Error(`unknown argument ${value}`);
  }
  if (!args.baseAssets || !args.compatibleAssets || !args.manifest || args.recipes.length === 0
    || !SHA256.test(args.sourceXstageSha256 ?? "")
    || !SHA256.test(args.sourceArchiveSha256 ?? "")
    || !isSafeSourceBasename(args.sourceXstageName, ".xstage")
    || !isSafeSourceBasename(args.sourceArchiveName, ".zip")) {
    throw new Error(
      "usage: register-compatible-tvg-assets.mjs --manifest rig-v2/runtime.json --base-assets rig-v2/assets --compatible-assets compiled-assets --source-xstage-sha256 SHA --source-xstage-name scene.xstage --source-archive-sha256 SHA --source-archive-name source.zip [--registration-state-dir directory] --recipe pose.json [--recipe pose.json]",
    );
  }
  return args;
}

function drawingElementsByNodeName(manifest) {
  const scene = manifest.scenes?.[0];
  if (!scene) throw new Error("runtime manifest contains no scene");
  const columns = indexColumns(scene);
  const elements = new Map(manifest.elements.map((element) => [element.id, element]));
  const result = new Map();
  for (const node of scene.nodes.filter(({ type }) => type === "READ")) {
    const columnName = attributeAtPath(node, "drawing.element")?.attributes?.col;
    const column = columns.get(columnName);
    const element = column?.type === 0 ? elements.get(column.elementId) : null;
    if (!element) throw new Error(`runtime READ ${node.name} has no drawing element`);
    if (result.has(node.name)) throw new Error(`runtime READ name is not unique: ${node.name}`);
    result.set(node.name, element.name);
  }
  return result;
}

function baseReceiptState(receipt) {
  if (receipt.schemaVersion === "shaz-tvg-asset-receipt-v2") {
    return {
      runtimeXstageSha256: receipt.sourceXstageSha256,
      sources: [{
        xstageSha256: receipt.sourceXstageSha256,
        sourceArchiveBundled: receipt.sourceArchiveBundled === true,
      }],
      assets: receipt.assets.map((asset) => ({
        ...asset,
        sourceXstageSha256: receipt.sourceXstageSha256,
      })),
      rasterMarginModelUnits: receipt.rasterMarginModelUnits,
    };
  }
  if (receipt.schemaVersion === "shaz-tvg-asset-receipt-v3") {
    return {
      runtimeXstageSha256: receipt.runtimeXstageSha256,
      sources: receipt.sources,
      assets: receipt.assets,
      rasterMarginModelUnits: receipt.rasterMarginModelUnits,
    };
  }
  throw new Error(`unsupported base asset receipt ${receipt.schemaVersion}`);
}

async function flatAssetDirectoryEntries(directory, fileSystem) {
  const directoryStat = await fileSystem.lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new Error("compatible asset workspace must be a real directory");
  }
  const entries = await fileSystem.readdir(directory, { withFileTypes: true });
  const assets = [];
  for (const entry of entries) {
    if (!entry.isFile() || !FLAT_ASSET_FILENAME.test(entry.name)) {
      throw new Error(`compatible asset workspace contains a non-flat asset: ${entry.name}`);
    }
    assets.push({
      filename: entry.name,
      outputSha256: await sha256(path.join(directory, entry.name), fileSystem),
    });
  }
  return assets.sort((left, right) => left.filename.localeCompare(right.filename));
}

async function verifyFlatAssetDirectory(directory, expectedEntries, fileSystem) {
  const expected = expectedEntries
    .map(([filename, outputSha256]) => ({ filename, outputSha256 }))
    .sort((left, right) => left.filename.localeCompare(right.filename));
  const actual = await flatAssetDirectoryEntries(directory, fileSystem);
  if (actual.length !== expected.length
    || actual.some((entry, index) => (
      entry.filename !== expected[index].filename
      || entry.outputSha256 !== expected[index].outputSha256
    ))) {
    throw new Error("compatible asset workspace does not exactly match its checksums");
  }
}

function sameAssetEntries(left, right) {
  return left.length === right.length && left.every((entry, index) => (
    entry.filename === right[index].filename
    && entry.outputSha256 === right[index].outputSha256
  ));
}

async function currentFlatAssetEntries(directory, fileSystem) {
  try {
    return await flatAssetDirectoryEntries(directory, fileSystem);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function classifyCurrentSourceDirectory({
  sourceDirectory,
  backupAssets,
  preparedAssets,
  fileSystem,
}) {
  const current = await currentFlatAssetEntries(sourceDirectory, fileSystem);
  if (current == null) return "missing";
  const before = [...backupAssets].sort((left, right) => left.filename.localeCompare(right.filename));
  const after = [...preparedAssets].sort((left, right) => left.filename.localeCompare(right.filename));
  if (sameAssetEntries(current, before)) return "before";
  if (sameAssetEntries(current, after)) return "after";
  const beforeByFilename = new Map(before.map((asset) => [asset.filename, asset.outputSha256]));
  const afterByFilename = new Map(after.map((asset) => [asset.filename, asset.outputSha256]));
  const isChecksumVerifiedPartial = (expected, expectedByFilename) => (
    current.length < expected.length && current.every((asset) => (
      expectedByFilename.get(asset.filename) === asset.outputSha256
    ))
  );
  if (isChecksumVerifiedPartial(before, beforeByFilename)
    || isChecksumVerifiedPartial(after, afterByFilename)) {
    return "prepared-partial";
  }
  throw new Error("current compatible source contains bytes not recognized by its journal");
}

async function readFileOrMissing(file, fileSystem) {
  try {
    const fileStat = await fileSystem.lstat(file);
    if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
      throw new Error("journal-classified receipt must be a real file");
    }
    return await fileSystem.readFile(file);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function classifyCurrentReceipt({
  receiptPath,
  backupReceipt,
  stagedReceipt,
  receiptSha256Before,
  receiptSha256After,
  fileSystem,
}) {
  const [before, after, current] = await Promise.all([
    fileSystem.readFile(backupReceipt),
    fileSystem.readFile(stagedReceipt),
    readFileOrMissing(receiptPath, fileSystem),
  ]);
  if (crypto.createHash("sha256").update(before).digest("hex") !== receiptSha256Before) {
    throw new Error("registration journal receipt backup checksum mismatch");
  }
  if (crypto.createHash("sha256").update(after).digest("hex") !== receiptSha256After) {
    throw new Error("registration journal staged receipt checksum mismatch");
  }
  if (current == null) return "missing";
  const currentSha256 = crypto.createHash("sha256").update(current).digest("hex");
  if (currentSha256 === receiptSha256Before) return "before";
  if (currentSha256 === receiptSha256After) return "after";
  if ((current.length < before.length && current.equals(before.subarray(0, current.length)))
    || (current.length < after.length && current.equals(after.subarray(0, current.length)))) {
    return "prepared-partial";
  }
  throw new Error("current asset receipt contains bytes not recognized by its journal");
}

async function syncRegistrationPath(target, expectedKind, fileSystem) {
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot safely sync registration state");
  }
  let flags = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;
  if (expectedKind === "directory" && Number.isInteger(fsConstants.O_DIRECTORY)) {
    flags |= fsConstants.O_DIRECTORY;
  }
  const handle = await fileSystem.open(target, flags);
  try {
    const stat = await handle.stat();
    if ((expectedKind === "file" && (!stat.isFile() || stat.isSymbolicLink()))
      || (expectedKind === "directory" && (!stat.isDirectory() || stat.isSymbolicLink()))) {
      throw new Error(`registration durability target is not a safe ${expectedKind}: ${target}`);
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncRegistrationFile(target, fileSystem) {
  await syncRegistrationPath(target, "file", fileSystem);
}

async function syncRegistrationDirectory(target, fileSystem) {
  await syncRegistrationPath(target, "directory", fileSystem);
}

async function syncFlatAssetDirectory(directory, expectedEntries, fileSystem) {
  for (const [filename] of expectedEntries) {
    await syncRegistrationFile(path.join(directory, filename), fileSystem);
  }
  await syncRegistrationDirectory(directory, fileSystem);
}

async function durableSameParentRename(source, destination, fileSystem) {
  const sourceParent = path.dirname(source);
  if (sourceParent !== path.dirname(destination)) {
    throw new Error("registration atomic rename must remain within one parent directory");
  }
  await fileSystem.rename(source, destination);
  await syncRegistrationDirectory(sourceParent, fileSystem);
}

async function durableUnlink(target, fileSystem) {
  await fileSystem.unlink(target);
  await syncRegistrationDirectory(path.dirname(target), fileSystem);
}

async function writeRegistrationJournal(transactionDirectory, journal, fileSystem) {
  const nextJournal = path.join(
    transactionDirectory,
    `.journal-next-${crypto.randomUUID()}.json`,
  );
  await fileSystem.writeFile(
    nextJournal,
    `${JSON.stringify(journal, null, 2)}\n`,
    { flag: "wx" },
  );
  await syncRegistrationFile(nextJournal, fileSystem);
  await durableSameParentRename(
    nextJournal,
    path.join(transactionDirectory, "journal.json"),
    fileSystem,
  );
}

function atomicRegistrationArtifactPaths({
  canonicalBaseAssets,
  sourceXstageSha256,
  ownerId,
}) {
  const sourceParent = path.join(canonicalBaseAssets, "sources");
  return {
    sourceParent,
    sourceDirectory: path.join(sourceParent, sourceXstageSha256),
    nextSourceDirectory: path.join(
      sourceParent,
      `${REGISTRATION_SOURCE_NEXT_PREFIX}${sourceXstageSha256}-${ownerId}`,
    ),
    priorSourceDirectory: path.join(
      sourceParent,
      `${REGISTRATION_SOURCE_PRIOR_PREFIX}${sourceXstageSha256}-${ownerId}`,
    ),
    receiptPath: path.join(canonicalBaseAssets, "receipt.json"),
    nextReceiptPath: path.join(
      canonicalBaseAssets,
      `${REGISTRATION_RECEIPT_NEXT_PREFIX}${ownerId}.json`,
    ),
  };
}

function validateJournalAssetList(value, label) {
  if (!Array.isArray(value)) throw new Error(`registration journal has invalid ${label}`);
  const seen = new Set();
  for (const asset of value) {
    if (!asset || !FLAT_ASSET_FILENAME.test(asset.filename ?? "")
      || !SHA256.test(asset.outputSha256 ?? "")
      || seen.has(asset.filename)) {
      throw new Error(`registration journal has invalid ${label}`);
    }
    seen.add(asset.filename);
  }
}

async function resolveCanonicalBaseAssets({
  baseAssets,
  fileSystem,
  allowMissingBaseAssets,
}) {
  const requestedBaseAssets = path.resolve(baseAssets);
  try {
    return path.resolve(await fileSystem.realpath(requestedBaseAssets));
  } catch (error) {
    if (!allowMissingBaseAssets || error?.code !== "ENOENT") throw error;
  }

  try {
    await fileSystem.lstat(requestedBaseAssets);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const basename = path.basename(requestedBaseAssets);
    if (!basename) throw new Error("canonical asset identity cannot be the filesystem root");
    const canonicalParent = path.resolve(await fileSystem.realpath(
      path.dirname(requestedBaseAssets),
    ));
    try {
      await fileSystem.lstat(requestedBaseAssets);
    } catch (recheckError) {
      if (recheckError?.code === "ENOENT") {
        return path.join(canonicalParent, basename);
      }
      throw recheckError;
    }
    throw new Error("canonical asset target appeared while its missing identity was resolved");
  }
  throw new Error("canonical asset target is present but cannot be resolved safely");
}

async function resolveRegistrationState({
  baseAssets,
  transactionParent,
  fileSystem,
  allowMissingBaseAssets = false,
}) {
  const requestedBaseAssets = path.resolve(baseAssets);
  const canonicalBaseAssets = await resolveCanonicalBaseAssets({
    baseAssets: requestedBaseAssets,
    fileSystem,
    allowMissingBaseAssets,
  });
  const packageRoot = inferredPackageRoot(canonicalBaseAssets);
  const requestedTransactionParent = path.resolve(
    transactionParent ?? defaultRegistrationStateParentForCanonicalAssets(canonicalBaseAssets),
  );
  if (isPathInside(requestedTransactionParent, requestedBaseAssets)) {
    throw new Error("registration transaction parent must be outside the packaged asset tree");
  }
  if (isPathInside(requestedTransactionParent, packageRoot)) {
    throw new Error("registration state must be outside the Format package root");
  }
  await fileSystem.mkdir(requestedTransactionParent, { recursive: true });
  const canonicalTransactionParent = path.resolve(
    await fileSystem.realpath(requestedTransactionParent),
  );
  if (isPathInside(canonicalTransactionParent, canonicalBaseAssets)) {
    throw new Error("registration transaction parent resolves inside the packaged asset tree");
  }
  if (isPathInside(canonicalTransactionParent, packageRoot)) {
    throw new Error("registration state must resolve outside the Format package root");
  }
  return {
    requestedBaseAssets,
    requestedTransactionParent,
    resolvedBaseAssets: canonicalBaseAssets,
    resolvedTransactionParent: canonicalTransactionParent,
    canonicalBaseAssets,
    canonicalTransactionParent,
  };
}

function activeRegistrationJournalLocatorPath(lockStateParent) {
  return path.join(lockStateParent, REGISTRATION_JOURNAL_LOCATOR_FILE);
}

async function inspectRegistrationJournalLocator(locatorPath, canonicalBaseAssets, fileSystem) {
  const before = await fileSystem.lstat(locatorPath);
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error("canonical registration journal locator is not a safe file");
  }
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot safely open the canonical journal locator");
  }
  const handle = await fileSystem.open(
    locatorPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  let contents;
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error("canonical registration journal locator changed during validation");
    }
    contents = await handle.readFile();
  } finally {
    await handle.close();
  }
  const after = await fileSystem.lstat(locatorPath);
  if (!after.isFile() || after.isSymbolicLink()
    || after.dev !== before.dev || after.ino !== before.ino) {
    throw new Error("canonical registration journal locator changed during validation");
  }
  const locator = JSON.parse(contents.toString("utf8"));
  if (!locator || locator.schemaVersion !== REGISTRATION_JOURNAL_LOCATOR_SCHEMA
    || locator.baseAssetsRealpath !== canonicalBaseAssets
    || !path.isAbsolute(locator.stateParentRealpath ?? "")
    || path.resolve(locator.stateParentRealpath) !== locator.stateParentRealpath
    || !/^registration-[a-zA-Z0-9_-]+$/.test(locator.transactionDirectoryBasename ?? "")
    || !REGISTRATION_OWNER_ID.test(locator.ownerId ?? "")) {
    throw new Error("canonical registration journal locator is unsafe");
  }
  return {
    locator,
    identity: { dev: before.dev, ino: before.ino },
  };
}

async function publishRegistrationJournalLocator({
  registrationState,
  transactionDirectory,
  ownerId,
  fileSystem,
}) {
  const lockStateParent = registrationState.canonicalLockStateParent;
  if (!path.isAbsolute(lockStateParent ?? "")) {
    throw new Error("compatible registration journal requires a canonical lock state parent");
  }
  const locatorPath = activeRegistrationJournalLocatorPath(lockStateParent);
  const locator = {
    schemaVersion: REGISTRATION_JOURNAL_LOCATOR_SCHEMA,
    ownerId,
    baseAssetsRealpath: registrationState.canonicalBaseAssets,
    stateParentRealpath: registrationState.canonicalTransactionParent,
    transactionDirectoryBasename: path.basename(transactionDirectory),
  };
  const nextLocator = path.join(
    lockStateParent,
    `${REGISTRATION_JOURNAL_LOCATOR_NEXT_PREFIX}${ownerId}-${crypto.randomUUID()}.json`,
  );
  await fileSystem.writeFile(nextLocator, `${JSON.stringify(locator, null, 2)}\n`, {
    flag: "wx",
  });
  try {
    await syncRegistrationFile(nextLocator, fileSystem);
    await fileSystem.link(nextLocator, locatorPath);
    await syncRegistrationDirectory(lockStateParent, fileSystem);
  } finally {
    try {
      await durableUnlink(nextLocator, fileSystem);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return locator;
}

async function retireRegistrationJournalLocator({
  registrationState,
  expectedOwnerId,
  fileSystem,
}) {
  const lockStateParent = registrationState.canonicalLockStateParent;
  const locatorPath = activeRegistrationJournalLocatorPath(lockStateParent);
  const pinned = await inspectRegistrationJournalLocator(
    locatorPath,
    registrationState.canonicalBaseAssets,
    fileSystem,
  );
  if (pinned.locator.ownerId !== expectedOwnerId) {
    throw new Error("canonical registration journal locator owner changed before retirement");
  }
  const tombstone = path.join(
    lockStateParent,
    `${REGISTRATION_JOURNAL_LOCATOR_TOMBSTONE_PREFIX}${expectedOwnerId}-${crypto.randomUUID()}.json`,
  );
  await durableSameParentRename(locatorPath, tombstone, fileSystem);
  let retirementError = null;
  try {
    const retired = await inspectRegistrationJournalLocator(
      tombstone,
      registrationState.canonicalBaseAssets,
      fileSystem,
    );
    if (retired.locator.ownerId !== expectedOwnerId
      || retired.identity.dev !== pinned.identity.dev
      || retired.identity.ino !== pinned.identity.ino) {
      throw new Error("canonical registration journal locator changed during retirement");
    }
  } catch (error) {
    retirementError = error;
  }
  if (retirementError) {
    try {
      await durableSameParentRename(tombstone, locatorPath, fileSystem);
    } catch (restoreError) {
      throw new AggregateError(
        [retirementError, restoreError],
        "canonical registration journal locator changed and its retired state was preserved",
      );
    }
    throw retirementError;
  }
  await durableUnlink(tombstone, fileSystem);
}

async function cleanupRegistrationJournalLocatorTemps(registrationState, fileSystem) {
  const lockStateParent = registrationState.canonicalLockStateParent;
  const entries = await fileSystem.readdir(lockStateParent, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.name.startsWith(REGISTRATION_JOURNAL_LOCATOR_NEXT_PREFIX)
      && !entry.name.startsWith(REGISTRATION_JOURNAL_LOCATOR_TOMBSTONE_PREFIX)) {
      continue;
    }
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error(`canonical registration journal locator artifact is unsafe: ${entry.name}`);
    }
    const artifact = path.join(lockStateParent, entry.name);
    if (entry.name.startsWith(REGISTRATION_JOURNAL_LOCATOR_TOMBSTONE_PREFIX)) {
      const match = /^\.journal-locator-tombstone-([a-f0-9]{32})-[a-f0-9-]+\.json$/.exec(
        entry.name,
      );
      if (!match) {
        throw new Error(`canonical registration journal locator tombstone is unsafe: ${entry.name}`);
      }
      const retired = await inspectRegistrationJournalLocator(
        artifact,
        registrationState.canonicalBaseAssets,
        fileSystem,
      );
      if (retired.locator.ownerId !== match[1]) {
        throw new Error(`canonical registration journal locator tombstone owner mismatch: ${entry.name}`);
      }
    }
    await durableUnlink(artifact, fileSystem);
  }
}

function registrationLockHooks(lockHooks = {}) {
  const hooks = {
    processId: lockHooks.processId ?? process.pid,
    isProcessAlive: lockHooks.isProcessAlive ?? ((processId) => {
      try {
        process.kill(processId, 0);
        return true;
      } catch (error) {
        if (error?.code === "ESRCH") return false;
        return null;
      }
    }),
    now: lockHooks.now ?? (() => Date.now()),
    leaseDurationMs: lockHooks.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS,
    heartbeatIntervalMs: lockHooks.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    transitionRetryAttempts: lockHooks.transitionRetryAttempts
      ?? DEFAULT_TRANSITION_RETRY_ATTEMPTS,
    transitionRetryDelayMs: lockHooks.transitionRetryDelayMs
      ?? DEFAULT_TRANSITION_RETRY_DELAY_MS,
  };
  if (!Number.isSafeInteger(hooks.processId) || hooks.processId <= 0
    || typeof hooks.isProcessAlive !== "function"
    || typeof hooks.now !== "function"
    || !Number.isFinite(hooks.leaseDurationMs)
    || hooks.leaseDurationMs <= 0
    || !Number.isFinite(hooks.heartbeatIntervalMs)
    || hooks.heartbeatIntervalMs <= 0
    || hooks.heartbeatIntervalMs >= hooks.leaseDurationMs
    || !Number.isSafeInteger(hooks.transitionRetryAttempts)
    || hooks.transitionRetryAttempts < 0
    || !Number.isFinite(hooks.transitionRetryDelayMs)
    || hooks.transitionRetryDelayMs < 0) {
    throw new Error("registration lock hooks are invalid");
  }
  return hooks;
}

async function inspectRegistrationTransitionOwner(transitionDirectory, state, fileSystem) {
  const ownerPath = path.join(transitionDirectory, "owner.json");
  const [directoryStat, ownerStat] = await Promise.all([
    fileSystem.lstat(transitionDirectory),
    fileSystem.lstat(ownerPath),
  ]);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()
    || !ownerStat.isFile() || ownerStat.isSymbolicLink()) {
    throw new Error("registration state contains an unsafe transition mutex");
  }
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot safely open registration transition ownership");
  }
  const handle = await fileSystem.open(
    ownerPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  let ownerBytes;
  try {
    const openedStat = await handle.stat();
    if (!openedStat.isFile()
      || openedStat.dev !== ownerStat.dev
      || openedStat.ino !== ownerStat.ino) {
      throw new Error("registration transition mutex owner changed during validation");
    }
    ownerBytes = await handle.readFile();
  } finally {
    await handle.close();
  }
  const [directoryAfter, ownerAfter] = await Promise.all([
    fileSystem.lstat(transitionDirectory),
    fileSystem.lstat(ownerPath),
  ]);
  if (!directoryAfter.isDirectory() || directoryAfter.isSymbolicLink()
    || directoryAfter.dev !== directoryStat.dev
    || directoryAfter.ino !== directoryStat.ino
    || !ownerAfter.isFile() || ownerAfter.isSymbolicLink()
    || ownerAfter.dev !== ownerStat.dev
    || ownerAfter.ino !== ownerStat.ino) {
    throw new Error("registration transition mutex changed during validation");
  }
  const owner = JSON.parse(ownerBytes.toString("utf8"));
  if (!owner || owner.schemaVersion !== REGISTRATION_TRANSITION_MUTEX_SCHEMA
    || owner.baseAssetsRealpath !== state.canonicalBaseAssets
    || owner.stateParentRealpath !== state.canonicalTransactionParent
    || !REGISTRATION_OWNER_ID.test(owner.ownerId ?? "")
    || !Number.isSafeInteger(owner.processId)
    || owner.processId <= 0
    || !Number.isFinite(owner.createdAtMs)) {
    throw new Error("registration state contains an unsafe transition mutex owner");
  }
  return {
    owner,
    directoryIdentity: { dev: directoryStat.dev, ino: directoryStat.ino },
    ownerIdentity: { dev: ownerStat.dev, ino: ownerStat.ino },
  };
}

async function readRegistrationTransitionOwner(transitionDirectory, state, fileSystem) {
  return (await inspectRegistrationTransitionOwner(
    transitionDirectory,
    state,
    fileSystem,
  )).owner;
}

async function acquireRegistrationTransitionMutex({ state, fileSystem, hooks }) {
  const transitionDirectory = path.join(
    state.resolvedTransactionParent,
    REGISTRATION_TRANSITION_MUTEX_DIRECTORY,
  );
  const owner = {
    schemaVersion: REGISTRATION_TRANSITION_MUTEX_SCHEMA,
    ownerId: crypto.randomBytes(16).toString("hex"),
    baseAssetsRealpath: state.canonicalBaseAssets,
    stateParentRealpath: state.canonicalTransactionParent,
    processId: hooks.processId,
    createdAtMs: hooks.now(),
  };
  if (!Number.isFinite(owner.createdAtMs)) {
    throw new Error("registration lock clock is invalid");
  }
  for (let attempt = 0; attempt <= hooks.transitionRetryAttempts; attempt += 1) {
    try {
      await fileSystem.mkdir(transitionDirectory);
      try {
        await fileSystem.writeFile(
          path.join(transitionDirectory, "owner.json"),
          `${JSON.stringify(owner, null, 2)}\n`,
          { flag: "wx" },
        );
      } catch (error) {
        throw new Error(
          "compatible asset registration created its transition mutex but could not persist ownership; explicit operator cleanup is required",
          { cause: error },
        );
      }
      const acquired = await inspectRegistrationTransitionOwner(
        transitionDirectory,
        state,
        fileSystem,
      );
      if (acquired.owner.ownerId !== owner.ownerId) {
        throw new Error("registration transition mutex changed during acquisition");
      }
      return {
        transitionDirectory,
        owner,
        state,
        directoryIdentity: acquired.directoryIdentity,
        ownerIdentity: acquired.ownerIdentity,
      };
    } catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes(error?.code)) throw error;
    }

    let existingOwner = null;
    try {
      existingOwner = await readRegistrationTransitionOwner(
        transitionDirectory,
        state,
        fileSystem,
      );
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    let processLiveness = null;
    if (existingOwner) {
      try {
        processLiveness = await hooks.isProcessAlive(existingOwner.processId);
      } catch {
        // Indeterminate process liveness must block automatic reclamation.
      }
    }
    if (existingOwner && processLiveness !== true) {
      throw new Error(
        "compatible asset registration transition mutex is not provably live; it is never reclaimed automatically and requires explicit operator cleanup if stale",
      );
    }
    if (attempt === hooks.transitionRetryAttempts) {
      throw new Error(
        existingOwner
          ? "compatible asset registration transition mutex is already held by a live process after bounded wait"
          : "compatible asset registration transition mutex is incomplete; it is never reclaimed automatically and requires explicit operator cleanup if stale",
      );
    }
    await new Promise((resolve) => {
      setTimeout(resolve, hooks.transitionRetryDelayMs);
    });
  }
  throw new Error("could not acquire the registration transition mutex");
}

async function releaseRegistrationTransitionMutex(mutex, fileSystem) {
  const tombstone = path.join(
    mutex.state.resolvedTransactionParent,
    `${REGISTRATION_TRANSITION_TOMBSTONE_PREFIX}${mutex.owner.ownerId}-${crypto.randomUUID()}`,
  );
  await fileSystem.rename(mutex.transitionDirectory, tombstone);
  let retirementError = null;
  try {
    const retired = await inspectRegistrationTransitionOwner(
      tombstone,
      mutex.state,
      fileSystem,
    );
    if (retired.owner.ownerId !== mutex.owner.ownerId
      || retired.directoryIdentity.dev !== mutex.directoryIdentity.dev
      || retired.directoryIdentity.ino !== mutex.directoryIdentity.ino
      || retired.ownerIdentity.dev !== mutex.ownerIdentity.dev
      || retired.ownerIdentity.ino !== mutex.ownerIdentity.ino) {
      throw new Error("registration transition mutex owner changed during owner-specific retirement");
    }
  } catch (error) {
    retirementError = error;
  }
  if (retirementError) {
    try {
      await fileSystem.rename(tombstone, mutex.transitionDirectory);
    } catch (restoreError) {
      throw new AggregateError(
        [retirementError, restoreError],
        "registration transition mutex ownership changed and its retired state was preserved for inspection",
      );
    }
    throw retirementError;
  }
  await fileSystem.unlink(path.join(tombstone, "owner.json"));
  await fileSystem.rmdir(tombstone);
}

async function withRegistrationTransitionMutex(
  { state, fileSystem, hooks },
  callback,
) {
  const mutex = await acquireRegistrationTransitionMutex({ state, fileSystem, hooks });
  let result;
  let operationError = null;
  try {
    result = await callback();
  } catch (error) {
    operationError = error;
  }
  try {
    await releaseRegistrationTransitionMutex(mutex, fileSystem);
  } catch (releaseError) {
    if (operationError) {
      throw new AggregateError(
        [operationError, releaseError],
        "registration lock transition failed and its mutex was not safely released",
      );
    }
    throw releaseError;
  }
  if (operationError) throw operationError;
  return result;
}

async function inspectRegistrationLockOwner(lockDirectory, state, fileSystem) {
  const ownerPath = path.join(lockDirectory, "owner.json");
  const [directoryStat, ownerStat] = await Promise.all([
    fileSystem.lstat(lockDirectory),
    fileSystem.lstat(ownerPath),
  ]);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()
    || !ownerStat.isFile() || ownerStat.isSymbolicLink()) {
    throw new Error("registration state contains an unsafe active lock");
  }
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot safely open registration lock ownership");
  }
  const handle = await fileSystem.open(
    ownerPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  let ownerBytes;
  try {
    const openedStat = await handle.stat();
    if (!openedStat.isFile()
      || openedStat.dev !== ownerStat.dev
      || openedStat.ino !== ownerStat.ino) {
      throw new Error("registration lock owner changed during validation");
    }
    ownerBytes = await handle.readFile();
  } finally {
    await handle.close();
  }
  const [directoryAfter, ownerAfter] = await Promise.all([
    fileSystem.lstat(lockDirectory),
    fileSystem.lstat(ownerPath),
  ]);
  if (!directoryAfter.isDirectory() || directoryAfter.isSymbolicLink()
    || directoryAfter.dev !== directoryStat.dev
    || directoryAfter.ino !== directoryStat.ino
    || !ownerAfter.isFile() || ownerAfter.isSymbolicLink()
    || ownerAfter.dev !== ownerStat.dev
    || ownerAfter.ino !== ownerStat.ino) {
    throw new Error("registration active lock changed during validation");
  }
  const owner = JSON.parse(ownerBytes.toString("utf8"));
  if (!owner || owner.schemaVersion !== REGISTRATION_LOCK_SCHEMA
    || owner.baseAssetsRealpath !== state.canonicalBaseAssets
    || owner.stateParentRealpath !== state.canonicalTransactionParent
    || !REGISTRATION_OWNER_ID.test(owner.ownerId ?? "")
    || !Number.isSafeInteger(owner.processId)
    || owner.processId <= 0
    || !Number.isFinite(owner.createdAtMs)
    || !Number.isFinite(owner.heartbeatAtMs)
    || !Number.isFinite(owner.leaseExpiresAtMs)
    || owner.leaseExpiresAtMs <= owner.heartbeatAtMs
    || owner.status !== "active") {
    throw new Error("registration state contains an unsafe active lock owner");
  }
  return {
    owner,
    directoryIdentity: { dev: directoryStat.dev, ino: directoryStat.ino },
    ownerIdentity: { dev: ownerStat.dev, ino: ownerStat.ino },
  };
}

async function readRegistrationLockOwner(lockDirectory, state, fileSystem) {
  return (await inspectRegistrationLockOwner(lockDirectory, state, fileSystem)).owner;
}

async function retireRegistrationLockUnderTransition({
  lockDirectory,
  expectedOwnerId,
  state,
  fileSystem,
}) {
  const pinned = await inspectRegistrationLockOwner(lockDirectory, state, fileSystem);
  if (pinned.owner.ownerId !== expectedOwnerId) {
    throw new Error("registration lock owner changed before owner-specific retirement");
  }
  const tombstone = path.join(
    state.resolvedTransactionParent,
    `${REGISTRATION_LOCK_TOMBSTONE_PREFIX}${expectedOwnerId}-${crypto.randomUUID()}`,
  );
  await fileSystem.rename(lockDirectory, tombstone);
  let retirementError = null;
  try {
    const retired = await inspectRegistrationLockOwner(tombstone, state, fileSystem);
    if (retired.owner.ownerId !== expectedOwnerId
      || retired.directoryIdentity.dev !== pinned.directoryIdentity.dev
      || retired.directoryIdentity.ino !== pinned.directoryIdentity.ino
      || retired.ownerIdentity.dev !== pinned.ownerIdentity.dev
      || retired.ownerIdentity.ino !== pinned.ownerIdentity.ino) {
      throw new Error("registration lock owner changed during owner-specific retirement");
    }
  } catch (error) {
    retirementError = error;
  }
  if (retirementError) {
    try {
      await fileSystem.rename(tombstone, lockDirectory);
    } catch (restoreError) {
      throw new AggregateError(
        [retirementError, restoreError],
        "registration lock ownership changed and its retired state was preserved for inspection",
      );
    }
    throw retirementError;
  }
  await fileSystem.rm(tombstone, { recursive: true, force: true });
}

async function cleanupRegistrationLockTombstonesUnderTransition(state, fileSystem) {
  const entries = await fileSystem.readdir(state.resolvedTransactionParent, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!entry.name.startsWith(REGISTRATION_LOCK_TOMBSTONE_PREFIX)) continue;
    const match = /^\.lock-tombstone-([a-f0-9]{32})-[a-f0-9-]+$/.exec(entry.name);
    if (!entry.isDirectory() || !match) {
      throw new Error(`registration state contains an unsafe lock tombstone: ${entry.name}`);
    }
    const tombstone = path.join(state.resolvedTransactionParent, entry.name);
    const owner = await readRegistrationLockOwner(tombstone, state, fileSystem);
    if (owner.ownerId !== match[1]) {
      throw new Error(`registration lock tombstone owner mismatch: ${entry.name}`);
    }
    await fileSystem.rm(tombstone, { recursive: true, force: true });
  }
}

async function acquireRegistrationLock({ state, fileSystem, lockHooks }) {
  const hooks = registrationLockHooks(lockHooks);
  const lockDirectory = path.join(
    state.resolvedTransactionParent,
    REGISTRATION_LOCK_DIRECTORY,
  );
  return withRegistrationTransitionMutex({ state, fileSystem, hooks }, async () => {
    await cleanupRegistrationLockTombstonesUnderTransition(state, fileSystem);
    let activeOwner = null;
    try {
      activeOwner = await readRegistrationLockOwner(lockDirectory, state, fileSystem);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (activeOwner) {
      let processLiveness = null;
      try {
        processLiveness = await hooks.isProcessAlive(activeOwner.processId);
      } catch {
        // Indeterminate process liveness must block automatic reclamation.
      }
      if (processLiveness !== false) {
        throw new Error(
          `compatible asset registration is already active under process owner ${activeOwner.ownerId}; expired heartbeat metadata is not reclaim authority`,
        );
      }
      await retireRegistrationLockUnderTransition({
        lockDirectory,
        expectedOwnerId: activeOwner.ownerId,
        state,
        fileSystem,
      });
    }

    const createdAtMs = hooks.now();
    if (!Number.isFinite(createdAtMs)) throw new Error("registration lock clock is invalid");
    const owner = {
      schemaVersion: REGISTRATION_LOCK_SCHEMA,
      ownerId: crypto.randomBytes(16).toString("hex"),
      baseAssetsRealpath: state.canonicalBaseAssets,
      stateParentRealpath: state.canonicalTransactionParent,
      processId: hooks.processId,
      createdAtMs,
      heartbeatAtMs: createdAtMs,
      leaseExpiresAtMs: createdAtMs + hooks.leaseDurationMs,
      status: "active",
    };
    const candidateDirectory = await fileSystem.mkdtemp(path.join(
      state.resolvedTransactionParent,
      REGISTRATION_LOCK_CANDIDATE_PREFIX,
    ));
    try {
      await fileSystem.writeFile(
        path.join(candidateDirectory, "owner.json"),
        `${JSON.stringify(owner, null, 2)}\n`,
        { flag: "wx" },
      );
      await fileSystem.rename(candidateDirectory, lockDirectory);
      return { lockDirectory, owner, hooks, state };
    } finally {
      await fileSystem.rm(candidateDirectory, { recursive: true, force: true });
    }
  });
}

async function releaseRegistrationLock(lease, fileSystem) {
  await withRegistrationTransitionMutex({
    state: lease.state,
    fileSystem,
    hooks: lease.hooks,
  }, async () => {
    await retireRegistrationLockUnderTransition({
      lockDirectory: lease.lockDirectory,
      expectedOwnerId: lease.owner.ownerId,
      state: lease.state,
      fileSystem,
    });
  });
}

async function assertRegistrationLease(lease, fileSystem) {
  return withRegistrationTransitionMutex({
    state: lease.state,
    fileSystem,
    hooks: lease.hooks,
  }, async () => {
    const owner = await readRegistrationLockOwner(
      lease.lockDirectory,
      lease.state,
      fileSystem,
    );
    if (owner.ownerId !== lease.owner.ownerId) {
      throw new Error("compatible asset registration lost its active lease owner");
    }
    if (owner.status !== "active" || owner.leaseExpiresAtMs <= lease.hooks.now()) {
      throw new Error("compatible asset registration lease expired before mutation");
    }
    return owner;
  });
}

async function heartbeatRegistrationLock(lease, fileSystem) {
  await withRegistrationTransitionMutex({
    state: lease.state,
    fileSystem,
    hooks: lease.hooks,
  }, async () => {
    const currentOwner = await readRegistrationLockOwner(
      lease.lockDirectory,
      lease.state,
      fileSystem,
    );
    if (currentOwner.ownerId !== lease.owner.ownerId) {
      throw new Error("compatible asset registration lost its active lease owner");
    }
    if (currentOwner.leaseExpiresAtMs <= lease.hooks.now()) {
      throw new Error("compatible asset registration lease expired before heartbeat");
    }
    const heartbeatAtMs = lease.hooks.now();
    if (!Number.isFinite(heartbeatAtMs)) throw new Error("registration lock clock is invalid");
    const nextOwnerValue = {
      ...currentOwner,
      heartbeatAtMs,
      leaseExpiresAtMs: heartbeatAtMs + lease.hooks.leaseDurationMs,
    };
    const nextOwner = path.join(
      lease.lockDirectory,
      `.owner-next-${crypto.randomUUID()}.json`,
    );
    await fileSystem.writeFile(nextOwner, `${JSON.stringify(nextOwnerValue, null, 2)}\n`, {
      flag: "wx",
    });
    await fileSystem.rename(nextOwner, path.join(lease.lockDirectory, "owner.json"));
    lease.owner = nextOwnerValue;
  });
}

function startRegistrationHeartbeat(lease, fileSystem) {
  let pending = Promise.resolve();
  let heartbeatError = null;
  const timer = setInterval(() => {
    pending = pending.then(
      () => heartbeatRegistrationLock(lease, fileSystem),
    ).catch((error) => {
      heartbeatError ??= error;
    });
  }, lease.hooks.heartbeatIntervalMs);
  timer.unref?.();
  return async () => {
    clearInterval(timer);
    await pending;
    return heartbeatError;
  };
}

async function withRegistrationLock({ state, fileSystem, lockHooks }, callback) {
  const lease = await acquireRegistrationLock({ state, fileSystem, lockHooks });
  const stopHeartbeat = startRegistrationHeartbeat(lease, fileSystem);
  let result;
  let operationError = null;
  try {
    result = await callback({
      ...state,
      lockOwnerId: lease.owner.ownerId,
      assertLease: () => assertRegistrationLease(lease, fileSystem),
    });
  } catch (error) {
    operationError = error;
  }
  const heartbeatError = await stopHeartbeat();
  if (!operationError && heartbeatError) operationError = heartbeatError;
  try {
    await releaseRegistrationLock(lease, fileSystem);
  } catch (releaseError) {
    if (operationError) {
      throw new AggregateError(
        [operationError, releaseError],
        "compatible asset registration failed and its active lock was not fully released",
      );
    }
    throw releaseError;
  }
  if (operationError) throw operationError;
  return result;
}

function registrationStateMatches(actual, expected) {
  return actual === expected || actual === "before-and-after";
}

async function inspectRegistrationTransactionOwner({
  transactionDirectory,
  registrationState,
  fileSystem,
  validateOwner = true,
}) {
  const ownerPath = path.join(transactionDirectory, "owner.json");
  const [directoryStat, ownerStat] = await Promise.all([
    fileSystem.lstat(transactionDirectory),
    fileSystem.lstat(ownerPath),
  ]);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()
    || !ownerStat.isFile() || ownerStat.isSymbolicLink()) {
    throw new Error(`unsafe compatible registration owner: ${transactionDirectory}`);
  }
  if (!Number.isInteger(fsConstants.O_NOFOLLOW)) {
    throw new Error("this platform cannot safely open compatible registration ownership");
  }
  const handle = await fileSystem.open(
    ownerPath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  );
  let ownerBytes;
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== ownerStat.dev || opened.ino !== ownerStat.ino) {
      throw new Error("compatible registration owner changed during validation");
    }
    ownerBytes = await handle.readFile();
  } finally {
    await handle.close();
  }
  const [directoryAfter, ownerAfter] = await Promise.all([
    fileSystem.lstat(transactionDirectory),
    fileSystem.lstat(ownerPath),
  ]);
  if (!directoryAfter.isDirectory() || directoryAfter.isSymbolicLink()
    || directoryAfter.dev !== directoryStat.dev
    || directoryAfter.ino !== directoryStat.ino
    || !ownerAfter.isFile() || ownerAfter.isSymbolicLink()
    || ownerAfter.dev !== ownerStat.dev || ownerAfter.ino !== ownerStat.ino) {
    throw new Error("compatible registration transaction changed during validation");
  }
  const owner = JSON.parse(ownerBytes.toString("utf8"));
  if (validateOwner && (!owner || owner.schemaVersion !== REGISTRATION_OWNER_SCHEMA
    || owner.baseAssetsRealpath !== registrationState.canonicalBaseAssets
    || owner.stateParentRealpath !== registrationState.canonicalTransactionParent
    || !REGISTRATION_OWNER_ID.test(owner.leaseOwnerId ?? "")
    || !REGISTRATION_OWNER_ID.test(owner.ownerId ?? ""))) {
    throw new Error(`unsafe compatible registration owner: ${transactionDirectory}`);
  }
  return {
    owner,
    directoryIdentity: { dev: directoryStat.dev, ino: directoryStat.ino },
    ownerIdentity: { dev: ownerStat.dev, ino: ownerStat.ino },
  };
}

async function classifyAtomicSourceDirectory({
  directory,
  beforeAssets,
  afterAssets,
  fileSystem,
}) {
  const current = await currentFlatAssetEntries(directory, fileSystem);
  if (current == null) return "missing";
  const before = [...beforeAssets].sort((left, right) => left.filename.localeCompare(right.filename));
  const after = [...afterAssets].sort((left, right) => left.filename.localeCompare(right.filename));
  const matchesBefore = sameAssetEntries(current, before);
  const matchesAfter = sameAssetEntries(current, after);
  if (matchesBefore && matchesAfter) return "before-and-after";
  if (matchesBefore) return "before";
  if (matchesAfter) return "after";
  throw new Error("current compatible source contains bytes not recognized by its atomic journal");
}

async function classifyAtomicReceipt({
  receiptPath,
  receiptSha256Before,
  receiptSha256After,
  fileSystem,
}) {
  const current = await readFileOrMissing(receiptPath, fileSystem);
  if (current == null) return "missing";
  const checksum = crypto.createHash("sha256").update(current).digest("hex");
  const matchesBefore = checksum === receiptSha256Before;
  const matchesAfter = checksum === receiptSha256After;
  if (matchesBefore && matchesAfter) return "before-and-after";
  if (matchesBefore) return "before";
  if (matchesAfter) return "after";
  throw new Error("current asset receipt contains bytes not recognized by its atomic journal");
}

async function inspectOwnedRegistrationArtifact(target, expectedKind, fileSystem) {
  try {
    const stat = await fileSystem.lstat(target);
    const safe = expectedKind === "directory"
      ? stat.isDirectory() && !stat.isSymbolicLink()
      : stat.isFile() && !stat.isSymbolicLink();
    if (!safe) {
      throw new Error(`owned registration ${expectedKind} is unsafe: ${target}`);
    }
    return "present";
  } catch (error) {
    if (error?.code === "ENOENT") return "missing";
    throw error;
  }
}

async function preflightAtomicRegistrationJournal({
  transactionDirectory,
  registrationState,
  journal,
  sourceDirectory,
  receiptPath,
  backupDirectory,
  backupReceipt,
  stagedReceipt,
  fileSystem,
}) {
  const artifacts = atomicRegistrationArtifactPaths({
    canonicalBaseAssets: registrationState.canonicalBaseAssets,
    sourceXstageSha256: journal.sourceXstageSha256,
    ownerId: journal.ownerId,
  });
  const [sourceState, receiptState, nextSourceState, nextReceiptState] = await Promise.all([
    classifyAtomicSourceDirectory({
      directory: sourceDirectory,
      beforeAssets: journal.hadSourceDirectory ? journal.backupAssets : [],
      afterAssets: journal.preparedAssets,
      fileSystem,
    }),
    classifyAtomicReceipt({
      receiptPath,
      receiptSha256Before: journal.receiptSha256Before,
      receiptSha256After: journal.receiptSha256After,
      fileSystem,
    }),
    inspectOwnedRegistrationArtifact(artifacts.nextSourceDirectory, "directory", fileSystem),
    inspectOwnedRegistrationArtifact(artifacts.nextReceiptPath, "file", fileSystem),
  ]);
  let priorSourceState = "missing";
  if (await inspectOwnedRegistrationArtifact(
    artifacts.priorSourceDirectory,
    "directory",
    fileSystem,
  ) === "present") {
    if (["committed", "rolled-back"].includes(journal.phase)) {
      priorSourceState = "present";
    } else {
      const priorEntries = await flatAssetDirectoryEntries(
        artifacts.priorSourceDirectory,
        fileSystem,
      );
      const expectedPrior = [...journal.backupAssets]
        .sort((left, right) => left.filename.localeCompare(right.filename));
      if (!journal.hadSourceDirectory || !sameAssetEntries(priorEntries, expectedPrior)) {
        throw new Error("atomic registration prior source does not match its journal");
      }
      priorSourceState = "before";
    }
  }

  const sourceIsBefore = journal.hadSourceDirectory
    ? registrationStateMatches(sourceState, "before")
    : sourceState === "missing";
  const sourceIsAfter = registrationStateMatches(sourceState, "after");
  const receiptIsBefore = registrationStateMatches(receiptState, "before");
  const receiptIsAfter = registrationStateMatches(receiptState, "after");

  if (journal.phase === "committed") {
    if (!sourceIsAfter || !receiptIsAfter) {
      throw new Error(
        `committed atomic registration state is not fully installed: source=${sourceState}, receipt=${receiptState}`,
      );
    }
    return {
      kind: "atomic-committed-cleanup",
      transactionDirectory,
      journal,
      backupDirectory,
      backupReceipt,
      stagedReceipt,
      artifacts,
    };
  }
  if (journal.phase === "rolled-back") {
    if (!sourceIsBefore || !receiptIsBefore) {
      throw new Error(
        `rolled-back atomic registration state is not fully restored: source=${sourceState}, receipt=${receiptState}`,
      );
    }
    return {
      kind: "atomic-rolled-back-cleanup",
      transactionDirectory,
      journal,
      backupDirectory,
      backupReceipt,
      stagedReceipt,
      artifacts,
    };
  }

  const sourceCombinationIsRecognized = journal.hadSourceDirectory
    ? ((sourceIsBefore && priorSourceState === "missing")
      || ((sourceState === "missing" || sourceIsAfter) && priorSourceState === "before"))
    : (priorSourceState === "missing" && (sourceState === "missing" || sourceIsAfter));
  if (!sourceCombinationIsRecognized
    || (!receiptIsBefore && !receiptIsAfter)) {
    throw new Error(
      `atomic registration state is not recoverable: source=${sourceState}, prior=${priorSourceState}, receipt=${receiptState}`,
    );
  }
  return {
    kind: "atomic-rollback",
    transactionDirectory,
    sourceDirectory,
    receiptPath,
    backupDirectory,
    backupReceipt,
    stagedReceipt,
    journal,
    artifacts,
    observed: {
      sourceState,
      receiptState,
      priorSourceState,
      nextSourceState,
      nextReceiptState,
    },
  };
}

async function preflightCompatibleAssetRegistrationJournal({
  transactionDirectory,
  registrationState,
  fileSystem,
  suppliedOwner = null,
}) {
  const expectedBaseAssets = registrationState.canonicalBaseAssets;
  const owner = suppliedOwner ?? (await inspectRegistrationTransactionOwner({
    transactionDirectory,
    registrationState,
    fileSystem,
  })).owner;
  if (!owner || owner.schemaVersion !== REGISTRATION_OWNER_SCHEMA
    || owner.baseAssetsRealpath !== expectedBaseAssets
    || owner.stateParentRealpath !== registrationState.canonicalTransactionParent
    || !REGISTRATION_OWNER_ID.test(owner.leaseOwnerId ?? "")
    || !REGISTRATION_OWNER_ID.test(owner.ownerId ?? "")) {
    throw new Error(`unsafe compatible registration owner: ${transactionDirectory}`);
  }
  const journalPath = path.join(transactionDirectory, "journal.json");
  let journal;
  try {
    journal = JSON.parse(await fileSystem.readFile(journalPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    // The protocol persists its first journal before touching packaged assets.
    // A child without one is therefore an abandoned staging workspace only.
    return { kind: "abandoned-staging", transactionDirectory };
  }
  if (!journal || journal.schemaVersion !== REGISTRATION_JOURNAL_SCHEMA
    || journal.baseAssetsRealpath !== expectedBaseAssets
    || journal.stateParentRealpath !== registrationState.canonicalTransactionParent
    || journal.leaseOwnerId !== owner.leaseOwnerId
    || journal.ownerId !== owner.ownerId
    || !SHA256.test(journal.sourceXstageSha256 ?? "")
    || !([null, REGISTRATION_ATOMIC_INSTALL_PROTOCOL].includes(
      journal.installProtocol ?? null,
    ))
    || !(journal.installProtocol === REGISTRATION_ATOMIC_INSTALL_PROTOCOL
      ? [
        "staging",
        "prepared",
        "source-retired",
        "source-installed",
        "committed",
        "rolled-back",
      ].includes(journal.phase)
      : ["prepared", "source-installed", "committed"].includes(journal.phase))
    || typeof journal.hadSourceDirectory !== "boolean"
    || !SHA256.test(journal.receiptSha256Before ?? "")
    || !SHA256.test(journal.receiptSha256After ?? "")) {
    throw new Error(`unsafe compatible registration journal: ${transactionDirectory}`);
  }
  validateJournalAssetList(journal.backupAssets, "backup assets");
  validateJournalAssetList(journal.preparedAssets, "prepared assets");

  const sourceDirectory = path.join(
    expectedBaseAssets,
    "sources",
    journal.sourceXstageSha256,
  );
  const receiptPath = path.join(expectedBaseAssets, "receipt.json");
  const backupDirectory = path.join(transactionDirectory, "backup-source");
  const backupReceipt = path.join(transactionDirectory, "backup-receipt.json");
  const stagedReceipt = path.join(transactionDirectory, "staged-receipt.json");

  if (journal.hadSourceDirectory) {
    await verifyFlatAssetDirectory(
      backupDirectory,
      journal.backupAssets.map(({ filename, outputSha256 }) => [filename, outputSha256]),
      fileSystem,
    );
  } else if (journal.backupAssets.length !== 0) {
    throw new Error("registration journal records assets for a missing backup source");
  }
  if (journal.installProtocol === REGISTRATION_ATOMIC_INSTALL_PROTOCOL) {
    const [backupReceiptBytes, stagedReceiptBytes] = await Promise.all([
      fileSystem.readFile(backupReceipt),
      fileSystem.readFile(stagedReceipt),
    ]);
    if (crypto.createHash("sha256").update(backupReceiptBytes).digest("hex")
      !== journal.receiptSha256Before) {
      throw new Error("registration journal receipt backup checksum mismatch");
    }
    if (crypto.createHash("sha256").update(stagedReceiptBytes).digest("hex")
      !== journal.receiptSha256After) {
      throw new Error("registration journal staged receipt checksum mismatch");
    }
    return preflightAtomicRegistrationJournal({
      transactionDirectory,
      registrationState,
      journal,
      sourceDirectory,
      receiptPath,
      backupDirectory,
      backupReceipt,
      stagedReceipt,
      fileSystem,
    });
  }
  const [sourceState, receiptState] = await Promise.all([
    classifyCurrentSourceDirectory({
      sourceDirectory,
      backupAssets: journal.backupAssets,
      preparedAssets: journal.preparedAssets,
      fileSystem,
    }),
    classifyCurrentReceipt({
      receiptPath,
      backupReceipt,
      stagedReceipt,
      receiptSha256Before: journal.receiptSha256Before,
      receiptSha256After: journal.receiptSha256After,
      fileSystem,
    }),
  ]);

  if (journal.phase === "committed") {
    if (sourceState !== "after" || receiptState !== "after") {
      throw new Error(
        `committed registration state is not fully installed: source=${sourceState}, receipt=${receiptState}`,
      );
    }
    return { kind: "committed-cleanup", transactionDirectory };
  }

  return {
    kind: "rollback",
    transactionDirectory,
    sourceDirectory,
    receiptPath,
    backupDirectory,
    backupReceipt,
    journal,
  };
}

async function removeOwnedRegistrationArtifact(target, expectedKind, fileSystem) {
  let before;
  try {
    before = await fileSystem.lstat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  const beforeIsSafe = expectedKind === "directory"
    ? before.isDirectory() && !before.isSymbolicLink()
    : before.isFile() && !before.isSymbolicLink();
  if (!beforeIsSafe) {
    throw new Error(`owned registration ${expectedKind} is unsafe: ${target}`);
  }
  const tombstone = `${target}.cleanup-${crypto.randomUUID()}`;
  await durableSameParentRename(target, tombstone, fileSystem);
  let retirementError = null;
  try {
    const retired = await fileSystem.lstat(tombstone);
    const safe = expectedKind === "directory"
      ? retired.isDirectory() && !retired.isSymbolicLink()
      : retired.isFile() && !retired.isSymbolicLink();
    if (!safe || retired.dev !== before.dev || retired.ino !== before.ino) {
      throw new Error(`owned registration ${expectedKind} changed during retirement`);
    }
  } catch (error) {
    retirementError = error;
  }
  if (retirementError) {
    try {
      await durableSameParentRename(tombstone, target, fileSystem);
    } catch (restoreError) {
      throw new AggregateError(
        [retirementError, restoreError],
        `owned registration ${expectedKind} changed and its retired state was preserved`,
      );
    }
    throw retirementError;
  }
  if (expectedKind === "directory") {
    await fileSystem.rm(tombstone, { recursive: true, force: false });
    await syncRegistrationDirectory(path.dirname(tombstone), fileSystem);
    return;
  }
  await durableUnlink(tombstone, fileSystem);
}

async function cleanupRegistrationArtifactTombstones(target, expectedKind, fileSystem) {
  const parent = path.dirname(target);
  const prefix = `${path.basename(target)}.cleanup-`;
  const entries = await fileSystem.readdir(parent, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.name.startsWith(prefix)) continue;
    const match = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[a-f0-9-]+$`)
      .test(entry.name);
    const safe = expectedKind === "directory"
      ? entry.isDirectory() && !entry.isSymbolicLink()
      : entry.isFile() && !entry.isSymbolicLink();
    if (!match || !safe) {
      throw new Error(`owned registration cleanup artifact is unsafe: ${entry.name}`);
    }
    const artifact = path.join(parent, entry.name);
    if (expectedKind === "directory") {
      await fileSystem.rm(artifact, { recursive: true, force: false });
      await syncRegistrationDirectory(parent, fileSystem);
    } else {
      await durableUnlink(artifact, fileSystem);
    }
  }
}

async function restoreAtomicRegistrationReceipt(plan, fileSystem) {
  await removeOwnedRegistrationArtifact(plan.artifacts.nextReceiptPath, "file", fileSystem);
  await fileSystem.copyFile(
    plan.backupReceipt,
    plan.artifacts.nextReceiptPath,
    fsConstants.COPYFILE_EXCL,
  );
  await syncRegistrationFile(plan.artifacts.nextReceiptPath, fileSystem);
  if (await sha256(plan.artifacts.nextReceiptPath, fileSystem)
    !== plan.journal.receiptSha256Before) {
    throw new Error("atomic rollback receipt checksum mismatch before installation");
  }
  await durableSameParentRename(
    plan.artifacts.nextReceiptPath,
    plan.receiptPath,
    fileSystem,
  );
}

async function rollbackAtomicRegistration(plan, registrationState, fileSystem) {
  await registrationState.assertLease?.();
  const { artifacts, journal, observed } = plan;
  if (journal.hadSourceDirectory && observed.priorSourceState === "before") {
    if (observed.sourceState !== "missing") {
      await removeOwnedRegistrationArtifact(
        artifacts.nextSourceDirectory,
        "directory",
        fileSystem,
      );
      await durableSameParentRename(
        artifacts.sourceDirectory,
        artifacts.nextSourceDirectory,
        fileSystem,
      );
    }
    await durableSameParentRename(
      artifacts.priorSourceDirectory,
      artifacts.sourceDirectory,
      fileSystem,
    );
  } else if (!journal.hadSourceDirectory
    && registrationStateMatches(observed.sourceState, "after")) {
    await removeOwnedRegistrationArtifact(
      artifacts.nextSourceDirectory,
      "directory",
      fileSystem,
    );
    await durableSameParentRename(
      artifacts.sourceDirectory,
      artifacts.nextSourceDirectory,
      fileSystem,
    );
  }
  await registrationState.assertLease?.();
  if (!registrationStateMatches(observed.receiptState, "before")) {
    await restoreAtomicRegistrationReceipt(plan, fileSystem);
  }
  await registrationState.assertLease?.();
  const [restoredSource, restoredReceipt] = await Promise.all([
    classifyAtomicSourceDirectory({
      directory: artifacts.sourceDirectory,
      beforeAssets: journal.hadSourceDirectory ? journal.backupAssets : [],
      afterAssets: journal.preparedAssets,
      fileSystem,
    }),
    classifyAtomicReceipt({
      receiptPath: artifacts.receiptPath,
      receiptSha256Before: journal.receiptSha256Before,
      receiptSha256After: journal.receiptSha256After,
      fileSystem,
    }),
  ]);
  const sourceIsRestored = journal.hadSourceDirectory
    ? registrationStateMatches(restoredSource, "before")
    : restoredSource === "missing";
  if (!sourceIsRestored || !registrationStateMatches(restoredReceipt, "before")) {
    throw new Error(
      `atomic registration rollback did not restore exact prior state: source=${restoredSource}, receipt=${restoredReceipt}`,
    );
  }
  journal.phase = "rolled-back";
  await writeRegistrationJournal(plan.transactionDirectory, journal, fileSystem);
}

async function cleanupAtomicRegistrationArtifacts(plan, fileSystem) {
  await removeOwnedRegistrationArtifact(
    plan.artifacts.nextSourceDirectory,
    "directory",
    fileSystem,
  );
  await removeOwnedRegistrationArtifact(
    plan.artifacts.priorSourceDirectory,
    "directory",
    fileSystem,
  );
  await removeOwnedRegistrationArtifact(
    plan.artifacts.nextReceiptPath,
    "file",
    fileSystem,
  );
  await cleanupRegistrationArtifactTombstones(
    plan.artifacts.nextSourceDirectory,
    "directory",
    fileSystem,
  );
  await cleanupRegistrationArtifactTombstones(
    plan.artifacts.priorSourceDirectory,
    "directory",
    fileSystem,
  );
  await cleanupRegistrationArtifactTombstones(
    plan.artifacts.nextReceiptPath,
    "file",
    fileSystem,
  );
}

async function maybeRetireRegistrationJournalLocator({
  registrationState,
  expectedOwnerId,
  fileSystem,
}) {
  const locatorPath = activeRegistrationJournalLocatorPath(
    registrationState.canonicalLockStateParent,
  );
  let active;
  try {
    active = await inspectRegistrationJournalLocator(
      locatorPath,
      registrationState.canonicalBaseAssets,
      fileSystem,
    );
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (active.locator.ownerId !== expectedOwnerId) {
    throw new Error("another canonical registration journal locator is active");
  }
  await retireRegistrationJournalLocator({
    registrationState,
    expectedOwnerId,
    fileSystem,
  });
}

async function retireAndRemoveRegistrationTransaction({
  plan,
  registrationState,
  fileSystem,
}) {
  const transactionDirectory = plan.transactionDirectory;
  if (path.dirname(transactionDirectory) !== registrationState.canonicalTransactionParent
    || !path.basename(transactionDirectory).startsWith(REGISTRATION_TRANSACTION_PREFIX)) {
    throw new Error("compatible registration transaction cleanup escaped its state parent");
  }
  const pinned = await inspectRegistrationTransactionOwner({
    transactionDirectory,
    registrationState,
    fileSystem,
  });
  if (pinned.owner.ownerId !== plan.journal.ownerId) {
    throw new Error("compatible registration transaction owner changed before cleanup");
  }
  const tombstone = path.join(
    registrationState.canonicalTransactionParent,
    `${REGISTRATION_TRANSACTION_RETIRED_PREFIX}${plan.journal.ownerId}-${crypto.randomUUID()}`,
  );
  await durableSameParentRename(transactionDirectory, tombstone, fileSystem);
  let retirementError = null;
  try {
    const retired = await inspectRegistrationTransactionOwner({
      transactionDirectory: tombstone,
      registrationState,
      fileSystem,
    });
    if (retired.owner.ownerId !== plan.journal.ownerId
      || retired.directoryIdentity.dev !== pinned.directoryIdentity.dev
      || retired.directoryIdentity.ino !== pinned.directoryIdentity.ino
      || retired.ownerIdentity.dev !== pinned.ownerIdentity.dev
      || retired.ownerIdentity.ino !== pinned.ownerIdentity.ino) {
      throw new Error("compatible registration transaction changed during cleanup retirement");
    }
  } catch (error) {
    retirementError = error;
  }
  if (retirementError) {
    try {
      await durableSameParentRename(tombstone, transactionDirectory, fileSystem);
    } catch (restoreError) {
      throw new AggregateError(
        [retirementError, restoreError],
        "compatible registration transaction changed and its retired state was preserved",
      );
    }
    throw retirementError;
  }
  await fileSystem.rm(tombstone, { recursive: true, force: false });
  await syncRegistrationDirectory(registrationState.canonicalTransactionParent, fileSystem);
}

async function finalizeAtomicRegistrationTransaction({
  plan,
  registrationState,
  fileSystem,
}) {
  await cleanupAtomicRegistrationArtifacts(plan, fileSystem);
  await maybeRetireRegistrationJournalLocator({
    registrationState,
    expectedOwnerId: plan.journal.ownerId,
    fileSystem,
  });
  await retireAndRemoveRegistrationTransaction({ plan, registrationState, fileSystem });
}

async function applyCompatibleAssetRegistrationRecovery({
  plan,
  registrationState,
  fileSystem,
}) {
  await registrationState.assertLease?.();
  if (plan.kind.startsWith("atomic-")) {
    if (plan.kind === "atomic-rollback") {
      await rollbackAtomicRegistration(plan, registrationState, fileSystem);
    }
    await finalizeAtomicRegistrationTransaction({ plan, registrationState, fileSystem });
    return;
  }
  if (plan.kind !== "rollback") {
    await fileSystem.rm(plan.transactionDirectory, { recursive: true, force: true });
    return;
  }
  await fileSystem.rm(plan.sourceDirectory, { recursive: true, force: true });
  if (plan.journal.hadSourceDirectory) {
    await fileSystem.cp(plan.backupDirectory, plan.sourceDirectory, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    await verifyFlatAssetDirectory(
      plan.sourceDirectory,
      plan.journal.backupAssets.map(({ filename, outputSha256 }) => [filename, outputSha256]),
      fileSystem,
    );
  }
  await registrationState.assertLease?.();
  await fileSystem.copyFile(plan.backupReceipt, plan.receiptPath);
  if (await sha256(plan.receiptPath, fileSystem) !== plan.journal.receiptSha256Before) {
    throw new Error("recovered registration receipt checksum mismatch");
  }
  await registrationState.assertLease?.();
  await fileSystem.rm(plan.transactionDirectory, { recursive: true, force: true });
}

async function recoverCompatibleAssetRegistrationJournal({
  transactionDirectory,
  registrationState,
  fileSystem,
}) {
  const plan = await preflightCompatibleAssetRegistrationJournal({
    transactionDirectory,
    registrationState,
    fileSystem,
  });
  await applyCompatibleAssetRegistrationRecovery({ plan, registrationState, fileSystem });
}

async function recoverLocatedCompatibleAssetRegistrationJournal({
  registrationState,
  fileSystem,
}) {
  const locatorPath = activeRegistrationJournalLocatorPath(
    registrationState.canonicalLockStateParent,
  );
  let inspected;
  try {
    inspected = await inspectRegistrationJournalLocator(
      locatorPath,
      registrationState.canonicalBaseAssets,
      fileSystem,
    );
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  const locatedParentStat = await fileSystem.lstat(inspected.locator.stateParentRealpath);
  if (!locatedParentStat.isDirectory() || locatedParentStat.isSymbolicLink()
    || path.resolve(await fileSystem.realpath(inspected.locator.stateParentRealpath))
      !== inspected.locator.stateParentRealpath) {
    throw new Error("canonical registration journal locator state parent changed identity");
  }
  const locatedState = await resolveRegistrationState({
    baseAssets: registrationState.canonicalBaseAssets,
    transactionParent: inspected.locator.stateParentRealpath,
    fileSystem,
  });
  if (locatedState.canonicalTransactionParent !== inspected.locator.stateParentRealpath) {
    throw new Error("canonical registration journal locator state parent changed");
  }
  const locatedRegistrationState = {
    ...locatedState,
    canonicalLockStateParent: registrationState.canonicalLockStateParent,
    lockOwnerId: registrationState.lockOwnerId,
    assertLease: registrationState.assertLease,
  };
  const transactionDirectory = path.join(
    locatedState.canonicalTransactionParent,
    inspected.locator.transactionDirectoryBasename,
  );
  const canonicalTransactionDirectory = path.resolve(
    await fileSystem.realpath(transactionDirectory),
  );
  if (canonicalTransactionDirectory !== transactionDirectory
    || path.dirname(canonicalTransactionDirectory) !== locatedState.canonicalTransactionParent) {
    throw new Error("canonical registration journal locator transaction changed identity");
  }
  const plans = await preflightCompatibleAssetRegistrationJournals({
    registrationState: locatedRegistrationState,
    fileSystem,
  });
  if (plans.length !== 1 || plans[0].transactionDirectory !== transactionDirectory) {
    throw new Error(
      "canonical registration journal locator does not uniquely identify the pending transaction",
    );
  }
  const [plan] = plans;
  if (plan.journal?.ownerId !== inspected.locator.ownerId) {
    throw new Error("canonical registration journal locator owner mismatch");
  }
  await applyCompatibleAssetRegistrationRecovery({
    plan,
    registrationState: locatedRegistrationState,
    fileSystem,
  });
}

async function preflightCompatibleAssetRegistrationJournals({
  registrationState,
  fileSystem = fs,
}) {
  const resolvedBaseAssets = registrationState.canonicalBaseAssets;
  const resolvedTransactionParent = registrationState.canonicalTransactionParent;
  const entries = await fileSystem.readdir(resolvedTransactionParent, { withFileTypes: true });
  const recoveryPlans = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.name.startsWith(REGISTRATION_TRANSACTION_PREFIX)) continue;
    if (!entry.isDirectory()) {
      throw new Error(`registration journal contains an unsupported entry: ${entry.name}`);
    }
    const transactionDirectory = path.join(resolvedTransactionParent, entry.name);
    let owner;
    try {
      owner = (await inspectRegistrationTransactionOwner({
        transactionDirectory,
        registrationState,
        fileSystem,
        validateOwner: false,
      })).owner;
    } catch (error) {
      if (error?.code === "ENOENT") {
        const ownerlessEntries = await fileSystem.readdir(transactionDirectory);
        if (ownerlessEntries.length === 0) continue;
        if (ownerlessEntries.includes("journal.json")) {
          throw new Error(`ownerless registration journal is unsafe: ${entry.name}`);
        }
        throw new Error(`ownerless registration staging directory is not empty: ${entry.name}`);
      }
      throw error;
    }
    if (owner?.schemaVersion !== REGISTRATION_OWNER_SCHEMA) {
      throw new Error(`unsupported compatible registration owner schema: ${entry.name}`);
    }
    if (owner.baseAssetsRealpath !== resolvedBaseAssets
      || owner.stateParentRealpath !== resolvedTransactionParent) {
      throw new Error(`registration owner canonical identity mismatch: ${entry.name}`);
    }
    recoveryPlans.push(await preflightCompatibleAssetRegistrationJournal({
      transactionDirectory,
      registrationState,
      fileSystem,
      suppliedOwner: owner,
    }));
  }
  return recoveryPlans;
}

async function recoverCompatibleAssetRegistrationJournals({
  registrationState,
  fileSystem = fs,
}) {
  const recoveryPlans = await preflightCompatibleAssetRegistrationJournals({
    registrationState,
    fileSystem,
  });
  if (recoveryPlans.length > 1) {
    throw new Error(
      "multiple compatible registration journals require explicit operator inspection before recovery",
    );
  }
  if (recoveryPlans.length === 1) {
    await applyCompatibleAssetRegistrationRecovery({
      plan: recoveryPlans[0],
      registrationState,
      fileSystem,
    });
  }
}

async function commitCompatibleAssetRegistrationUnderLock({
  baseAssets,
  sourceXstageSha256,
  preparedAssets,
  receipt,
  registrationState,
  fileSystem = fs,
}) {
  const resolvedBaseAssets = path.resolve(baseAssets);
  const {
    resolvedTransactionParent,
    canonicalBaseAssets,
    canonicalTransactionParent,
  } = registrationState;
  if (!REGISTRATION_OWNER_ID.test(registrationState.lockOwnerId ?? "")) {
    throw new Error("compatible asset registration requires an active canonical lease");
  }
  if (!SHA256.test(sourceXstageSha256 ?? "")) {
    throw new Error("compatible source must be a lowercase SHA-256");
  }
  if (!Array.isArray(preparedAssets)) {
    throw new Error("prepared assets must be an array");
  }

  if (!receipt || receipt.schemaVersion !== "shaz-tvg-asset-receipt-v3"
    || !Array.isArray(receipt.sources)
    || !receipt.sources.some((source) => (
      source && source.xstageSha256 === sourceXstageSha256
    ))
    || !Array.isArray(receipt.assets)) {
    throw new Error("registration receipt does not contain the compatible source");
  }

  const expectedPrefix = `sources/${sourceXstageSha256}/`;
  const expectedAssets = new Map();
  for (const asset of receipt.assets.filter(({ sourceXstageSha256: source }) => (
    source === sourceXstageSha256
  ))) {
    if (typeof asset.filename !== "string" || !asset.filename.startsWith(expectedPrefix)) {
      throw new Error("registration receipt contains an invalid compatible asset path");
    }
    const filename = asset.filename.slice(expectedPrefix.length);
    if (!FLAT_ASSET_FILENAME.test(filename)
      || asset.filename !== `${expectedPrefix}${filename}`
      || !SHA256.test(asset.outputSha256 ?? "")
      || expectedAssets.has(filename)) {
      throw new Error("registration receipt contains an invalid compatible asset boundary");
    }
    expectedAssets.set(filename, asset.outputSha256);
  }

  const preparedByFilename = new Map();
  for (const asset of preparedAssets) {
    if (!asset || typeof asset.source !== "string"
      || !FLAT_ASSET_FILENAME.test(asset.filename ?? "")
      || !SHA256.test(asset.outputSha256 ?? "")
      || preparedByFilename.has(asset.filename)) {
      throw new Error("prepared compatible assets require unique flat PNG filenames and SHA-256 checksums");
    }
    if (expectedAssets.get(asset.filename) !== asset.outputSha256) {
      throw new Error(`prepared compatible asset does not match the receipt: ${asset.filename}`);
    }
    preparedByFilename.set(asset.filename, asset);
  }
  if (preparedByFilename.size !== expectedAssets.size) {
    throw new Error("prepared compatible assets do not exactly match the receipt");
  }
  for (const asset of preparedAssets) {
    if (await sha256(path.resolve(asset.source), fileSystem) !== asset.outputSha256) {
      throw new Error(`prepared compatible asset checksum mismatch: ${asset.filename}`);
    }
  }

  await registrationState.assertLease?.();
  const transactionDirectory = path.resolve(await fileSystem.mkdtemp(
    path.join(resolvedTransactionParent, REGISTRATION_TRANSACTION_PREFIX),
  ));
  await syncRegistrationDirectory(resolvedTransactionParent, fileSystem);
  const canonicalTransactionDirectory = await fileSystem.realpath(transactionDirectory);
  if (path.dirname(transactionDirectory) !== resolvedTransactionParent
    || !path.basename(transactionDirectory).startsWith(REGISTRATION_TRANSACTION_PREFIX)
    || path.dirname(canonicalTransactionDirectory) !== canonicalTransactionParent
    || isPathInside(canonicalTransactionDirectory, canonicalBaseAssets)) {
    throw new Error("transaction factory did not create an owned child outside the asset tree");
  }

  const ownerId = crypto.randomBytes(16).toString("hex");
  const ownerPath = path.join(transactionDirectory, "owner.json");
  try {
    await fileSystem.writeFile(ownerPath, `${JSON.stringify({
      schemaVersion: REGISTRATION_OWNER_SCHEMA,
      ownerId,
      leaseOwnerId: registrationState.lockOwnerId,
      baseAssetsRealpath: canonicalBaseAssets,
      stateParentRealpath: canonicalTransactionParent,
    }, null, 2)}\n`, { flag: "wx" });
    await syncRegistrationFile(ownerPath, fileSystem);
    await syncRegistrationDirectory(transactionDirectory, fileSystem);
  } catch (error) {
    try {
      await fileSystem.rm(transactionDirectory, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "compatible asset registration could not initialize or clean its owned transaction child",
      );
    }
    throw error;
  }

  const sourceDirectory = path.join(resolvedBaseAssets, "sources", sourceXstageSha256);
  const stagedDirectory = path.join(transactionDirectory, "staged-source");
  const backupDirectory = path.join(transactionDirectory, "backup-source");
  const stagedReceipt = path.join(transactionDirectory, "staged-receipt.json");
  const backupReceipt = path.join(transactionDirectory, "backup-receipt.json");
  const receiptPath = path.join(resolvedBaseAssets, "receipt.json");
  const artifacts = atomicRegistrationArtifactPaths({
    canonicalBaseAssets,
    sourceXstageSha256,
    ownerId,
  });
  let journal = null;

  try {
    await fileSystem.mkdir(stagedDirectory);
    for (const asset of preparedAssets) {
      await fileSystem.copyFile(
        path.resolve(asset.source),
        path.join(stagedDirectory, asset.filename),
        fsConstants.COPYFILE_EXCL,
      );
    }
    await verifyFlatAssetDirectory(stagedDirectory, [...expectedAssets.entries()], fileSystem);
    await syncFlatAssetDirectory(stagedDirectory, [...expectedAssets.entries()], fileSystem);
    const serializedReceipt = `${JSON.stringify(receipt, null, 2)}\n`;
    await fileSystem.writeFile(stagedReceipt, serializedReceipt, { flag: "wx" });
    await syncRegistrationFile(stagedReceipt, fileSystem);
    await fileSystem.copyFile(receiptPath, backupReceipt, fsConstants.COPYFILE_EXCL);
    await syncRegistrationFile(backupReceipt, fileSystem);
    const receiptSha256Before = await sha256(backupReceipt, fileSystem);
    let hadSourceDirectory = true;
    try {
      await fileSystem.cp(sourceDirectory, backupDirectory, {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      hadSourceDirectory = false;
    }
    const backupAssets = hadSourceDirectory
      ? await flatAssetDirectoryEntries(backupDirectory, fileSystem)
      : [];
    if (hadSourceDirectory) {
      await syncFlatAssetDirectory(
        backupDirectory,
        backupAssets.map(({ filename, outputSha256 }) => [filename, outputSha256]),
        fileSystem,
      );
    }
    await syncRegistrationDirectory(transactionDirectory, fileSystem);
    journal = {
      schemaVersion: REGISTRATION_JOURNAL_SCHEMA,
      installProtocol: REGISTRATION_ATOMIC_INSTALL_PROTOCOL,
      ownerId,
      leaseOwnerId: registrationState.lockOwnerId,
      baseAssetsRealpath: canonicalBaseAssets,
      stateParentRealpath: canonicalTransactionParent,
      sourceXstageSha256,
      phase: "staging",
      hadSourceDirectory,
      receiptSha256Before,
      receiptSha256After: crypto.createHash("sha256").update(serializedReceipt).digest("hex"),
      backupAssets,
      preparedAssets: [...expectedAssets.entries()].map(([filename, outputSha256]) => ({
        filename,
        outputSha256,
      })),
    };
    await writeRegistrationJournal(transactionDirectory, journal, fileSystem);
    await publishRegistrationJournalLocator({
      registrationState,
      transactionDirectory,
      ownerId,
      fileSystem,
    });

    await registrationState.assertLease?.();
    await fileSystem.mkdir(artifacts.sourceParent, { recursive: true });
    await fileSystem.cp(stagedDirectory, artifacts.nextSourceDirectory, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    await verifyFlatAssetDirectory(
      artifacts.nextSourceDirectory,
      journal.preparedAssets.map(({ filename, outputSha256 }) => [filename, outputSha256]),
      fileSystem,
    );
    await syncFlatAssetDirectory(
      artifacts.nextSourceDirectory,
      journal.preparedAssets.map(({ filename, outputSha256 }) => [filename, outputSha256]),
      fileSystem,
    );
    await syncRegistrationDirectory(artifacts.sourceParent, fileSystem);
    await fileSystem.copyFile(
      stagedReceipt,
      artifacts.nextReceiptPath,
      fsConstants.COPYFILE_EXCL,
    );
    await syncRegistrationFile(artifacts.nextReceiptPath, fileSystem);
    if (await sha256(artifacts.nextReceiptPath, fileSystem) !== journal.receiptSha256After) {
      throw new Error("pending compatible asset receipt checksum mismatch");
    }
    await syncRegistrationDirectory(canonicalBaseAssets, fileSystem);
    const [untouchedSource, untouchedReceipt] = await Promise.all([
      classifyAtomicSourceDirectory({
        directory: sourceDirectory,
        beforeAssets: hadSourceDirectory ? journal.backupAssets : [],
        afterAssets: journal.preparedAssets,
        fileSystem,
      }),
      classifyAtomicReceipt({
        receiptPath,
        receiptSha256Before: journal.receiptSha256Before,
        receiptSha256After: journal.receiptSha256After,
        fileSystem,
      }),
    ]);
    const sourceStillBefore = hadSourceDirectory
      ? registrationStateMatches(untouchedSource, "before")
      : untouchedSource === "missing";
    if (!sourceStillBefore || !registrationStateMatches(untouchedReceipt, "before")) {
      throw new Error("live registration state changed while atomic siblings were prepared");
    }
    journal.phase = "prepared";
    await writeRegistrationJournal(transactionDirectory, journal, fileSystem);

    await registrationState.assertLease?.();
    if (hadSourceDirectory) {
      await durableSameParentRename(
        sourceDirectory,
        artifacts.priorSourceDirectory,
        fileSystem,
      );
    }
    journal.phase = "source-retired";
    await writeRegistrationJournal(transactionDirectory, journal, fileSystem);

    await registrationState.assertLease?.();
    await durableSameParentRename(
      artifacts.nextSourceDirectory,
      sourceDirectory,
      fileSystem,
    );
    await verifyFlatAssetDirectory(
      sourceDirectory,
      journal.preparedAssets.map(({ filename, outputSha256 }) => [filename, outputSha256]),
      fileSystem,
    );
    journal.phase = "source-installed";
    await writeRegistrationJournal(transactionDirectory, journal, fileSystem);

    await registrationState.assertLease?.();
    await durableSameParentRename(artifacts.nextReceiptPath, receiptPath, fileSystem);
    if (await sha256(receiptPath, fileSystem) !== journal.receiptSha256After) {
      throw new Error("installed compatible asset receipt checksum mismatch");
    }
    journal.phase = "committed";
    await writeRegistrationJournal(transactionDirectory, journal, fileSystem);
  } catch (error) {
    const recoveryErrors = [];
    try {
      await recoverCompatibleAssetRegistrationJournal({
        transactionDirectory,
        registrationState,
        fileSystem,
      });
    } catch (recoveryError) {
      recoveryErrors.push(recoveryError);
    }
    if (recoveryErrors.length > 0) {
      throw new AggregateError(
        [error, ...recoveryErrors],
        "compatible asset registration failed and journal recovery was incomplete",
      );
    }
    throw error;
  }

  try {
    await recoverCompatibleAssetRegistrationJournal({
      transactionDirectory,
      registrationState,
      fileSystem,
    });
  } catch (error) {
    throw new Error(
      "compatible asset registration committed but journal cleanup failed; the registered asset tree remains valid and the next invocation will retry cleanup",
      { cause: error },
    );
  }
  return { receiptPath, sourceDirectory };
}

export async function commitCompatibleAssetRegistration({
  baseAssets,
  sourceXstageSha256,
  preparedAssets,
  receipt,
  transactionParent = null,
  fileSystem = fs,
  lockHooks = {},
}) {
  return withCompatibleRegistrationLease({
    baseAssets,
    transactionParent,
    fileSystem,
    lockHooks,
  }, (lockedState) => commitCompatibleAssetRegistrationUnderLock({
    baseAssets: lockedState.resolvedBaseAssets,
    sourceXstageSha256,
    preparedAssets,
    receipt,
    registrationState: lockedState,
    fileSystem,
  }));
}

async function registerCompatibleAssetsUnderLock(args, registrationState) {
  const baseAssets = registrationState.resolvedBaseAssets;
  const compatibleAssets = path.resolve(args.compatibleAssets);
  const [manifest, rawBaseReceipt, compatibleReceipt, ...recipes] = await Promise.all([
    fs.readFile(path.resolve(args.manifest), "utf8").then(JSON.parse),
    fs.readFile(path.join(baseAssets, "receipt.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(compatibleAssets, "receipt.json"), "utf8").then(JSON.parse),
    ...args.recipes.map((recipe) => fs.readFile(path.resolve(recipe), "utf8").then(JSON.parse)),
  ]);
  if (compatibleReceipt.schemaVersion !== "shaz-tvg-asset-receipt-v2"
    || compatibleReceipt.sourceXstageSha256 !== args.sourceXstageSha256
    || compatibleReceipt.artistRenderedFramesUsed !== false) {
    throw new Error("compatible asset receipt does not match the declared Xstage source");
  }
  const state = baseReceiptState(rawBaseReceipt);
  await loadAssetRegistration(baseAssets, manifest.source?.sha256);
  if (manifest.source?.sha256 !== state.runtimeXstageSha256) {
    throw new Error("runtime manifest and base asset receipt reference different Xstage sources");
  }
  if (args.sourceXstageSha256 === state.runtimeXstageSha256) {
    throw new Error("compatible Xstage source must differ from the runtime Xstage source");
  }
  const drawingElements = drawingElementsByNodeName(manifest);
  const required = new Set();
  for (const recipe of recipes) {
    const sourceAction = recipe.sourceAction ?? {};
    const sourceArchiveName = sourceAction.sourceArchiveName ?? sourceAction.sourceArchive;
    if (sourceAction.sourceXstageSha256 !== args.sourceXstageSha256
      || sourceAction.sourceFile !== args.sourceXstageName
      || sourceAction.sourceArchiveSha256 !== args.sourceArchiveSha256
      || sourceArchiveName !== args.sourceArchiveName) {
      throw new Error(`recipe ${recipe.id ?? "<unnamed>"} does not match the declared compatible-source provenance`);
    }
    for (const [nodeName, drawings] of Object.entries(recipe.drawingSources ?? {})) {
      const element = drawingElements.get(nodeName);
      if (!element) throw new Error(`recipe ${recipe.id} drawing source is not a runtime READ: ${nodeName}`);
      for (const [drawing, source] of Object.entries(drawings)) {
        if (source !== args.sourceXstageSha256) {
          throw new Error(`recipe ${recipe.id} has a mismatched drawing source`);
        }
        required.add(`${element}:${drawing}`);
      }
    }
  }

  const selected = compatibleReceipt.assets.filter((asset) => (
    required.has(`${asset.element}:${asset.drawing}`)
  ));
  for (const key of required) {
    if (!selected.some((asset) => `${asset.element}:${asset.drawing}` === key
      && asset.variant === "main")) {
      throw new Error(`compatible receipt is missing required main drawing ${key}`);
    }
  }

  const extensionAssets = [];
  const preparedAssets = [];
  for (const asset of selected) {
    let expectedFilename = null;
    try {
      expectedFilename = assetFilename({
        element: asset.element,
        drawing: String(asset.drawing ?? ""),
      }, asset.variant);
    } catch {
      // The common validation error below keeps receipts from exposing implementation details.
    }
    if (!FLAT_ASSET_FILENAME.test(asset.filename)
      || !SHA256.test(asset.outputSha256 ?? "")
      || !/^\d+$/.test(String(asset.drawing ?? ""))
      || !["main", "color", "overlay"].includes(asset.variant)
      || asset.filename !== expectedFilename
      || !isSafeRelativeTvgSourcePath(asset.source)
      || !SHA256.test(asset.sourceSha256 ?? "")
      || !Number.isFinite(asset.canvas?.width)
      || !Number.isFinite(asset.canvas?.height)
      || asset.canvas.width <= 0
      || asset.canvas.height <= 0
      || !Number.isFinite(asset.modelOrigin?.x)
      || !Number.isFinite(asset.modelOrigin?.y)) {
      throw new Error(`compatible receipt contains an unsafe asset record: ${asset.filename}`);
    }
    const compatibleSource = path.resolve(compatibleAssets, asset.filename);
    if (path.dirname(compatibleSource) !== compatibleAssets) {
      throw new Error(`compatible asset escapes its receipt directory: ${asset.filename}`);
    }
    if (await sha256(compatibleSource) !== asset.outputSha256) {
      throw new Error(`compatible asset checksum mismatch: ${asset.filename}`);
    }
    const filename = `sources/${args.sourceXstageSha256}/${asset.filename}`;
    preparedAssets.push({
      source: compatibleSource,
      filename: asset.filename,
      outputSha256: asset.outputSha256,
    });
    extensionAssets.push({
      ...asset,
      filename,
      sourceXstageSha256: args.sourceXstageSha256,
    });
  }

  const sources = [
    ...state.sources.filter(({ xstageSha256 }) => xstageSha256 !== args.sourceXstageSha256),
    {
      xstageSha256: args.sourceXstageSha256,
      xstageName: args.sourceXstageName,
      sourceArchiveSha256: args.sourceArchiveSha256,
      sourceArchiveName: args.sourceArchiveName,
      sourceArchiveBundled: false,
    },
  ].sort((left, right) => left.xstageSha256.localeCompare(right.xstageSha256));
  const assets = [
    ...state.assets.filter(({ sourceXstageSha256 }) => (
      sourceXstageSha256 !== args.sourceXstageSha256
    )),
    ...extensionAssets,
  ].sort((left, right) => left.filename.localeCompare(right.filename));
  if (new Set(assets.map(({ filename }) => filename)).size !== assets.length) {
    throw new Error("multi-source asset registration produced duplicate filenames");
  }

  const receipt = {
    schemaVersion: "shaz-tvg-asset-receipt-v3",
    runtimeXstageSha256: state.runtimeXstageSha256,
    sources,
    sourceArchiveBundled: false,
    artistRenderedFramesUsed: false,
    rasterMarginModelUnits: state.rasterMarginModelUnits,
    assets,
  };
  const { receiptPath } = await commitCompatibleAssetRegistrationUnderLock({
    baseAssets,
    sourceXstageSha256: args.sourceXstageSha256,
    preparedAssets,
    receipt,
    registrationState,
  });
  process.stdout.write(`${JSON.stringify({
    receipt: receiptPath,
    sourceXstageSha256: args.sourceXstageSha256,
    drawingCount: required.size,
    assetCount: extensionAssets.length,
  }, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await withCompatibleRegistrationLease({
    baseAssets: args.baseAssets,
    transactionParent: args.registrationStateDirectory,
    fileSystem: fs,
  }, (lockedState) => registerCompatibleAssetsUnderLock(args, lockedState));
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
