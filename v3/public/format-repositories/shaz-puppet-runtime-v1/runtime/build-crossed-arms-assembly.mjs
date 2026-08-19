#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sharp from "sharp";

import { generatedRecipe } from "./pose-authoring.mjs";
import { createPoseRuntime } from "./pose-recipe.mjs";
import { loadManifest, renderRigFrame } from "./rig-v2-renderer.mjs";

const PARTS = [
  {
    id: "crossed-right-sleeve",
    asset: "crossed-right-sleeve.png",
    sha256: "6825bd9502845dfee7f44700488d25469fd15a3fddafc8aa5c007ae8ef3d29ba",
    position: [0.46, 0.64], width: 0.094, scale: [0.64, 1.26], rotation: 86,
  },
  {
    id: "crossed-right-hand",
    asset: "crossed-right-hand.png",
    sha256: "1ca56cff2c194949889c10e6b5f1d07e9d64ca4837a76db086966f79baaa429d",
    position: [0.405, 0.59], width: 0.05, scale: [1, 1], rotation: 0,
  },
  {
    id: "crossed-left-sleeve",
    asset: "crossed-left-sleeve.png",
    sha256: "66d4c48a8656d36fa99ac68cd59272f25f249d170d9c8ef2f6f8279ffa38ddef",
    position: [0.46, 0.65], width: 0.094, scale: [0.64, 1.28], rotation: -94,
  },
  {
    id: "crossed-left-hand",
    asset: "crossed-left-hand.png",
    sha256: "e393634f96b9d607f96af9ce01c288d5e3bf8a43ca3cd05e5d67cebe89cab5c2",
    position: [0.525, 0.59], width: 0.05, scale: [1, 1], rotation: 0,
  },
];

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

async function main() {
  const [manifestPath, assetRoot, propRoot, outputPath, receiptPath] = process.argv.slice(2);
  if (!manifestPath || !assetRoot || !propRoot || !outputPath || !receiptPath) {
    throw new Error("usage: build-crossed-arms-assembly.mjs runtime.json rig-assets prop-assets output.png receipt.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  const recipe = {
    ...generatedRecipe(manifest, {
      id: "crossed-arms-assembly-source",
      durationFrames: 1,
      learnedFrom: [
        "registered rig sleeve and hand cutouts composed once into a fixed crossover-depth assembly",
      ],
      controls: {},
      drawings: {},
      quality: { maximumIdenticalFrames: 1 },
    }),
    props: PARTS.map(({ id, asset, sha256: checksum, ...key }) => ({
      id,
      asset,
      sha256: checksum,
      layer: "front",
      keys: [{ frame: 1, ...key, opacity: 100 }],
    })),
  };
  const rendered = await renderRigFrame({
    manifest,
    frame: 1,
    assetRoot: path.resolve(assetRoot),
    propRoot: path.resolve(propRoot),
    poseRuntime: createPoseRuntime(manifest, recipe),
    includeLayerBuffers: true,
  });
  const output = await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(rendered.analysisProps.map(({ input }) => ({ input }))).png().toBuffer();
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(path.resolve(outputPath), output);
  await fs.writeFile(path.resolve(receiptPath), `${JSON.stringify({
    schemaVersion: "shaz-derived-prop-receipt-v1",
    id: "crossed-arms-assembly",
    sourceXstageSha256: manifest.source.sha256,
    artistRenderedFramesUsed: false,
    sourceParts: PARTS.map(({ id, asset, sha256: checksum }) => ({ id, asset, sha256: checksum })),
    outputSha256: sha256(output),
  }, null, 2)}\n`);
  process.stdout.write(`${path.resolve(outputPath)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
