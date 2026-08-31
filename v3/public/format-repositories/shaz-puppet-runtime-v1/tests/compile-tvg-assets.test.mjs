import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  enumerateFrameRange,
  normalizeOutlinePalette,
  parseCompileArgs,
  parseFrameRange,
  readTvgSourceWithinRig,
  requestedDrawings,
  resolveRealRigRoot,
  validateFrameRange,
  validateOutlinePaletteApplication,
  withStagedCompiledOutput,
} from "../runtime/compile-tvg-assets.mjs";
import { READ_PAINT_ORDER } from "../runtime/rig-v2-renderer.mjs";

const requiredArgs = [
  "--manifest", "runtime.json",
  "--rig", "source-rig",
  "--output", "compiled-assets",
];
const sourceSha256 = "a".repeat(64);

function drawingAttrs(columnName = "art") {
  return {
    children: {
      drawing: [{
        children: {
          element: [{ attributes: { col: columnName } }],
        },
      }],
    },
  };
}

function compatibleManifest(prefix, {
  omitName = null,
  duplicateInsideName = null,
  outsideCopies = 1,
} = {}) {
  const inside = READ_PAINT_ORDER.flatMap((nodePath) => {
    const name = path.posix.basename(nodePath);
    if (name === omitName) return [];
    const expected = `${prefix}${nodePath.slice("Top/Shaz_Rig/".length)}`;
    const node = { path: expected, name, type: "READ", attrs: drawingAttrs() };
    if (name !== duplicateInsideName) return [node];
    return [
      node,
      { ...node, path: `${prefix}Duplicate/${name}` },
    ];
  });
  const outside = Array.from({ length: outsideCopies }, (_, copy) => (
    READ_PAINT_ORDER.map((nodePath) => {
      const name = path.posix.basename(nodePath);
      return {
        path: `Top/Storyboard_${copy}/${name}`,
        name,
        type: "READ",
        attrs: drawingAttrs(),
      };
    })
  )).flat();
  return {
    source: { sha256: sourceSha256 },
    scenes: [{
      startFrame: 1,
      stopFrame: 2,
      nodes: [...inside, ...outside],
      columns: [{
        name: "art",
        type: 0,
        elementId: 42,
        exposures: [{ frames: [1], drawing: "1" }],
        heldFrames: [1, 2],
      }],
    }],
    elements: [{
      id: 42,
      name: "Left_Hand",
      drawings: ["1"],
      rootFolder: "elements",
      folder: "Left_Hand",
    }],
  };
}

async function writeCompiledTree(directory, assets) {
  await fs.mkdir(directory, { recursive: true });
  const receiptAssets = [];
  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    await fs.writeFile(path.join(directory, asset.filename), asset.bytes);
    receiptAssets.push({
      filename: asset.filename,
      variant: asset.variant ?? "main",
      elementId: index + 1,
      element: asset.element,
      drawing: asset.drawing,
      source: `elements/${asset.element}/${asset.element}-${asset.drawing}.tvg`,
      sourceSha256: crypto.createHash("sha256").update(`source-${asset.filename}`).digest("hex"),
      outputSha256: crypto.createHash("sha256").update(asset.bytes).digest("hex"),
    });
  }
  await fs.writeFile(path.join(directory, "receipt.json"), `${JSON.stringify({
    schemaVersion: "shaz-tvg-asset-receipt-v2",
    sourceXstageSha256: sourceSha256,
    sourceArchiveBundled: false,
    artistRenderedFramesUsed: false,
    rasterMarginModelUnits: 50,
    assets: receiptAssets,
  })}\n`);
}

test("TVG compilation parses drawing selectors and complete RGBA normalization", () => {
  const parsed = parseCompileArgs([
    ...requiredArgs,
    "--drawings", "Left_Hand:14,Mouth:2",
    "--outline-source-color", "77,17,3,255",
    "--outline-color", "0,0,0,255",
  ]);
  assert.deepEqual(parsed.drawings, [
    { element: "Left_Hand", drawing: "14" },
    { element: "Mouth", drawing: "2" },
  ]);
  assert.deepEqual(parsed.outlineSourceColor, [77, 17, 3, 255]);
  assert.deepEqual(parsed.outlineColor, [0, 0, 0, 255]);

  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--frames", "1", "--drawings", "Mouth:2"]),
    /mutually exclusive/,
  );
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--outline-color", "0,0,0,255"]),
    /requires both source and destination colors/,
  );
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--outline-source-color", "77,17,3", "--outline-color", "0,0,0,255"]),
    /four comma-separated bytes/,
  );
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--drawings", "Left_Hand"]),
    /Element:Drawing selectors/,
  );
});

test("TVG compilation expands an inclusive validated frame range", () => {
  assert.deepEqual(parseFrameRange("7-10"), { start: 7, end: 10 });
  assert.deepEqual([...enumerateFrameRange({ start: 7, end: 10 })], [7, 8, 9, 10]);
  assert.deepEqual(parseCompileArgs([...requiredArgs, "--range", "7-10"]).range, {
    start: 7,
    end: 10,
  });
  assert.throws(() => parseFrameRange("0-2"), /positive integers/);
  assert.throws(() => parseFrameRange("4-3"), /less than or equal/);
  assert.throws(() => parseFrameRange("1..3"), /START-END/);
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--range", "1-3", "--frames", "1,2"]),
    /mutually exclusive/,
  );

  const huge = parseFrameRange("1-4294967296");
  assert.throws(
    () => validateFrameRange(huge, { startFrame: 1, stopFrame: 350 }),
    /outside 1-350/,
  );
  assert.deepEqual(enumerateFrameRange(huge).next(), { value: 1, done: false });
  assert.throws(
    () => validateFrameRange(huge, { startFrame: 1, stopFrame: Number.MAX_SAFE_INTEGER }),
    /at most 10000 frames/,
  );
  assert.throws(
    () => validateFrameRange({ start: 0, end: 1 }, { startFrame: 1, stopFrame: 350 }),
    /invalid frame bounds/,
  );
});

test("frame compilation accepts only an explicit unique compatible node boundary", () => {
  const prefix = "Top/Puppet_Talk_Section_Group/";
  const parsed = parseCompileArgs([
    ...requiredArgs,
    "--range", "1-2",
    "--node-prefix", prefix,
  ]);
  assert.equal(parsed.nodePrefix, prefix);
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--drawings", "Left_Hand:1", "--node-prefix", prefix]),
    /requires --frames or --range/,
  );
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--range", "1-2", "--node-prefix", "Top/Puppet"]),
    /ending in/,
  );

  const withOutsideDuplicates = compatibleManifest(prefix, { outsideCopies: 2 });
  assert.deepEqual(
    requestedDrawings(withOutsideDuplicates, [1, 2], null, prefix),
    [{
      elementId: 42,
      element: "Left_Hand",
      drawing: "1",
      file: "elements/Left_Hand/Left_Hand-1.tvg",
    }],
  );
  assert.throws(
    () => requestedDrawings(withOutsideDuplicates, [1], null),
    /--node-prefix is required/,
  );
  assert.throws(
    () => requestedDrawings(
      compatibleManifest(prefix, { omitName: "Left_Hand", outsideCopies: 2 }),
      [1],
      null,
      prefix,
    ),
    /Left_Hand is not unique within --node-prefix/,
  );
  assert.throws(
    () => requestedDrawings(
      compatibleManifest(prefix, { duplicateInsideName: "Left_Hand", outsideCopies: 0 }),
      [1],
      null,
      prefix,
    ),
    /Left_Hand is not unique within --node-prefix/,
  );
});

test("TVG drawing selection resolves only declared element drawings", () => {
  const manifest = {
    scenes: [{ nodes: [] }],
    elements: [{
      id: 42,
      name: "Left_Hand",
      drawings: ["1", "14"],
      rootFolder: "elements",
      folder: "Left_Hand",
    }],
  };
  assert.deepEqual(
    requestedDrawings(manifest, null, [{ element: "Left_Hand", drawing: "14" }]),
    [{
      elementId: 42,
      element: "Left_Hand",
      drawing: "14",
      file: "elements/Left_Hand/Left_Hand-14.tvg",
    }],
  );
  assert.throws(
    () => requestedDrawings(manifest, null, [{ element: "Left_Hand", drawing: "99" }]),
    /unknown drawing selector Left_Hand:99/,
  );
});

test("TVG drawing selection rejects unsafe manifest ids and paths", () => {
  const manifest = {
    scenes: [{ nodes: [] }],
    elements: [{
      id: 42,
      name: "Left_Hand",
      drawings: ["../../../escape"],
      rootFolder: "elements",
      folder: "Left_Hand",
    }],
  };
  assert.throws(
    () => requestedDrawings(manifest, null, [{ element: "Left_Hand", drawing: "../../../escape" }]),
    /canonical non-negative integer drawing id/,
  );
  assert.throws(
    () => requestedDrawings({
      ...manifest,
      elements: [{ ...manifest.elements[0], drawings: ["1"], rootFolder: "../elements" }],
    }, null, [{ element: "Left_Hand", drawing: "1" }]),
    /unsafe TVG source path/,
  );
  assert.throws(
    () => requestedDrawings({
      ...manifest,
      elements: [{ ...manifest.elements[0], id: 0, drawings: ["1"] }],
    }, null, [{ element: "Left_Hand", drawing: "1" }]),
    /unsafe element id/,
  );
});

test("TVG source resolution rejects symlink escapes from the real rig root", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-tvg-source-boundary-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const rigRoot = path.join(scratch, "rig");
  const outsideElements = path.join(scratch, "outside-elements");
  await Promise.all([
    fs.mkdir(rigRoot, { recursive: true }),
    fs.mkdir(path.join(outsideElements, "Left_Hand"), { recursive: true }),
  ]);
  await fs.writeFile(path.join(outsideElements, "Left_Hand", "Left_Hand-1.tvg"), "outside");
  await fs.symlink(outsideElements, path.join(rigRoot, "elements"), "dir");
  const canonicalRigRoot = await resolveRealRigRoot(rigRoot);
  await assert.rejects(
    () => readTvgSourceWithinRig(
      canonicalRigRoot,
      "elements/Left_Hand/Left_Hand-1.tvg",
    ),
    /resolves outside --rig/,
  );
});

test("TVG source resolution does not reopen a swapped symlink", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-tvg-source-race-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const rigRoot = path.join(scratch, "rig");
  const source = path.join(rigRoot, "elements", "Left_Hand", "Left_Hand-1.tvg");
  const original = path.join(scratch, "original.tvg");
  const outside = path.join(scratch, "outside.tvg");
  await fs.mkdir(path.dirname(source), { recursive: true });
  await Promise.all([
    fs.writeFile(source, "inside"),
    fs.writeFile(outside, "outside"),
  ]);
  const canonicalRigRoot = await resolveRealRigRoot(rigRoot);
  let swapped = false;
  const swappingFileSystem = {
    ...fs,
    open: async (...args) => {
      if (!swapped) {
        swapped = true;
        await fs.rename(source, original);
        await fs.symlink(outside, source);
      }
      return fs.open(...args);
    },
  };
  await assert.rejects(
    () => readTvgSourceWithinRig(
      canonicalRigRoot,
      "elements/Left_Hand/Left_Hand-1.tvg",
      swappingFileSystem,
    ),
    /ELOOP|symbolic link/,
  );
});

test("compiled output staging preserves old output on failure and replaces narrower trees exactly", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-tvg-output-transaction-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const output = path.join(scratch, "compiled-assets");
  const oldAssets = [
    { filename: "left-hand-01.png", bytes: Buffer.from("old left"), element: "Left_Hand", drawing: "1" },
    { filename: "mouth-02.png", bytes: Buffer.from("old mouth"), element: "Mouth", drawing: "2" },
  ];
  await writeCompiledTree(output, oldAssets);
  const canonicalOutput = path.join(await fs.realpath(scratch), "compiled-assets");
  const backupIdentity = crypto.createHash("sha256")
    .update(canonicalOutput)
    .digest("hex")
    .slice(0, 16);
  const backup = path.join(scratch, `.shaz-tvg-backup-${backupIdentity}`);
  await fs.rename(output, backup);
  await withStagedCompiledOutput(output, (stage) => writeCompiledTree(stage, oldAssets));
  assert.equal(await fs.stat(output).then((stat) => stat.isDirectory()), true);
  await assert.rejects(() => fs.stat(backup), { code: "ENOENT" });
  const receiptBefore = await fs.readFile(path.join(output, "receipt.json"));

  await assert.rejects(
    () => withStagedCompiledOutput(output, async (stage) => {
      await fs.writeFile(path.join(stage, "partial.png"), "partial");
      throw new Error("forced renderer failure");
    }),
    /forced renderer failure/,
  );
  assert.deepEqual(await fs.readFile(path.join(output, "receipt.json")), receiptBefore);
  assert.deepEqual((await fs.readdir(output)).sort(), [
    "left-hand-01.png",
    "mouth-02.png",
    "receipt.json",
  ]);

  let failedInstall = false;
  const interruptedFileSystem = {
    ...fs,
    rename: async (source, destination) => {
      if (!failedInstall
        && path.basename(source).startsWith(".shaz-tvg-stage-")
        && path.resolve(destination) === canonicalOutput) {
        failedInstall = true;
        throw new Error("forced staged install failure");
      }
      return fs.rename(source, destination);
    },
  };
  await assert.rejects(
    () => withStagedCompiledOutput(output, (stage) => writeCompiledTree(stage, [{
      filename: "left-hand-01.png",
      bytes: Buffer.from("replacement"),
      element: "Left_Hand",
      drawing: "1",
    }]), { fileSystem: interruptedFileSystem }),
    /forced staged install failure/,
  );
  assert.deepEqual(await fs.readFile(path.join(output, "receipt.json")), receiptBefore);

  let failedCleanup = false;
  const interruptedCleanupFileSystem = {
    ...fs,
    rm: async (target, options) => {
      if (!failedCleanup && path.basename(target).startsWith(".shaz-tvg-backup-")) {
        failedCleanup = true;
        await fs.rm(path.join(target, "mouth-02.png"), { force: true });
        throw new Error("forced partial backup cleanup failure");
      }
      return fs.rm(target, options);
    },
  };
  await assert.rejects(
    () => withStagedCompiledOutput(output, (stage) => writeCompiledTree(stage, [{
      filename: "left-hand-01.png",
      bytes: Buffer.from("cleanup-interrupted"),
      element: "Left_Hand",
      drawing: "1",
    }]), { fileSystem: interruptedCleanupFileSystem }),
    /backup cleanup failed/,
  );
  assert.equal(
    await fs.readFile(path.join(output, "left-hand-01.png"), "utf8"),
    "cleanup-interrupted",
  );

  await withStagedCompiledOutput(output, (stage) => writeCompiledTree(stage, [{
    filename: "left-hand-01.png",
    bytes: Buffer.from("new left"),
    element: "Left_Hand",
    drawing: "1",
  }]));
  assert.deepEqual((await fs.readdir(output)).sort(), ["left-hand-01.png", "receipt.json"]);
  assert.equal(await fs.readFile(path.join(output, "left-hand-01.png"), "utf8"), "new left");
});

test("compiled output staging refuses a symlink destination", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-tvg-output-symlink-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const actual = path.join(scratch, "actual");
  const output = path.join(scratch, "compiled-assets");
  await fs.mkdir(actual);
  await fs.symlink(actual, output, "dir");
  await assert.rejects(
    () => withStagedCompiledOutput(output, (stage) => writeCompiledTree(stage, [{
      filename: "left-hand-01.png",
      bytes: Buffer.from("new"),
      element: "Left_Hand",
      drawing: "1",
    }])),
    /real directory/,
  );
});

test("compiled output staging refuses a target replaced during the build", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-tvg-output-race-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const output = path.join(scratch, "compiled-assets");
  const original = path.join(scratch, "original-assets");
  await writeCompiledTree(output, [{
    filename: "left-hand-01.png",
    bytes: Buffer.from("original"),
    element: "Left_Hand",
    drawing: "1",
  }]);
  await assert.rejects(
    () => withStagedCompiledOutput(output, async (stage) => {
      await writeCompiledTree(stage, [{
        filename: "left-hand-01.png",
        bytes: Buffer.from("staged"),
        element: "Left_Hand",
        drawing: "1",
      }]);
      await fs.rename(output, original);
      await writeCompiledTree(output, [{
        filename: "left-hand-01.png",
        bytes: Buffer.from("concurrent"),
        element: "Left_Hand",
        drawing: "1",
      }]);
    }),
    /changed while the replacement was being built/,
  );
  assert.equal(await fs.readFile(path.join(output, "left-hand-01.png"), "utf8"), "concurrent");
  assert.equal(await fs.readFile(path.join(original, "left-hand-01.png"), "utf8"), "original");
});

test("requested outline normalization supports mixed palettes but rejects a total no-op", () => {
  const sourceColor = [77, 17, 3, 255];
  const destinationColor = [0, 0, 0, 255];
  const main = {
    strokes: [
      { color: [...sourceColor], d: "M 0 0 L 1 1" },
      { color: [1, 2, 3, 255], d: "M 1 1 L 2 2" },
    ],
  };
  assert.equal(normalizeOutlinePalette(main, sourceColor, destinationColor), 1);
  assert.deepEqual(main.strokes.map(({ color }) => color), [
    destinationColor,
    [1, 2, 3, 255],
  ]);

  assert.equal(normalizeOutlinePalette(
    { strokes: [{ color: [1, 2, 3, 255] }] },
    sourceColor,
    destinationColor,
  ), 0, "an art-layer variant may legitimately contain no outline color");

  assert.equal(normalizeOutlinePalette(
    { strokes: [{ color: [1, 2, 3, 255] }] },
    sourceColor,
    destinationColor,
  ), 0, "mixed-palette source drawings may legitimately need no replacement");
  assert.doesNotThrow(() => validateOutlinePaletteApplication(sourceColor, 1));
  assert.throws(
    () => validateOutlinePaletteApplication(sourceColor, 0),
    /not found in any compiled artwork/,
  );
});
