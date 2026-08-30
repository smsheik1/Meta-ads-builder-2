#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  createPoseRuntime,
  loadPoseRecipe,
} from "./pose-recipe.mjs";
import {
  applyArmPaintOrder,
  loadManifest,
  READ_PAINT_PLAN,
  renderRigFrame,
} from "./rig-v2-renderer.mjs";

const ALPHA_THRESHOLD = 24;
const MIN_COMPONENT_PIXELS = 12;
const LIMB_PROP_PATTERN = /(?:arm|forearm|sleeve|hand|fist)/i;
const REGISTERED_NON_LIMB_PROPS = new Map([
  ["phone", {
    asset: "phone.svg",
    sha256: "aadcadb428f4f63ad54ed9575e5120a8519a3520af3b2460714a337a1fd21975",
  }],
]);
const REGISTERED_POSE_REPLACEMENTS = new Map([
  ["crossed-arms-pose", {
    asset: "crossed-arms-pose.png",
    sha256: "73e73755a77822989fd466ab6fe79591b176bbe9ea68940a46359c999a84e311",
    layer: "body-front",
    position: [0.41796875, 0.621875],
    width: 0.2578125,
    scale: [1, 1],
    rotation: 0,
    opacity: 100,
  }],
]);
const OBSERVED_HAND_LIMITS = {
  "hand-matted": {
    maximumHandToSleeveAreaRatio: 0.45,
    maximumHandToHeadWidthRatio: 0.8,
  },
  "authored-open-hand-cuff": {
    maximumHandToSleeveAreaRatio: 0.56,
    maximumHandToHeadWidthRatio: 0.82,
  },
  "overlay-hand-matted": {
    maximumHandToSleeveAreaRatio: 0.65,
    maximumHandToHeadWidthRatio: 0.9,
  },
};

function parseArgs(values) {
  const args = {
    manifest: null,
    assets: null,
    propAssets: null,
    recipe: null,
    output: null,
  };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--manifest") args.manifest = values[++index];
    else if (value === "--assets") args.assets = values[++index];
    else if (value === "--prop-assets") args.propAssets = values[++index];
    else if (value === "--recipe") args.recipe = values[++index];
    else if (value === "--output") args.output = values[++index];
    else throw new Error(`unknown argument ${value}`);
  }
  if (!args.manifest || !args.assets || !args.recipe || !args.output) {
    throw new Error("usage: inspect-pose.mjs --manifest runtime.json --assets assets [--prop-assets props] --recipe pose.json --output inspection.json");
  }
  return args;
}

async function alphaStats(buffer, analysisWidth = 640) {
  const { data, info } = await sharp(buffer)
    .resize({ width: analysisWidth })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let weightedX = 0;
  let weightedY = 0;
  let alphaSum = 0;
  let opaquePixels = 0;
  const mask = new Uint8Array(info.width * info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const pixel = y * info.width + x;
      const alpha = data[pixel * info.channels + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      mask[pixel] = 1;
      opaquePixels += 1;
      alphaSum += alpha;
      weightedX += x * alpha;
      weightedY += y * alpha;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (opaquePixels === 0) return { empty: true, width: info.width, height: info.height };

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  const components = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let size = 0;
    let componentMinX = info.width;
    let componentMinY = info.height;
    let componentMaxX = -1;
    let componentMaxY = -1;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const pixel = queue[head++];
      size += 1;
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      componentMinX = Math.min(componentMinX, x);
      componentMinY = Math.min(componentMinY, y);
      componentMaxX = Math.max(componentMaxX, x);
      componentMaxY = Math.max(componentMaxY, y);
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
    if (size >= MIN_COMPONENT_PIXELS) {
      components.push({
        pixels: size,
        bbox: {
          minX: componentMinX,
          minY: componentMinY,
          maxX: componentMaxX,
          maxY: componentMaxY,
        },
      });
    }
  }
  components.sort((left, right) => right.pixels - left.pixels);
  return {
    empty: false,
    width: info.width,
    height: info.height,
    bbox: { minX, minY, maxX, maxY },
    centroid: { x: weightedX / alphaSum, y: weightedY / alphaSum },
    opaquePixels,
    componentPixels: components.map(({ pixels }) => pixels),
    components,
  };
}

async function nearWhitePixelCount(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    if (data[index] >= 245
      && data[index + 1] >= 245
      && data[index + 2] >= 245
      && data[index + 3] >= 245) count += 1;
  }
  return count;
}

async function alphaContactPixelCount(left, right, radius = 3, analysisWidth = 640) {
  const [leftRaw, rightRaw] = await Promise.all([
    sharp(left).resize({ width: analysisWidth }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(right).resize({ width: analysisWidth }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (leftRaw.info.width !== rightRaw.info.width || leftRaw.info.height !== rightRaw.info.height) {
    throw new Error("contact masks must have matching dimensions");
  }
  let contactPixels = 0;
  for (let y = 0; y < leftRaw.info.height; y += 1) {
    for (let x = 0; x < leftRaw.info.width; x += 1) {
      const leftOffset = (y * leftRaw.info.width + x) * leftRaw.info.channels;
      if (leftRaw.data[leftOffset + 3] <= ALPHA_THRESHOLD) continue;
      let touches = false;
      for (let dy = -radius; dy <= radius && !touches; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const rightX = x + dx;
          const rightY = y + dy;
          if (rightX < 0 || rightX >= rightRaw.info.width
            || rightY < 0 || rightY >= rightRaw.info.height) continue;
          const rightOffset = (rightY * rightRaw.info.width + rightX) * rightRaw.info.channels;
          if (rightRaw.data[rightOffset + 3] > ALPHA_THRESHOLD) {
            touches = true;
            break;
          }
        }
      }
      if (touches) contactPixels += 1;
    }
  }
  return contactPixels;
}

async function alphaOverlapPixelCount(leftBuffers, rightBuffers, analysisWidth = 640) {
  const left = Array.isArray(leftBuffers) ? leftBuffers : [leftBuffers];
  const right = Array.isArray(rightBuffers) ? rightBuffers : [rightBuffers];
  if (left.length === 0 || right.length === 0) return 0;
  const masks = await Promise.all([...left, ...right].map((buffer) => (
    sharp(buffer)
      .resize({ width: analysisWidth })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
  )));
  const [first, ...rest] = masks;
  if (rest.some(({ info }) => (
    info.width !== first.info.width || info.height !== first.info.height
  ))) {
    throw new Error("overlap masks must have matching dimensions");
  }
  const leftMasks = masks.slice(0, left.length);
  const rightMasks = masks.slice(left.length);
  let overlapPixels = 0;
  for (let pixel = 0; pixel < first.info.width * first.info.height; pixel += 1) {
    const leftVisible = leftMasks.some(({ data, info }) => (
      data[pixel * info.channels + 3] > ALPHA_THRESHOLD
    ));
    if (!leftVisible) continue;
    const rightVisible = rightMasks.some(({ data, info }) => (
      data[pixel * info.channels + 3] > ALPHA_THRESHOLD
    ));
    if (rightVisible) overlapPixels += 1;
  }
  return overlapPixels;
}

function paintPlanKey(entry) {
  return `${entry.nodePath}:${entry.variant}`;
}

function registeredNonLimbProp(prop) {
  const registered = REGISTERED_NON_LIMB_PROPS.get(prop.id);
  return Boolean(registered
    && prop.asset === registered.asset
    && prop.sha256 === registered.sha256
    && !LIMB_PROP_PATTERN.test(`${prop.id ?? ""} ${prop.asset ?? ""}`));
}

function nearlyEqual(left, right, epsilon = 1e-9) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= epsilon;
}

function registeredPoseReplacement(prop) {
  const registered = REGISTERED_POSE_REPLACEMENTS.get(prop.id);
  return Boolean(registered
    && prop.asset === registered.asset
    && prop.sha256 === registered.sha256
    && prop.layer === registered.layer
    && Array.isArray(prop.position)
    && prop.position.length === 2
    && prop.position.every((value, index) => nearlyEqual(value, registered.position[index]))
    && nearlyEqual(prop.width, registered.width)
    && Array.isArray(prop.scale)
    && prop.scale.length === 2
    && prop.scale.every((value, index) => nearlyEqual(value, registered.scale[index]))
    && nearlyEqual(prop.rotation, registered.rotation)
    && nearlyEqual(prop.opacity, registered.opacity));
}

function hasVisibleNativeArmArtwork(layers) {
  return layers.some((layer) => (
    /\/(?:Left|Right)_(?:Arm|Forearm|Hand)$/.test(layer.nodePath)
    || layer.nodePath.endsWith("/OL_Hand")
  ));
}

function observedHandLimits(handLayer) {
  if (handLayer.compositeRole === "authored-open-hand-cuff") {
    return OBSERVED_HAND_LIMITS["authored-open-hand-cuff"];
  }
  if (String(handLayer.compositeRole ?? "").startsWith("overlay-hand-matted-to-")) {
    return OBSERVED_HAND_LIMITS["overlay-hand-matted"];
  }
  return OBSERVED_HAND_LIMITS["hand-matted"];
}

function effectiveHandLimits(handLayer, requested = {}) {
  const observed = observedHandLimits(handLayer);
  return {
    minimumHandToSleeveAreaRatio: requested.minimumHandToSleeveAreaRatio ?? 0.1,
    maximumHandToSleeveAreaRatio: Math.min(
      requested.maximumHandToSleeveAreaRatio ?? observed.maximumHandToSleeveAreaRatio,
      observed.maximumHandToSleeveAreaRatio,
    ),
    maximumHandToHeadWidthRatio: Math.min(
      requested.maximumHandToHeadWidthRatio ?? observed.maximumHandToHeadWidthRatio,
      observed.maximumHandToHeadWidthRatio,
    ),
  };
}

function shoulderAnchorValid(side, upperArmStats, bodyStats, mirrored = false) {
  if (upperArmStats?.empty || bodyStats?.empty) return false;
  const bodyWidth = bodyStats.bbox.maxX - bodyStats.bbox.minX + 1;
  const minimumLateralMargin = bodyWidth * 0.2;
  const leftAppearsOnScreenLeft = side === "Left" ? !mirrored : mirrored;
  return leftAppearsOnScreenLeft
    ? upperArmStats.centroid.x <= bodyStats.centroid.x - minimumLateralMargin
    : upperArmStats.centroid.x >= bodyStats.centroid.x + minimumLateralMargin;
}

function finishedSleeveValid(stats) {
  return !stats?.empty && stats.components?.length === 1;
}

function paintOrderValid(layers, recipe = {}) {
  const actual = layers.map(paintPlanKey);
  const visible = new Set(actual);
  const expected = applyArmPaintOrder(
    READ_PAINT_PLAN.filter((entry) => visible.has(paintPlanKey(entry))),
    recipe.quality?.armPaintOrder,
  ).map(paintPlanKey);
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function crossedPaintOrderEligible(recipe, maximumCrossoverPixels) {
  return recipe.quality?.armPaintOrder !== "both-front-left-under-right"
    || maximumCrossoverPixels >= 20;
}

function rightFrontPaintOrderEligible(recipe, maximumHeadOverlapPixels) {
  return recipe.quality?.armPaintOrder !== "right-front-of-head"
    || maximumHeadOverlapPixels >= 20;
}

function armCompositeValid(layers, recipe = {}, frame = null) {
  for (const side of ["Left", "Right"]) {
    if (layers.some((layer) => layer.nodePath.endsWith(`/${side}_Arm`))) return false;
    const forearm = layers.findIndex((layer) => (
      layer.nodePath.endsWith(`/${side}_Forearm`)
      && layer.variant === "main"
      && layer.compositeRole === "finished-sleeve-union"
    ));
    if (forearm < 0) return false;
    const allowedHands = side === "Left"
      ? [`/${side}_Hand`, "/OL_Hand"]
      : [`/${side}_Hand`];
    const hands = layers.filter((layer, index) => (
      index > forearm
      && layer.variant === "main"
      && allowedHands.some((suffix) => layer.nodePath.endsWith(suffix))
    ));
    if (hands.length !== 1) return false;
    const [handLayer] = hands;
    const acceptedRole = new Set([
        `hand-matted-to-${side.toLowerCase()}-sleeve`,
        `overlay-hand-matted-to-${side.toLowerCase()}-sleeve`,
      ]).has(handLayer.compositeRole)
      || handLayer.compositeRole === "authored-open-hand-cuff";
    if (handLayer.cuffOwner !== side || !acceptedRole) return false;
  }
  return true;
}

function armTopologyValid(layers, props, recipe, frame = null) {
  if (recipe.quality?.armCompositeMode === "registered-pose-replacement") {
    const replacements = props.filter(registeredPoseReplacement);
    const unsupported = props.filter((prop) => (
      !registeredNonLimbProp(prop) && !registeredPoseReplacement(prop)
    ));
    if (unsupported.length > 0 || replacements.length > 1) return false;
    if (replacements.length === 1) {
      return !hasVisibleNativeArmArtwork(layers);
    }
    return props.every(registeredNonLimbProp) && armCompositeValid(layers, recipe, frame);
  }
  return props.every(registeredNonLimbProp) && armCompositeValid(layers, recipe, frame);
}

function hairCompositeValid(layers) {
  const rearHair = layers.find((layer) => (
    layer.nodePath.endsWith("/Hair") && layer.variant === "main"
  ));
  const backBang = layers.find((layer) => (
    layer.nodePath.endsWith("/Bangs_back") && layer.variant === "main"
  ));
  const headBase = layers.find((layer) => (
    layer.nodePath.endsWith("/Head_Base") && layer.variant === "main"
  ));
  if (!rearHair || !backBang || !headBase
    || rearHair.compositeRole !== "rear-hair-with-artist-forehead-shade"
    || rearHair.foreheadShadePixelCount <= 0
    || rearHair.replacedForeheadShadowPixelCount <= 0) return false;
  const requiresPatchMask = ["1", "3"].includes(String(backBang.drawing));
  if (!requiresPatchMask) return backBang.compositeRole === "finished-artwork";
  return Boolean(backBang.compositeRole === "finished-back-bang-with-upper-patch-hidden"
    && backBang.sourceFillComponentCount >= 1
    && backBang.hiddenFillComponentCount > 0
    && backBang.hiddenFillComponentCount < backBang.sourceFillComponentCount);
}

function eyeEnvelopeCompositeValid(layers) {
  const frontBang = layers.find((layer) => (
    layer.nodePath.endsWith("/Bangs_front") && layer.variant === "main"
  ));
  const eyes = layers.filter((layer) => (
    (layer.nodePath.endsWith("/Left_Eye") || layer.nodePath.endsWith("/Right_Eye"))
    && layer.variant === "main"
  ));
  return Boolean(frontBang
    && eyes.length === 2
    && Number.isInteger(frontBang.eyeEnvelopeClearancePixelCount)
    && frontBang.eyeEnvelopeClearancePixelCount >= 0
    && eyes.every((eye) => Number.isInteger(eye.eyeEnvelopePixelCount)
      && eye.eyeEnvelopePixelCount > 0));
}

async function opaqueMaskOverlapPixelCount(artwork, masks) {
  const [artworkRaw, ...maskRaws] = await Promise.all([
    sharp(artwork).ensureAlpha().raw().toBuffer(),
    ...masks.map((mask) => sharp(mask).ensureAlpha().raw().toBuffer()),
  ]);
  let overlap = 0;
  for (let offset = 0; offset < artworkRaw.length; offset += 4) {
    if (artworkRaw[offset + 3] <= ALPHA_THRESHOLD) continue;
    if (maskRaws.some((mask) => mask[offset + 3] >= 240)) overlap += 1;
  }
  return overlap;
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function maximumConsecutiveEqual(values) {
  let maximum = 0;
  let current = 0;
  let previous;
  for (const value of values) {
    current = value === previous ? current + 1 : 1;
    maximum = Math.max(maximum, current);
    previous = value;
  }
  return maximum;
}

function expectedEdgesForFrame(recipe, frame) {
  const policies = recipe.quality?.sourceApprovedEdgeContacts ?? [];
  if (policies.length > 0
    && recipe.sourceAction?.generatedFrom !== "xstage-control-channels-and-drawing-exposures") {
    throw new Error("edge-contact exceptions are allowed only for Xstage calibration recipes");
  }
  return new Set(policies.filter((policy) => (
    Array.isArray(policy.frames)
    && policy.frames.length === 2
    && frame >= policy.frames[0]
    && frame <= policy.frames[1]
  )).map((policy) => policy.edge));
}

async function inspectPose({ manifest, assetRoot, propRoot = null, recipe }) {
  const poseRuntime = createPoseRuntime(manifest, recipe);
  const masterNode = manifest.scenes[0]?.nodes.find(({ name }) => name === "Shaz_Master-P");
  const failures = [];
  const approvedEdgeContacts = [];
  const frameReports = [];
  const previousFace = new Map();
  const previousLimbProps = new Map();
  const previousNativeArms = new Map();
  const assetCache = new Map();
  const propCache = new Map();
  const renderedFrameHashes = [];
  let maximumNativeSleeveCrossoverPixels = 0;
  let maximumRightArmHeadBaseOverlapPixels = 0;

  for (let frame = 1; frame <= recipe.durationFrames; frame += 1) {
    const masterSample = masterNode
      ? poseRuntime.sampleNodeAtFrame(masterNode, null, frame)
      : null;
    const mirrored = Boolean(masterSample?.attrs?.flipHor);
    const rendered = await renderRigFrame({
      manifest,
      frame,
      assetRoot,
      propRoot,
      poseRuntime,
      assetCache,
      propCache,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      includeLayerBuffers: true,
    });
    renderedFrameHashes.push(crypto.createHash("sha256").update(rendered.buffer).digest("hex"));
    if (rendered.receipt.artistRenderedFramesUsed !== false
      || rendered.receipt.poseRecipeSha256 !== poseRuntime.recipeSha256) {
      failures.push({ frame, gate: "provenance", detail: "frame receipt lost recipe provenance" });
    }
    if (!paintOrderValid(rendered.receipt.layers, recipe)) {
      failures.push({ frame, gate: "layer-order", detail: "frame layers do not follow READ_PAINT_PLAN" });
    }
    if (!armTopologyValid(rendered.receipt.layers, rendered.receipt.props, recipe, frame)) {
      failures.push({
        frame,
        gate: "arm-composite",
        detail: recipe.quality?.armCompositeMode === "registered-pose-replacement"
          ? "use either both complete native arm chains or the exact registered pose drawing at its locked placement, never both"
          : "use the connected native arm chain; independent sleeve, hand, forearm, fist, or flattened arm props are forbidden",
      });
    }
    if (!hairCompositeValid(rendered.receipt.layers)) {
      failures.push({
        frame,
        gate: "hair-composite",
        detail: "the rear-hair forehead wedge must use the artist shade and the back bang must expose only its intended component",
      });
    }
    const frontBangLayer = rendered.analysisLayers.find((layer) => (
      layer.nodePath.endsWith("/Bangs_front") && layer.variant === "main"
    ));
    const eyeLayers = rendered.analysisLayers.filter((layer) => (
      (layer.nodePath.endsWith("/Left_Eye") || layer.nodePath.endsWith("/Right_Eye"))
      && layer.variant === "main"
    ));
    let eyeEnvelopeOverlapPixels = null;
    if (!eyeEnvelopeCompositeValid(rendered.receipt.layers)
      || !frontBangLayer
      || eyeLayers.length !== 2
      || eyeLayers.some((layer) => !layer.eyeClearanceMask)) {
      failures.push({
        frame,
        gate: "eye-occlusion",
        detail: "both eyes and the front bang must preserve the semantic eye-envelope composite",
      });
    } else {
      eyeEnvelopeOverlapPixels = await opaqueMaskOverlapPixelCount(
        frontBangLayer.input,
        eyeLayers.map(({ eyeClearanceMask }) => eyeClearanceMask),
      );
      if (eyeEnvelopeOverlapPixels > 0) {
        failures.push({
          frame,
          gate: "eye-occlusion",
          detail: `${eyeEnvelopeOverlapPixels} opaque front-bang pixels remain inside the eye envelopes`,
        });
      }
    }
    const backBangLayer = rendered.analysisLayers.find((layer) => (
      layer.nodePath.endsWith("/Bangs_back") && layer.variant === "main"
    ));
    const backBang = backBangLayer ? await alphaStats(backBangLayer.input) : { empty: true };
    const backBangNeedsMask = backBangLayer
      && ["1", "3"].includes(String(backBangLayer.drawing.drawing));
    if (backBangNeedsMask && (backBang.empty || backBang.componentPixels.length !== 1)) {
      failures.push({
        frame,
        gate: "hair-composite",
        detail: `back bang rendered ${backBang.empty ? 0 : backBang.componentPixels.length} visible components instead of one`,
      });
    }
    const collarLayer = rendered.analysisLayers.find((layer) => (
      layer.nodePath.endsWith("/Collar") && layer.variant === "main"
    ));
    const collar = collarLayer ? await alphaStats(collarLayer.input) : { empty: true };
    const collarArea = collar.empty
      ? 0
      : (collar.bbox.maxX - collar.bbox.minX + 1) * (collar.bbox.maxY - collar.bbox.minY + 1);
    if (collar.empty || collar.opaquePixels / collarArea < 0.45) {
      failures.push({
        frame,
        gate: "collar-fill",
        detail: "the closed collar/scarf shape is not substantially skin-filled",
      });
    }

    const mouthLayer = rendered.analysisLayers.find((layer) => (
      layer.nodePath.endsWith("/Mouth") && layer.variant === "main"
    ));
    if (mouthLayer && ["2", "4", "5", "7", "8", "9", "10"]
      .includes(String(mouthLayer.drawing.drawing))) {
      const whitePixels = await nearWhitePixelCount(mouthLayer.input);
      if (whitePixels < 16) {
        failures.push({
          frame,
          gate: "mouth-color-ownership",
          detail: `mouth drawing ${mouthLayer.drawing.drawing} lost its authored white tooth region`,
        });
      }
    }

    const firstHeadAnalysisLayer = rendered.analysisLayers.findIndex((layer) => (
      layer.nodePath.includes("/Head_Group/")
    ));
    const bodyAnalysisEnd = firstHeadAnalysisLayer < 0
      ? rendered.analysisLayers.length
      : firstHeadAnalysisLayer;
    const characterBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([
      ...rendered.analysisProps.filter(({ layer }) => layer === "behind")
        .map(({ input }) => ({ input })),
      ...rendered.analysisLayers.slice(0, bodyAnalysisEnd).map(({ input }) => ({ input })),
      ...rendered.analysisProps.filter(({ layer }) => layer === "body-front")
        .map(({ input }) => ({ input })),
      ...rendered.analysisLayers.slice(bodyAnalysisEnd).map(({ input }) => ({ input })),
      ...rendered.analysisProps.filter(({ layer }) => layer === "front")
        .map(({ input }) => ({ input })),
    ]).png().toBuffer();
    const character = await alphaStats(characterBuffer);
    const sceneStats = await alphaStats(rendered.buffer);
    if (character.empty) {
      failures.push({ frame, gate: "visible-character", detail: "frame is empty" });
    } else {
      const edgeMargins = {
        left: sceneStats.bbox.minX,
        top: sceneStats.bbox.minY,
        right: sceneStats.width - 1 - sceneStats.bbox.maxX,
        bottom: sceneStats.height - 1 - sceneStats.bbox.maxY,
      };
      const expectedEdges = expectedEdgesForFrame(recipe, frame);
      for (const [edge, margin] of Object.entries(edgeMargins)) {
        if (margin >= 2) continue;
        if (expectedEdges.has(edge)) {
          approvedEdgeContacts.push({ frame, edge, margin });
        } else {
          failures.push({ frame, gate: "clipping", detail: `${edge} alpha margin is ${margin}px` });
        }
      }
      if (character.componentPixels.length !== 1) {
        failures.push({
          frame,
          gate: "joint-continuity",
          detail: `${character.componentPixels.length} significant alpha components`,
        });
      }
    }

    const expectedPropIds = poseRuntime.propsAtFrame(frame)
      .filter(({ opacity }) => opacity > 0)
      .map(({ id }) => id)
      .sort();
    const renderedPropIds = rendered.receipt.props.map(({ id }) => id).sort();
    if (JSON.stringify(expectedPropIds) !== JSON.stringify(renderedPropIds)) {
      failures.push({ frame, gate: "prop-presence", detail: "visible recipe props were not rendered exactly once" });
    }

    const limbPropStats = await Promise.all(rendered.analysisProps
      .filter((prop) => !registeredNonLimbProp(prop))
      .map(async (prop) => ({
        id: prop.id,
        stats: await alphaStats(prop.input),
      })));
    const armGeometry = [];
    let rightArmHeadBaseOverlapPixels = null;
    if (limbPropStats.length === 0) {
      const bodyLayer = rendered.analysisLayers.find((layer) => (
        layer.nodePath.endsWith("/Body") && layer.variant === "main"
      ));
      const headLayer = rendered.analysisLayers.find((layer) => (
        layer.nodePath.endsWith("/Head_Base") && layer.variant === "main"
      ));
      const bodyStats = bodyLayer ? await alphaStats(bodyLayer.input) : { empty: true };
      const headStats = headLayer
        ? await alphaStats(headLayer.input)
        : { empty: true };
      const rightArmLayers = rendered.analysisLayers.filter((layer) => (
        layer.variant === "main"
        && (layer.nodePath.endsWith("/Right_Forearm")
          || layer.nodePath.endsWith("/Right_Hand"))
      ));
      if (headLayer && rightArmLayers.length === 2) {
        rightArmHeadBaseOverlapPixels = await alphaOverlapPixelCount(
          rightArmLayers.map(({ input }) => input),
          headLayer.input,
        );
        maximumRightArmHeadBaseOverlapPixels = Math.max(
          maximumRightArmHeadBaseOverlapPixels,
          rightArmHeadBaseOverlapPixels,
        );
      }
      const nativeForearms = ["Left", "Right"].map((side) => rendered.analysisLayers.find((layer) => (
        layer.nodePath.endsWith(`/${side}_Forearm`) && layer.variant === "main"
      )));
      if (nativeForearms.every(Boolean)) {
        maximumNativeSleeveCrossoverPixels = Math.max(
          maximumNativeSleeveCrossoverPixels,
          await alphaContactPixelCount(nativeForearms[0].input, nativeForearms[1].input, 1),
        );
      }
      for (const side of ["Left", "Right"]) {
        const forearmLayer = rendered.analysisLayers.find((layer) => (
          layer.nodePath.endsWith(`/${side}_Forearm`) && layer.variant === "main"
        ));
        const handLayer = rendered.analysisLayers.find((layer) => (
          layer.variant === "main"
          && (side === "Left"
            ? layer.nodePath.endsWith("/OL_Hand")
              || layer.nodePath.endsWith("/Left_Hand")
            : layer.nodePath.endsWith("/Right_Hand"))
        ));
        const upperArmLayer = rendered.analysisConstructionLayers?.find((layer) => (
          layer.nodePath.endsWith(`/${side}_Arm`) && layer.variant === "main"
        ));
        if (!forearmLayer) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} finished sleeve is missing`,
          });
          continue;
        }
        const [
          forearmStats,
          handStats,
          contactPixels,
          shoulderContactPixels,
          upperArmStats,
        ] = await Promise.all([
          alphaStats(forearmLayer.input),
          handLayer ? alphaStats(handLayer.input) : Promise.resolve({ empty: true }),
          handLayer ? alphaContactPixelCount(handLayer.input, forearmLayer.input, 1) : Promise.resolve(0),
          bodyLayer ? alphaContactPixelCount(forearmLayer.input, bodyLayer.input, 1) : Promise.resolve(0),
          upperArmLayer ? alphaStats(upperArmLayer.input) : Promise.resolve({ empty: true }),
        ]);
        if (forearmStats.empty) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} finished sleeve is empty`,
          });
          continue;
        }
        if (!finishedSleeveValid(forearmStats)) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} finished sleeve split into ${forearmStats.components.length} significant components`,
          });
        }
        if (handStats.empty) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} native hand is missing; hidden-hand self-certification is forbidden`,
          });
          continue;
        }
        if (!shoulderAnchorValid(side, upperArmStats, bodyStats, mirrored)) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} upper-arm anchor crossed the torso center or disappeared`,
          });
        }
        const areaRatio = handStats.opaquePixels / forearmStats.opaquePixels;
        const handWidth = handStats.bbox.maxX - handStats.bbox.minX + 1;
        const headWidth = headStats.empty ? 0 : headStats.bbox.maxX - headStats.bbox.minX + 1;
        const handToHeadWidthRatio = headWidth > 0 ? handWidth / headWidth : null;
        const limits = effectiveHandLimits(
          handLayer,
          recipe.quality?.armGeometryLimits?.[side],
        );
        const sleeveRelativeUpperArm = upperArmStats.empty ? null : {
          x: forearmStats.centroid.x - upperArmStats.centroid.x,
          y: forearmStats.centroid.y - upperArmStats.centroid.y,
        };
        const handRelativeSleeve = {
          x: handStats.centroid.x - forearmStats.centroid.x,
          y: handStats.centroid.y - forearmStats.centroid.y,
        };
        const handDrawing = String(handLayer.drawing.drawing);
        const previousArm = previousNativeArms.get(side);
        let handRelativeSleeveTravel = null;
        let sleeveRelativeUpperArmTravel = null;
        let handAreaFoldChange = null;
        if (previousArm?.frame === frame - 1
          && previousArm.handNode === handLayer.nodePath
          && previousArm.handDrawing === handDrawing
          && sleeveRelativeUpperArm) {
          handRelativeSleeveTravel = distance(
            handRelativeSleeve,
            previousArm.handRelativeSleeve,
          );
          sleeveRelativeUpperArmTravel = distance(
            sleeveRelativeUpperArm,
            previousArm.sleeveRelativeUpperArm,
          );
          handAreaFoldChange = Math.max(
            handStats.opaquePixels / previousArm.handOpaquePixels,
            previousArm.handOpaquePixels / handStats.opaquePixels,
          );
          if (handRelativeSleeveTravel > 100
            || sleeveRelativeUpperArmTravel > 45
            || handAreaFoldChange > 2) {
            failures.push({
              frame,
              gate: "limb-temporal-continuity",
              detail: `${side.toLowerCase()} native chain popped without a drawing substitution: hand/sleeve ${handRelativeSleeveTravel.toFixed(1)}px, sleeve/upper-arm ${sleeveRelativeUpperArmTravel.toFixed(1)}px, hand area ${handAreaFoldChange.toFixed(2)}x`,
            });
          }
        }
        if (sleeveRelativeUpperArm) {
          previousNativeArms.set(side, {
            frame,
            handNode: handLayer.nodePath,
            handDrawing,
            handOpaquePixels: handStats.opaquePixels,
            handRelativeSleeve,
            sleeveRelativeUpperArm,
          });
        }
        const minimumAreaRatio = limits.minimumHandToSleeveAreaRatio;
        const maximumAreaRatio = limits.maximumHandToSleeveAreaRatio;
        const maximumHeadWidthRatio = limits.maximumHandToHeadWidthRatio;
        armGeometry.push({
          side,
          mode: "native-rig",
          handNode: handLayer.nodePath,
          handCompositeRole: handLayer.compositeRole,
          cuffOwner: handLayer.cuffOwner,
          contactPixels,
          sleeveBodyContactPixels: shoulderContactPixels,
          sleeveSignificantComponents: forearmStats.components.length,
          upperArmCentroid: upperArmStats.empty ? null : upperArmStats.centroid,
          upperArmAnchorValid: shoulderAnchorValid(side, upperArmStats, bodyStats, mirrored),
          bodyCenterX: bodyStats.empty ? null : bodyStats.centroid.x,
          bodyWidth: bodyStats.empty ? null : bodyStats.bbox.maxX - bodyStats.bbox.minX + 1,
          mirrored,
          handToSleeveAreaRatio: areaRatio,
          handToHeadWidthRatio,
          handRelativeSleeve,
          sleeveRelativeUpperArm,
          handRelativeSleeveTravel,
          sleeveRelativeUpperArmTravel,
          handAreaFoldChange,
        });
        if (contactPixels < 4) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} hand has only ${contactPixels} contact pixels with its sleeve`,
          });
        }
        if (shoulderContactPixels < 4) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} sleeve has only ${shoulderContactPixels} shoulder contact pixels with the torso`,
          });
        }
        if (areaRatio < minimumAreaRatio || areaRatio > maximumAreaRatio) {
          failures.push({
            frame,
            gate: "limb-proportion",
            detail: `${side.toLowerCase()} hand/sleeve alpha-area ratio ${areaRatio.toFixed(3)} is outside ${minimumAreaRatio}–${maximumAreaRatio}`,
          });
        }
        if (handToHeadWidthRatio !== null && handToHeadWidthRatio > maximumHeadWidthRatio) {
          failures.push({
            frame,
            gate: "limb-proportion",
            detail: `${side.toLowerCase()} hand/head width ratio ${handToHeadWidthRatio.toFixed(3)} exceeds ${maximumHeadWidthRatio}`,
          });
        }
      }
    }
    for (const { id, stats } of limbPropStats) {
      if (stats.empty) continue;
      const propReceipt = rendered.receipt.props.find((prop) => prop.id === id);
      if (registeredPoseReplacement(propReceipt)) {
        armGeometry.push({
          mode: "registered-pose-replacement",
          id,
          significantComponents: stats.components.length,
          opaquePixels: stats.opaquePixels,
          bbox: stats.bbox,
          centroid: stats.centroid,
        });
        if (stats.components.length !== 1) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${id} split into ${stats.components.length} significant components`,
          });
        }
      }
      const previous = previousLimbProps.get(id);
      if (previous?.frame === frame - 1) {
        const areaRatio = stats.opaquePixels / previous.opaquePixels;
        if (areaRatio > 1.35 || areaRatio < 0.74) {
          failures.push({
            frame,
            gate: "limb-scale-stability",
            detail: `${id} alpha area changed by ${areaRatio.toFixed(2)}x in one frame`,
          });
        }
        const travel = distance(stats.centroid, previous.centroid);
        if (travel > 80) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${id} jumped ${travel.toFixed(1)}px in one frame`,
          });
        }
      }
      previousLimbProps.set(id, {
        frame,
        opaquePixels: stats.opaquePixels,
        centroid: stats.centroid,
      });
    }

    const faceLayers = rendered.analysisLayers.filter((layer) => (
      layer.nodePath.includes("/Head_Group/")
      && !layer.nodePath.endsWith("/OL_Hand")
      && layer.variant === "main"
    ));
    const faceStats = await Promise.all(faceLayers.map(async (layer) => ({
      key: `${layer.nodePath}:${layer.variant}`,
      drawing: String(layer.drawing.drawing),
      stats: await alphaStats(layer.input),
    })));
    const headBase = faceStats.find(({ key }) => key.includes("/Head_Base:"));
    if (!headBase || headBase.stats.empty) {
      failures.push({ frame, gate: "facial-pop", detail: "head base disappeared" });
    } else {
      for (const layer of faceStats.filter(({ stats }) => !stats.empty)) {
        const relative = {
          x: layer.stats.centroid.x - headBase.stats.centroid.x,
          y: layer.stats.centroid.y - headBase.stats.centroid.y,
        };
        const previous = previousFace.get(layer.key);
        if (previous && distance(relative, previous.relative) > 48) {
          failures.push({
            frame,
            gate: "facial-pop",
            detail: `${layer.key} jumped ${distance(relative, previous.relative).toFixed(1)}px relative to the head`,
          });
        }
        if (previous && previous.drawing === layer.drawing) {
          const ratio = layer.stats.opaquePixels / previous.opaquePixels;
          if (ratio > 4 || ratio < 0.25) {
            failures.push({
              frame,
              gate: "facial-pop",
              detail: `${layer.key} area changed by ${ratio.toFixed(2)}x without a drawing substitution`,
            });
          }
        }
        previousFace.set(layer.key, {
          drawing: layer.drawing,
          opaquePixels: layer.stats.opaquePixels,
          relative,
        });
      }
    }

    frameReports.push({
      frame,
      alphaBounds: character.empty ? null : character.bbox,
      significantComponents: character.componentPixels?.length ?? 0,
      componentGeometry: character.empty ? [] : character.components,
      layerCount: rendered.receipt.layers.length,
      propCount: rendered.receipt.props.length,
      limbSubstitutionProps: limbPropStats.map(({ id }) => id),
      armGeometry,
      eyeEnvelopeOverlapPixels,
      rightArmHeadBaseOverlapPixels,
    });
  }

  const maximumIdenticalFrames = maximumConsecutiveEqual(renderedFrameHashes);
  if (!crossedPaintOrderEligible(recipe, maximumNativeSleeveCrossoverPixels)) {
    failures.push({
      frame: null,
      gate: "layer-order",
      detail: "custom crossed-arm paint order requires an observed native sleeve crossover",
    });
  }
  if (!rightFrontPaintOrderEligible(recipe, maximumRightArmHeadBaseOverlapPixels)) {
    failures.push({
      frame: null,
      gate: "layer-order",
      detail: `right-front-of-head paint order requires at least 20 observed native right-arm/Head_Base overlap pixels; maximum was ${maximumRightArmHeadBaseOverlapPixels}`,
    });
  }
  if (recipe.quality?.maximumIdenticalFrames !== undefined
    && maximumIdenticalFrames > recipe.quality.maximumIdenticalFrames) {
    failures.push({
      frame: null,
      gate: "temporal-motion",
      detail: `${maximumIdenticalFrames} identical rendered frames exceed the ${recipe.quality.maximumIdenticalFrames}-frame limit`,
    });
  }

  return {
    schemaVersion: "shaz-pose-inspection-v1",
    status: failures.length === 0 ? "pass" : "fail",
    sourceXstageSha256: manifest.source.sha256,
    poseRecipeId: recipe.id,
    poseRecipeSha256: poseRuntime.recipeSha256,
    artistRenderedFramesUsed: false,
    gates: [
      "provenance",
      "layer-order",
      "arm-composite",
      "limb-proportion",
      "limb-scale-stability",
      "limb-temporal-continuity",
      "limb-attachment",
      "hair-composite",
      "eye-occlusion",
      "construction-seam",
      "collar-fill",
      "mouth-color-ownership",
      "clipping",
      "joint-continuity",
      "facial-pop",
      "prop-presence",
      "temporal-motion",
    ],
    failures,
    approvedEdgeContacts,
    maximumIdenticalFrames,
    maximumNativeSleeveCrossoverPixels,
    maximumRightArmHeadBaseOverlapPixels,
    frames: frameReports,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(path.resolve(args.manifest));
  const recipe = await loadPoseRecipe(path.resolve(args.recipe));
  const report = await inspectPose({
    manifest,
    assetRoot: path.resolve(args.assets),
    propRoot: args.propAssets ? path.resolve(args.propAssets) : null,
    recipe,
  });
  const output = path.resolve(args.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${report.status.toUpperCase()} ${recipe.id}: ${report.failures.length} failure(s)\n${output}\n`);
  if (report.status !== "pass") process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  alphaOverlapPixelCount,
  alphaStats,
  alphaContactPixelCount,
  armCompositeValid,
  armTopologyValid,
  crossedPaintOrderEligible,
  effectiveHandLimits,
  finishedSleeveValid,
  observedHandLimits,
  registeredNonLimbProp,
  registeredPoseReplacement,
  rightFrontPaintOrderEligible,
  shoulderAnchorValid,
  expectedEdgesForFrame,
  eyeEnvelopeCompositeValid,
  hairCompositeValid,
  inspectPose,
  maximumConsecutiveEqual,
  nearWhitePixelCount,
  opaqueMaskOverlapPixelCount,
  paintOrderValid,
};
