import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { include as includeInKit } from "../build-kit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function sha256(filePath) {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

test("Sisters Room registry locks the flattened source provenance, exact bytes, and dimensions", async () => {
  const assets = JSON.parse(await fs.readFile(path.join(root, "assets.json"), "utf8"));
  const background = assets.backgrounds.find(({ id }) => id === "sisters-room");

  assert.deepEqual(background, {
    id: "sisters-room",
    path: "assets/backgrounds/sisters-room.png",
    mediaType: "image/png",
    width: 3840,
    height: 2160,
    hasAlpha: false,
    sha256: "740f61cbd58581b3c944fc77038fd51756305083b22ae3e28df0f1f5190ec485",
    usage: "fixed Sisters Room environment for the Shaz blind-animation experiment; no camera motion",
    provenance: {
      sourceFilename: "BG (8) Sisters room.psd",
      sourceMediaType: "image/vnd.adobe.photoshop",
      sourceWidth: 3840,
      sourceHeight: 2160,
      sourceSha256: "5ad1d74940954256925905428fb945bd07ecf4a22d104ff42c55696caa6c5566",
      operation: "flatten visible PSD composite to lossless RGB PNG",
      tool: "macOS sips",
      deterministicExportVerified: true,
    },
  });

  const assetPath = path.join(root, background.path);
  assert.equal(await sha256(assetPath), background.sha256);
  const metadata = await sharp(assetPath).metadata();
  assert.deepEqual(
    {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      depth: metadata.depth,
      hasAlpha: metadata.hasAlpha,
    },
    {
      format: "png",
      width: 3840,
      height: 2160,
      channels: 3,
      depth: "uchar",
      hasAlpha: false,
    },
  );
});

test("kit packaging includes only the registered Sisters Room background", () => {
  const registered = path.join(root, "assets", "backgrounds", "sisters-room.png");
  const unregistered = path.join(root, "assets", "backgrounds", "unregistered.png");

  assert.equal(includeInKit(registered), true);
  assert.equal(includeInKit(unregistered), false);
});
