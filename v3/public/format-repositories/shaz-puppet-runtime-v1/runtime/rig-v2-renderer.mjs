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

// Highest Composite input ports paint last in this scene. AutoPatch receives
// the forearm and extracts its Colour Art above the upper arm; Overlay then
// restores any authored Overlay Art. This plan is recovered once from the
// Xstage graph and applies to every pose.
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
  { nodePath: READ_PAINT_ORDER[0], variant: "main" },
  { nodePath: READ_PAINT_ORDER[1], variant: "main" },
  { nodePath: READ_PAINT_ORDER[2], variant: "main" },
  { nodePath: READ_PAINT_ORDER[1], variant: "color" },
  { nodePath: READ_PAINT_ORDER[1], variant: "overlay" },
  ...READ_PAINT_ORDER.slice(3, 10).map((nodePath) => ({ nodePath, variant: "main" })),
  { nodePath: READ_PAINT_ORDER[8], variant: "color" },
  { nodePath: READ_PAINT_ORDER[8], variant: "overlay" },
  ...READ_PAINT_ORDER.slice(10).map((nodePath) => ({ nodePath, variant: "main" })),
]);

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

function assetFilename(drawing, variant = "main") {
  const assetId = ELEMENT_ASSET_IDS[drawing.element];
  if (!assetId) throw new Error(`no TVG asset mapping for ${drawing.element}`);
  const suffix = variant === "main" ? "" : `--${variant}`;
  return `${assetId}-${String(drawing.drawing).padStart(2, "0")}${suffix}.png`;
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

function tightStageMatrix(worldMatrix, manifest, outputWidth, outputHeight, modelOrigin) {
  const [sourceWidth, sourceHeight] = manifest.stage.resolution.size;
  const pixelsPerModelUnit = manifest.stage.pixelPerModelUnitForVectorLayers;
  const stage = [
    pixelsPerModelUnit * outputWidth / sourceWidth,
    0,
    0,
    pixelsPerModelUnit * outputHeight / sourceHeight,
    outputWidth / 2,
    outputHeight / 2,
  ];
  return multiply(stage, multiply(
    worldMatrix,
    translation(modelOrigin.x, modelOrigin.y),
  ));
}

async function loadAssetRegistration(assetRoot, sourceXstageSha256) {
  const receipt = JSON.parse(await fs.readFile(path.join(assetRoot, "receipt.json"), "utf8"));
  if (receipt.schemaVersion !== "shaz-tvg-asset-receipt-v2") {
    throw new Error(`unsupported Shaz asset receipt ${receipt.schemaVersion}`);
  }
  if (receipt.artistRenderedFramesUsed !== false) {
    throw new Error("asset receipt does not prove artist-frame exclusion");
  }
  if (receipt.sourceXstageSha256 !== sourceXstageSha256) {
    throw new Error("asset receipt was compiled from a different Xstage source");
  }
  const assets = new Map(receipt.assets.map((asset) => [asset.filename, asset]));
  if (assets.size === 0 || assets.size !== receipt.assets.length
    || [...assets.values()].some((asset) => (
      !Number.isFinite(asset.canvas?.width)
      || !Number.isFinite(asset.canvas?.height)
      || !Number.isFinite(asset.modelOrigin?.x)
      || !Number.isFinite(asset.modelOrigin?.y)
    ))) {
    throw new Error("asset receipt contains invalid model-space registrations");
  }
  return { assets, receipt };
}

async function readTightAsset(assetRoot, filename, registration, cache) {
  const record = registration.assets.get(filename);
  if (!record) return null;
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

function propStageMatrix(prop, outputWidth, outputHeight, imageWidth, imageHeight) {
  const pixelWidth = prop.width * outputWidth;
  const scale = pixelWidth / imageWidth;
  const centerX = prop.position[0] * outputWidth;
  const centerY = prop.position[1] * outputHeight;
  return [
    translation(centerX, centerY),
    rotationMatrix(prop.rotation),
    scaleMatrix(scale, scale),
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
  background = { r: 255, g: 255, b: 255, alpha: 1 },
  assetCache = new Map(),
  propCache = new Map(),
  includeLayerBuffers = false,
}) {
  if (manifest.schemaVersion !== "harmony-xstage-runtime-v1") {
    throw new Error(`unsupported manifest schema ${manifest.schemaVersion}`);
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
    const drawing = poseRuntime
      ? poseRuntime.resolveDrawing(node, frame)
      : resolveReadDrawing(manifest, scene, node, frame);
    if (!drawing) continue;
    const filename = assetFilename(drawing, variant);
    const asset = await readTightAsset(
      assetRoot,
      filename,
      registration,
      assetCache,
    );
    if (!asset && variant !== "main") continue;
    if (!asset) throw new Error(`compiled asset is missing ${filename}`);
    const matrix = tightStageMatrix(
      matrices.get(nodePath) ?? identity(),
      manifest,
      outputWidth,
      outputHeight,
      asset.modelOrigin,
    );
    const transformed = await sharp(svgTransform(
      asset.buffer,
      outputWidth,
      outputHeight,
      matrix,
      asset.canvas.width,
      asset.canvas.height,
    )).png().toBuffer();
    layers.push({ input: transformed, nodePath, drawing, variant, filename });
  }

  const output = await sharp({
    create: { width: outputWidth, height: outputHeight, channels: 4, background },
  }).composite([
    ...props.filter(({ layer }) => layer === "behind").map(({ input }) => ({ input })),
    ...layers.map(({ input }) => ({ input })),
    ...props.filter(({ layer }) => layer === "front").map(({ input }) => ({ input })),
  ]).png().toBuffer();

  return {
    buffer: output,
    ...(includeLayerBuffers ? { analysisLayers: layers } : {}),
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
      props: props.map(({ input, ...prop }) => prop),
      layers: layers.map(({ nodePath, drawing, variant, filename }) => ({
        nodePath,
        element: drawing.element,
        drawing: drawing.drawing,
        variant,
        filename,
      })),
    },
  };
}

async function loadManifest(manifestPath) {
  return JSON.parse(await fs.readFile(manifestPath, "utf8"));
}

export {
  ELEMENT_ASSET_IDS,
  READ_PAINT_ORDER,
  READ_PAINT_PLAN,
  assetFilename,
  fieldGridForManifest,
  loadAssetRegistration,
  loadManifest,
  propStageMatrix,
  renderRigFrame,
  tightStageMatrix,
};
