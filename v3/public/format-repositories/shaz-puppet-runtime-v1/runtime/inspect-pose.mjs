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
  loadManifest,
  READ_PAINT_PLAN,
  renderRigFrame,
} from "./rig-v2-renderer.mjs";

const ALPHA_THRESHOLD = 24;
const MIN_COMPONENT_PIXELS = 12;
const LIMB_PROP_PATTERN = /(?:arm|forearm|sleeve|hand|fist)/i;

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

function paintPlanKey(entry) {
  return `${entry.nodePath}:${entry.variant}`;
}

function paintOrderValid(layers) {
  const indexes = new Map(READ_PAINT_PLAN.map((entry, index) => [paintPlanKey(entry), index]));
  let previous = -1;
  for (const layer of layers) {
    const index = indexes.get(paintPlanKey(layer));
    if (index === undefined || index <= previous) return false;
    previous = index;
  }
  return true;
}

function armCompositeValid(layers) {
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
    const hand = layers.findIndex((layer, index) => (
      index > forearm
      && layer.variant === "main"
      && allowedHands.some((suffix) => layer.nodePath.endsWith(suffix))
    ));
    if (hand < 0) return false;
  }
  return true;
}

function registeredCrossedArmCompositeValid(layers, props, recipe) {
  if (recipe.quality?.armCompositeMode !== "registered-crossed-rig-assembly") return false;
  const limbProps = props.filter(({ id }) => LIMB_PROP_PATTERN.test(id));
  if (limbProps.length !== 1) return false;
  const [assembly] = limbProps;
  if (assembly.id !== "crossed-arms-assembly"
    || assembly.asset !== "crossed-arms-assembly.png"
    || assembly.layer !== "front") return false;

  const armLayers = layers.filter((layer) => (
    /\/(Left|Right)_(Arm|Forearm|Hand)$/.test(layer.nodePath)
  ));
  return armLayers.length === 2 && ["Left", "Right"].every((side) => (
    armLayers.some((layer) => (
      layer.nodePath.endsWith(`/${side}_Arm`)
      && layer.variant === "main"
      && layer.compositeRole === "hidden-construction-fill"
    ))
  ));
}

function armTopologyValid(layers, props, recipe) {
  const limbProps = props.filter(({ id }) => LIMB_PROP_PATTERN.test(id));
  if (limbProps.length === 0) return armCompositeValid(layers);
  if (limbProps.length > 1) return false;
  return registeredCrossedArmCompositeValid(layers, props, recipe);
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
  const failures = [];
  const approvedEdgeContacts = [];
  const frameReports = [];
  const previousFace = new Map();
  const previousLimbProps = new Map();
  const assetCache = new Map();
  const propCache = new Map();
  const renderedFrameHashes = [];

  for (let frame = 1; frame <= recipe.durationFrames; frame += 1) {
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
    if (!paintOrderValid(rendered.receipt.layers)) {
      failures.push({ frame, gate: "layer-order", detail: "frame layers do not follow READ_PAINT_PLAN" });
    }
    if (!armTopologyValid(rendered.receipt.layers, rendered.receipt.props, recipe)) {
      failures.push({
        frame,
        gate: "arm-composite",
        detail: "use the connected native arm chain or exactly one registered contact assembly; independent sleeve, hand, forearm, or fist props are forbidden",
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

    const characterBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([
      ...rendered.analysisLayers.map(({ input }) => ({ input })),
      ...rendered.analysisProps.map(({ input }) => ({ input })),
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
      .filter(({ id }) => LIMB_PROP_PATTERN.test(id))
      .map(async (prop) => ({
        id: prop.id,
        stats: await alphaStats(prop.input),
      })));
    const armGeometry = [];
    if (limbPropStats.length === 0) {
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
        if (!forearmLayer || !handLayer) continue;
        const [forearmStats, handStats, contactPixels] = await Promise.all([
          alphaStats(forearmLayer.input),
          alphaStats(handLayer.input),
          alphaContactPixelCount(handLayer.input, forearmLayer.input),
        ]);
        if (forearmStats.empty || handStats.empty) continue;
        const areaRatio = handStats.opaquePixels / forearmStats.opaquePixels;
        armGeometry.push({
          side,
          mode: "native-rig",
          handNode: handLayer.nodePath,
          contactPixels,
          handToSleeveAreaRatio: areaRatio,
        });
        if (contactPixels < 8) {
          failures.push({
            frame,
            gate: "limb-attachment",
            detail: `${side.toLowerCase()} hand has only ${contactPixels} contact pixels with its sleeve`,
          });
        }
        if (areaRatio < 0.09 || areaRatio > 0.75) {
          failures.push({
            frame,
            gate: "limb-proportion",
            detail: `${side.toLowerCase()} hand/sleeve alpha-area ratio ${areaRatio.toFixed(3)} is outside 0.09–0.75`,
          });
        }
      }
    } else if (limbPropStats.length === 1
      && limbPropStats[0].id === "crossed-arms-assembly") {
      const assembly = limbPropStats[0].stats;
      const bboxWidth = assembly.empty ? 0 : assembly.bbox.maxX - assembly.bbox.minX + 1;
      const bboxHeight = assembly.empty ? 0 : assembly.bbox.maxY - assembly.bbox.minY + 1;
      armGeometry.push({
        mode: "registered-crossed-rig-assembly",
        bboxWidth,
        bboxHeight,
        opaquePixels: assembly.empty ? 0 : assembly.opaquePixels,
      });
      if (assembly.empty || bboxWidth < 150 || bboxHeight < 60 || assembly.opaquePixels < 7000) {
        failures.push({
          frame,
          gate: "limb-proportion",
          detail: `crossed-arm assembly geometry ${bboxWidth}x${bboxHeight}/${assembly.empty ? 0 : assembly.opaquePixels}px is below the approved 150x60/7000px floor`,
        });
      }
    }
    for (const { id, stats } of limbPropStats) {
      if (stats.empty) continue;
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
    });
  }

  const maximumIdenticalFrames = maximumConsecutiveEqual(renderedFrameHashes);
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
  alphaStats,
  alphaContactPixelCount,
  armCompositeValid,
  armTopologyValid,
  registeredCrossedArmCompositeValid,
  expectedEdgesForFrame,
  eyeEnvelopeCompositeValid,
  hairCompositeValid,
  inspectPose,
  maximumConsecutiveEqual,
  nearWhitePixelCount,
  opaqueMaskOverlapPixelCount,
  paintOrderValid,
};
