import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  parseCanonicalRefreshArgs,
  refreshCanonicalTvgAssets,
} from "../runtime/refresh-canonical-tvg-assets.mjs";
import {
  retainedCanonicalBackupPath,
  withCanonicalAssetIdentityLease,
  withCompatibleRegistrationLease,
} from "../runtime/register-compatible-tvg-assets.mjs";
import { loadAssetRegistration } from "../runtime/rig-v2-renderer.mjs";

const runtimeSource = "a".repeat(64);
const compatibleSource = "b".repeat(64);
const sourceSha256 = "c".repeat(64);

function digest(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function asset({ drawing = "8", bytes, source = runtimeSource }) {
  const flat = `left-pupil-${drawing.padStart(2, "0")}.png`;
  return {
    filename: source === runtimeSource ? flat : `sources/${source}/${flat}`,
    variant: "main",
    elementId: 5,
    element: "Left_Pupil",
    drawing,
    source: `elements/Left_Pupil/Left_Pupil-${drawing}.tvg`,
    sourceSha256,
    outputSha256: digest(bytes),
    canvas: { width: 110, height: 110 },
    modelOrigin: { x: -50, y: -50 },
    drawingBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    sourceXstageSha256: source,
  };
}

async function writeReceipt(file, receipt) {
  await fs.writeFile(file, `${JSON.stringify(receipt, null, 2)}\n`);
}

async function fixture(t, { compiledDrawing = "8", boundOnlyDrawing = null } = {}) {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-canonical-refresh-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const baseAssets = path.join(scratch, "format", "rig-v2", "assets");
  const compiledAssets = path.join(scratch, "compiled");
  const registrationStateDirectory = path.join(scratch, "registration-state");
  const manifest = path.join(scratch, "runtime.json");
  await Promise.all([
    fs.mkdir(path.join(baseAssets, "sources", compatibleSource), { recursive: true }),
    fs.mkdir(compiledAssets, { recursive: true }),
  ]);

  const raster = (background) => sharp({
    create: { width: 110, height: 110, channels: 4, background },
  }).png().toBuffer();
  const [canonicalBefore, compatibleBytes, canonicalAfter] = await Promise.all([
    raster({ r: 1, g: 2, b: 3, alpha: 1 }),
    raster({ r: 4, g: 5, b: 6, alpha: 1 }),
    raster({ r: 7, g: 8, b: 9, alpha: 1 }),
  ]);
  const baseAssetsReceipt = [
    asset({ bytes: canonicalBefore }),
    asset({ bytes: compatibleBytes, source: compatibleSource }),
  ];
  await Promise.all([
    fs.writeFile(path.join(baseAssets, "left-pupil-08.png"), canonicalBefore),
    fs.writeFile(
      path.join(baseAssets, "sources", compatibleSource, "left-pupil-08.png"),
      compatibleBytes,
    ),
    fs.writeFile(manifest, `${JSON.stringify({ source: { sha256: runtimeSource } })}\n`),
  ]);

  if (boundOnlyDrawing) {
    const boundOnlyBytes = Buffer.from(`compatible pupil ${boundOnlyDrawing}`);
    baseAssetsReceipt.push(asset({
      drawing: boundOnlyDrawing,
      bytes: boundOnlyBytes,
      source: compatibleSource,
    }));
    await fs.writeFile(
      path.join(
        baseAssets,
        "sources",
        compatibleSource,
        `left-pupil-${boundOnlyDrawing.padStart(2, "0")}.png`,
      ),
      boundOnlyBytes,
    );
  }

  await writeReceipt(path.join(baseAssets, "receipt.json"), {
    schemaVersion: "shaz-tvg-asset-receipt-v3",
    runtimeXstageSha256: runtimeSource,
    sources: [
      { xstageSha256: runtimeSource, sourceArchiveBundled: false },
      {
        xstageSha256: compatibleSource,
        xstageName: "compatible.xstage",
        sourceArchiveSha256: "d".repeat(64),
        sourceArchiveName: "compatible.zip",
        sourceArchiveBundled: false,
      },
    ],
    sourceArchiveBundled: false,
    artistRenderedFramesUsed: false,
    rasterMarginModelUnits: 50,
    assets: baseAssetsReceipt,
  });

  const compiledRecord = asset({ drawing: compiledDrawing, bytes: canonicalAfter });
  delete compiledRecord.sourceXstageSha256;
  await fs.writeFile(path.join(compiledAssets, compiledRecord.filename), canonicalAfter);
  await writeReceipt(path.join(compiledAssets, "receipt.json"), {
    schemaVersion: "shaz-tvg-asset-receipt-v2",
    sourceXstageSha256: runtimeSource,
    sourceArchiveBundled: false,
    artistRenderedFramesUsed: false,
    rasterMarginModelUnits: 50,
    assets: [compiledRecord],
  });

  return {
    scratch,
    baseAssets,
    compiledAssets,
    registrationStateDirectory,
    manifest,
    canonicalBefore,
    canonicalAfter,
    compatibleBytes,
  };
}

function refreshArgs(value, overrides = {}) {
  return {
    manifest: value.manifest,
    baseAssets: value.baseAssets,
    compiledAssets: value.compiledAssets,
    registrationStateDirectory: value.registrationStateDirectory,
    ...overrides,
  };
}

test("canonical refresh CLI requires the three authoring inputs", () => {
  assert.deepEqual(parseCanonicalRefreshArgs([
    "--manifest", "runtime.json",
    "--base-assets", "assets",
    "--compiled-assets", "compiled",
  ]), {
    manifest: "runtime.json",
    baseAssets: "assets",
    compiledAssets: "compiled",
    registrationStateDirectory: null,
  });
  assert.throws(() => parseCanonicalRefreshArgs([
    "--manifest", "runtime.json",
    "--base-assets", "assets",
  ]), /usage/);
});

test("canonical refresh replaces only the exact canonical asset in the full v3 tree", async (t) => {
  const value = await fixture(t);
  const before = JSON.parse(await fs.readFile(path.join(value.baseAssets, "receipt.json"), "utf8"));
  const boundBefore = before.assets.find(({ sourceXstageSha256 }) => (
    sourceXstageSha256 === compatibleSource
  ));
  const result = await refreshCanonicalTvgAssets(refreshArgs(value));

  assert.deepEqual(result.updatedAssets, ["left-pupil-08.png"]);
  assert.deepEqual(
    await fs.readFile(path.join(value.baseAssets, "left-pupil-08.png")),
    value.canonicalAfter,
  );
  assert.deepEqual(await fs.readFile(path.join(
    value.baseAssets,
    "sources",
    compatibleSource,
    "left-pupil-08.png",
  )), value.compatibleBytes);
  const after = JSON.parse(await fs.readFile(path.join(value.baseAssets, "receipt.json"), "utf8"));
  assert.deepEqual(after.assets.find(({ sourceXstageSha256 }) => (
    sourceXstageSha256 === compatibleSource
  )), boundBefore);
  assert.equal(after.assets.find(({ filename }) => filename === "left-pupil-08.png").outputSha256,
    digest(value.canonicalAfter));
  await loadAssetRegistration(value.baseAssets, runtimeSource);
});

test("canonical refresh rejects checksum drift, path traversal, and symlink inputs", async (t) => {
  await t.test("compiled provenance drift", async (child) => {
    const value = await fixture(child);
    const receiptPath = path.join(value.compiledAssets, "receipt.json");
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.sourceXstageSha256 = "f".repeat(64);
    await writeReceipt(receiptPath, receipt);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /must be v2 and match the runtime Xstage source/,
    );
  });
  await t.test("checksum drift", async (child) => {
    const value = await fixture(child);
    await fs.writeFile(path.join(value.compiledAssets, "left-pupil-08.png"), "tampered");
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /checksum mismatch/,
    );
  });
  await t.test("self-consistent non-PNG bytes", async (child) => {
    const value = await fixture(child);
    const bytes = Buffer.from("not actually a PNG");
    await fs.writeFile(path.join(value.compiledAssets, "left-pupil-08.png"), bytes);
    const receiptPath = path.join(value.compiledAssets, "receipt.json");
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.assets[0].outputSha256 = digest(bytes);
    await writeReceipt(receiptPath, receipt);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /not a decodable PNG/,
    );
  });
  await t.test("self-consistent PNG with corrupt image data", async (child) => {
    const value = await fixture(child);
    const bytes = Buffer.from(value.canonicalAfter);
    const idat = bytes.indexOf(Buffer.from("IDAT"));
    assert.ok(idat >= 0, "fixture PNG requires an IDAT chunk");
    bytes[idat + 4] ^= 0xff;
    await fs.writeFile(path.join(value.compiledAssets, "left-pupil-08.png"), bytes);
    const receiptPath = path.join(value.compiledAssets, "receipt.json");
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.assets[0].outputSha256 = digest(bytes);
    await writeReceipt(receiptPath, receipt);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /not a decodable PNG/,
    );
  });
  await t.test("decoded dimensions disagree with receipt", async (child) => {
    const value = await fixture(child);
    const bytes = await sharp({
      create: {
        width: 111,
        height: 110,
        channels: 4,
        background: { r: 7, g: 8, b: 9, alpha: 1 },
      },
    }).png().toBuffer();
    await fs.writeFile(path.join(value.compiledAssets, "left-pupil-08.png"), bytes);
    const receiptPath = path.join(value.compiledAssets, "receipt.json");
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.assets[0].outputSha256 = digest(bytes);
    await writeReceipt(receiptPath, receipt);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /PNG dimensions do not match its receipt/,
    );
  });
  await t.test("non-finite model geometry", async (child) => {
    const value = await fixture(child);
    const receiptPath = path.join(value.compiledAssets, "receipt.json");
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.assets[0].modelOrigin.x = null;
    await writeReceipt(receiptPath, receipt);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /invalid model geometry/,
    );
  });
  await t.test("finite but displaced compiler geometry", async (child) => {
    const value = await fixture(child);
    const receiptPath = path.join(value.compiledAssets, "receipt.json");
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.assets[0].modelOrigin.x += 1;
    await writeReceipt(receiptPath, receipt);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /violates compiler geometry invariants/,
    );
  });
  await t.test("path traversal", async (child) => {
    const value = await fixture(child);
    const receiptPath = path.join(value.compiledAssets, "receipt.json");
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    receipt.assets[0].filename = "../left-pupil-08.png";
    await writeReceipt(receiptPath, receipt);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /unsafe asset receipt|exactly match/,
    );
  });
  await t.test("unreceipted file", async (child) => {
    const value = await fixture(child);
    await fs.writeFile(path.join(value.compiledAssets, "mouth-01.png"), "extra");
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /does not exactly match its receipt/,
    );
  });
  await t.test("symlinked compiled asset", async (child) => {
    const value = await fixture(child);
    const target = path.join(value.compiledAssets, "left-pupil-08.png");
    const outside = path.join(value.scratch, "outside.png");
    await fs.writeFile(outside, value.canonicalAfter);
    await fs.rm(target);
    await fs.symlink(outside, target);
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      /contains a symlink|only real flat files/,
    );
  });
  await t.test("symlinked base root", async (child) => {
    const value = await fixture(child);
    const alias = path.join(value.scratch, "assets-alias");
    await fs.symlink(value.baseAssets, alias, "dir");
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value, { baseAssets: alias })),
      /base-assets must be a real directory/,
    );
  });
});

test("canonical refresh rejects a drawing that exists only in a source-bound tree", async (t) => {
  const value = await fixture(t, { compiledDrawing: "9", boundOnlyDrawing: "9" });
  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value)),
    /does not uniquely match a canonical-source asset: Left_Pupil:9:main/,
  );
  assert.deepEqual(
    await fs.readFile(path.join(value.baseAssets, "left-pupil-08.png")),
    value.canonicalBefore,
  );
});

test("canonical refresh rejects accidental palette normalization drift", async (t) => {
  const value = await fixture(t);
  const receiptPath = path.join(value.compiledAssets, "receipt.json");
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  receipt.assets[0].paletteNormalization = {
    schemaVersion: "shaz-outline-palette-normalization-v1",
    sourceColor: [77, 17, 3, 255],
    destinationColor: [0, 0, 0, 255],
    replacementCount: 1,
  };
  await writeReceipt(receiptPath, receipt);
  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value)),
    /does not exactly match canonical registration/,
  );
  assert.deepEqual(
    await fs.readFile(path.join(value.baseAssets, "left-pupil-08.png")),
    value.canonicalBefore,
  );
});

test("canonical refresh compares the live receipt before rename", async (t) => {
  const value = await fixture(t);
  let changed = false;
  const driftingFileSystem = {
    ...fs,
    writeFile: async (target, data, options) => {
      if (!changed && target.includes(".shaz-canonical-stage-")
        && path.basename(target) === "left-pupil-08.png") {
        changed = true;
        await fs.appendFile(path.join(value.baseAssets, "receipt.json"), "\n");
      }
      return fs.writeFile(target, data, options);
    },
  };
  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value, { fileSystem: driftingFileSystem })),
    /receipt changed while the refresh was staged/,
  );
  assert.deepEqual(
    await fs.readFile(path.join(value.baseAssets, "left-pupil-08.png")),
    value.canonicalBefore,
  );
});

test("canonical refresh rolls back a failed staged install", async (t) => {
  const value = await fixture(t);
  const receiptBefore = await fs.readFile(path.join(value.baseAssets, "receipt.json"));
  const canonicalBase = await fs.realpath(value.baseAssets);
  let failed = false;
  const interruptedFileSystem = {
    ...fs,
    rename: async (source, destination) => {
      if (!failed
        && path.basename(source).startsWith(".shaz-canonical-stage-")
        && path.resolve(destination) === canonicalBase) {
        failed = true;
        throw new Error("forced staged install failure");
      }
      return fs.rename(source, destination);
    },
  };
  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value, {
      fileSystem: interruptedFileSystem,
    })),
    /forced staged install failure/,
  );
  assert.deepEqual(await fs.readFile(path.join(value.baseAssets, "receipt.json")), receiptBefore);
  assert.deepEqual(
    await fs.readFile(path.join(value.baseAssets, "left-pupil-08.png")),
    value.canonicalBefore,
  );
  await loadAssetRegistration(value.baseAssets, runtimeSource);
});

test("an abrupt whole-tree swap interruption fails closed until its backup is restored", async (t) => {
  const value = await fixture(t);
  const canonicalBase = await fs.realpath(value.baseAssets);
  const identityHash = digest(Buffer.from(canonicalBase)).slice(0, 16);
  const backup = path.join(
    path.dirname(canonicalBase),
    `.shaz-canonical-backup-${identityHash}`,
  );

  await fs.rename(canonicalBase, backup);
  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value)),
    /target is missing while its retained backup exists.*manually rename/s,
  );

  await fs.rename(backup, canonicalBase);
  await loadAssetRegistration(canonicalBase, runtimeSource);
  await refreshCanonicalTvgAssets(refreshArgs(value));
  assert.deepEqual(
    await fs.readFile(path.join(canonicalBase, "left-pupil-08.png")),
    value.canonicalAfter,
  );
});

test("a live whole-tree swap never emits manual recovery instructions", async (t) => {
  const value = await fixture(t);
  const canonicalBase = await fs.realpath(value.baseAssets);
  const backup = retainedCanonicalBackupPath(canonicalBase);
  let announceSwap;
  let releaseSwap;
  const swapped = new Promise((resolve) => { announceSwap = resolve; });
  const release = new Promise((resolve) => { releaseSwap = resolve; });
  const holder = withCanonicalAssetIdentityLease({
    baseAssets: canonicalBase,
  }, async ({ assertLease }) => {
    await assertLease();
    await fs.rename(canonicalBase, backup);
    announceSwap();
    await release;
    await fs.rename(backup, canonicalBase);
  });
  await swapped;

  let observedError = null;
  try {
    await assert.rejects(
      () => refreshCanonicalTvgAssets(refreshArgs(value)),
      (error) => {
        observedError = error;
        return /already active under process owner/.test(error.message);
      },
    );
  } finally {
    releaseSwap();
    await holder;
  }
  assert.ok(observedError);
  assert.doesNotMatch(observedError.message, /manually rename/);

  await refreshCanonicalTvgAssets(refreshArgs(value));
  assert.deepEqual(
    await fs.readFile(path.join(canonicalBase, "left-pupil-08.png")),
    value.canonicalAfter,
  );
});

test("a substituted staging path is preserved for inspection and never installed", async (t) => {
  const value = await fixture(t);
  const canonicalBase = await fs.realpath(value.baseAssets);
  const foreign = path.join(value.scratch, "foreign-stage");
  const foreignMarker = path.join(foreign, "do-not-delete.txt");
  await fs.mkdir(foreign);
  await fs.writeFile(foreignMarker, "preserve me");
  let stage = null;
  let ownedStage = null;
  let swapped = false;
  const substitutingFileSystem = {
    ...fs,
    mkdtemp: async (prefix) => {
      const created = await fs.mkdtemp(prefix);
      if (path.basename(prefix).startsWith(".shaz-canonical-stage-")) stage = created;
      return created;
    },
    rename: async (source, destination) => {
      await fs.rename(source, destination);
      if (!swapped && path.resolve(source) === canonicalBase) {
        swapped = true;
        ownedStage = `${stage}-original`;
        await fs.rename(stage, ownedStage);
        await fs.symlink(foreign, stage, "dir");
      }
    },
  };

  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value, {
      fileSystem: substitutingFileSystem,
    })),
    /staging cleanup was incomplete|must remain a real directory/,
  );
  assert.equal(swapped, true);
  assert.equal((await fs.lstat(stage)).isSymbolicLink(), true);
  assert.equal((await fs.lstat(ownedStage)).isDirectory(), true);
  assert.equal(await fs.readFile(foreignMarker, "utf8"), "preserve me");
  assert.deepEqual(
    await fs.readFile(path.join(canonicalBase, "left-pupil-08.png")),
    value.canonicalBefore,
  );
  await loadAssetRegistration(canonicalBase, runtimeSource);
});

test("owned-directory cleanup retires the exact inode before recursive removal", async (t) => {
  const value = await fixture(t);
  const canonicalBase = await fs.realpath(value.baseAssets);
  const foreign = path.join(value.scratch, "foreign-cleanup-replacement");
  const foreignMarker = path.join(foreign, "do-not-delete.txt");
  await fs.mkdir(foreign);
  await fs.writeFile(foreignMarker, "preserve me");
  let preservedOwnedBackup = null;
  let substitutedTombstone = null;
  const substitutingFileSystem = {
    ...fs,
    rename: async (source, destination) => {
      await fs.rename(source, destination);
      if (!substitutedTombstone
        && path.basename(source).startsWith(".shaz-canonical-backup-")
        && path.basename(destination).includes(".retired-")) {
        substitutedTombstone = destination;
        preservedOwnedBackup = `${destination}.owned`;
        await fs.rename(destination, preservedOwnedBackup);
        await fs.symlink(foreign, destination, "dir");
      }
    },
  };

  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value, {
      fileSystem: substitutingFileSystem,
    })),
    /backup cleanup failed|must remain a real directory/,
  );
  assert.ok(substitutedTombstone);
  assert.equal((await fs.lstat(substitutedTombstone)).isSymbolicLink(), true);
  assert.equal((await fs.lstat(preservedOwnedBackup)).isDirectory(), true);
  assert.equal(await fs.readFile(foreignMarker, "utf8"), "preserve me");
  assert.deepEqual(
    await fs.readFile(path.join(canonicalBase, "left-pupil-08.png")),
    value.canonicalAfter,
  );
  await loadAssetRegistration(canonicalBase, runtimeSource);
});

test("canonical refresh syncs staged bytes and every rename parent in order", async (t) => {
  const value = await fixture(t);
  const canonicalBase = await fs.realpath(value.baseAssets);
  const parent = path.dirname(canonicalBase);
  const events = [];
  let stage = null;
  const observedFileSystem = {
    ...fs,
    mkdtemp: async (prefix) => {
      const created = await fs.mkdtemp(prefix);
      if (path.basename(prefix).startsWith(".shaz-canonical-stage-")) stage = created;
      return created;
    },
    open: async (filename, ...args) => {
      const handle = await fs.open(filename, ...args);
      const resolved = path.resolve(filename);
      return new Proxy(handle, {
        get(target, property) {
          if (property === "sync") {
            return async () => {
              events.push({ kind: "sync", path: resolved });
              return target.sync();
            };
          }
          const member = Reflect.get(target, property, target);
          return typeof member === "function" ? member.bind(target) : member;
        },
      });
    },
    rename: async (source, destination) => {
      events.push({
        kind: "rename",
        source: path.resolve(source),
        destination: path.resolve(destination),
      });
      return fs.rename(source, destination);
    },
    rm: async (target, options) => {
      events.push({ kind: "rm", path: path.resolve(target) });
      return fs.rm(target, options);
    },
  };

  await refreshCanonicalTvgAssets(refreshArgs(value, {
    fileSystem: observedFileSystem,
  }));
  assert.ok(stage);

  const targetRetired = events.findIndex((event) => (
    event.kind === "rename" && event.source === canonicalBase
  ));
  const stageInstalled = events.findIndex((event) => (
    event.kind === "rename" && event.source === stage && event.destination === canonicalBase
  ));
  const backupRetired = events.findIndex((event) => (
    event.kind === "rename"
      && path.basename(event.source).startsWith(".shaz-canonical-backup-")
      && path.basename(event.destination).includes(".retired-")
  ));
  const tombstoneRemoved = events.findIndex((event) => (
    event.kind === "rm" && path.basename(event.path).includes(".retired-")
  ));
  assert.ok(targetRetired > 0);
  assert.ok(stageInstalled > targetRetired);
  assert.ok(backupRetired > stageInstalled);
  assert.ok(tombstoneRemoved > backupRetired);

  const syncedBefore = (filename, boundary) => events.some((event, index) => (
    index < boundary && event.kind === "sync" && event.path === filename
  ));
  const parentSyncedBetween = (after, before) => events.some((event, index) => (
    index > after && index < before && event.kind === "sync" && event.path === parent
  ));
  assert.equal(
    syncedBefore(path.join(stage, "left-pupil-08.png"), targetRetired),
    true,
  );
  assert.equal(
    syncedBefore(path.join(stage, "receipt.json"), targetRetired),
    true,
  );
  assert.equal(syncedBefore(stage, targetRetired), true);
  assert.equal(parentSyncedBetween(targetRetired, stageInstalled), true);
  assert.equal(parentSyncedBetween(stageInstalled, backupRetired), true);
  assert.equal(parentSyncedBetween(backupRetired, tombstoneRemoved), true);
  assert.equal(
    events.some((event, index) => (
      index > tombstoneRemoved && event.kind === "sync" && event.path === parent
    )),
    true,
  );
});

test("the shared registration lease blocks while a canonical backup is retained", async (t) => {
  const value = await fixture(t);
  const canonicalBase = await fs.realpath(value.baseAssets);
  const backup = retainedCanonicalBackupPath(canonicalBase);
  await fs.cp(canonicalBase, backup, { recursive: true });
  let entered = false;

  await assert.rejects(
    () => withCompatibleRegistrationLease({
      baseAssets: canonicalBase,
      transactionParent: value.registrationStateDirectory,
    }, async () => {
      entered = true;
    }),
    /retained canonical refresh backup requires explicit operator recovery/,
  );
  assert.equal(entered, false);
  assert.deepEqual(
    await fs.readFile(path.join(canonicalBase, "left-pupil-08.png")),
    value.canonicalBefore,
  );
});

test("canonical refresh cannot overlap the compatible registrar lease", async (t) => {
  const value = await fixture(t);
  let releaseHolder;
  let holderStarted;
  const release = new Promise((resolve) => { releaseHolder = resolve; });
  const started = new Promise((resolve) => { holderStarted = resolve; });
  const holder = withCompatibleRegistrationLease({
    baseAssets: value.baseAssets,
  }, async () => {
    holderStarted();
    await release;
  });
  await started;

  let stageStarted = false;
  const observedFileSystem = {
    ...fs,
    mkdtemp: async (prefix) => {
      if (path.basename(prefix).startsWith(".shaz-canonical-stage-")) stageStarted = true;
      return fs.mkdtemp(prefix);
    },
  };
  await assert.rejects(
    () => refreshCanonicalTvgAssets(refreshArgs(value, {
      fileSystem: observedFileSystem,
      registrationStateDirectory: null,
    })),
    /already active under process owner/,
  );
  assert.equal(stageStarted, false, "canonical staging must not overlap compatible registration");
  releaseHolder();
  await holder;
  await refreshCanonicalTvgAssets(refreshArgs(value, {
    fileSystem: observedFileSystem,
    registrationStateDirectory: null,
  }));
  assert.equal(stageStarted, true);
});
