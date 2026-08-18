import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { applyToPoint } from "../runtime/vendor/scene_transforms.mjs";

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
  propStageMatrix,
  tightStageMatrix,
} from "../runtime/rig-v2-renderer.mjs";

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
