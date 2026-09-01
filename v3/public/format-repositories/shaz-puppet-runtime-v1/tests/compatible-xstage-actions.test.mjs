import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createPoseRuntime } from "../runtime/pose-recipe.mjs";
import {
  commitCompatibleAssetRegistration,
  defaultCompatibleRegistrationStateParent,
  retainedCanonicalBackupPath,
} from "../runtime/register-compatible-tvg-assets.mjs";
import { loadAssetRegistration } from "../runtime/rig-v2-renderer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeSource = "507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca";
const compatibleSource = "0303b090a58f7ab66139e2e5328c29ca7a2528b7508c91fb648bbd80f8d1342f";
const archiveSha256 = "ce74bf295692d55e65f2a10e81350f067be79ea8f110fde3d3f446bf3192cd97";

test("default compatible-registration state lives outside the Format package", () => {
  const stateParent = defaultCompatibleRegistrationStateParent(
    path.join(root, "rig-v2", "assets"),
  );
  assert.equal(stateParent === root || stateParent.startsWith(`${root}${path.sep}`), false);
});

async function read(relative) {
  return JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
}

async function sha256(file) {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function canonicalPathForPotentialEntry(file) {
  return path.join(await fs.realpath(path.dirname(file)), path.basename(file));
}

function isPendingSourceCopy(source, destination) {
  return path.basename(source) === "staged-source"
    && path.basename(destination).startsWith(".registration-source-next-");
}

function isPendingReceiptInstall(source, destination) {
  return path.basename(source).startsWith(".registration-receipt-next-")
    && path.basename(destination) === "receipt.json";
}

function interruptedAtomicRegistrationFileSystem(interruptAt) {
  const state = { interrupted: false, recoveryBlocked: false };
  const fileSystem = {
    ...fs,
    rename: async (source, destination) => {
      const sourceName = path.basename(source);
      const destinationName = path.basename(destination);
      const sourceRetirement = sourceName === compatibleSource
        && destinationName.startsWith(".registration-source-prior-");
      const sourceInstallation = sourceName.startsWith(".registration-source-next-")
        && destinationName === compatibleSource;
      const receiptInstallation = isPendingReceiptInstall(source, destination);
      const shouldInterrupt = !state.interrupted && (
        (interruptAt === "source-retired" && sourceRetirement)
        || (interruptAt === "source-installed" && sourceInstallation)
        || (interruptAt === "receipt-installed" && receiptInstallation)
      );
      if (shouldInterrupt) {
        await fs.rename(source, destination);
        state.interrupted = true;
        throw new Error(`forced interruption after ${interruptAt}`);
      }
      const rollbackRestoreAfterRetirement = state.interrupted
        && sourceName.startsWith(".registration-source-prior-")
        && destinationName === compatibleSource;
      const rollbackRetireInstalledSource = state.interrupted
        && sourceName === compatibleSource
        && destinationName.startsWith(".registration-source-next-");
      if (!state.recoveryBlocked
        && (rollbackRestoreAfterRetirement || rollbackRetireInstalledSource)) {
        state.recoveryBlocked = true;
        throw new Error("simulate process death before caught-error rollback can finish");
      }
      return fs.rename(source, destination);
    },
  };
  return { fileSystem, state };
}

test("compatible Episode 5 actions retain exact external provenance and complete deformation state", async () => {
  const [manifest, paired, enumeration, sheepish, registry] = await Promise.all([
    read("rig-v2/runtime.json"),
    read("poses/candidates/paired-open-hand-emphasis.json"),
    read("poses/candidates/enumerate-list-items.json"),
    read("poses/candidates/sheepish-side-eye.json"),
    read("poses/index.json"),
  ]);
  const expected = [
    [paired, "poses/candidates/paired-open-hand-emphasis.json", [1683, 1740], {
      Head_Base: ["1"],
      Left_Forearm: ["7"],
      Left_Hand: ["14"],
      Left_Pupil: ["1"],
      Mouth: ["3", "6", "7", "9"],
      Right_Forearm: ["6"],
      Right_Hand: ["12"],
      Right_Pupil: ["1"],
    }, "f589f603092bd36e66729e413f9762152e7779751e36f1354d9192eb22d4ef76", "0c9d69254e6a05a7c2e7cca17de70334ca33c7fa1c89de4805595ef70b7f76dd"],
    [enumeration, "poses/candidates/enumerate-list-items.json", [1795, 1959], {
      Head_Base: ["1"],
      Left_Forearm: ["7"],
      Left_Hand: ["16", "17"],
      Left_Pupil: ["1", "8", "11", "13"],
      Mouth: ["1", "2", "3", "5", "6", "7", "9"],
      Right_Pupil: ["1", "8", "11", "13"],
    }, "059b231faf5e0517d94afb7ad99436ee0330df66b46ec79ef6cf7e3fd77c1802", "2a1040a70c9ef8d5e7615972be232a200bcd278ea4c4b995aa8a5ce411cae14f"],
    [sheepish, "poses/candidates/sheepish-side-eye.json", [2817, 2933], {
      Body: ["3"],
      Collar: ["3"],
      Left_Arm: ["3"],
      Left_Forearm: ["8"],
      Left_Hand: ["15"],
      Pouch: ["3"],
      Right_Arm: ["4"],
      Right_Forearm: ["7"],
      Right_Hand: ["13"],
      Strings: ["3"],
      Back_Hair: ["3"],
      Bangs_back: ["4"],
      Bangs_front: ["4"],
      Hair: ["4"],
      Head_Base: ["4"],
      Left_Pupil: ["1", "15"],
      Mouth: ["2", "3", "5", "6", "7", "9"],
      Nose: ["3"],
      Right_Pupil: ["1", "15"],
    }, "dd0a9c32a4e8f1e80f47a7d0d90ad2a256332f546f67a1ea483f5dc315aa2533", "a921a3fcf124c3a51092f34811cb6f8d9263fcc1a6fc945c1f8fab523789d8cf"],
  ];
  for (const [recipe, recipePath, range, drawings, fileSha256, semanticSha256] of expected) {
    assert.equal(recipe.sourceXstageSha256, runtimeSource);
    assert.equal(recipe.sourceAction.sourceXstageSha256, compatibleSource);
    assert.equal(recipe.sourceAction.sourceArchiveSha256, archiveSha256);
    assert.deepEqual(
      [recipe.sourceAction.startFrame, recipe.sourceAction.endFrame],
      range,
    );
    assert.deepEqual(
      Object.fromEntries(Object.entries(recipe.drawingSources).map(([element, records]) => [
        element,
        Object.keys(records),
      ])),
      drawings,
    );
    assert.equal(Object.keys(recipe.deformationSamples).length, 26);
    for (const entry of Object.values(recipe.deformationSamples)) {
      assert.equal(entry.frameSamples.length, recipe.durationFrames);
    }
    assert.deepEqual(
      recipe.deformationFrames,
      Array.from({ length: recipe.durationFrames }, (_, index) => range[0] + index),
    );
    assert.equal(recipe.status, undefined);
    assert.equal(recipe.promotion, undefined);
    assert.equal(recipe.approval, undefined);
    assert.equal(await sha256(path.join(root, recipePath)), fileSha256);
    const runtime = createPoseRuntime(manifest, recipe);
    assert.equal(runtime.recipeSha256, semanticSha256);
    assert.equal(registry.poses.some(({ id }) => id === recipe.id), false);
  }
});

test("compatible drawings are hash-namespaced, palette-normalized, and checksum-locked", async () => {
  const receipt = await read("rig-v2/assets/receipt.json");
  assert.equal(receipt.schemaVersion, "shaz-tvg-asset-receipt-v3");
  assert.equal(receipt.runtimeXstageSha256, runtimeSource);
  const source = receipt.sources.find(({ xstageSha256 }) => xstageSha256 === compatibleSource);
  assert.deepEqual(source, {
    xstageSha256: compatibleSource,
    xstageName: "PART2_F_v2.xstage",
    sourceArchiveSha256: archiveSha256,
    sourceArchiveName: "PART2_F.zip",
    sourceArchiveBundled: false,
  });

  const assets = receipt.assets.filter(({ sourceXstageSha256 }) => (
    sourceXstageSha256 === compatibleSource
  ));
  assert.equal(assets.length, 70);
  assert.equal(assets.filter(({ paletteNormalization }) => paletteNormalization).length, 30);
  for (const asset of assets) {
    assert.ok(asset.filename.startsWith(`sources/${compatibleSource}/`));
    assert.equal(
      await sha256(path.join(root, "rig-v2", "assets", asset.filename)),
      asset.outputSha256,
    );
    if (asset.paletteNormalization) {
      assert.deepEqual(asset.paletteNormalization?.sourceColor, [77, 17, 3, 255]);
      assert.deepEqual(asset.paletteNormalization?.destinationColor, [0, 0, 0, 255]);
    }
  }
});

test("compatible asset registration rejects provenance drift and path traversal before copying", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-assets-"));
  const baseAssets = path.join(scratch, "format", "rig-v2", "assets");
  const compatibleAssets = path.join(scratch, "compatible");
  const transactionParent = path.join(scratch, "transactions");
  const recipePath = path.join(scratch, "candidate.json");
  await Promise.all([
    fs.mkdir(baseAssets, { recursive: true }),
    fs.mkdir(compatibleAssets, { recursive: true }),
  ]);
  try {
    await fs.writeFile(path.join(baseAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: runtimeSource,
      sourceArchiveBundled: false,
      artistRenderedFramesUsed: false,
      rasterMarginModelUnits: 50,
      assets: [{
        element: "Body",
        drawing: "1",
        variant: "main",
        filename: "body-01.png",
        source: "elements/Body/Body-1.tvg",
        sourceSha256: "b".repeat(64),
        outputSha256: "a".repeat(64),
        canvas: { width: 10, height: 10 },
        modelOrigin: { x: 0, y: 0 },
      }],
    }));
    await fs.writeFile(path.join(baseAssets, "body-01.png"), "fixture");
    await fs.writeFile(path.join(compatibleAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: compatibleSource,
      artistRenderedFramesUsed: false,
      assets: [{
        element: "Left_Hand",
        drawing: "14",
        variant: "main",
        filename: "../../escaped.png",
        outputSha256: "f".repeat(64),
      }],
    }));
    await fs.writeFile(recipePath, JSON.stringify({
      id: "unsafe-compatible-asset",
      sourceAction: {
        sourceXstageSha256: compatibleSource,
        sourceFile: "compatible.xstage",
        sourceArchiveName: "compatible.zip",
        sourceArchiveSha256: "e".repeat(64),
      },
      drawingSources: { Left_Hand: { 14: compatibleSource } },
    }));
    const command = [
      path.join(root, "runtime", "register-compatible-tvg-assets.mjs"),
      "--manifest", path.join(root, "rig-v2", "runtime.json"),
      "--base-assets", baseAssets,
      "--compatible-assets", compatibleAssets,
      "--source-xstage-sha256", compatibleSource,
      "--source-xstage-name", "compatible.xstage",
      "--source-archive-sha256", archiveSha256,
      "--source-archive-name", "compatible.zip",
      "--registration-state-dir", transactionParent,
      "--recipe", recipePath,
    ];
    const provenanceResult = spawnSync(process.execPath, command, { encoding: "utf8" });
    assert.notEqual(provenanceResult.status, 0);
    assert.match(provenanceResult.stderr, /declared compatible-source provenance/);

    const recipe = JSON.parse(await fs.readFile(recipePath, "utf8"));
    recipe.sourceAction.sourceArchiveSha256 = archiveSha256;
    await fs.writeFile(recipePath, JSON.stringify(recipe));
    const result = spawnSync(process.execPath, command, { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unsafe asset record/);
    await assert.rejects(() => fs.stat(path.join(scratch, "escaped.png")));

    const mislabeledBytes = Buffer.from("mislabeled compatible drawing");
    const mislabeledSha256 = crypto.createHash("sha256").update(mislabeledBytes).digest("hex");
    await fs.writeFile(path.join(compatibleAssets, "left-hand-14.png"), mislabeledBytes);
    await fs.writeFile(path.join(compatibleAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: compatibleSource,
      artistRenderedFramesUsed: false,
      assets: [{
        element: "Right_Hand",
        drawing: "14",
        variant: "main",
        filename: "left-hand-14.png",
        outputSha256: mislabeledSha256,
        canvas: { width: 10, height: 10 },
        modelOrigin: { x: 0, y: 0 },
      }],
    }));
    recipe.drawingSources = { Right_Hand: { 14: compatibleSource } };
    await fs.writeFile(recipePath, JSON.stringify(recipe));
    const mislabeledResult = spawnSync(process.execPath, command, { encoding: "utf8" });
    assert.notEqual(mislabeledResult.status, 0);
    assert.match(mislabeledResult.stderr, /unsafe asset record/);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("compatible asset registration namespaces a source drawing that reuses a canonical numeric ID", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-collision-"));
  const baseAssets = path.join(scratch, "format", "rig-v2", "assets");
  const compatibleAssets = path.join(scratch, "compatible");
  const transactionParent = path.join(scratch, "transactions");
  const recipePath = path.join(scratch, "candidate.json");
  const canonicalBytes = Buffer.from("canonical pupil eight");
  const compatibleBytes = Buffer.from("PART2 pupil eight");
  const canonicalSha256 = crypto.createHash("sha256").update(canonicalBytes).digest("hex");
  const compatibleSha256 = crypto.createHash("sha256").update(compatibleBytes).digest("hex");
  await Promise.all([
    fs.mkdir(baseAssets, { recursive: true }),
    fs.mkdir(compatibleAssets, { recursive: true }),
  ]);
  try {
    await Promise.all([
      fs.writeFile(path.join(baseAssets, "left-pupil-08.png"), canonicalBytes),
      fs.writeFile(path.join(compatibleAssets, "left-pupil-08.png"), compatibleBytes),
    ]);
    await fs.writeFile(path.join(baseAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: runtimeSource,
      sourceArchiveBundled: false,
      artistRenderedFramesUsed: false,
      rasterMarginModelUnits: 50,
      assets: [{
        element: "Left_Pupil",
        drawing: "8",
        variant: "main",
        filename: "left-pupil-08.png",
        source: "elements/Left_Pupil/Left_Pupil-8.tvg",
        sourceSha256: "b".repeat(64),
        outputSha256: canonicalSha256,
        canvas: { width: 10, height: 10 },
        modelOrigin: { x: 0, y: 0 },
      }],
    }));
    await fs.writeFile(path.join(compatibleAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: compatibleSource,
      artistRenderedFramesUsed: false,
      assets: [{
        element: "Left_Pupil",
        drawing: "8",
        variant: "main",
        filename: "left-pupil-08.png",
        source: "elements/Left_Pupil/Left_Pupil-8.tvg",
        sourceSha256: "c".repeat(64),
        outputSha256: compatibleSha256,
        canvas: { width: 10, height: 10 },
        modelOrigin: { x: 0, y: 0 },
      }],
    }));
    await fs.writeFile(recipePath, JSON.stringify({
      id: "same-id-compatible-drawing",
      sourceAction: {
        sourceXstageSha256: compatibleSource,
        sourceFile: "compatible.xstage",
        sourceArchiveName: "compatible.zip",
        sourceArchiveSha256: archiveSha256,
      },
      drawingSources: { Left_Pupil: { 8: compatibleSource } },
    }));
    const result = spawnSync(process.execPath, [
      path.join(root, "runtime", "register-compatible-tvg-assets.mjs"),
      "--manifest", path.join(root, "rig-v2", "runtime.json"),
      "--base-assets", baseAssets,
      "--compatible-assets", compatibleAssets,
      "--source-xstage-sha256", compatibleSource,
      "--source-xstage-name", "compatible.xstage",
      "--source-archive-sha256", archiveSha256,
      "--source-archive-name", "compatible.zip",
      "--registration-state-dir", transactionParent,
      "--recipe", recipePath,
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await fs.readFile(path.join(baseAssets, "left-pupil-08.png"), "utf8"),
      canonicalBytes.toString());
    assert.equal(await fs.readFile(path.join(
      baseAssets,
      "sources",
      compatibleSource,
      "left-pupil-08.png",
    ), "utf8"), compatibleBytes.toString());
    const receipt = JSON.parse(await fs.readFile(path.join(baseAssets, "receipt.json"), "utf8"));
    assert.deepEqual(receipt.assets.map(({ filename }) => filename).sort(), [
      "left-pupil-08.png",
      `sources/${compatibleSource}/left-pupil-08.png`,
    ]);
    await loadAssetRegistration(baseAssets, runtimeSource);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("re-registering a compatible source removes assets no longer selected by recipes", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-assets-shrink-"));
  const baseAssets = path.join(scratch, "format", "rig-v2", "assets");
  const compatibleAssets = path.join(scratch, "compatible");
  const transactionParent = path.join(scratch, "transactions");
  const sourceDirectory = path.join(baseAssets, "sources", compatibleSource);
  const recipePath = path.join(scratch, "candidate.json");
  const selectedBytes = Buffer.from("selected compatible asset");
  const selectedSha256 = crypto.createHash("sha256").update(selectedBytes).digest("hex");
  await Promise.all([
    fs.mkdir(sourceDirectory, { recursive: true }),
    fs.mkdir(compatibleAssets, { recursive: true }),
  ]);
  try {
    await Promise.all([
      fs.writeFile(path.join(sourceDirectory, "left-eye-99.png"), selectedBytes),
      fs.writeFile(path.join(sourceDirectory, "left-eye-100.png"), Buffer.from("orphan")),
      fs.writeFile(path.join(compatibleAssets, "left-eye-99.png"), selectedBytes),
    ]);
    await fs.writeFile(path.join(baseAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v3",
      runtimeXstageSha256: runtimeSource,
      artistRenderedFramesUsed: false,
      rasterMarginModelUnits: 50,
      sources: [
        { xstageSha256: runtimeSource, sourceArchiveBundled: false },
        {
          xstageSha256: compatibleSource,
          xstageName: "compatible.xstage",
          sourceArchiveSha256: archiveSha256,
          sourceArchiveName: "compatible.zip",
          sourceArchiveBundled: false,
        },
      ],
      assets: ["99", "100"].map((drawing) => ({
        element: "Left_eye",
        drawing,
        variant: "main",
        filename: `sources/${compatibleSource}/left-eye-${drawing}.png`,
        sourceXstageSha256: compatibleSource,
        source: `elements/Left_eye/Left_eye-${drawing}.tvg`,
        sourceSha256: "b".repeat(64),
        outputSha256: drawing === "99" ? selectedSha256 : "f".repeat(64),
        canvas: { width: 10, height: 10 },
        modelOrigin: { x: 0, y: 0 },
      })),
    }));
    await fs.writeFile(path.join(compatibleAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: compatibleSource,
      artistRenderedFramesUsed: false,
      assets: [{
        element: "Left_eye",
        drawing: "99",
        variant: "main",
        filename: "left-eye-99.png",
        source: "elements/Left_eye/Left_eye-99.tvg",
        sourceSha256: "b".repeat(64),
        outputSha256: selectedSha256,
        canvas: { width: 10, height: 10 },
        modelOrigin: { x: 0, y: 0 },
      }],
    }));
    await fs.writeFile(recipePath, JSON.stringify({
      id: "shrunk-compatible-assets",
      sourceAction: {
        sourceXstageSha256: compatibleSource,
        sourceFile: "compatible.xstage",
        sourceArchiveName: "compatible.zip",
        sourceArchiveSha256: archiveSha256,
      },
      drawingSources: { Left_Eye: { 99: compatibleSource } },
    }));
    const result = spawnSync(process.execPath, [
      path.join(root, "runtime", "register-compatible-tvg-assets.mjs"),
      "--manifest", path.join(root, "rig-v2", "runtime.json"),
      "--base-assets", baseAssets,
      "--compatible-assets", compatibleAssets,
      "--source-xstage-sha256", compatibleSource,
      "--source-xstage-name", "compatible.xstage",
      "--source-archive-sha256", archiveSha256,
      "--source-archive-name", "compatible.zip",
      "--registration-state-dir", transactionParent,
      "--recipe", recipePath,
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await fs.readdir(sourceDirectory), ["left-eye-99.png"]);
    const receipt = JSON.parse(await fs.readFile(path.join(baseAssets, "receipt.json"), "utf8"));
    assert.deepEqual(
      receipt.assets.filter(({ sourceXstageSha256 }) => sourceXstageSha256 === compatibleSource)
        .map(({ filename }) => filename),
      [`sources/${compatibleSource}/left-eye-99.png`],
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

function transactionAsset({
  drawing,
  filename,
  outputSha256,
  sourceSha256 = "b".repeat(64),
}) {
  return {
    element: "Left_eye",
    drawing,
    variant: "main",
    filename,
    sourceXstageSha256: compatibleSource,
    source: `elements/Left_eye/Left_eye-${drawing}.tvg`,
    sourceSha256,
    outputSha256,
    canvas: { width: 10, height: 10 },
    modelOrigin: { x: 0, y: 0 },
  };
}

async function transactionFixture(scratch) {
  const baseAssets = path.join(scratch, "format", "rig-v2", "assets");
  const sourceDirectory = path.join(baseAssets, "sources", compatibleSource);
  const preparedDirectory = path.join(scratch, "prepared");
  const preparedSource = path.join(preparedDirectory, "left-eye-99.png");
  const oldFilename = `sources/${compatibleSource}/left-eye-100.png`;
  const newFilename = `sources/${compatibleSource}/left-eye-99.png`;
  const oldBytes = Buffer.from("old");
  const newBytes = Buffer.from("new");
  const oldOutputSha256 = crypto.createHash("sha256").update(oldBytes).digest("hex");
  const newOutputSha256 = crypto.createHash("sha256").update(newBytes).digest("hex");
  const sources = [
    { xstageSha256: runtimeSource, sourceArchiveBundled: false },
    {
      xstageSha256: compatibleSource,
      xstageName: "compatible.xstage",
      sourceArchiveSha256: archiveSha256,
      sourceArchiveName: "compatible.zip",
      sourceArchiveBundled: false,
    },
  ];
  const body = {
    element: "Body",
    drawing: "1",
    variant: "main",
    filename: "body-01.png",
    sourceXstageSha256: runtimeSource,
    source: "elements/Body/Body-1.tvg",
    sourceSha256: "a".repeat(64),
    outputSha256: "c".repeat(64),
    canvas: { width: 10, height: 10 },
    modelOrigin: { x: 0, y: 0 },
  };
  const currentReceipt = {
    schemaVersion: "shaz-tvg-asset-receipt-v3",
    runtimeXstageSha256: runtimeSource,
    artistRenderedFramesUsed: false,
    sources,
    assets: [body, transactionAsset({
      drawing: "100",
      filename: oldFilename,
      outputSha256: oldOutputSha256,
    })],
  };
  const nextReceipt = {
    ...currentReceipt,
    assets: [body, transactionAsset({
      drawing: "99",
      filename: newFilename,
      outputSha256: newOutputSha256,
    })],
  };
  await Promise.all([
    fs.mkdir(sourceDirectory, { recursive: true }),
    fs.mkdir(preparedDirectory, { recursive: true }),
  ]);
  await Promise.all([
    fs.writeFile(path.join(baseAssets, "body-01.png"), "base"),
    fs.writeFile(path.join(baseAssets, oldFilename), oldBytes),
    fs.writeFile(preparedSource, newBytes),
    fs.writeFile(path.join(baseAssets, "receipt.json"), `${JSON.stringify(currentReceipt)}\n`),
  ]);
  return {
    baseAssets,
    sourceDirectory,
    preparedSource,
    currentReceipt,
    nextReceipt,
    newOutputSha256,
    oldFilename,
    newFilename,
  };
}

async function canonicalLockStateParent(baseAssets) {
  const stateParent = defaultCompatibleRegistrationStateParent(
    await fs.realpath(baseAssets),
  );
  await fs.mkdir(stateParent, { recursive: true });
  return fs.realpath(stateParent);
}

test("compatible registration rolls back a failed receipt commit", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-rollback-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const receiptPath = path.join(fixture.baseAssets, "receipt.json");
    const canonicalReceiptPath = await fs.realpath(receiptPath);
    let failureInjected = false;
    const failingFileSystem = {
      ...fs,
      rename: async (source, destination) => {
        if (!failureInjected
          && isPendingReceiptInstall(source, destination)
          && path.resolve(destination) === canonicalReceiptPath) {
          failureInjected = true;
          const error = new Error("forced receipt commit failure");
          error.code = "EIO";
          throw error;
        }
        return fs.rename(source, destination);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: failingFileSystem,
      }),
      /forced receipt commit failure/,
    );
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(receiptPath, "utf8")),
      fixture.currentReceipt,
    );
    await loadAssetRegistration(fixture.baseAssets, runtimeSource);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("post-commit cleanup failure is surfaced without poisoning the asset tree", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-cleanup-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const canonicalTransactionParent = await canonicalPathForPotentialEntry(transactionParent);
    const failingFileSystem = {
      ...fs,
      rm: async (target, options) => {
        if (path.dirname(path.resolve(target)) === canonicalTransactionParent
          && path.basename(target).startsWith("registration-")) {
          throw new Error("forced transaction cleanup failure");
        }
        return fs.rm(target, options);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: failingFileSystem,
      }),
      /committed but journal cleanup failed/,
    );
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
    await loadAssetRegistration(fixture.baseAssets, runtimeSource);
    assert.equal((await fs.readdir(transactionParent)).length, 1);

    await commitCompatibleAssetRegistration({
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    });
    assert.deepEqual(await fs.readdir(transactionParent), []);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("registration helper rejects unsafe source and workspace boundaries before mutation", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-boundaries-"));
  try {
    const fixture = await transactionFixture(scratch);
    const transactionParent = path.join(scratch, "transactions");
    const unownedDirectory = path.join(transactionParent, "user-owned-do-not-delete");
    await fs.mkdir(unownedDirectory, { recursive: true });
    await fs.writeFile(path.join(unownedDirectory, "sentinel.txt"), "user-owned");
    const prepared = {
      source: fixture.preparedSource,
      filename: "left-eye-99.png",
      outputSha256: fixture.newOutputSha256,
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: "../escaped-source",
        preparedAssets: [prepared],
        receipt: fixture.nextReceipt,
        transactionParent,
      }),
      /lowercase SHA-256/,
    );
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{ ...prepared, filename: "../escaped.png" }],
        receipt: fixture.nextReceipt,
        transactionParent,
      }),
      /flat PNG filenames/,
    );
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [prepared],
        receipt: fixture.nextReceipt,
        transactionParent: path.join(fixture.baseAssets, "transactions"),
      }),
      /outside the packaged asset tree/,
    );
    const packageRoot = path.dirname(path.dirname(fixture.baseAssets));
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [prepared],
        receipt: fixture.nextReceipt,
        transactionParent: path.join(packageRoot, "authoring-state"),
      }),
      /outside the Format package root/,
    );
    const linkedTransactionTarget = path.join(fixture.baseAssets, "linked-transactions");
    const linkedTransactionParent = path.join(scratch, "linked-transactions");
    await fs.mkdir(linkedTransactionTarget, { recursive: true });
    await fs.symlink(linkedTransactionTarget, linkedTransactionParent);
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [prepared],
        receipt: fixture.nextReceipt,
        transactionParent: linkedTransactionParent,
      }),
      /resolves inside the packaged asset tree/,
    );
    assert.equal(await fs.readFile(path.join(unownedDirectory, "sentinel.txt"), "utf8"), "user-owned");
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(fixture.baseAssets, "receipt.json"), "utf8")),
      fixture.currentReceipt,
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("compatible registration restores the previous source after source installation fails", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-source-rollback-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const canonicalSourceDirectory = await fs.realpath(fixture.sourceDirectory);
    let failureInjected = false;
    const failingFileSystem = {
      ...fs,
      rename: async (source, destination) => {
        if (!failureInjected
          && path.basename(source).startsWith(".registration-source-next-")
          && path.resolve(destination) === canonicalSourceDirectory) {
          failureInjected = true;
          throw new Error("forced source installation failure");
        }
        return fs.rename(source, destination);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: failingFileSystem,
      }),
      /forced source installation failure/,
    );
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(fixture.baseAssets, "receipt.json"), "utf8")),
      fixture.currentReceipt,
    );
    assert.deepEqual(await fs.readdir(transactionParent), []);
    await loadAssetRegistration(fixture.baseAssets, runtimeSource);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("a torn owner-scoped pending source is removed without touching live bytes", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-pending-partial-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    let partialCopyCreated = false;
    const interruptedFileSystem = {
      ...fs,
      cp: async (source, destination, options) => {
        if (!partialCopyCreated && isPendingSourceCopy(source, destination)) {
          partialCopyCreated = true;
          await fs.mkdir(destination);
          await fs.writeFile(path.join(destination, "left-eye-99.png"), "torn pending bytes");
          throw new Error("forced partial pending source copy");
        }
        return fs.cp(source, destination, options);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: interruptedFileSystem,
      }),
      /forced partial pending source copy/,
    );
    assert.equal(partialCopyCreated, true);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(fixture.baseAssets, "receipt.json"), "utf8")),
      fixture.currentReceipt,
    );
    assert.deepEqual(await fs.readdir(transactionParent), []);
    assert.equal((await fs.readdir(path.dirname(fixture.sourceDirectory))).some((entry) => (
      entry.startsWith(".registration-source-")
    )), false);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("live source and receipt mutation uses only owner-scoped same-parent renames", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-atomic-live-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const liveSource = await fs.realpath(fixture.sourceDirectory);
    const liveReceipt = await fs.realpath(path.join(fixture.baseAssets, "receipt.json"));
    let sourceInstalledByRename = false;
    let receiptInstalledByRename = false;
    const observedRenames = [];
    const observingFileSystem = {
      ...fs,
      cp: async (source, destination, options) => {
        assert.notEqual(path.resolve(destination), liveSource, "recursive copy targeted live source");
        return fs.cp(source, destination, options);
      },
      copyFile: async (source, destination, mode) => {
        assert.notEqual(path.resolve(destination), liveReceipt, "copyFile targeted live receipt");
        return fs.copyFile(source, destination, mode);
      },
      rm: async (target, options) => {
        assert.notEqual(path.resolve(target), liveSource, "recursive removal targeted live source");
        return fs.rm(target, options);
      },
      rename: async (source, destination) => {
        observedRenames.push([path.resolve(source), path.resolve(destination)]);
        if (path.resolve(destination) === liveSource) {
          assert.equal(path.dirname(source), path.dirname(destination));
          assert.equal(path.basename(source).startsWith(".registration-source-next-"), true);
          sourceInstalledByRename = true;
        }
        if (path.resolve(destination) === liveReceipt) {
          assert.equal(path.dirname(source), path.dirname(destination));
          assert.equal(path.basename(source).startsWith(".registration-receipt-next-"), true);
          receiptInstalledByRename = true;
        }
        return fs.rename(source, destination);
      },
    };
    await commitCompatibleAssetRegistration({
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
      fileSystem: observingFileSystem,
    });
    assert.equal(sourceInstalledByRename, true, JSON.stringify(observedRenames));
    assert.equal(receiptInstalledByRename, true, JSON.stringify(observedRenames));
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("owned sibling cleanup preserves a substituted directory", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-sibling-cleanup-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const preservedOriginal = path.join(
      path.dirname(fixture.sourceDirectory),
      "preserved-original-prior-source",
    );
    let replacementPath = null;
    const interleavingFileSystem = {
      ...fs,
      rename: async (source, destination) => {
        if (replacementPath === null
          && path.basename(source).startsWith(".registration-source-prior-")
          && path.basename(destination).startsWith(`${path.basename(source)}.cleanup-`)) {
          replacementPath = source;
          await fs.rename(source, preservedOriginal);
          await fs.mkdir(source);
          await fs.writeFile(path.join(source, "replacement-sentinel"), "preserve me");
        }
        return fs.rename(source, destination);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: interleavingFileSystem,
      }),
      /committed but journal cleanup failed/,
    );
    assert.ok(replacementPath);
    assert.equal(await fs.readFile(path.join(replacementPath, "replacement-sentinel"), "utf8"),
      "preserve me");
    assert.equal((await fs.lstat(preservedOriginal)).isDirectory(), true);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("transaction cleanup preserves a substituted directory", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-transaction-cleanup-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const canonicalTransactionParent = await canonicalPathForPotentialEntry(transactionParent);
    const preservedOriginal = path.join(transactionParent, "preserved-original-transaction");
    let replacementPath = null;
    const interleavingFileSystem = {
      ...fs,
      rename: async (source, destination) => {
        if (replacementPath === null
          && path.dirname(source) === canonicalTransactionParent
          && path.basename(source).startsWith("registration-")
          && path.basename(destination).startsWith("registration-retired-")) {
          replacementPath = source;
          await fs.rename(source, preservedOriginal);
          await fs.mkdir(source);
          await fs.writeFile(path.join(source, "replacement-sentinel"), "preserve me");
        }
        return fs.rename(source, destination);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: interleavingFileSystem,
      }),
      /committed but journal cleanup failed/,
    );
    assert.ok(replacementPath);
    assert.equal(await fs.readFile(path.join(replacementPath, "replacement-sentinel"), "utf8"),
      "preserve me");
    assert.equal((await fs.lstat(preservedOriginal)).isDirectory(), true);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("a concurrent invocation cannot recover or replace a live registration", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-concurrent-"));
  const transactionParent = path.join(scratch, "transactions");
  let releaseInstall;
  try {
    const fixture = await transactionFixture(scratch);
    let notifyInstall;
    const installStarted = new Promise((resolve) => { notifyInstall = resolve; });
    const installRelease = new Promise((resolve) => { releaseInstall = resolve; });
    const blockingFileSystem = {
      ...fs,
      cp: async (source, destination, options) => {
        if (isPendingSourceCopy(source, destination)) {
          notifyInstall();
          await installRelease;
        }
        return fs.cp(source, destination, options);
      },
    };
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    const firstInvocation = commitCompatibleAssetRegistration({
      ...registration,
      fileSystem: blockingFileSystem,
    });
    await installStarted;
    await assert.rejects(
      () => commitCompatibleAssetRegistration(registration),
      /already active under process owner/,
    );
    releaseInstall();
    await firstInvocation;
    releaseInstall = null;
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
    assert.deepEqual(await fs.readdir(transactionParent), []);
    await loadAssetRegistration(fixture.baseAssets, runtimeSource);
  } finally {
    releaseInstall?.();
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("different custom journal directories share one canonical asset-tree lease", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-custom-lock-"));
  const firstTransactionParent = path.join(scratch, "transactions-a");
  const secondTransactionParent = path.join(scratch, "transactions-b");
  let releaseInstall;
  try {
    const fixture = await transactionFixture(scratch);
    const canonicalSourceDirectory = await fs.realpath(fixture.sourceDirectory);
    let notifyInstall;
    const installStarted = new Promise((resolve) => { notifyInstall = resolve; });
    const installRelease = new Promise((resolve) => { releaseInstall = resolve; });
    const blockingFileSystem = {
      ...fs,
      cp: async (source, destination, options) => {
        if (isPendingSourceCopy(source, destination)) {
          notifyInstall();
          await installRelease;
        }
        return fs.cp(source, destination, options);
      },
    };
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
    };
    const firstInvocation = commitCompatibleAssetRegistration({
      ...registration,
      transactionParent: firstTransactionParent,
      fileSystem: blockingFileSystem,
    });
    await installStarted;
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        transactionParent: secondTransactionParent,
      }),
      /already active under process owner/,
    );
    releaseInstall();
    await firstInvocation;
    releaseInstall = null;
    assert.deepEqual(await fs.readdir(firstTransactionParent), []);
    assert.deepEqual(await fs.readdir(secondTransactionParent), []);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
  } finally {
    releaseInstall?.();
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("a canonical journal locator recovers custom directory A through directory B", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-custom-recovery-"));
  const firstTransactionParent = path.join(scratch, "transactions-a");
  const secondTransactionParent = path.join(scratch, "transactions-b");
  try {
    const fixture = await transactionFixture(scratch);
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
    };
    const { fileSystem: interruptedFileSystem, state: interruption } =
      interruptedAtomicRegistrationFileSystem("source-retired");
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        transactionParent: firstTransactionParent,
        fileSystem: interruptedFileSystem,
      }),
      /journal recovery was incomplete/,
    );
    assert.equal(interruption.interrupted, true);
    assert.equal(interruption.recoveryBlocked, true);
    assert.equal((await fs.readdir(firstTransactionParent)).some((entry) => (
      entry.startsWith("registration-")
    )), true);

    const stopAfterRecoveryFileSystem = {
      ...fs,
      mkdtemp: async (prefix) => {
        if (path.basename(prefix) === "registration-") {
          throw new Error("stop after cross-directory journal recovery");
        }
        return fs.mkdtemp(prefix);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        transactionParent: secondTransactionParent,
        fileSystem: stopAfterRecoveryFileSystem,
      }),
      /stop after cross-directory journal recovery/,
    );
    assert.deepEqual(await fs.readdir(firstTransactionParent), []);
    assert.deepEqual(await fs.readdir(secondTransactionParent), []);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(fixture.baseAssets, "receipt.json"), "utf8")),
      fixture.currentReceipt,
    );
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    assert.equal((await fs.readdir(lockStateParent)).includes("active-journal.json"), false);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("the next invocation recovers an interruption after atomic source installation", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-source-interrupt-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    const { fileSystem: interruptedFileSystem } =
      interruptedAtomicRegistrationFileSystem("source-installed");
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: interruptedFileSystem,
      }),
      /journal recovery was incomplete/,
    );
    const stopAfterRecoveryFileSystem = {
      ...fs,
      mkdtemp: async (prefix) => {
        if (path.basename(prefix) === "registration-") {
          throw new Error("stop after source-install recovery");
        }
        return fs.mkdtemp(prefix);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: stopAfterRecoveryFileSystem,
      }),
      /stop after source-install recovery/,
    );
    assert.deepEqual(await fs.readdir(transactionParent), []);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(fixture.baseAssets, "receipt.json"), "utf8")),
      fixture.currentReceipt,
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("a retained canonical backup blocks journal recovery without mutating live bytes", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-backup-guard-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    const { fileSystem: interruptedFileSystem } =
      interruptedAtomicRegistrationFileSystem("source-installed");
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: interruptedFileSystem,
      }),
      /journal recovery was incomplete/,
    );
    const interruptedTransaction = (await fs.readdir(transactionParent))
      .find((entry) => entry.startsWith("registration-"));
    assert.ok(interruptedTransaction);
    const sourceBeforeGuard = await fs.readFile(
      path.join(fixture.sourceDirectory, "left-eye-99.png"),
    );
    const receiptBeforeGuard = await fs.readFile(
      path.join(fixture.baseAssets, "receipt.json"),
    );
    const retainedBackup = retainedCanonicalBackupPath(await fs.realpath(fixture.baseAssets));
    await fs.mkdir(retainedBackup);
    await fs.writeFile(path.join(retainedBackup, "operator-recovery-required"), "retained");

    await assert.rejects(
      () => commitCompatibleAssetRegistration(registration),
      /retained canonical refresh backup requires explicit operator recovery/,
    );
    assert.deepEqual(
      await fs.readFile(path.join(fixture.sourceDirectory, "left-eye-99.png")),
      sourceBeforeGuard,
    );
    assert.deepEqual(
      await fs.readFile(path.join(fixture.baseAssets, "receipt.json")),
      receiptBeforeGuard,
    );
    assert.equal((await fs.readdir(transactionParent)).includes(interruptedTransaction), true);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    assert.equal((await fs.readdir(lockStateParent)).includes("active-journal.json"), true);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("a heartbeat waits for an in-process lease assertion transition", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-transition-wait-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    let transitionReleases = 0;
    let collisionObserved = false;
    const interleavingFileSystem = {
      ...fs,
      mkdir: async (target, options) => {
        try {
          return await fs.mkdir(target, options);
        } catch (error) {
          if (path.basename(target) === "active.transition.lock"
            && error?.code === "EEXIST") {
            collisionObserved = true;
          }
          throw error;
        }
      },
      rename: async (source, destination) => {
        if (path.basename(source) === "active.transition.lock"
          && path.basename(destination).startsWith(".transition-tombstone-")) {
          transitionReleases += 1;
          if (transitionReleases === 2) {
            await new Promise((resolve) => { setTimeout(resolve, 40); });
          }
        }
        return fs.rename(source, destination);
      },
    };
    await commitCompatibleAssetRegistration({
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
      fileSystem: interleavingFileSystem,
      lockHooks: {
        leaseDurationMs: 2000,
        heartbeatIntervalMs: 5,
        transitionRetryAttempts: 200,
        transitionRetryDelayMs: 1,
      },
    });
    assert.equal(collisionObserved, true);
    assert.deepEqual(await fs.readdir(transactionParent), []);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("an expired heartbeat fails closed when its PID may have been reused", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-dead-lock-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    const lockDirectory = path.join(lockStateParent, "active.lock");
    await fs.mkdir(lockDirectory, { recursive: true });
    const canonicalBaseAssets = await fs.realpath(fixture.baseAssets);
    await fs.writeFile(path.join(lockDirectory, "owner.json"), `${JSON.stringify({
      schemaVersion: "shaz-compatible-registration-lock-v1",
      ownerId: "d".repeat(32),
      baseAssetsRealpath: canonicalBaseAssets,
      stateParentRealpath: lockStateParent,
      processId: process.pid,
      createdAtMs: 1000,
      heartbeatAtMs: 1000,
      leaseExpiresAtMs: 1500,
      status: "active",
    })}\n`);
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        lockHooks: {
          processId: 31337,
          now: () => 2000,
          leaseDurationMs: 1000,
          heartbeatIntervalMs: 250,
        },
      }),
      /expired heartbeat metadata is not reclaim authority/,
    );
    assert.deepEqual(await fs.readdir(lockStateParent), ["active.lock"]);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("an active lock is reclaimed only when process death is definitive", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-dead-owner-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    const lockDirectory = path.join(lockStateParent, "active.lock");
    await fs.mkdir(lockDirectory, { recursive: true });
    const canonicalBaseAssets = await fs.realpath(fixture.baseAssets);
    await fs.writeFile(path.join(lockDirectory, "owner.json"), `${JSON.stringify({
      schemaVersion: "shaz-compatible-registration-lock-v1",
      ownerId: "e".repeat(32),
      baseAssetsRealpath: canonicalBaseAssets,
      stateParentRealpath: lockStateParent,
      processId: 424242,
      createdAtMs: 1000,
      heartbeatAtMs: 1000,
      leaseExpiresAtMs: 5000,
      status: "active",
    })}\n`);
    await commitCompatibleAssetRegistration({
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
      lockHooks: {
        isProcessAlive: () => false,
      },
    });
    assert.deepEqual(await fs.readdir(lockStateParent), []);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("active lock owner reads reject an inode swap without reclaiming the lock", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-lock-inode-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    const lockDirectory = path.join(lockStateParent, "active.lock");
    const ownerPath = path.join(lockDirectory, "owner.json");
    await fs.mkdir(lockDirectory);
    await fs.writeFile(ownerPath, `${JSON.stringify({
      schemaVersion: "shaz-compatible-registration-lock-v1",
      ownerId: "8".repeat(32),
      baseAssetsRealpath: await fs.realpath(fixture.baseAssets),
      stateParentRealpath: lockStateParent,
      processId: process.pid,
      createdAtMs: 1000,
      heartbeatAtMs: 1000,
      leaseExpiresAtMs: 5000,
      status: "active",
    })}\n`);
    let swappedOwner = false;
    let usedNoFollow = false;
    const interleavingFileSystem = {
      ...fs,
      open: async (target, flags, ...rest) => {
        if (!swappedOwner
          && path.basename(target) === "owner.json"
          && path.basename(path.dirname(target)) === "active.lock") {
          swappedOwner = true;
          usedNoFollow = (flags & fsConstants.O_NOFOLLOW) === fsConstants.O_NOFOLLOW;
          await fs.rename(target, `${target}.prior`);
          const replacement = JSON.parse(await fs.readFile(`${target}.prior`, "utf8"));
          await fs.writeFile(target, `${JSON.stringify({
            ...replacement,
            replacementGeneration: "same-owner-inode-swap",
          })}\n`);
        }
        return fs.open(target, flags, ...rest);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: interleavingFileSystem,
      }),
      /registration lock owner changed during validation/,
    );
    assert.equal(swappedOwner, true);
    assert.equal(usedNoFollow, true);
    assert.equal(JSON.parse(await fs.readFile(ownerPath, "utf8")).replacementGeneration,
      "same-owner-inode-swap");
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("a stale transition mutex is never reclaimed automatically", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-stale-transition-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    const transitionDirectory = path.join(lockStateParent, "active.transition.lock");
    await fs.mkdir(transitionDirectory, { recursive: true });
    const canonicalBaseAssets = await fs.realpath(fixture.baseAssets);
    await fs.writeFile(path.join(transitionDirectory, "owner.json"), `${JSON.stringify({
      schemaVersion: "shaz-compatible-registration-transition-v1",
      ownerId: "f".repeat(32),
      baseAssetsRealpath: canonicalBaseAssets,
      stateParentRealpath: lockStateParent,
      processId: 424242,
      createdAtMs: 1000,
    })}\n`);
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        lockHooks: {
          isProcessAlive: () => false,
        },
      }),
      /never reclaimed automatically and requires explicit operator cleanup/,
    );
    assert.equal(
      await fs.readFile(path.join(transitionDirectory, "owner.json"), "utf8")
        .then((value) => JSON.parse(value).ownerId),
      "f".repeat(32),
    );
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("transition owner reads reject an inode swap and preserve the retired mutex", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-transition-inode-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    let swappedOwner = false;
    let usedNoFollow = false;
    const interleavingFileSystem = {
      ...fs,
      open: async (target, flags, ...rest) => {
        if (!swappedOwner
          && path.basename(target) === "owner.json"
          && path.basename(path.dirname(target)).startsWith(".transition-tombstone-")) {
          swappedOwner = true;
          usedNoFollow = (flags & fsConstants.O_NOFOLLOW) === fsConstants.O_NOFOLLOW;
          const priorOwner = `${target}.prior`;
          await fs.rename(target, priorOwner);
          await fs.writeFile(target, await fs.readFile(priorOwner));
        }
        return fs.open(target, flags, ...rest);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: interleavingFileSystem,
      }),
      /transition mutex owner changed during validation/,
    );
    assert.equal(swappedOwner, true);
    assert.equal(usedNoFollow, true);
    assert.equal((await fs.lstat(
      path.join(lockStateParent, "active.transition.lock"),
    )).isDirectory(), true);
    assert.equal((await fs.readdir(lockStateParent)).some((entry) => (
      entry.startsWith(".transition-tombstone-")
    )), false);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("owner-specific transition tombstones preserve an ABA replacement", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-transition-aba-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    const preservedOriginal = path.join(lockStateParent, "preserved-original-transition");
    let interleaved = false;
    const interleavingFileSystem = {
      ...fs,
      rename: async (source, destination) => {
        if (!interleaved
          && path.basename(source) === "active.transition.lock"
          && path.basename(destination).startsWith(".transition-tombstone-")) {
          interleaved = true;
          const owner = JSON.parse(await fs.readFile(
            path.join(source, "owner.json"),
            "utf8",
          ));
          await fs.rename(source, preservedOriginal);
          await fs.mkdir(source);
          await fs.writeFile(path.join(source, "owner.json"), `${JSON.stringify({
            ...owner,
            replacementGeneration: "same-owner-aba",
          })}\n`);
        }
        return fs.rename(source, destination);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: interleavingFileSystem,
      }),
      /transition mutex owner changed during owner-specific retirement/,
    );
    assert.equal(interleaved, true);
    const preservedOwner = JSON.parse(await fs.readFile(
      path.join(lockStateParent, "active.transition.lock", "owner.json"),
      "utf8",
    ));
    assert.equal(preservedOwner.replacementGeneration, "same-owner-aba");
    assert.equal((await fs.readdir(lockStateParent)).some((entry) => (
      entry.startsWith(".transition-tombstone-")
    )), false);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("owner-specific tombstones preserve a fresh lock across an ABA reclaim interleaving", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-lock-aba-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const lockStateParent = await canonicalLockStateParent(fixture.baseAssets);
    const lockDirectory = path.join(lockStateParent, "active.lock");
    await fs.mkdir(lockDirectory, { recursive: true });
    const canonicalBaseAssets = await fs.realpath(fixture.baseAssets);
    const lockOwner = (ownerId, leaseExpiresAtMs) => ({
      schemaVersion: "shaz-compatible-registration-lock-v1",
      ownerId,
      baseAssetsRealpath: canonicalBaseAssets,
      stateParentRealpath: lockStateParent,
      processId: process.pid,
      createdAtMs: 1000,
      heartbeatAtMs: 1000,
      leaseExpiresAtMs,
      status: "active",
    });
    await fs.writeFile(
      path.join(lockDirectory, "owner.json"),
      `${JSON.stringify(lockOwner("a".repeat(32), 1500))}\n`,
    );
    let interleaved = false;
    let thirdContenderError = null;
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    const interleavingFileSystem = {
      ...fs,
      rename: async (source, destination) => {
        if (!interleaved
          && path.basename(source) === "active.lock"
          && path.basename(destination).startsWith(".lock-tombstone-")) {
          interleaved = true;
          try {
            await commitCompatibleAssetRegistration(registration);
          } catch (error) {
            thirdContenderError = error;
          }
          await fs.writeFile(
            path.join(source, "owner.json"),
            `${JSON.stringify(lockOwner("b".repeat(32), 5000))}\n`,
          );
        }
        return fs.rename(source, destination);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: interleavingFileSystem,
        lockHooks: {
          isProcessAlive: () => false,
          now: () => 2000,
          leaseDurationMs: 1000,
          heartbeatIntervalMs: 250,
        },
      }),
      /owner changed during owner-specific retirement/,
    );
    assert.match(thirdContenderError?.message ?? "", /transition mutex is already held/);
    const preservedOwner = JSON.parse(await fs.readFile(
      path.join(lockDirectory, "owner.json"),
      "utf8",
    ));
    assert.equal(preservedOwner.ownerId, "b".repeat(32));
    assert.equal((await fs.readdir(lockStateParent)).some((entry) => (
      entry.startsWith(".lock-tombstone-") || entry === "active.transition.lock"
    )), false);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("canonical leases survive a symlink alias retarget without touching the new target", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-symlink-lease-"));
  let releaseInstall;
  try {
    const fixture = await transactionFixture(scratch);
    const alias = path.join(scratch, "assets-alias");
    const decoy = path.join(scratch, "decoy-assets");
    await fs.mkdir(decoy, { recursive: true });
    await fs.writeFile(path.join(decoy, "sentinel.txt"), "untouched");
    await fs.symlink(fixture.baseAssets, alias);
    let notifyInstall;
    const installStarted = new Promise((resolve) => { notifyInstall = resolve; });
    const installRelease = new Promise((resolve) => { releaseInstall = resolve; });
    const blockingFileSystem = {
      ...fs,
      cp: async (source, destination, options) => {
        if (isPendingSourceCopy(source, destination)) {
          notifyInstall();
          await installRelease;
        }
        return fs.cp(source, destination, options);
      },
    };
    const registration = {
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
    };
    const aliasedInvocation = commitCompatibleAssetRegistration({
      ...registration,
      baseAssets: alias,
      fileSystem: blockingFileSystem,
    });
    await installStarted;
    await fs.unlink(alias);
    await fs.symlink(decoy, alias);
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        baseAssets: fixture.baseAssets,
      }),
      /already active under process owner/,
    );
    releaseInstall();
    await aliasedInvocation;
    releaseInstall = null;
    assert.equal(await fs.readFile(path.join(decoy, "sentinel.txt"), "utf8"), "untouched");
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
  } finally {
    releaseInstall?.();
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("journal recovery rejects a transaction owner bound to another canonical asset tree", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-canonical-journal-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const canonicalTransactionParent = await canonicalPathForPotentialEntry(transactionParent);
    const cleanupFailingFileSystem = {
      ...fs,
      rm: async (target, options) => {
        if (path.dirname(path.resolve(target)) === canonicalTransactionParent
          && path.basename(target).startsWith("registration-")) {
          throw new Error("leave a committed journal for identity validation");
        }
        return fs.rm(target, options);
      },
    };
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: cleanupFailingFileSystem,
      }),
      /committed but journal cleanup failed/,
    );
    const transaction = (await fs.readdir(transactionParent))
      .find((entry) => entry.startsWith("registration-"));
    assert.ok(transaction);
    const ownerPath = path.join(transactionParent, transaction, "owner.json");
    const owner = JSON.parse(await fs.readFile(ownerPath, "utf8"));
    owner.baseAssetsRealpath = path.join(scratch, "different-assets");
    await fs.writeFile(ownerPath, `${JSON.stringify(owner)}\n`);

    await assert.rejects(
      () => commitCompatibleAssetRegistration(registration),
      /canonical identity mismatch/,
    );
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
    assert.equal((await fs.readdir(transactionParent)).includes(transaction), true);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("journal recovery rejects an unknown protocol owner schema before mutation", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-unknown-owner-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const unknownTransaction = path.join(transactionParent, "registration-unknown-owner");
    await fs.mkdir(unknownTransaction, { recursive: true });
    await fs.writeFile(path.join(unknownTransaction, "owner.json"), `${JSON.stringify({
      schemaVersion: "shaz-compatible-registration-owner-v2",
    })}\n`);
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
      }),
      /unsupported compatible registration owner schema: registration-unknown-owner/,
    );
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(fixture.baseAssets, "receipt.json"), "utf8")),
      fixture.currentReceipt,
    );
    assert.equal((await fs.readdir(transactionParent)).includes("registration-unknown-owner"), true);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("journal recovery rejects an ownerless journal before mutation", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-ownerless-journal-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const ownerlessTransaction = path.join(transactionParent, "registration-ownerless");
    await fs.mkdir(ownerlessTransaction, { recursive: true });
    await fs.writeFile(path.join(ownerlessTransaction, "journal.json"), "{}\n");
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
      }),
      /ownerless registration journal is unsafe: registration-ownerless/,
    );
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-100.png"]);
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(fixture.baseAssets, "receipt.json"), "utf8")),
      fixture.currentReceipt,
    );
    assert.equal((await fs.readdir(transactionParent)).includes("registration-ownerless"), true);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("journal recovery preflights the whole collection before replaying an earlier valid plan", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-journal-preflight-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const receiptPath = path.join(fixture.baseAssets, "receipt.json");
    const { fileSystem: interruptedFileSystem, state: interruption } =
      interruptedAtomicRegistrationFileSystem("source-installed");
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: interruptedFileSystem,
      }),
      /journal recovery was incomplete/,
    );
    assert.equal(interruption.interrupted, true);
    assert.equal(interruption.recoveryBlocked, true);
    const generatedTransaction = (await fs.readdir(transactionParent))
      .find((entry) => entry.startsWith("registration-"));
    assert.ok(generatedTransaction);
    const laterUnsafeTransaction = "registration-zzz-unsafe";
    await fs.mkdir(path.join(transactionParent, laterUnsafeTransaction));
    await fs.writeFile(
      path.join(transactionParent, laterUnsafeTransaction, "owner.json"),
      `${JSON.stringify({ schemaVersion: "unknown-registration-owner" })}\n`,
    );
    const receiptBeforePreflight = await fs.readFile(receiptPath);
    const sourceBeforePreflight = await fs.readFile(
      path.join(fixture.sourceDirectory, "left-eye-99.png"),
    );

    await assert.rejects(
      () => commitCompatibleAssetRegistration(registration),
      /unsupported compatible registration owner schema: registration-zzz-unsafe/,
    );
    assert.deepEqual(await fs.readFile(receiptPath), receiptBeforePreflight);
    assert.deepEqual(
      await fs.readFile(path.join(fixture.sourceDirectory, "left-eye-99.png")),
      sourceBeforePreflight,
    );
    const remainingState = await fs.readdir(transactionParent);
    assert.equal(remainingState.includes(generatedTransaction), true);
    assert.equal(remainingState.includes(laterUnsafeTransaction), true);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("the next authoring invocation recovers an interrupted journal before staging new work", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-stale-journal-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const receiptPath = path.join(fixture.baseAssets, "receipt.json");
    const secondOldFilename = `sources/${compatibleSource}/left-eye-101.png`;
    const secondOldBytes = Buffer.from("second old");
    const secondOldOutputSha256 = crypto.createHash("sha256")
      .update(secondOldBytes)
      .digest("hex");
    const currentReceipt = {
      ...fixture.currentReceipt,
      assets: [...fixture.currentReceipt.assets, transactionAsset({
        drawing: "101",
        filename: secondOldFilename,
        outputSha256: secondOldOutputSha256,
      })],
    };
    await Promise.all([
      fs.writeFile(path.join(fixture.baseAssets, secondOldFilename), secondOldBytes),
      fs.writeFile(receiptPath, `${JSON.stringify(currentReceipt)}\n`),
    ]);
    const { fileSystem: interruptedFileSystem, state: interruption } =
      interruptedAtomicRegistrationFileSystem("receipt-installed");
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: interruptedFileSystem,
      }),
      /journal recovery was incomplete/,
    );
    assert.equal(interruption.interrupted, true);
    assert.equal(interruption.recoveryBlocked, true);
    assert.equal((await fs.readdir(transactionParent)).length, 1);

    const stopAfterRecoveryFileSystem = {
      ...fs,
      mkdtemp: async (prefix) => {
        if (path.basename(prefix) === "registration-") {
          throw new Error("stop after stale-journal recovery");
        }
        return fs.mkdtemp(prefix);
      },
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: stopAfterRecoveryFileSystem,
      }),
      /stop after stale-journal recovery/,
    );
    assert.deepEqual(await fs.readdir(transactionParent), []);
    assert.deepEqual(
      (await fs.readdir(fixture.sourceDirectory)).sort(),
      ["left-eye-100.png", "left-eye-101.png"],
    );
    assert.deepEqual(
      JSON.parse(await fs.readFile(receiptPath, "utf8")),
      currentReceipt,
    );
    await loadAssetRegistration(fixture.baseAssets, runtimeSource);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("journal recovery fails closed before mutating unrecognized source or receipt bytes", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-fail-closed-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const receiptPath = path.join(fixture.baseAssets, "receipt.json");
    const { fileSystem: interruptedFileSystem, state: interruption } =
      interruptedAtomicRegistrationFileSystem("source-installed");
    const registration = {
      baseAssets: fixture.baseAssets,
      sourceXstageSha256: compatibleSource,
      preparedAssets: [{
        source: fixture.preparedSource,
        filename: "left-eye-99.png",
        outputSha256: fixture.newOutputSha256,
      }],
      receipt: fixture.nextReceipt,
      transactionParent,
    };
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        ...registration,
        fileSystem: interruptedFileSystem,
      }),
      /journal recovery was incomplete/,
    );
    assert.equal(interruption.interrupted, true);
    assert.equal(interruption.recoveryBlocked, true);

    const unexpectedReceipt = Buffer.from("not a journaled receipt state");
    const unexpectedSource = Buffer.from("not a prepared drawing");
    await Promise.all([
      fs.writeFile(receiptPath, unexpectedReceipt),
      fs.writeFile(path.join(fixture.sourceDirectory, "left-eye-99.png"), unexpectedSource),
    ]);
    await assert.rejects(
      () => commitCompatibleAssetRegistration(registration),
      /bytes not recognized by its atomic journal/,
    );
    assert.deepEqual(await fs.readFile(receiptPath), unexpectedReceipt);
    assert.deepEqual(
      await fs.readFile(path.join(fixture.sourceDirectory, "left-eye-99.png")),
      unexpectedSource,
    );
    assert.equal((await fs.readdir(transactionParent)).some((entry) => (
      entry.startsWith("registration-")
    )), true);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("the CLI recovers an interrupted atomic receipt install before parsing", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-cli-recovery-"));
  const transactionParent = path.join(scratch, "transactions");
  try {
    const fixture = await transactionFixture(scratch);
    const receiptPath = path.join(fixture.baseAssets, "receipt.json");
    const { fileSystem: interruptedFileSystem, state: interruption } =
      interruptedAtomicRegistrationFileSystem("receipt-installed");
    await assert.rejects(
      () => commitCompatibleAssetRegistration({
        baseAssets: fixture.baseAssets,
        sourceXstageSha256: compatibleSource,
        preparedAssets: [{
          source: fixture.preparedSource,
          filename: "left-eye-99.png",
          outputSha256: fixture.newOutputSha256,
        }],
        receipt: fixture.nextReceipt,
        transactionParent,
        fileSystem: interruptedFileSystem,
      }),
      /journal recovery was incomplete/,
    );
    assert.equal(interruption.interrupted, true);
    assert.equal(interruption.recoveryBlocked, true);

    const compatibleAssets = path.dirname(fixture.preparedSource);
    await fs.writeFile(path.join(compatibleAssets, "receipt.json"), JSON.stringify({
      schemaVersion: "shaz-tvg-asset-receipt-v2",
      sourceXstageSha256: compatibleSource,
      artistRenderedFramesUsed: false,
      assets: [{
        element: "Left_eye",
        drawing: "99",
        variant: "main",
        filename: "left-eye-99.png",
        source: "elements/Left_eye/Left_eye-99.tvg",
        sourceSha256: "b".repeat(64),
        outputSha256: fixture.newOutputSha256,
        canvas: { width: 10, height: 10 },
        modelOrigin: { x: 0, y: 0 },
      }],
    }));
    const recipePath = path.join(scratch, "candidate.json");
    await fs.writeFile(recipePath, JSON.stringify({
      id: "cli-recovery-candidate",
      sourceAction: {
        sourceXstageSha256: compatibleSource,
        sourceFile: "compatible.xstage",
        sourceArchiveName: "compatible.zip",
        sourceArchiveSha256: archiveSha256,
      },
      drawingSources: { Left_Eye: { 99: compatibleSource } },
    }));
    const result = spawnSync(process.execPath, [
      path.join(root, "runtime", "register-compatible-tvg-assets.mjs"),
      "--manifest", path.join(root, "rig-v2", "runtime.json"),
      "--base-assets", fixture.baseAssets,
      "--compatible-assets", compatibleAssets,
      "--source-xstage-sha256", compatibleSource,
      "--source-xstage-name", "compatible.xstage",
      "--source-archive-sha256", archiveSha256,
      "--source-archive-name", "compatible.zip",
      "--registration-state-dir", transactionParent,
      "--recipe", recipePath,
    ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(await fs.readdir(fixture.sourceDirectory), ["left-eye-99.png"]);
    assert.equal(JSON.parse(await fs.readFile(receiptPath, "utf8")).schemaVersion,
      "shaz-tvg-asset-receipt-v3");
    assert.deepEqual(await fs.readdir(transactionParent), []);
    await loadAssetRegistration(fixture.baseAssets, runtimeSource);
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});
