import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

import {
  auditCompatibleTopology,
  buildCompatibleImport,
  parseExtractArgs,
  validateCompatibleProvenance,
  verifyCompatibleSourceArchive,
  verifyCompiledAssetRoot,
  recoverCompatibleImportPair,
  writeCompatibleImportPair,
} from "../runtime/extract-pose-recipe.mjs";

const sourceHash = "1".repeat(64);
const targetHash = "2".repeat(64);
const archiveHash = "3".repeat(64);
const sourcePrefix = "Top/Compatible/";
const paintOrder = ["Alpha", "Beta", "Gamma"].map((name) => `Top/Shaz_Rig/${name}`);
const stage = {
  resolution: { size: [1920, 1080] },
  pixelPerModelUnitForVectorLayers: 1,
  metrics: {
    unitAspectRatioX: 1,
    unitAspectRatioY: 1,
    numberOfUnitsX: 10,
    numberOfUnitsY: 10,
  },
};

function value(entry) {
  return { attributes: { val: String(entry) } };
}

function pegAttrs(positionColumn = null) {
  return {
    children: {
      position: [{
        children: positionColumn
          ? { attr3dpath: [{ attributes: { col: positionColumn } }] }
          : { x: [value(0)], y: [value(0)], z: [value(0)] },
      }],
      angle: [value(0)],
      scale: [{ children: { x: [value(1)], y: [value(1)] } }],
      skew: [value(0)],
      opacity: [value(100)],
    },
  };
}

function readAttrs(column) {
  return {
    children: {
      offset: [{ children: { x: [value(0)], y: [value(0)], z: [value(0)] } }],
      angle: [value(0)],
      scale: [{ children: { x: [value(1)], y: [value(1)] } }],
      skew: [value(0)],
      opacity: [value(100)],
      drawing: [{ children: { element: [{ attributes: { col: column } }] } }],
    },
  };
}

function node(pathname, name, type, attrs) {
  return { path: pathname, name, type, attrs, options: { children: {} } };
}

function drawingColumn(name, elementId, drawing) {
  return {
    name,
    type: 0,
    elementId,
    exposures: [{ drawing, frames: [1] }],
    heldFrames: [2, 3],
  };
}

function manifests() {
  const sourceElements = [
    { id: 1, name: "Alpha", drawings: ["1"], rootFolder: "elements", folder: "Alpha" },
    { id: 2, name: "Beta", drawings: ["2"], rootFolder: "elements", folder: "Beta" },
    { id: 3, name: "Gamma", drawings: ["3"], rootFolder: "elements", folder: "Gamma" },
  ];
  const targetElements = [
    { id: 11, name: "Alpha", drawings: ["1"], rootFolder: "elements", folder: "Alpha" },
    { id: 12, name: "Beta", drawings: ["1"], rootFolder: "elements", folder: "Beta" },
    { id: 13, name: "Gamma", drawings: ["3"], rootFolder: "elements", folder: "Gamma" },
  ];
  const sourceNodes = [
    node(`${sourcePrefix}Mover-P`, "Mover-P", "PEG", pegAttrs("MOVE")),
    ...["Alpha", "Beta", "Gamma"].map((name, index) => (
      node(`${sourcePrefix}${name}`, name, "READ", readAttrs(`S_${name}`))
    )),
    node(`${sourcePrefix}Master-P`, "Master-P", "PEG", pegAttrs()),
    node(`${sourcePrefix}Shot-P`, "Shot-P", "PEG", pegAttrs()),
    node(`${sourcePrefix}Deform/Curve`, "Curve", "CurveModule", {
      children: { length: [{ attributes: { col: "DEF" } }] },
    }),
  ];
  const targetNodes = [
    node("Top/Shaz_Rig/Mover-P", "Mover-P", "PEG", pegAttrs()),
    ...["Alpha", "Beta", "Gamma"].map((name) => (
      node(`Top/Shaz_Rig/${name}`, name, "READ", readAttrs(`T_${name}`))
    )),
    node("Top/Master-P", "Master-P", "PEG", pegAttrs()),
    node("Top/Shot-P", "Shot-P", "PEG", pegAttrs()),
    node("Top/TargetCard", "TargetCard", "PEG", pegAttrs()),
    node("Top/Shaz_Rig/Deform/Curve", "Curve", "CurveModule", {
      children: { length: [value(1)] },
    }),
  ];
  const source = {
    source: { file: "compatible.xstage", sha256: sourceHash },
    stage,
    elements: sourceElements,
    scenes: [{
      startFrame: 1,
      stopFrame: 3,
      groups: [],
      links: [],
      nodes: sourceNodes,
      columns: [
        drawingColumn("S_Alpha", 1, "1"),
        drawingColumn("S_Beta", 2, "2"),
        drawingColumn("S_Gamma", 3, "3"),
        {
          name: "MOVE",
          type: 2,
          path3d: {
            points: [
              { frame: 1, value: [0, 0, 0] },
              { frame: 3, value: [2, 0, 0] },
            ],
            velocity: { points: [{ frames: [1], constantSegment: true }] },
          },
        },
        {
          name: "DEF",
          type: 3,
          points: [
            { frames: [1], value: 1, constantSegment: true },
            { frames: [3], value: 2 },
          ],
        },
      ],
    }],
  };
  const target = {
    source: { file: "target.xstage", sha256: targetHash },
    stage,
    elements: targetElements,
    scenes: [{
      startFrame: 1,
      stopFrame: 3,
      groups: [],
      links: [],
      nodes: targetNodes,
      columns: [
        drawingColumn("T_Alpha", 11, "1"),
        drawingColumn("T_Beta", 12, "1"),
        drawingColumn("T_Gamma", 13, "3"),
      ],
    }],
  };
  return { source, target };
}

function assetRecord(variant, outputSha256, paletteNormalization = null) {
  return {
    variant,
    filename: `${variant}-${outputSha256.slice(0, 4)}.png`,
    outputSha256,
    sourceSha256: "9".repeat(64),
    canvas: { width: 100, height: 80 },
    modelOrigin: { x: -10, y: -20 },
    ...(paletteNormalization ? { paletteNormalization } : {}),
  };
}

function compiledAssets(entries, schemaVersion = "shaz-tvg-asset-receipt-v2") {
  const groups = new Map(entries.map(([key, records]) => [
    key,
    new Map(records.map((record) => [record.variant, record])),
  ]));
  return {
    receipt: { schemaVersion },
    groups,
    records: [...groups.values()].flatMap((records) => [...records.values()]),
  };
}

function assets() {
  const normalized = {
    schemaVersion: "shaz-outline-palette-normalization-v1",
    sourceColor: [77, 17, 3, 255],
    destinationColor: [0, 0, 0, 255],
    replacementCount: 2,
  };
  return {
    sourceAssets: compiledAssets([
      ["Alpha:1", [assetRecord("main", "a".repeat(64), normalized)]],
      ["Beta:2", [assetRecord("main", "b".repeat(64))]],
      ["Gamma:3", [
        assetRecord("main", "c".repeat(64)),
        assetRecord("color", "d".repeat(64)),
      ]],
    ]),
    targetAssets: compiledAssets([
      ["Alpha:1", [assetRecord("main", "a".repeat(64), normalized)]],
      ["Beta:1", [assetRecord("main", "e".repeat(64))]],
      ["Gamma:3", [assetRecord("main", "c".repeat(64))]],
    ], "shaz-tvg-asset-receipt-v3"),
  };
}

function compatibleArgs(overrides = {}) {
  return {
    compatibleSource: true,
    id: "compatible-action",
    start: 1,
    end: 3,
    baseFrame: 1,
    nodePrefix: sourcePrefix,
    sourceArchiveSha256: archiveHash,
    sourceArchiveName: "source.zip",
    sourceArchive: "/tmp/source.zip",
    sourceXstagePath: "source/compatible.xstage",
    omitNodes: ["Shot-P"],
    targetBaseNodes: ["Shot-P", "TargetCard"],
    outerMasterMappings: [{ sourceName: "Master-P", targetName: "Master-P" }],
    ...overrides,
  };
}

function archiveProof(args, sourceAssets) {
  return {
    archivePath: args.sourceArchive,
    archiveName: args.sourceArchiveName,
    archiveSha256: args.sourceArchiveSha256,
    xstagePath: args.sourceXstagePath,
    xstageSha256: sourceHash,
    entryCount: sourceAssets.records.length + 1,
    verifiedTvgEntries: sourceAssets.records.map((record) => ({
      assetFilename: record.filename,
      archivePath: `source/${record.filename}.tvg`,
      sourceSha256: record.sourceSha256,
    })),
  };
}

test("compatible importer creates a portable exact-frame recipe and complete audit", () => {
  const { source, target } = manifests();
  const { sourceAssets, targetAssets } = assets();
  const { recipe, audit } = buildCompatibleImport({
    args: compatibleArgs(),
    sourceManifest: source,
    targetManifest: target,
    sourceAssets,
    targetAssets,
    archiveProof: archiveProof(compatibleArgs(), sourceAssets),
    paintOrder,
    startFrame: 1,
    endFrame: 3,
    baseFrame: 1,
  });

  assert.equal(recipe.sourceXstageSha256, targetHash);
  assert.deepEqual(recipe.deformationFrames, [1, 2, 3]);
  assert.deepEqual(
    recipe.controls["Mover-P"].map(({ position, interpolation }) => ({ position, interpolation })),
    [
      { position: [0, 0, 0], interpolation: "hold" },
      { position: [0, 0, 0], interpolation: "hold" },
      { position: [2, 0, 0], interpolation: "hold" },
    ],
    "a constant Harmony path segment must remain held rather than sliding",
  );
  const deformation = recipe.deformationSamples["Top/Shaz_Rig/Deform/Curve"];
  assert.equal(deformation.samples.length, 2);
  assert.deepEqual(deformation.frameSamples, [0, 0, 1]);
  assert.deepEqual(recipe.drawingSources, {
    Beta: { 2: sourceHash },
    Gamma: { 3: sourceHash },
  });
  assert.deepEqual(audit.drawings.counts, {
    "canonical-identical": 1,
    "absent-from-canonical": 1,
    "same-id-different-artwork": 1,
  });
  assert.deepEqual(audit.drawings.sourceBoundDrawingMap, recipe.drawingSources);
  assert.equal(
    audit.paletteNormalization.comparisonBasis,
    "compiler-normalized-output-sha256-canvas-and-model-origin-by-complete-variant-set",
  );
  assert.equal(audit.source.verifiedTvgAssetRecordCount, sourceAssets.records.length);
  assert.equal(audit.source.verifiedTvgArchiveMemberCount, sourceAssets.records.length);
  assert.equal(recipe.sourceAction.sourceArchiveSha256, archiveHash);
  assert.deepEqual(recipe.sourceAction.extractionBoundary, {
    type: "node-path-prefix",
    nodePrefix: sourcePrefix,
    omittedSourceNodes: [`${sourcePrefix}Shot-P`],
  });
  assert.deepEqual(recipe.stagingNormalization.outerMasterMappings, [{
    sourceNode: `${sourcePrefix}Master-P`,
    targetNode: "Top/Master-P",
  }]);
  assert.equal(recipe.stagingNormalization.preservedInternalChoreography, true);
  assert.equal(audit.topology.rendererBasis.equal, true);
  assert.equal(audit.topology.parentGraph.length, audit.topology.mappings.length);
});

test("compatible topology audit fails closed on every undeclared mismatch", () => {
  const base = manifests();
  const run = (source, target, overrides = {}) => auditCompatibleTopology({
    sourceManifest: source,
    targetManifest: target,
    nodePrefix: sourcePrefix,
    omitNodes: ["Shot-P"],
    targetBaseNodes: ["Shot-P", "TargetCard"],
    outerMasterMappings: [{ sourceName: "Master-P", targetName: "Master-P" }],
    paintOrder,
    startFrame: 1,
    endFrame: 3,
    baseFrame: 1,
    ...overrides,
  });

  const duplicate = structuredClone(base.source);
  duplicate.scenes[0].nodes.find(({ name }) => name === "Beta").name = "Alpha";
  assert.throws(() => run(duplicate, base.target), /not unique/);

  const wrongType = structuredClone(base.source);
  wrongType.scenes[0].nodes.find(({ name }) => name === "Mover-P").type = "READ";
  assert.throws(() => run(wrongType, base.target), /type mismatch/);

  assert.throws(
    () => run(base.source, base.target, { targetBaseNodes: ["Shot-P"] }),
    /target-only nodes require --target-base-node/,
  );
  assert.throws(
    () => run(base.source, base.target, {
      omitNodes: ["Shot-P", "Alpha"],
      targetBaseNodes: ["Shot-P", "TargetCard", "Alpha"],
    }),
    /direct Top --target-base-node/,
  );

  const missingDeformation = structuredClone(base.source);
  missingDeformation.scenes[0].nodes = missingDeformation.scenes[0].nodes.filter((entry) => (
    entry.type !== "CurveModule"
  ));
  assert.throws(() => run(missingDeformation, base.target), /deformation path must exist exactly once/);

  assert.throws(
    () => run(base.source, base.target, { outerMasterMappings: [] }),
    /unmapped compatible source nodes/,
  );
  assert.throws(
    () => run(base.source, base.target, { omitNodes: ["Missing"] }),
    /does not exist/,
  );

  const linkedSource = structuredClone(base.source);
  linkedSource.scenes[0].links = [{
    from: `${sourcePrefix}Mover-P`,
    to: `${sourcePrefix}Alpha`,
  }];
  assert.throws(() => run(linkedSource, base.target), /mapped parent graph mismatch/);

  const linkedTarget = structuredClone(base.target);
  linkedTarget.scenes[0].links = [{
    from: "Top/Shaz_Rig/Mover-P",
    to: "Top/Shaz_Rig/Alpha",
  }];
  assert.throws(() => run(base.source, linkedTarget), /mapped parent graph mismatch/);

  const pivotMismatch = structuredClone(base.source);
  pivotMismatch.scenes[0].nodes.find(({ name }) => name === "Alpha")
    .attrs.children.pivot = [{ children: { x: [value(1)], y: [value(0)] } }];
  assert.throws(() => run(pivotMismatch, base.target), /renderer pivot mismatch/);

  const stageMismatch = structuredClone(base.target);
  stageMismatch.stage.pixelPerModelUnitForVectorLayers = 2;
  assert.throws(() => run(base.source, stageMismatch), /field grids do not match/);

  assert.throws(
    () => run(base.source, base.target, {
      omitNodes: ["Mover-P", "Shot-P"],
      targetBaseNodes: ["Mover-P", "Shot-P", "TargetCard"],
    }),
    /direct Top --target-base-node/,
  );
  const animatedOmission = structuredClone(base.source);
  animatedOmission.scenes[0].nodes.find(({ name }) => name === "Shot-P").attrs = pegAttrs("MOVE");
  assert.throws(() => run(animatedOmission, base.target), /control is animated/);
});

test("canonical artwork reuse requires identical renderer spatial registration", () => {
  const { source, target } = manifests();
  const { sourceAssets, targetAssets } = assets();
  targetAssets.groups.get("Alpha:1").get("main").modelOrigin.x += 1;
  const { recipe, audit } = buildCompatibleImport({
    args: compatibleArgs(),
    sourceManifest: source,
    targetManifest: target,
    sourceAssets,
    targetAssets,
    archiveProof: archiveProof(compatibleArgs(), sourceAssets),
    paintOrder,
  });
  assert.equal(recipe.drawingSources.Alpha[1], sourceHash);
  const alpha = audit.drawings.pairs.find(({ targetReadName }) => targetReadName === "Alpha");
  assert.equal(alpha.classification, "same-id-different-artwork");
  assert.deepEqual(alpha.sourceVariants[0].modelOrigin, { x: -10, y: -20 });
  assert.deepEqual(alpha.targetVariants[0].modelOrigin, { x: -9, y: -20 });
});

test("compatible drawing audit rejects uncompiled used artwork", () => {
  const { source, target } = manifests();
  const { sourceAssets, targetAssets } = assets();
  sourceAssets.groups.delete("Beta:2");
  assert.throws(() => buildCompatibleImport({
    args: compatibleArgs(),
    sourceManifest: source,
    targetManifest: target,
    sourceAssets,
    targetAssets,
    archiveProof: archiveProof(compatibleArgs(), sourceAssets),
    paintOrder,
  }), /used source artwork was not compiled/);
});

test("compatible provenance rejects unsafe paths, basenames, hashes, and identical rigs", () => {
  const { source, target } = manifests();
  assert.throws(
    () => validateCompatibleProvenance(compatibleArgs({ sourceXstagePath: "../compatible.xstage" }), source, target),
    /safe archive-relative path/,
  );
  assert.throws(
    () => validateCompatibleProvenance(compatibleArgs({ sourceArchiveName: "folder/source.zip" }), source, target),
    /safe .zip basename/,
  );
  assert.throws(
    () => validateCompatibleProvenance(compatibleArgs({ sourceArchive: "/tmp/other.zip" }), source, target),
    /exactly match the --source-archive basename/,
  );
  assert.throws(
    () => validateCompatibleProvenance(compatibleArgs({ sourceArchiveSha256: "nope" }), source, target),
    /lowercase SHA-256/,
  );
  assert.throws(
    () => validateCompatibleProvenance(compatibleArgs(), source, { ...target, source: source.source }),
    /distinct source and target/,
  );
});

test("compatible CLI arguments require explicit complete mode and separate outputs", () => {
  const common = [
    "--manifest", "source.json",
    "--target-manifest", "target.json",
    "--compatible-assets", "source-assets",
    "--target-assets", "target-assets",
    "--id", "action",
    "--start", "1",
    "--end", "3",
    "--base-frame", "1",
    "--node-prefix", sourcePrefix,
    "--source-archive-sha256", archiveHash,
    "--source-archive-name", "source.zip",
    "--source-archive", "/tmp/source.zip",
    "--source-xstage-path", "source/compatible.xstage",
    "--audit-output", "audit.json",
    "--output", "recipe.json",
  ];
  assert.throws(() => parseExtractArgs(common), /explicit --compatible-source mode/);
  const parsed = parseExtractArgs([
    "--compatible-source",
    ...common,
    "--omit-node", "Shot-P",
    "--omit-node", "Other-P",
    "--target-base-node", "TargetCard",
    "--outer-master-map", "Master-P=Master-P",
  ]);
  assert.deepEqual(parsed.omitNodes, ["Shot-P", "Other-P"]);
  assert.deepEqual(parsed.targetBaseNodes, ["TargetCard"]);
  assert.deepEqual(parsed.outerMasterMappings, [{ sourceName: "Master-P", targetName: "Master-P" }]);
  assert.throws(
    () => parseExtractArgs(["--compatible-source", ...common.slice(0, -2), "--output", "audit.json"]),
    /separate from --output/,
  );
});

test("compiled asset verification catches tampered files and receipt provenance", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-assets-"));
  const manifest = {
    source: { sha256: "a".repeat(64) },
    elements: [{
      id: 7,
      name: "Body",
      drawings: ["1"],
      rootFolder: "elements",
      folder: "Body",
    }],
  };
  const filename = "body-01.png";
  const bytes = Buffer.from("verified-asset");
  const outputSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const receipt = {
    schemaVersion: "shaz-tvg-asset-receipt-v2",
    sourceXstageSha256: manifest.source.sha256,
    sourceArchiveBundled: false,
    artistRenderedFramesUsed: false,
    rasterMarginModelUnits: 50,
    assets: [{
      filename,
      variant: "main",
      elementId: 7,
      element: "Body",
      drawing: "1",
      source: "elements/Body/Body-1.tvg",
      sourceSha256: "b".repeat(64),
      outputSha256,
      canvas: { width: 1, height: 1 },
      modelOrigin: { x: 0, y: 0 },
      drawingBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    }],
  };
  try {
    await fs.writeFile(path.join(scratch, filename), bytes);
    await fs.writeFile(path.join(scratch, "receipt.json"), `${JSON.stringify(receipt)}\n`);
    const verified = await verifyCompiledAssetRoot(scratch, manifest);
    assert.equal(verified.groups.get("Body:1").get("main").outputSha256, outputSha256);

    await fs.writeFile(path.join(scratch, filename), "tampered");
    await assert.rejects(
      () => verifyCompiledAssetRoot(scratch, manifest),
      /checksum mismatch/,
    );

    await fs.writeFile(path.join(scratch, filename), bytes);
    await assert.rejects(
      () => verifyCompiledAssetRoot(scratch, {
        ...manifest,
        source: { sha256: "c".repeat(64) },
      }),
      /different Xstage source/,
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("source archive proof binds the manifest and every compiled TVG to exact ZIP members", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-archive-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const tree = path.join(scratch, "tree");
  const xstagePath = path.join(tree, "source", "compatible.xstage");
  const tvgPath = path.join(tree, "source", "elements", "Body", "Body-1.tvg");
  await Promise.all([
    fs.mkdir(path.dirname(xstagePath), { recursive: true }),
    fs.mkdir(path.dirname(tvgPath), { recursive: true }),
  ]);
  const xstageBytes = Buffer.from("verified compatible xstage");
  const tvgBytes = Buffer.from("verified compatible tvg");
  await Promise.all([
    fs.writeFile(xstagePath, xstageBytes),
    fs.writeFile(tvgPath, tvgBytes),
  ]);
  const archive = path.join(scratch, "source.zip");
  execFileSync("zip", ["-q", "-r", archive, "source"], { cwd: tree });
  const archiveBytes = await fs.readFile(archive);
  const args = compatibleArgs({
    sourceArchive: archive,
    sourceArchiveName: "source.zip",
    sourceArchiveSha256: crypto.createHash("sha256").update(archiveBytes).digest("hex"),
  });
  const manifest = {
    source: {
      file: "compatible.xstage",
      sha256: crypto.createHash("sha256").update(xstageBytes).digest("hex"),
    },
  };
  const sourceAssets = {
    records: [{
      filename: "body-01.png",
      source: "elements/Body/Body-1.tvg",
      sourceSha256: crypto.createHash("sha256").update(tvgBytes).digest("hex"),
    }],
  };

  const proof = await verifyCompatibleSourceArchive(args, manifest, sourceAssets);
  assert.equal(proof.xstageSha256, manifest.source.sha256);
  assert.equal(proof.entryCount, 5);
  assert.equal(proof.verifiedTvgEntries[0].archivePath, "source/elements/Body/Body-1.tvg");
  await assert.rejects(
    () => verifyCompatibleSourceArchive({
      ...args,
      sourceArchiveSha256: "0".repeat(64),
    }, manifest, sourceAssets),
    /does not match --source-archive bytes/,
  );
  await assert.rejects(
    () => verifyCompatibleSourceArchive(args, {
      source: { ...manifest.source, sha256: "0".repeat(64) },
    }, sourceAssets),
    /archived Xstage checksum/,
  );
  await assert.rejects(
    () => verifyCompatibleSourceArchive(args, manifest, {
      records: [{ ...sourceAssets.records[0], sourceSha256: "0".repeat(64) }],
    }),
    /archived TVG checksum mismatch/,
  );
});

test("source archive streaming keeps Info-ZIP member arguments exact and option-safe", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-infozip-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const tree = path.join(scratch, "tree");
  await fs.mkdir(tree);
  const xstageName = "-compatible[a].xstage";
  const tvgName = "-Body[1].tvg";
  const xstageBytes = Buffer.from("literal bracketed compatible xstage");
  const tvgBytes = Buffer.from("literal bracketed compatible tvg");
  await Promise.all([
    fs.writeFile(path.join(tree, xstageName), xstageBytes),
    fs.writeFile(path.join(tree, tvgName), tvgBytes),
    fs.writeFile(path.join(tree, "-compatiblea.xstage"), "pattern decoy xstage"),
    fs.writeFile(path.join(tree, "-Body1.tvg"), "pattern decoy tvg"),
  ]);
  const archive = path.join(scratch, "source.zip");
  execFileSync("zip", [
    "-q",
    archive,
    "--",
    xstageName,
    tvgName,
    "-compatiblea.xstage",
    "-Body1.tvg",
  ], { cwd: tree });
  const archiveBytes = await fs.readFile(archive);
  const args = compatibleArgs({
    sourceArchive: archive,
    sourceArchiveName: "source.zip",
    sourceArchiveSha256: crypto.createHash("sha256").update(archiveBytes).digest("hex"),
    sourceXstagePath: xstageName,
  });
  const manifest = {
    source: {
      file: xstageName,
      sha256: crypto.createHash("sha256").update(xstageBytes).digest("hex"),
    },
  };
  const sourceAssets = {
    records: [{
      filename: "body-01.png",
      source: tvgName,
      sourceSha256: crypto.createHash("sha256").update(tvgBytes).digest("hex"),
    }],
  };
  const streamingFileSystem = {
    lstat: (...values) => fs.lstat(...values),
    open: (...values) => fs.open(...values),
    readFile: () => {
      throw new Error("source archive must not be buffered with readFile");
    },
  };

  const proof = await verifyCompatibleSourceArchive(
    args,
    manifest,
    sourceAssets,
    streamingFileSystem,
  );
  assert.equal(proof.entryCount, 4);
  assert.equal(proof.xstagePath, xstageName);
  assert.equal(proof.verifiedTvgEntries[0].archivePath, tvgName);
});

test("paired recipe and audit output rolls back a failed commit immediately", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-output-pair-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const output = path.join(scratch, "candidate.json");
  const auditOutput = path.join(scratch, "candidate-audit.json");
  await Promise.all([
    fs.writeFile(output, "old recipe\n"),
    fs.writeFile(auditOutput, "old audit\n"),
  ]);
  let failRecipeInstall = true;
  const failingFileSystem = new Proxy(fs, {
    get(target, property) {
      if (property !== "rename") return target[property];
      return async (source, destination) => {
        if (destination === output && failRecipeInstall) {
          failRecipeInstall = false;
          throw new Error("forced recipe install failure");
        }
        return target.rename(source, destination);
      };
    },
  });

  await assert.rejects(
    () => writeCompatibleImportPair({
      output,
      auditOutput,
      recipeBytes: "new recipe\n",
      auditBytes: "new audit\n",
      fileSystem: failingFileSystem,
    }),
    /forced recipe install failure/,
  );
  assert.equal(await fs.readFile(output, "utf8"), "old recipe\n");
  assert.equal(await fs.readFile(auditOutput, "utf8"), "old audit\n");
  assert.equal((await recoverCompatibleImportPair({ output, auditOutput })).kind, "none");

  await writeCompatibleImportPair({
    output,
    auditOutput,
    recipeBytes: "new recipe\n",
    auditBytes: "new audit\n",
  });
  assert.equal(await fs.readFile(output, "utf8"), "new recipe\n");
  assert.equal(await fs.readFile(auditOutput, "utf8"), "new audit\n");
  assert.equal((await recoverCompatibleImportPair({ output, auditOutput })).kind, "none");
});

test("paired recipe and audit output recovers when failure also interrupts rollback", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-compatible-output-recovery-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const output = path.join(scratch, "candidate.json");
  const auditOutput = path.join(scratch, "candidate-audit.json");
  await Promise.all([
    fs.writeFile(output, "old recipe\n"),
    fs.writeFile(auditOutput, "old audit\n"),
  ]);
  let remainingRecipeFailures = 2;
  const interruptedFileSystem = new Proxy(fs, {
    get(target, property) {
      if (property !== "rename") return target[property];
      return async (source, destination) => {
        if (destination === output && remainingRecipeFailures > 0) {
          remainingRecipeFailures -= 1;
          throw new Error("forced recipe path interruption");
        }
        return target.rename(source, destination);
      };
    },
  });

  await assert.rejects(
    () => writeCompatibleImportPair({
      output,
      auditOutput,
      recipeBytes: "new recipe\n",
      auditBytes: "new audit\n",
      fileSystem: interruptedFileSystem,
    }),
    /rollback was incomplete/,
  );
  assert.equal(await fs.readFile(output, "utf8"), "old recipe\n");
  assert.equal(await fs.readFile(auditOutput, "utf8"), "new audit\n");

  const recovery = await recoverCompatibleImportPair({ output, auditOutput });
  assert.equal(recovery.kind, "rolled-back");
  assert.equal(await fs.readFile(output, "utf8"), "old recipe\n");
  assert.equal(await fs.readFile(auditOutput, "utf8"), "old audit\n");
});
