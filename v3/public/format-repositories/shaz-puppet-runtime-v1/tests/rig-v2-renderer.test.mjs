import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  applyToPoint,
  localMatrix,
} from "../runtime/vendor/scene_transforms.mjs";

import {
  READ_PAINT_ORDER,
  READ_PAINT_PLAN,
  assetFilename,
  clipArtworkBehindMasks,
  clipHandBehindSleeve,
  clipToRearHairShadow,
  createFinishedSleeve,
  createRoundEyeEnvelope,
  expandFlatShade,
  extractHeadBaseForeheadShade,
  fillEnclosedOutline,
  fieldGridForManifest,
  hideUpperBackBangPatch,
  loadAssetRegistration,
  propStageMatrix,
  tightStageMatrix,
} from "../runtime/rig-v2-renderer.mjs";

test("multi-source asset receipts keep every compiled drawing bound to its Xstage", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-multi-source-assets-"));
  const runtimeSource = "a".repeat(64);
  const compatibleSource = "b".repeat(64);
  const compatibleFilename = `sources/${compatibleSource}/left-hand-14.png`;
  const receipt = {
    schemaVersion: "shaz-tvg-asset-receipt-v3",
    runtimeXstageSha256: runtimeSource,
    artistRenderedFramesUsed: false,
    sources: [
      { xstageSha256: runtimeSource, sourceArchiveBundled: false },
      {
        xstageSha256: compatibleSource,
        xstageName: "compatible.xstage",
        sourceArchiveSha256: "e".repeat(64),
        sourceArchiveName: "compatible.zip",
        sourceArchiveBundled: false,
      },
    ],
    assets: [{
      filename: compatibleFilename,
      element: "Left_Hand",
      drawing: "14",
      variant: "main",
      sourceXstageSha256: compatibleSource,
      source: "elements/Left_Hand/Left_Hand-14.tvg",
      sourceSha256: "f".repeat(64),
      outputSha256: "c".repeat(64),
      canvas: { width: 10, height: 12 },
      modelOrigin: { x: 1, y: 2 },
    }],
  };
  try {
    await fs.mkdir(path.join(scratch, "sources", compatibleSource), { recursive: true });
    await fs.writeFile(path.join(scratch, compatibleFilename), "fixture");
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify(receipt));
    const registration = await loadAssetRegistration(scratch, runtimeSource);
    assert.equal(
      registration.assets.get(compatibleFilename).sourceXstageSha256,
      compatibleSource,
    );

    receipt.assets[0].sourceXstageSha256 = "d".repeat(64);
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify(receipt));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid model-space registrations/,
    );

    receipt.assets[0].sourceXstageSha256 = compatibleSource;
    receipt.assets[0].element = "Right_Hand";
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify(receipt));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid model-space registrations/,
    );

    receipt.assets[0].element = "Left_Hand";
    receipt.assets[0].sourceSha256 = "not-a-hash";
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify(receipt));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid model-space registrations/,
    );

    receipt.assets[0].sourceSha256 = "f".repeat(64);
    delete receipt.sources[1].sourceArchiveSha256;
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify(receipt));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid Xstage source registry/,
    );

    receipt.sources[1].sourceArchiveSha256 = "e".repeat(64);
    delete receipt.assets[0].sourceXstageSha256;
    receipt.sourceXstageSha256 = compatibleSource;
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify(receipt));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid model-space registrations/,
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("asset receipts remain v2-compatible and reject orphan files", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-v2-assets-"));
  const runtimeSource = "a".repeat(64);
  const receipt = {
    schemaVersion: "shaz-tvg-asset-receipt-v2",
    sourceXstageSha256: runtimeSource,
    artistRenderedFramesUsed: false,
    assets: [{
      filename: "left-hand-01.png",
      element: "Left_Hand",
      drawing: "1",
      variant: "main",
      source: "elements/Left_Hand/Left_Hand-1.tvg",
      sourceSha256: "f".repeat(64),
      outputSha256: "c".repeat(64),
      canvas: { width: 10, height: 12 },
      modelOrigin: { x: 1, y: 2 },
    }],
  };
  try {
    await fs.writeFile(path.join(scratch, "left-hand-01.png"), "fixture");
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify(receipt));
    const registration = await loadAssetRegistration(scratch, runtimeSource);
    assert.equal(registration.assets.get("left-hand-01.png").sourceXstageSha256, runtimeSource);

    await fs.writeFile(path.join(scratch, "interrupted-transaction.backup"), "orphan");
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /asset directory does not exactly match its receipt/,
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

test("malformed v3 receipt collections fail with receipt errors", async () => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-malformed-assets-"));
  const runtimeSource = "a".repeat(64);
  const base = {
    schemaVersion: "shaz-tvg-asset-receipt-v3",
    runtimeXstageSha256: runtimeSource,
    artistRenderedFramesUsed: false,
    sources: [{ xstageSha256: runtimeSource }],
    assets: [],
  };
  try {
    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify({ ...base, sources: {} }));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid Xstage source registry/,
    );

    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify({ ...base, sources: [null] }));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid Xstage source registry/,
    );

    await fs.writeFile(path.join(scratch, "receipt.json"), JSON.stringify({ ...base, assets: {} }));
    await assert.rejects(
      () => loadAssetRegistration(scratch, runtimeSource),
      /invalid model-space registrations/,
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
});

function close(actual, expected, epsilon = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function closePoint(actual, expected, epsilon = 1e-8) {
  close(actual[0], expected[0], epsilon);
  close(actual[1], expected[1], epsilon);
}

test("field conversion is derived from the source camera and vector scale", () => {
  const grid = fieldGridForManifest({
    stage: {
      resolution: { size: [1920, 1080] },
      pixelPerModelUnitForVectorLayers: 0.288,
      metrics: {
        unitAspectRatioX: 4,
        unitAspectRatioY: 3,
        numberOfUnitsX: 24,
        numberOfUnitsY: 24,
      },
    },
    elements: [{ vectorType: 2, fieldChart: 12 }],
  });
  close(grid.x, 208.33333333333334);
  close(grid.y, 156.25);
});

test("prop transforms use normalized output placement and width", () => {
  const matrix = propStageMatrix({
    position: [0.25, 0.5],
    width: 0.2,
    rotation: 0,
  }, 1000, 500, 200, 100);
  assert.deepEqual(applyToPoint(matrix, [100, 50]), [250, 250]);
  assert.deepEqual(applyToPoint(matrix, [0, 0]), [150, 200]);
});

test("PEG-level flips mirror the complete descendant rig", () => {
  const matrix = localMatrix({
    type: "PEG",
    attrs: {
      position: { attr3dpath: [0, 0, 0] },
      pivot: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: { anglez: 0 },
      flipHor: true,
      flipVert: false,
    },
  }, { invertY: false, invertAngle: false, fieldGrid: { x: 1, y: 1 } });
  closePoint(applyToPoint(matrix, [2, 3]), [-2, 3]);
});

test("tight assets map model coordinates into the source camera", () => {
  const manifest = {
    stage: {
      resolution: { size: [1920, 1080] },
      pixelPerModelUnitForVectorLayers: 0.288,
    },
  };
  const matrix = tightStageMatrix(
    [1, 0, 0, 1, 0, 0],
    manifest,
    1920,
    1080,
    { x: 100, y: -50 },
  );
  close(matrix[4], 988.8);
  close(matrix[5], 525.6);
});

test("a partial eyelid drawing recovers its full invisible round eye envelope", async () => {
  const partialEye = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">'
      + '<path d="M7 17 Q15 25 23 17 L23 22 Q15 29 7 22 Z" fill="white"/>'
      + '<path d="M7 17 Q15 25 23 17" fill="none" stroke="black" stroke-width="2"/>'
      + "</svg>",
  );
  const envelope = await createRoundEyeEnvelope(partialEye);
  assert.ok(envelope.envelopePixelCount > 150);
  const { data } = await sharp(envelope.buffer).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = (x, y) => data[((y * 30 + x) * 4) + 3];
  assert.equal(alpha(15, 9), 255, "the invisible upper eye must be owned by the matte");
  assert.equal(alpha(15, 22), 255, "the visible lower eyelid remains inside the matte");
  assert.equal(alpha(2, 2), 0, "the matte must not clear unrelated hair");
});

test("the full eye envelope clears both fill and outline from artwork behind it", async () => {
  const artwork = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">'
      + '<rect x="3" y="3" width="24" height="24" fill="#ad6845"/>'
      + '<path d="M3 12 H27" stroke="black" stroke-width="2"/>'
      + "</svg>",
  );
  const envelope = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">'
      + '<circle cx="18" cy="15" r="7" fill="white"/>'
      + "</svg>",
  );
  const cleared = await clipArtworkBehindMasks(artwork, [envelope], 30, 30);
  assert.ok(cleared.clearedPixelCount > 0);
  const { data } = await sharp(cleared.buffer).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = (x, y) => [...data.slice((y * 30 + x) * 4, (y * 30 + x) * 4 + 4)];
  assert.equal(rgba(18, 12)[3], 0, "black construction line under the eye must be hidden");
  assert.equal(rgba(18, 16)[3], 0, "brown hair fill under the eye must be hidden");
  assert.deepEqual(rgba(5, 5).slice(0, 3), [173, 104, 69]);
});

test("deformed raster pixels retain their declared model-space scale", () => {
  const manifest = {
    stage: {
      resolution: { size: [1920, 1080] },
      pixelPerModelUnitForVectorLayers: 0.288,
    },
  };
  const matrix = tightStageMatrix(
    [1, 0, 0, 1, 0, 0],
    manifest,
    1920,
    1080,
    { x: 100, y: -50 },
    2,
  );
  closePoint(applyToPoint(matrix, [10, 0]), [994.56, 525.6]);
});

test("drawing substitutions use deterministic main and art-layer filenames", () => {
  const drawing = { element: "Left_Forearm", drawing: "2" };
  assert.equal(assetFilename(drawing), "left-forearm-02.png");
  assert.equal(assetFilename(drawing, "color"), "left-forearm-02--color.png");
  assert.equal(assetFilename(drawing, "overlay"), "left-forearm-02--overlay.png");
  const sourceXstageSha256 = "a".repeat(64);
  assert.equal(
    assetFilename({ ...drawing, sourceXstageSha256 }),
    `sources/${sourceXstageSha256}/left-forearm-02.png`,
  );
});

test("compiled tooth-bearing mouths preserve their artist-authored white regions", async () => {
  for (const drawing of [2, 4, 5, 7, 8, 9, 10]) {
    const filename = `mouth-${String(drawing).padStart(2, "0")}.png`;
    const file = fileURLToPath(new URL(`../rig-v2/assets/${filename}`, import.meta.url));
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let whitePixels = 0;
    for (let index = 0; index < data.length; index += info.channels) {
      if (data[index] >= 245
        && data[index + 1] >= 245
        && data[index + 2] >= 245
        && data[index + 3] >= 245) whitePixels += 1;
    }
    assert.ok(whitePixels > 2_000, `${filename} has only ${whitePixels} white tooth pixels`);
  }
});

test("paint order keeps the body between the recovered left and right finished sleeves", () => {
  const leftSleeve = READ_PAINT_ORDER.indexOf("Top/Shaz_Rig/Body_Group/Left_Forearm");
  const body = READ_PAINT_ORDER.indexOf("Top/Shaz_Rig/Body_Group/Body");
  const rightHand = READ_PAINT_ORDER.indexOf("Top/Shaz_Rig/Body_Group/Right_Hand");
  assert.ok(leftSleeve < body);
  assert.ok(body < rightHand);
});

test("paint plan keeps construction fills below finished sleeve artwork", () => {
  for (const side of ["Left", "Right"]) {
    const hand = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Hand`) && entry.variant === "main"
    ));
    const forearm = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Forearm`) && entry.variant === "main"
    ));
    const constructionFill = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Arm`) && entry.variant === "main"
    ));
    const patch = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Forearm`) && entry.variant === "color"
    ));
    const overlay = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Forearm`) && entry.variant === "overlay"
    ));
    assert.ok(constructionFill >= 0);
    assert.ok(forearm >= 0);
    assert.ok(constructionFill < forearm);
    assert.ok(forearm < patch);
    assert.ok(patch < overlay);
    assert.ok(overlay < hand);
  }
});

test("closed line art receives a deterministic interior fill without filling the exterior", async () => {
  const outline = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">'
      + '<rect x="8" y="8" width="24" height="24" fill="none" stroke="black" stroke-width="3"/>'
      + "</svg>",
  );
  const filled = await fillEnclosedOutline(outline, 40, 40, {
    r: 255, g: 187, b: 152, alpha: 255,
  });
  const { data } = await sharp(filled).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4)];
  assert.deepEqual(pixel(20, 20), [255, 187, 152, 255]);
  assert.equal(pixel(2, 2)[3], 0);
  assert.deepEqual(pixel(8, 20).slice(0, 3), [0, 0, 0]);
});

test("outline-free fill replaces construction strokes instead of compositing them", async () => {
  const outline = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">'
      + '<rect x="8" y="8" width="24" height="24" fill="none" stroke="black" stroke-width="3"/>'
      + "</svg>",
  );
  const color = { r: 237, g: 113, b: 111, alpha: 255 };
  const filled = await fillEnclosedOutline(outline, 40, 40, color, false);
  const { data } = await sharp(filled).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...data.slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4)];
  assert.deepEqual(pixel(20, 20), [237, 113, 111, 255]);
  assert.deepEqual(pixel(8, 20), [237, 113, 111, 255]);
  assert.equal(pixel(2, 2)[3], 0);
});

test("back-bang component filtering hides the stray forehead crescent and preserves the side bang", async () => {
  const width = 20;
  const height = 20;
  const pixels = Buffer.alloc(width * height * 4);
  const paint = (minX, minY, maxX, maxY) => {
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const offset = (y * width + x) * 4;
        pixels.set([108, 44, 41, 255], offset);
      }
    }
  };
  paint(2, 2, 5, 5);
  paint(4, 11, 9, 18);
  paint(11, 10, 17, 18);
  for (let point = 5; point <= 11; point += 1) {
    const offset = (point * width + point) * 4;
    pixels.set([0, 0, 0, 255], offset);
  }
  const artwork = await sharp(pixels, {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
  const filtered = await hideUpperBackBangPatch(artwork);
  assert.equal(filtered.sourceFillComponentCount, 3);
  assert.equal(filtered.hiddenFillComponentCount, 1);
  const { data } = await sharp(filtered.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (x, y) => data[((y * width + x) * 4) + 3];
  assert.equal(alpha(3, 3), 0);
  assert.ok(alpha(6, 14) > 0);
  assert.ok(alpha(14, 14) > 0);
});

test("head-base shade extraction keeps only the artist-authored forehead color", async () => {
  const artwork = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">'
      + '<rect x="4" y="3" width="30" height="8" fill="#e88858" stroke="black"/>'
      + '<rect x="8" y="15" width="24" height="20" rx="8" fill="#ffbb98" stroke="black"/>'
      + '</svg>',
  );
  const filtered = await extractHeadBaseForeheadShade(artwork);
  assert.ok(filtered.shadePixelCount > 0);
  const { data } = await sharp(filtered.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (x, y) => data[((y * 40 + x) * 4) + 3];
  assert.ok(alpha(12, 6) > 0);
  assert.equal(alpha(4, 3), 0);
  assert.equal(alpha(20, 22), 0);
});

test("forehead shade expands as its own color and replaces only the maroon rear-hair wedge", async () => {
  const width = 30;
  const height = 20;
  const shade = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20">'
      + '<rect x="14" y="8" width="2" height="4" fill="#e2805b"/>'
      + '</svg>',
  );
  const expanded = await expandFlatShade(shade, [226, 128, 91], 4);
  const hair = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20">'
      + '<rect x="5" y="3" width="8" height="14" fill="#ad6845"/>'
      + '<rect x="13" y="3" width="8" height="14" fill="#662a27"/>'
      + '<path d="M13 3 V17" stroke="black" stroke-width="2"/>'
      + '</svg>',
  );
  const clipped = await clipToRearHairShadow(expanded, hair, width, height);
  assert.ok(clipped.replacedPixelCount > 0);
  const restored = await sharp(hair).composite([{ input: clipped.buffer }]).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = (x, y) => [...restored.data.slice(
    (y * width + x) * 4,
    (y * width + x) * 4 + 4,
  )];
  assert.deepEqual(rgba(16, 9).slice(0, 3), [226, 128, 91]);
  assert.deepEqual(rgba(8, 9).slice(0, 3), [173, 104, 69]);
  assert.deepEqual(rgba(13, 9).slice(0, 3), [0, 0, 0]);
});

test("finished sleeve synthesis outlines the union without drawing the overlap seam", async () => {
  const upper = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24">'
      + '<rect x="3" y="4" width="20" height="16" rx="5" fill="#ed716f"/>'
      + '</svg>',
  );
  const lower = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24">'
      + '<rect x="17" y="4" width="20" height="16" rx="5" fill="#ed716f" stroke="black" stroke-width="3"/>'
      + '</svg>',
  );
  const finished = await createFinishedSleeve([upper, lower], null, 40, 24, 2);
  const { data } = await sharp(finished).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = (x, y) => [...data.slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4)];
  assert.deepEqual(rgba(20, 12).slice(0, 3), [237, 113, 111]);
  let leftBoundary = 0;
  let rightBoundary = 0;
  for (let y = 0; y < 24; y += 1) {
    for (let x = 0; x < 40; x += 1) {
      const pixel = rgba(x, y);
      if (pixel[3] === 0 || pixel[0] >= 80 || pixel[1] >= 80 || pixel[2] >= 80) continue;
      if (x < 10) leftBoundary += 1;
      if (x > 30) rightBoundary += 1;
    }
  }
  assert.ok(leftBoundary > 0);
  assert.ok(rightBoundary > 0);
});

test("neutral hands are matted behind opaque sleeve pixels", async () => {
  const hand = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10">'
      + '<rect width="20" height="10" fill="#ffbb98"/>'
      + '</svg>',
  );
  const sleeve = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10">'
      + '<rect width="10" height="10" fill="#ed716f"/>'
      + '</svg>',
  );
  const clipped = await clipHandBehindSleeve(hand, sleeve, 20, 10);
  const { data } = await sharp(clipped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[(5 * 4) + 3], 0);
  assert.equal(data[(15 * 4) + 3], 255);
});
