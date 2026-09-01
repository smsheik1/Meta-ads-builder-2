import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  identity,
  multiply,
  worldMatrices,
} from "./vendor/scene_transforms.mjs";
import {
  indexColumns,
  resolveReadDrawing,
  sampleNode,
} from "./vendor/runtime_channels.mjs";
import { deformRegisteredAsset } from "./vendor/deformation_chains.mjs";

const ELEMENT_ASSET_IDS = Object.freeze({
  Back_Hair: "back-hair",
  Bangs_back: "bangs-back",
  Bangs_front: "bangs-front",
  Body: "body",
  Collar: "collar",
  Eyebrows: "eyebrows",
  Hair: "hair",
  Head_Base: "head-base",
  Left_Arm: "left-arm",
  Left_Eye: "left-eye",
  Left_Forearm: "left-forearm",
  Left_Hand: "left-hand",
  Left_Pupil: "left-pupil",
  Left_eye: "left-eye",
  Mouth: "mouth",
  Nose: "nose",
  OL_Hand: "ol-hand",
  Pouch: "pouch",
  Right_Arm: "right-arm",
  Right_Eye: "right-eye",
  Right_Forearm: "right-forearm",
  Right_Hand: "right-hand",
  Right_Pupil: "right-pupil",
  Strings: "strings",
});

const SHAZ_SKIN_COLOR = Object.freeze({ r: 255, g: 187, b: 152, alpha: 255 });
const SHAZ_HOODIE_COLOR = Object.freeze({ r: 237, g: 113, b: 111, alpha: 255 });
const OUTLINE_ALPHA_THRESHOLD = 24;
const SHA256 = /^[a-f0-9]{64}$/;
const ASSET_VARIANTS = new Set(["main", "color", "overlay"]);

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

// Rebuild the visible result of each source arm composite. Harmony's Auto-Patch
// hides the construction overlap: only a clipped upper-arm colour bridge joins
// torso to sleeve, sleeve art covers it, and the hand remains visible on top.
const READ_PAINT_ORDER = Object.freeze([
  "Top/Shaz_Rig/Body_Group/Left_Hand",
  "Top/Shaz_Rig/Body_Group/Left_Forearm",
  "Top/Shaz_Rig/Body_Group/Left_Arm",
  "Top/Shaz_Rig/Body_Group/Body",
  "Top/Shaz_Rig/Body_Group/Pouch",
  "Top/Shaz_Rig/Body_Group/Strings",
  "Top/Shaz_Rig/Body_Group/Collar",
  "Top/Shaz_Rig/Body_Group/Right_Hand",
  "Top/Shaz_Rig/Body_Group/Right_Forearm",
  "Top/Shaz_Rig/Body_Group/Right_Arm",
  "Top/Shaz_Rig/Head_Group/Back_Hair",
  "Top/Shaz_Rig/Head_Group/Hair",
  "Top/Shaz_Rig/Head_Group/Head_Base",
  "Top/Shaz_Rig/Head_Group/Mouth",
  "Top/Shaz_Rig/Head_Group/Bangs_back",
  "Top/Shaz_Rig/Head_Group/Bangs_front",
  "Top/Shaz_Rig/Head_Group/Right_Eye",
  "Top/Shaz_Rig/Head_Group/Right_Pupil",
  "Top/Shaz_Rig/Head_Group/Left_Eye",
  "Top/Shaz_Rig/Head_Group/Left_Pupil",
  "Top/Shaz_Rig/Head_Group/Nose",
  "Top/Shaz_Rig/Head_Group/Eyebrows",
  "Top/Shaz_Rig/Head_Group/OL_Hand",
]);

const READ_PAINT_PLAN = Object.freeze([
  { nodePath: READ_PAINT_ORDER[2], variant: "main" },
  { nodePath: READ_PAINT_ORDER[9], variant: "main" },
  { nodePath: READ_PAINT_ORDER[1], variant: "main" },
  { nodePath: READ_PAINT_ORDER[1], variant: "color" },
  { nodePath: READ_PAINT_ORDER[1], variant: "overlay" },
  { nodePath: READ_PAINT_ORDER[0], variant: "main" },
  ...READ_PAINT_ORDER.slice(3, 7).map((nodePath) => ({ nodePath, variant: "main" })),
  { nodePath: READ_PAINT_ORDER[8], variant: "main" },
  { nodePath: READ_PAINT_ORDER[8], variant: "color" },
  { nodePath: READ_PAINT_ORDER[8], variant: "overlay" },
  { nodePath: READ_PAINT_ORDER[7], variant: "main" },
  ...READ_PAINT_ORDER.slice(10).map((nodePath) => ({ nodePath, variant: "main" })),
]);

function applyArmPaintOrder(layers, armPaintOrder) {
  const isLeftArmLayer = (layer) => (
    layer.nodePath.endsWith("/Left_Forearm") || layer.nodePath.endsWith("/Left_Hand")
  );
  const isRightArmLayer = (layer) => (
    layer.nodePath.endsWith("/Right_Forearm") || layer.nodePath.endsWith("/Right_Hand")
  );

  if (armPaintOrder === "both-front-left-under-right") {
    const leftArmLayers = layers.filter(isLeftArmLayer);
    const rightArmLayers = layers.filter(isRightArmLayer);
    const withoutArms = layers.filter((layer) => (
      !isLeftArmLayer(layer) && !isRightArmLayer(layer)
    ));
    const firstHeadIndex = withoutArms.findIndex((layer) => (
      layer.nodePath.includes("/Head_Group/")
    ));
    const insertionIndex = firstHeadIndex < 0 ? withoutArms.length : firstHeadIndex;
    return [
      ...withoutArms.slice(0, insertionIndex),
      ...leftArmLayers,
      ...rightArmLayers,
      ...withoutArms.slice(insertionIndex),
    ];
  }

  if (armPaintOrder === "right-front-of-head") {
    const rightArmLayers = layers.filter(isRightArmLayer);
    const withoutRightArm = layers.filter((layer) => !isRightArmLayer(layer));
    const lastHeadIndex = withoutRightArm.findLastIndex((layer) => (
      layer.nodePath.includes("/Head_Group/")
    ));
    const insertionIndex = lastHeadIndex < 0 ? withoutRightArm.length : lastHeadIndex + 1;
    return [
      ...withoutRightArm.slice(0, insertionIndex),
      ...rightArmLayers,
      ...withoutRightArm.slice(insertionIndex),
    ];
  }

  return layers;
}

function translation(x, y) {
  return [1, 0, 0, 1, x, y];
}

function svgTransform(
  image,
  width,
  height,
  matrix,
  imageWidth,
  imageHeight,
  opacity = 1,
) {
  const [a, b, c, d, e, f] = matrix;
  const href = `data:image/png;base64,${image.toString("base64")}`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
      + `<image href="${href}" width="${imageWidth}" height="${imageHeight}" opacity="${opacity}" transform="matrix(${a} ${b} ${c} ${d} ${e} ${f})"/>`
      + "</svg>",
  );
}

function rotationMatrix(degrees) {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [cosine, sine, -sine, cosine, 0, 0];
}

function scaleMatrix(x, y) {
  return [x, 0, 0, y, 0, 0];
}

function normalizeStageView(value = {}) {
  const scale = value.scale ?? 1;
  const offset = value.offset ?? [0, 0];
  if (!Number.isFinite(scale) || scale < 0.5 || scale > 1.4) {
    throw new Error("stageView.scale must be a number from 0.5 to 1.4");
  }
  if (!Array.isArray(offset) || offset.length !== 2
    || offset.some((entry) => !Number.isFinite(entry) || Math.abs(entry) > 0.25)) {
    throw new Error("stageView.offset must contain two normalized numbers from -0.25 to 0.25");
  }
  return { scale, offset: [...offset] };
}

function assetFilename(drawing, variant = "main") {
  const assetId = ELEMENT_ASSET_IDS[drawing.element];
  if (!assetId) throw new Error(`no TVG asset mapping for ${drawing.element}`);
  const suffix = variant === "main" ? "" : `--${variant}`;
  const filename = `${assetId}-${String(drawing.drawing).padStart(2, "0")}${suffix}.png`;
  if (!drawing.sourceXstageSha256) return filename;
  if (!/^[a-f0-9]{64}$/.test(drawing.sourceXstageSha256)) {
    throw new Error("source-bound drawing requires a lowercase Xstage SHA-256");
  }
  return `sources/${drawing.sourceXstageSha256}/${filename}`;
}

function fieldGridForManifest(manifest) {
  const resolutionHeight = manifest.stage?.resolution?.size?.[1];
  const pixelsPerModelUnit = manifest.stage?.pixelPerModelUnitForVectorLayers;
  const metrics = manifest.stage?.metrics;
  if (!resolutionHeight || !pixelsPerModelUnit
    || !metrics?.unitAspectRatioX || !metrics?.unitAspectRatioY
    || !metrics?.numberOfUnitsX || !metrics?.numberOfUnitsY) {
    throw new Error("manifest is missing resolution, vector model scale, or field metrics");
  }
  const modelHeight = resolutionHeight / pixelsPerModelUnit;
  return {
    x: modelHeight
      * (metrics.unitAspectRatioX / metrics.unitAspectRatioY)
      / metrics.numberOfUnitsX,
    y: modelHeight / metrics.numberOfUnitsY,
  };
}

function tightStageMatrix(
  worldMatrix,
  manifest,
  outputWidth,
  outputHeight,
  modelOrigin,
  modelUnitsPerPixel = 1,
  stageView = { scale: 1, offset: [0, 0] },
) {
  const [sourceWidth, sourceHeight] = manifest.stage.resolution.size;
  const pixelsPerModelUnit = manifest.stage.pixelPerModelUnitForVectorLayers;
  const stage = [
    pixelsPerModelUnit * outputWidth / sourceWidth * stageView.scale,
    0,
    0,
    pixelsPerModelUnit * outputHeight / sourceHeight * stageView.scale,
    outputWidth / 2 + stageView.offset[0] * outputWidth,
    outputHeight / 2 + stageView.offset[1] * outputHeight,
  ];
  return multiply(stage, multiply(
    worldMatrix,
    multiply(
      translation(modelOrigin.x, modelOrigin.y),
      scaleMatrix(modelUnitsPerPixel, modelUnitsPerPixel),
    ),
  ));
}

async function assetTreeFiles(root) {
  const files = [];
  async function walk(directory, relativeDirectory = "") {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relative = path.posix.join(relativeDirectory, entry.name);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute, relative);
      else if (entry.isFile()) files.push(relative);
      else throw new Error(`asset directory contains an unsupported entry: ${relative}`);
    }
  }
  await walk(root);
  return files.sort();
}

async function loadAssetRegistration(assetRoot, sourceXstageSha256) {
  const receipt = JSON.parse(await fs.readFile(path.join(assetRoot, "receipt.json"), "utf8"));
  if (!["shaz-tvg-asset-receipt-v2", "shaz-tvg-asset-receipt-v3"].includes(receipt.schemaVersion)) {
    throw new Error(`unsupported Shaz asset receipt ${receipt.schemaVersion}`);
  }
  if (receipt.artistRenderedFramesUsed !== false) {
    throw new Error("asset receipt does not prove artist-frame exclusion");
  }
  const runtimeSource = receipt.schemaVersion === "shaz-tvg-asset-receipt-v3"
    ? receipt.runtimeXstageSha256
    : receipt.sourceXstageSha256;
  if (runtimeSource !== sourceXstageSha256) {
    throw new Error("asset receipt was compiled from a different Xstage source");
  }
  if (receipt.schemaVersion === "shaz-tvg-asset-receipt-v3" && !Array.isArray(receipt.sources)) {
    throw new Error("asset receipt contains an invalid Xstage source registry");
  }
  const sourceRecords = receipt.schemaVersion === "shaz-tvg-asset-receipt-v3"
    ? receipt.sources
    : [{ xstageSha256: receipt.sourceXstageSha256 }];
  if (sourceRecords.some((source) => !source || typeof source !== "object" || Array.isArray(source))) {
    throw new Error("asset receipt contains an invalid Xstage source registry");
  }
  const registeredSources = new Set(sourceRecords.map(({ xstageSha256 }) => xstageSha256));
  if (!SHA256.test(runtimeSource ?? "")
    || !Array.isArray(sourceRecords)
    || !registeredSources.has(runtimeSource)
    || registeredSources.size !== sourceRecords.length
    || sourceRecords.some((source) => (
      !SHA256.test(source.xstageSha256 ?? "")
      || (source.xstageSha256 !== runtimeSource && (
        !isSafeSourceBasename(source.xstageName, ".xstage")
        || !SHA256.test(source.sourceArchiveSha256 ?? "")
        || !isSafeSourceBasename(source.sourceArchiveName, ".zip")
        || source.sourceArchiveBundled !== false
      ))
    ))) {
    throw new Error("asset receipt contains an invalid Xstage source registry");
  }
  if (!Array.isArray(receipt.assets)) {
    throw new Error("asset receipt contains invalid model-space registrations");
  }
  const normalizedAssets = receipt.assets.map((asset) => ({
    ...asset,
    sourceXstageSha256: receipt.schemaVersion === "shaz-tvg-asset-receipt-v2"
      ? (asset.sourceXstageSha256 ?? receipt.sourceXstageSha256)
      : asset.sourceXstageSha256,
  }));
  const assets = new Map(normalizedAssets.map((asset) => [asset.filename, asset]));
  if (assets.size === 0 || assets.size !== receipt.assets.length
    || [...assets.values()].some((asset) => (
      !Number.isFinite(asset.canvas?.width)
      || !Number.isFinite(asset.canvas?.height)
      || asset.canvas.width <= 0
      || asset.canvas.height <= 0
      || !Number.isFinite(asset.modelOrigin?.x)
      || !Number.isFinite(asset.modelOrigin?.y)
      || !isSafeRelativeTvgSourcePath(asset.source)
      || !SHA256.test(asset.sourceSha256 ?? "")
      || !SHA256.test(asset.outputSha256 ?? "")
      || !ELEMENT_ASSET_IDS[asset.element]
      || !/^\d+$/.test(String(asset.drawing ?? ""))
      || !ASSET_VARIANTS.has(asset.variant)
      || !registeredSources.has(asset.sourceXstageSha256)
      || asset.filename !== assetFilename({
        element: asset.element,
        drawing: String(asset.drawing),
        ...(asset.sourceXstageSha256 === runtimeSource
          ? {}
          : { sourceXstageSha256: asset.sourceXstageSha256 }),
      }, asset.variant)
    ))) {
    throw new Error("asset receipt contains invalid model-space registrations");
  }
  const expectedFiles = ["receipt.json", ...assets.keys()].sort();
  const actualFiles = await assetTreeFiles(assetRoot);
  if (actualFiles.length !== expectedFiles.length
    || actualFiles.some((filename, index) => filename !== expectedFiles[index])) {
    throw new Error("asset directory does not exactly match its receipt");
  }
  return { assets, receipt };
}

async function readTightAsset(
  assetRoot,
  filename,
  registration,
  cache,
  expectedSourceXstageSha256 = null,
) {
  const record = registration.assets.get(filename);
  if (!record) return null;
  if (expectedSourceXstageSha256
    && record.sourceXstageSha256 !== expectedSourceXstageSha256) {
    throw new Error(`compiled asset source mismatch for ${filename}`);
  }
  const source = path.join(assetRoot, filename);
  if (!cache.has(source)) {
    cache.set(source, fs.readFile(source).then((buffer) => {
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
      if (checksum !== record.outputSha256) {
        throw new Error(`compiled asset checksum mismatch for ${filename}`);
      }
      return buffer;
    }));
  }
  return { buffer: await cache.get(source), ...record };
}

async function fillEnclosedOutline(image, width, height, color, preserveOutline = true) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== width || info.height !== height) {
    throw new Error("outline-fill dimensions do not match the registered asset");
  }
  const pixels = width * height;
  let barrier = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (data[pixel * 4 + 3] > OUTLINE_ALPHA_THRESHOLD) barrier[pixel] = 1;
  }
  // TVG strokes are exported as independent antialiased segments. Close their
  // sub-pixel joins before flood filling so a visually closed collar remains a
  // closed shape in the raster mask.
  for (let pass = 0; pass < 2; pass += 1) {
    const expanded = barrier.slice();
    for (let pixel = 0; pixel < pixels; pixel += 1) {
      if (!barrier[pixel]) continue;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
            expanded[nextY * width + nextX] = 1;
          }
        }
      }
    }
    barrier = expanded;
  }
  const exterior = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel) => {
    if (exterior[pixel] || barrier[pixel]) return;
    exterior[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y + 1 < height) enqueue(pixel + width);
  }
  const fill = Buffer.alloc(pixels * 4);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (exterior[pixel]
      || (preserveOutline && data[pixel * 4 + 3] > OUTLINE_ALPHA_THRESHOLD)) continue;
    const offset = pixel * 4;
    fill[offset] = color.r;
    fill[offset + 1] = color.g;
    fill[offset + 2] = color.b;
    fill[offset + 3] = color.alpha;
  }
  const filled = sharp(fill, { raw: { width, height, channels: 4 } });
  return preserveOutline
    ? filled.composite([{ input: image }]).png().toBuffer()
    : filled.png().toBuffer();
}

async function hideUpperBackBangPatch(image) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  const filled = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * info.channels;
    if (data[offset + 3] > OUTLINE_ALPHA_THRESHOLD
      && Math.max(data[offset], data[offset + 1], data[offset + 2]) > 80) filled[pixel] = 1;
  }
  const visited = new Uint8Array(pixels);
  const labels = new Uint32Array(pixels);
  const queue = new Int32Array(pixels);
  const components = [];
  for (let start = 0; start < pixels; start += 1) {
    if (!filled[start] || visited[start]) continue;
    const label = components.length + 1;
    let head = 0;
    let tail = 0;
    let size = 0;
    let maxY = -1;
    queue[tail++] = start;
    visited[start] = 1;
    labels[start] = label;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      size += 1;
      maxY = Math.max(maxY, y);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextX >= info.width || nextY < 0 || nextY >= info.height) continue;
          const next = nextY * info.width + nextX;
          if (!filled[next] || visited[next]) continue;
          visited[next] = 1;
          labels[next] = label;
          queue[tail++] = next;
        }
      }
    }
    components.push({ size, label, maxY });
  }
  const keptLabels = new Set(components
    .filter(({ maxY }) => maxY >= info.height / 2)
    .map(({ label }) => label));
  if (keptLabels.size === components.length) {
    return {
      buffer: image,
      sourceFillComponentCount: components.length,
      hiddenFillComponentCount: 0,
    };
  }
  if (keptLabels.size === 0) throw new Error("back-bang masking found no lower visible artwork");
  const output = Buffer.alloc(data.length);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * info.channels;
    let keep = keptLabels.has(labels[pixel]);
    if (!filled[pixel] && data[offset + 3] > 0) {
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      for (let dy = -8; dy <= 8 && !keep; dy += 1) {
        for (let dx = -8; dx <= 8; dx += 1) {
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextX >= info.width || nextY < 0 || nextY >= info.height) continue;
          if (keptLabels.has(labels[nextY * info.width + nextX])) {
            keep = true;
            break;
          }
        }
      }
    }
    if (keep) data.copy(output, offset, offset, offset + info.channels);
  }
  return {
    buffer: await sharp(output, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    }).png().toBuffer(),
    sourceFillComponentCount: components.length,
    hiddenFillComponentCount: components.length - keptLabels.size,
  };
}

async function extractHeadBaseForeheadShade(image) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(data.length);
  let shadePixelCount = 0;
  const shadeColorTotal = [0, 0, 0];
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const isArtistShade = data[offset + 3] > 0
      && data[offset] >= 180 && data[offset] <= 250
      && data[offset + 1] >= 80 && data[offset + 1] <= 170
      && data[offset + 2] >= 40 && data[offset + 2] <= 130;
    if (!isArtistShade) continue;
    data.copy(output, offset, offset, offset + info.channels);
    for (let channel = 0; channel < 3; channel += 1) {
      shadeColorTotal[channel] += data[offset + channel];
    }
    shadePixelCount += 1;
  }
  if (shadePixelCount === 0) throw new Error("head-base drawing contains no forehead shade pixels");
  return {
    buffer: await sharp(output, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    }).png().toBuffer(),
    shadePixelCount,
    shadeColor: shadeColorTotal.map((total) => Math.round(total / shadePixelCount)),
  };
}

async function expandFlatShade(image, color, radius) {
  const alpha = await sharp(image).ensureAlpha().extractChannel(3).erode(radius).raw().toBuffer();
  const metadata = await sharp(image).metadata();
  const output = Buffer.alloc(metadata.width * metadata.height * 4);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const offset = pixel * 4;
    output[offset] = color[0];
    output[offset + 1] = color[1];
    output[offset + 2] = color[2];
    output[offset + 3] = alpha[pixel];
  }
  return sharp(output, {
    raw: { width: metadata.width, height: metadata.height, channels: 4 },
  }).png().toBuffer();
}

async function clipToRearHairShadow(image, artwork, width, height) {
  const [imageRaw, artworkRaw] = await Promise.all([
    sharp(image).ensureAlpha().raw().toBuffer(),
    sharp(artwork).ensureAlpha().raw().toBuffer(),
  ]);
  const clipped = Buffer.from(imageRaw);
  let replacedPixelCount = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const isRearHairShadow = artworkRaw[offset + 3] > OUTLINE_ALPHA_THRESHOLD
      && artworkRaw[offset] >= 60 && artworkRaw[offset] <= 130
      && artworkRaw[offset + 1] >= 15 && artworkRaw[offset + 1] <= 75
      && artworkRaw[offset + 2] >= 10 && artworkRaw[offset + 2] <= 70;
    if (!isRearHairShadow) {
      clipped[offset + 3] = 0;
    } else if (clipped[offset + 3] > OUTLINE_ALPHA_THRESHOLD) {
      replacedPixelCount += 1;
    }
  }
  return {
    buffer: await sharp(clipped, { raw: { width, height, channels: 4 } }).png().toBuffer(),
    replacedPixelCount,
  };
}

async function clipHandBehindSleeve(hand, sleeve, width, height) {
  const [handRaw, sleeveRaw] = await Promise.all([
    sharp(hand).ensureAlpha().raw().toBuffer(),
    sharp(sleeve).ensureAlpha().raw().toBuffer(),
  ]);
  const clipped = Buffer.from(handRaw);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    clipped[offset + 3] = Math.round(
      clipped[offset + 3] * (255 - sleeveRaw[offset + 3]) / 255,
    );
  }
  return sharp(clipped, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function createRoundEyeEnvelope(image) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= OUTLINE_ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("eye drawing has no visible envelope seed");
  const diameter = maxX - minX + 1;
  const centerX = (minX + maxX) / 2;
  const centerY = maxY - (diameter - 1) / 2;
  const radius = diameter / 2;
  const output = Buffer.alloc(info.width * info.height * 4);
  let envelopePixelCount = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const normalizedX = (x + 0.5 - centerX) / radius;
      const normalizedY = (y + 0.5 - centerY) / radius;
      if (normalizedX ** 2 + normalizedY ** 2 > 1) continue;
      const offset = (y * info.width + x) * 4;
      output[offset] = 255;
      output[offset + 1] = 255;
      output[offset + 2] = 255;
      output[offset + 3] = 255;
      envelopePixelCount += 1;
    }
  }
  return {
    buffer: await sharp(output, {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png().toBuffer(),
    envelopePixelCount,
  };
}

async function clipArtworkBehindMasks(artwork, masks, width, height) {
  const [artworkRaw, ...maskRaws] = await Promise.all([
    sharp(artwork).ensureAlpha().raw().toBuffer(),
    ...masks.map((mask) => sharp(mask).ensureAlpha().raw().toBuffer()),
  ]);
  const clipped = Buffer.from(artworkRaw);
  let clearedPixelCount = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    const maskAlpha = Math.max(...maskRaws.map((mask) => mask[offset + 3]));
    if (maskAlpha <= OUTLINE_ALPHA_THRESHOLD || clipped[offset + 3] === 0) continue;
    clipped[offset + 3] = Math.round(clipped[offset + 3] * (255 - maskAlpha) / 255);
    clearedPixelCount += 1;
  }
  return {
    buffer: await sharp(clipped, { raw: { width, height, channels: 4 } }).png().toBuffer(),
    clearedPixelCount,
  };
}

async function createFinishedSleeve(fillParts, overlay, width, height, outlineRadius = 3) {
  const parts = await Promise.all(fillParts.map((part) => (
    sharp(part).ensureAlpha().raw().toBuffer()
  )));
  const pixels = width * height;
  const unionAlpha = new Uint8Array(pixels);
  for (const part of parts) {
    for (let pixel = 0; pixel < pixels; pixel += 1) {
      unionAlpha[pixel] = Math.max(unionAlpha[pixel], part[pixel * 4 + 3]);
    }
  }
  const stride = width + 1;
  const integral = new Uint32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) {
      if (unionAlpha[y * width + x] > OUTLINE_ALPHA_THRESHOLD) row += 1;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const output = Buffer.alloc(pixels * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const alpha = unionAlpha[pixel];
      if (alpha <= OUTLINE_ALPHA_THRESHOLD) continue;
      const minX = Math.max(0, x - outlineRadius);
      const minY = Math.max(0, y - outlineRadius);
      const maxX = Math.min(width - 1, x + outlineRadius);
      const maxY = Math.min(height - 1, y + outlineRadius);
      const count = integral[(maxY + 1) * stride + maxX + 1]
        - integral[minY * stride + maxX + 1]
        - integral[(maxY + 1) * stride + minX]
        + integral[minY * stride + minX];
      const area = (maxX - minX + 1) * (maxY - minY + 1);
      const boundary = count < area;
      const offset = pixel * 4;
      output[offset] = boundary ? 0 : SHAZ_HOODIE_COLOR.r;
      output[offset + 1] = boundary ? 0 : SHAZ_HOODIE_COLOR.g;
      output[offset + 2] = boundary ? 0 : SHAZ_HOODIE_COLOR.b;
      output[offset + 3] = alpha;
    }
  }
  const finished = sharp(output, { raw: { width, height, channels: 4 } });
  return overlay
    ? finished.composite([{ input: overlay }]).png().toBuffer()
    : finished.png().toBuffer();
}

async function significantAlphaComponentCount(image, analysisWidth = 640) {
  const { data, info } = await sharp(image)
    .resize({ width: analysisWidth })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (data[pixel * info.channels + 3] > OUTLINE_ALPHA_THRESHOLD) mask[pixel] = 1;
  }
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let components = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let size = 0;
    visited[start] = 1;
    queue[tail++] = start;
    while (head < tail) {
      const pixel = queue[head++];
      size += 1;
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextX >= info.width || nextY < 0 || nextY >= info.height) continue;
          const next = nextY * info.width + nextX;
          if (!mask[next] || visited[next]) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    if (size >= 12) components += 1;
  }
  return components;
}

async function readPropAsset(propRoot, prop, cache) {
  if (!propRoot) throw new Error(`pose ${prop.id} requires --prop-assets`);
  const source = path.join(propRoot, prop.asset);
  if (!cache.has(source)) {
    cache.set(source, fs.readFile(source).then(async (buffer) => {
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
      if (checksum !== prop.sha256) throw new Error(`prop checksum mismatch for ${prop.asset}`);
      const normalized = await sharp(buffer).png().toBuffer();
      const metadata = await sharp(normalized).metadata();
      if (!metadata.width || !metadata.height) throw new Error(`prop has no dimensions: ${prop.asset}`);
      return { buffer: normalized, width: metadata.width, height: metadata.height };
    }));
  }
  return cache.get(source);
}

function propStageMatrix(
  prop,
  outputWidth,
  outputHeight,
  imageWidth,
  imageHeight,
  stageView = { scale: 1, offset: [0, 0] },
) {
  const pixelWidth = prop.width * outputWidth * stageView.scale;
  const scale = pixelWidth / imageWidth;
  const [scaleX, scaleY] = prop.scale ?? [1, 1];
  const centerX = outputWidth / 2
    + (prop.position[0] - 0.5) * outputWidth * stageView.scale
    + stageView.offset[0] * outputWidth;
  const centerY = outputHeight / 2
    + (prop.position[1] - 0.5) * outputHeight * stageView.scale
    + stageView.offset[1] * outputHeight;
  return [
    translation(centerX, centerY),
    rotationMatrix(prop.rotation),
    scaleMatrix(scale * scaleX, scale * scaleY),
    translation(-imageWidth / 2, -imageHeight / 2),
  ].reduce(multiply, identity());
}

async function renderRigFrame({
  manifest,
  frame,
  assetRoot,
  propRoot = null,
  poseRuntime = null,
  outputWidth = 1280,
  outputHeight = 720,
  stageView: requestedStageView = undefined,
  background = { r: 255, g: 255, b: 255, alpha: 1 },
  assetCache = new Map(),
  propCache = new Map(),
  includeLayerBuffers = false,
  mouthDrawing = null,
}) {
  if (manifest.schemaVersion !== "harmony-xstage-runtime-v1") {
    throw new Error(`unsupported manifest schema ${manifest.schemaVersion}`);
  }
  const stageView = normalizeStageView(requestedStageView);
  if (mouthDrawing !== null
    && (!Number.isInteger(Number(mouthDrawing))
      || Number(mouthDrawing) < 1
      || Number(mouthDrawing) > 10)) {
    throw new Error("mouthDrawing must be null or a registered drawing number from 1 to 10");
  }
  const scene = manifest.scenes[0];
  if (!scene) throw new Error("manifest contains no scene");
  const registration = await loadAssetRegistration(assetRoot, manifest.source.sha256);
  const nodes = new Map(scene.nodes.map((node) => [node.path, node]));
  const columns = indexColumns(scene);
  const matrices = worldMatrices(scene, frame, {
    fieldGrid: fieldGridForManifest(manifest),
    ...(poseRuntime ? { sampleNodeAtFrame: poseRuntime.sampleNodeAtFrame } : {}),
  });
  const layers = [];
  const props = [];

  for (const prop of poseRuntime?.propsAtFrame(frame) ?? []) {
    if (prop.opacity <= 0) continue;
    const asset = await readPropAsset(propRoot, prop, propCache);
    const matrix = propStageMatrix(
      prop,
      outputWidth,
      outputHeight,
      asset.width,
      asset.height,
      stageView,
    );
    const transformed = await sharp(svgTransform(
      asset.buffer,
      outputWidth,
      outputHeight,
      matrix,
      asset.width,
      asset.height,
      prop.opacity / 100,
    )).png().toBuffer();
    props.push({ input: transformed, ...prop });
  }

  for (const { nodePath, variant } of READ_PAINT_PLAN) {
    const node = nodes.get(nodePath);
    if (!node) throw new Error(`missing expected rig READ ${nodePath}`);
    const sampled = poseRuntime
      ? poseRuntime.sampleNodeAtFrame(node, columns, frame)
      : sampleNode(node, columns, frame);
    if ((sampled.attrs?.opacity ?? 100) <= 0) continue;
    let drawing = poseRuntime
      ? poseRuntime.resolveDrawing(node, frame)
      : resolveReadDrawing(manifest, scene, node, frame);
    if (mouthDrawing !== null && nodePath.endsWith("/Mouth")) {
      if (!drawing) throw new Error("mouth override requires a visible registered Mouth drawing");
      const drawingNumber = String(mouthDrawing);
      drawing = {
        ...drawing,
        drawing: drawingNumber,
        file: `${drawing.element}/${drawing.element}-${drawingNumber}.tvg`,
      };
    }
    if (!drawing) continue;
    const filename = assetFilename(drawing, variant);
    const asset = await readTightAsset(
      assetRoot,
      filename,
      registration,
      assetCache,
      drawing.sourceXstageSha256 ?? null,
    );
    if (!asset && variant !== "main") continue;
    if (!asset) throw new Error(`compiled asset is missing ${filename}`);
    let renderBuffer = asset.buffer;
    const isBackBang = nodePath.endsWith("/Bangs_back") && variant === "main";
    const hidesUpperBackBangPatch = isBackBang
      && ["1", "3"].includes(String(drawing.drawing));
    let backBangComposite = null;
    if (hidesUpperBackBangPatch) {
      const derivedKey = `derived:${path.join(assetRoot, filename)}:hidden-upper-fill`;
      if (!assetCache.has(derivedKey)) {
        assetCache.set(derivedKey, hideUpperBackBangPatch(asset.buffer));
      }
      backBangComposite = await assetCache.get(derivedKey);
      renderBuffer = backBangComposite.buffer;
    }
    const isHeadBase = nodePath.endsWith("/Head_Base") && variant === "main";
    const restoresForeheadShade = isHeadBase && ["1", "3"].includes(String(drawing.drawing));
    if (nodePath.endsWith("/Collar") && variant === "main") {
      const derivedKey = `derived:${path.join(assetRoot, filename)}:skin-fill`;
      if (!assetCache.has(derivedKey)) {
        assetCache.set(derivedKey, fillEnclosedOutline(
          asset.buffer,
          asset.canvas.width,
          asset.canvas.height,
          SHAZ_SKIN_COLOR,
        ));
      }
      renderBuffer = await assetCache.get(derivedKey);
    }
    if ((nodePath.endsWith("/Left_Hand") || nodePath.endsWith("/Right_Hand"))
      && variant === "main") {
      const derivedKey = `derived:${path.join(assetRoot, filename)}:skin-fill`;
      if (!assetCache.has(derivedKey)) {
        assetCache.set(derivedKey, fillEnclosedOutline(
          asset.buffer,
          asset.canvas.width,
          asset.canvas.height,
          SHAZ_SKIN_COLOR,
        ));
      }
      renderBuffer = await assetCache.get(derivedKey);
    }
    const isConstructionFill = (nodePath.endsWith("/Left_Arm")
      || nodePath.endsWith("/Right_Arm")) && variant === "main";
    if (isConstructionFill) {
      const derivedKey = `derived:${path.join(assetRoot, filename)}:outline-free-construction-fill`;
      if (!assetCache.has(derivedKey)) {
        assetCache.set(derivedKey, fillEnclosedOutline(
          asset.buffer,
          asset.canvas.width,
          asset.canvas.height,
          SHAZ_HOODIE_COLOR,
          false,
        ));
      }
      renderBuffer = await assetCache.get(derivedKey);
    }
    let renderAsset = {
      buffer: renderBuffer,
      canvas: asset.canvas,
      modelOrigin: asset.modelOrigin,
      modelUnitsPerPixel: 1,
    };
    let deformation = null;
    if (variant === "main") {
      const deformationSourceFrame = poseRuntime?.deformationSourceFrameAtFrame(frame) ?? frame;
      const deformationIdentity = poseRuntime
        ? `${poseRuntime.recipeSha256}:${poseRuntime.deformationCacheIdentityAtFrame(frame)}`
        : `source-frame:${deformationSourceFrame}`;
      const derivedKey = `deformed:${path.join(assetRoot, filename)}:${deformationIdentity}`;
      if (!assetCache.has(derivedKey)) {
        assetCache.set(derivedKey, deformRegisteredAsset({
          buffer: renderBuffer,
          asset,
          nodePath,
          nodes,
          columns,
          frame,
          grid: fieldGridForManifest(manifest),
          sampleNodeAtFrame: poseRuntime?.sampleNodeAtFrame,
        }));
      }
      deformation = await assetCache.get(derivedKey);
      if (deformation) renderAsset = deformation;
    }
    const matrix = tightStageMatrix(
      matrices.get(nodePath) ?? identity(),
      manifest,
      outputWidth,
      outputHeight,
      renderAsset.modelOrigin,
      renderAsset.modelUnitsPerPixel,
      stageView,
    );
    let transformed = await sharp(svgTransform(
      renderAsset.buffer,
      outputWidth,
      outputHeight,
      matrix,
      renderAsset.canvas.width,
      renderAsset.canvas.height,
    )).png().toBuffer();
    let eyeClearanceMask = null;
    let eyeEnvelopePixelCount;
    const isEye = (nodePath.endsWith("/Left_Eye") || nodePath.endsWith("/Right_Eye"))
      && variant === "main";
    if (isEye) {
      const envelopeKey = `derived:${path.join(assetRoot, filename)}:round-eye-envelope:${
        deformation ? frame : "static"
      }`;
      if (!assetCache.has(envelopeKey)) {
        assetCache.set(envelopeKey, createRoundEyeEnvelope(renderAsset.buffer));
      }
      const envelope = await assetCache.get(envelopeKey);
      eyeEnvelopePixelCount = envelope.envelopePixelCount;
      eyeClearanceMask = await sharp(svgTransform(
        envelope.buffer,
        outputWidth,
        outputHeight,
        matrix,
        renderAsset.canvas.width,
        renderAsset.canvas.height,
      )).png().toBuffer();
    }
    let foreheadShadePixelCount;
    if (restoresForeheadShade) {
      const shadeFilename = "head-base-02.png";
      const shadeAsset = await readTightAsset(
        assetRoot,
        shadeFilename,
        registration,
        assetCache,
      );
      if (!shadeAsset) throw new Error(`compiled asset is missing ${shadeFilename}`);
      const shadeKey = `derived:${path.join(assetRoot, shadeFilename)}:forehead-shade`;
      if (!assetCache.has(shadeKey)) {
        assetCache.set(shadeKey, extractHeadBaseForeheadShade(shadeAsset.buffer));
      }
      const shade = await assetCache.get(shadeKey);
      foreheadShadePixelCount = shade.shadePixelCount;
      const shadeMatrix = tightStageMatrix(
        matrices.get(nodePath) ?? identity(),
        manifest,
        outputWidth,
        outputHeight,
        shadeAsset.modelOrigin,
        1,
        stageView,
      );
      const transformedShade = await sharp(svgTransform(
        shade.buffer,
        outputWidth,
        outputHeight,
        shadeMatrix,
        shadeAsset.canvas.width,
        shadeAsset.canvas.height,
      )).png().toBuffer();
      const expandedShade = await expandFlatShade(transformedShade, shade.shadeColor, 18);
      const rearHair = layers.find((layer) => (
        layer.nodePath.endsWith("/Hair") && layer.variant === "main"
      ));
      if (!rearHair) throw new Error("head-base shade requires the preceding rear hair layer");
      const containedShade = await clipToRearHairShadow(
        expandedShade,
        rearHair.input,
        outputWidth,
        outputHeight,
      );
      rearHair.input = await sharp(rearHair.input)
        .composite([{ input: containedShade.buffer }])
        .png()
        .toBuffer();
      rearHair.compositeRole = "rear-hair-with-artist-forehead-shade";
      rearHair.foreheadShadePixelCount = foreheadShadePixelCount;
      rearHair.replacedForeheadShadowPixelCount = containedShade.replacedPixelCount;
    }
    layers.push({
      input: transformed,
      nodePath,
      drawing,
      variant,
      filename,
      assetSha256: asset.outputSha256,
      compositeRole: isConstructionFill
        ? "hidden-construction-fill"
        : (hidesUpperBackBangPatch
          ? "finished-back-bang-with-upper-patch-hidden"
          : "finished-artwork"),
      ...(backBangComposite ? {
        sourceFillComponentCount: backBangComposite.sourceFillComponentCount,
        hiddenFillComponentCount: backBangComposite.hiddenFillComponentCount,
      } : {}),
      ...(deformation ? {
        deformation: {
          sourceFrame: poseRuntime?.deformationSourceFrameAtFrame(frame) ?? frame,
          maximumDisplacement: deformation.maximumDisplacement,
        },
      } : {}),
      ...(eyeClearanceMask ? { eyeClearanceMask, eyeEnvelopePixelCount } : {}),
    });
  }

  for (const side of ["Left", "Right"]) {
    const constructionFill = layers.find((layer) => (
      layer.nodePath.endsWith(`/${side}_Arm`)
      && layer.compositeRole === "hidden-construction-fill"
    ));
    const sleeve = layers.find((layer) => layer.nodePath.endsWith(`/${side}_Forearm`) && layer.variant === "main");
    const sleeveColor = layers.find((layer) => layer.nodePath.endsWith(`/${side}_Forearm`) && layer.variant === "color");
    const sleeveOverlay = layers.find((layer) => layer.nodePath.endsWith(`/${side}_Forearm`) && layer.variant === "overlay");
    const hand = layers.find((layer) => layer.nodePath.endsWith(`/${side}_Hand`) && layer.variant === "main");
    const overlayHand = layers.find((layer) => (
      layer.nodePath.endsWith("/OL_Hand") && layer.variant === "main"
    ));
    if (constructionFill && sleeve) {
      sleeve.input = await createFinishedSleeve(
        [constructionFill.input, sleeve.input, ...(sleeveColor ? [sleeveColor.input] : [])],
        sleeveOverlay?.input ?? null,
        outputWidth,
        outputHeight,
      );
      sleeve.compositeRole = "finished-sleeve-union";
      sleeve.sourceLayers = [
        constructionFill.nodePath,
        sleeve.nodePath,
        ...(sleeveColor ? [`${sleeveColor.nodePath}:color`] : []),
        ...(sleeveOverlay ? [`${sleeveOverlay.nodePath}:overlay`] : []),
      ];
      constructionFill.consumed = true;
      if (sleeveColor) sleeveColor.consumed = true;
      if (sleeveOverlay) sleeveOverlay.consumed = true;
    }
    if (hand && sleeve) {
      if (String(hand.drawing.drawing) !== "2") {
        hand.input = await clipHandBehindSleeve(
          hand.input,
          sleeve.input,
          outputWidth,
          outputHeight,
        );
        hand.compositeRole = `hand-matted-to-${side.toLowerCase()}-sleeve`;
      } else {
        hand.compositeRole = "authored-open-hand-cuff";
      }
      hand.cuffOwner = side;
    }
    // OL_Hand is the rig's authored front-palm channel for the left wrist.
    // Its cuff ownership comes from recovered rig topology, not a recipe flag.
    if (overlayHand && sleeve && side === "Left") {
      overlayHand.input = await clipHandBehindSleeve(
        overlayHand.input,
        sleeve.input,
        outputWidth,
        outputHeight,
      );
      overlayHand.compositeRole = `overlay-hand-matted-to-${side.toLowerCase()}-sleeve`;
      overlayHand.cuffOwner = side;
    }
  }

  const frontBang = layers.find((layer) => (
    layer.nodePath.endsWith("/Bangs_front") && layer.variant === "main"
  ));
  const eyeLayers = layers.filter((layer) => (
    (layer.nodePath.endsWith("/Left_Eye") || layer.nodePath.endsWith("/Right_Eye"))
    && layer.variant === "main"
  ));
  if (frontBang && eyeLayers.length > 0) {
    const cleared = await clipArtworkBehindMasks(
      frontBang.input,
      eyeLayers.map(({ eyeClearanceMask, input }) => eyeClearanceMask ?? input),
      outputWidth,
      outputHeight,
    );
    frontBang.input = cleared.buffer;
    frontBang.eyeEnvelopeClearancePixelCount = cleared.clearedPixelCount;
  }

  const activeLayers = applyArmPaintOrder(
    layers.filter(({ consumed }) => !consumed),
    poseRuntime?.recipe.quality?.armPaintOrder,
  );
  const baseCharacter = await sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(activeLayers.map(({ input }) => ({ input }))).png().toBuffer();
  const baseComponentCount = await significantAlphaComponentCount(baseCharacter);
  const firstHeadLayer = activeLayers.findIndex((layer) => (
    layer.nodePath.includes("/Head_Group/")
  ));
  const bodyLayerEnd = firstHeadLayer < 0 ? activeLayers.length : firstHeadLayer;

  const output = await sharp({
    create: { width: outputWidth, height: outputHeight, channels: 4, background },
  }).composite([
    ...props.filter(({ layer }) => layer === "behind").map(({ input }) => ({ input })),
    ...activeLayers.slice(0, bodyLayerEnd).map(({ input }) => ({ input })),
    ...props.filter(({ layer }) => layer === "body-front").map(({ input }) => ({ input })),
    ...activeLayers.slice(bodyLayerEnd).map(({ input }) => ({ input })),
    ...props.filter(({ layer }) => layer === "front").map(({ input }) => ({ input })),
  ]).png().toBuffer();

  return {
    buffer: output,
    ...(includeLayerBuffers ? { analysisLayers: activeLayers } : {}),
    ...(includeLayerBuffers ? {
      analysisConstructionLayers: layers.filter((layer) => (
        layer.compositeRole === "hidden-construction-fill"
      )),
    } : {}),
    ...(includeLayerBuffers ? { analysisProps: props } : {}),
    receipt: {
      schemaVersion: "shaz-rig-v2-frame-receipt-v1",
      sourceXstageSha256: manifest.source.sha256,
      assetReceiptSchema: registration.receipt.schemaVersion,
      frame,
      renderer: "tight-tvg-layers-plus-absolute-rig-world-matrices",
      mode: poseRuntime ? "pose-recipe" : "xstage-calibration",
      ...(poseRuntime ? {
        poseRecipeId: poseRuntime.recipe.id,
        poseRecipeSha256: poseRuntime.recipeSha256,
      } : {}),
      artistRenderedFramesUsed: false,
      ...(mouthDrawing !== null ? { mouthDrawingOverride: String(mouthDrawing) } : {}),
      stageView,
      baseComponentCount,
      props: props.map(({ input, ...prop }) => prop),
      layers: activeLayers.map(({
        nodePath,
        drawing,
        variant,
        filename,
        deformation,
        compositeRole,
        cuffOwner,
        sourceLayers,
        sourceFillComponentCount,
        hiddenFillComponentCount,
        foreheadShadePixelCount,
        replacedForeheadShadowPixelCount,
        eyeEnvelopePixelCount,
        eyeEnvelopeClearancePixelCount,
      }) => ({
        nodePath,
        element: drawing.element,
        drawing: drawing.drawing,
        ...(drawing.sourceXstageSha256
          ? { sourceXstageSha256: drawing.sourceXstageSha256 }
          : {}),
        variant,
        filename,
        compositeRole,
        ...(cuffOwner ? { cuffOwner } : {}),
        ...(sourceLayers ? { sourceLayers } : {}),
        ...(sourceFillComponentCount !== undefined ? { sourceFillComponentCount } : {}),
        ...(hiddenFillComponentCount !== undefined ? { hiddenFillComponentCount } : {}),
        ...(foreheadShadePixelCount !== undefined ? { foreheadShadePixelCount } : {}),
        ...(replacedForeheadShadowPixelCount !== undefined
          ? { replacedForeheadShadowPixelCount }
          : {}),
        ...(eyeEnvelopePixelCount !== undefined ? { eyeEnvelopePixelCount } : {}),
        ...(eyeEnvelopeClearancePixelCount !== undefined
          ? { eyeEnvelopeClearancePixelCount }
          : {}),
        ...(deformation ? { deformation } : {}),
      })),
    },
  };
}

async function loadManifest(manifestPath) {
  return JSON.parse(await fs.readFile(manifestPath, "utf8"));
}

export {
  applyArmPaintOrder,
  ELEMENT_ASSET_IDS,
  READ_PAINT_ORDER,
  READ_PAINT_PLAN,
  assetFilename,
  clipHandBehindSleeve,
  clipArtworkBehindMasks,
  createFinishedSleeve,
  createRoundEyeEnvelope,
  clipToRearHairShadow,
  expandFlatShade,
  fillEnclosedOutline,
  fieldGridForManifest,
  hideUpperBackBangPatch,
  extractHeadBaseForeheadShade,
  loadAssetRegistration,
  loadManifest,
  propStageMatrix,
  renderRigFrame,
  significantAlphaComponentCount,
  tightStageMatrix,
};
