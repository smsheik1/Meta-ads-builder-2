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

const expectedBackgrounds = [
  {
    id: "sisters-room",
    label: "Sisters Room",
    path: "assets/backgrounds/sisters-room.png",
    mediaType: "image/png",
    width: 3840,
    height: 2160,
    hasAlpha: false,
    sha256: "740f61cbd58581b3c944fc77038fd51756305083b22ae3e28df0f1f5190ec485",
    usage: "main/default environment for Shaz dialogue and body-language video; fixed camera only",
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
  },
  {
    id: "living-room",
    label: "Living Room",
    path: "assets/backgrounds/living-room.png",
    mediaType: "image/png",
    width: 3840,
    height: 2160,
    hasAlpha: false,
    sha256: "f5b6f3c78351028a1fd1d6b067337f2a99ed456647b5ce7608426f42088ece3e",
    usage: "warm home environment for dialogue and body-language video; fixed camera only",
    provenance: {
      sourceFilename: "BG (4) living room.psd",
      sourceMediaType: "image/vnd.adobe.photoshop",
      sourceWidth: 3840,
      sourceHeight: 2160,
      sourceSha256: "1da1c55eeccea94b49b14634b8167d2aeeee9be5618fff94d166d95595e3bd3d",
      operation: "decode the embedded Photoshop composite, flatten its boundary alpha onto white, and encode a lossless RGB PNG",
      tool: "psd-tools embedded composite + Sharp 0.35.3",
      deterministicExportVerified: true,
    },
  },
  {
    id: "map-photo-zone",
    label: "Photo Zone",
    path: "assets/backgrounds/map-photo-zone.png",
    mediaType: "image/png",
    width: 3840,
    height: 2160,
    hasAlpha: false,
    sha256: "2c5d6b6520b2bab37b74a3b46a32c01d266ca520e2fca5425192312c569cb937",
    usage: "clean purple room with the original map artwork removed; the cleared area is reserved for future supporting media but is a fixed background in this release",
    supportingMediaZone: {
      status: "reserved-not-active",
      sourceLayer: "Layer 4",
      sourceLayerBounds: { x: 463, y: 278, width: 1551, height: 1671 },
      changedPixelBounds: { x: 465, y: 278, width: 1546, height: 1669 },
      runtimeBehavior: "no overlay, crop, replacement, or supporting-media input is implemented",
    },
    provenance: {
      sourceFilename: "BG (22) map.psd",
      sourceMediaType: "image/vnd.adobe.photoshop",
      sourceWidth: 3840,
      sourceHeight: 2160,
      sourceSha256: "2666ddcf35837d74dc3e80803e138331a0f61f0ea46f78a42c535037a58eeb19",
      operation: "hide only the visible Layer 4 map artwork, preserve all other source visibility, and encode the resulting composite as a lossless RGB PNG",
      tool: "psd-tools layer visibility + Sharp 0.35.3",
      deterministicExportVerified: true,
    },
  },
  {
    id: "pure-white",
    label: "Pure White",
    path: "assets/backgrounds/pure-white.png",
    mediaType: "image/png",
    width: 3840,
    height: 2160,
    hasAlpha: false,
    sha256: "f91cf55509a036596da76a95f07a4034459ff0c6b23aac48b4ff6c2661edb807",
    usage: "neutral pure-white environment for minimal scenes and downstream compositing; fixed camera only",
    provenance: {
      sourceKind: "generated-color",
      color: "#FFFFFF",
      operation: "generate an opaque 3840x2160 RGB PNG filled with pure white",
      tool: "Sharp 0.35.3",
      deterministicExportVerified: true,
    },
  },
];

test("background registry locks four exact, opaque 16:9 assets and the main default", async () => {
  const assets = JSON.parse(await fs.readFile(path.join(root, "assets.json"), "utf8"));
  assert.equal(assets.defaultBackgroundId, "sisters-room");
  assert.deepEqual(assets.backgrounds, expectedBackgrounds);

  for (const background of assets.backgrounds) {
    const assetPath = path.join(root, background.path);
    assert.equal(await sha256(assetPath), background.sha256, background.id);
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
      background.id,
    );
  }
});

test("kit packaging allowlists all four registered backgrounds and nothing else", () => {
  for (const background of expectedBackgrounds) {
    assert.equal(includeInKit(path.join(root, background.path)), true, background.id);
  }
  assert.equal(
    includeInKit(path.join(root, "assets", "backgrounds", "unregistered.png")),
    false,
  );
});
