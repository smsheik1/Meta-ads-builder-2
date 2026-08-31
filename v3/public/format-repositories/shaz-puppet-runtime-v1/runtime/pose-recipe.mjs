import crypto from "node:crypto";
import fs from "node:fs/promises";

import {
  attributeAtPath,
  indexColumns,
  resolveReadDrawing,
  sampleNode,
} from "./vendor/runtime_channels.mjs";

const CONTROL_FIELDS = new Set([
  "position",
  "rotation",
  "scale",
  "skew",
  "opacity",
  "flipHorizontal",
  "flipVertical",
]);
const INTERPOLATIONS = new Set(["linear", "hold"]);
const PROP_LAYERS = new Set(["behind", "body-front", "front"]);
const ARM_SIDES = new Set(["Left", "Right"]);
const ARM_PAINT_ORDERS = new Set([
  "both-front-left-under-right",
  "right-front-of-head",
]);
const ARM_COMPOSITE_MODES = new Set(["native-rig", "registered-pose-replacement"]);
const DEFAULT_ARM_LIMITS = {
  minimumHandToSleeveAreaRatio: 0.1,
  maximumHandToSleeveAreaRatio: 0.45,
  maximumHandToHeadWidthRatio: 0.8,
};
const ABSOLUTE_ARM_LIMITS = {
  maximumHandToSleeveAreaRatio: 0.7,
  maximumHandToHeadWidthRatio: 0.95,
};
const DEFORMATION_NODE_TYPES = new Set([
  "BendyBoneModule",
  "CurveModule",
  "DeformationCompositeModule",
  "OffsetModule",
]);
const SHA256 = /^[a-f0-9]{64}$/;

function isSafeSourceBasename(value, extension) {
  return typeof value === "string"
    && value.length > extension.length
    && !/[\\/]/.test(value)
    && value.toLowerCase().endsWith(extension);
}

function validateCompatibleSourceAction(manifest, recipe) {
  const usesCompatibleSource = Object.keys(recipe.drawingSources ?? {}).length > 0
    || recipe.deformationSamples !== undefined;
  if (!usesCompatibleSource) return;
  const sourceAction = recipe.sourceAction ?? {};
  const archiveName = sourceAction.sourceArchiveName ?? sourceAction.sourceArchive;
  const sourcePath = sourceAction.sourceXstagePath;
  const pathSegments = typeof sourcePath === "string" ? sourcePath.split("/") : [];
  if (!SHA256.test(sourceAction.sourceXstageSha256 ?? "")
    || sourceAction.sourceXstageSha256 === manifest.source.sha256
    || !isSafeSourceBasename(sourceAction.sourceFile, ".xstage")
    || !isSafeSourceBasename(archiveName, ".zip")
    || !SHA256.test(sourceAction.sourceArchiveSha256 ?? "")
    || pathSegments.length === 0
    || pathSegments.some((segment) => !segment || segment === "." || segment === "..")
    || sourcePath.includes("\\")
    || pathSegments.at(-1) !== sourceAction.sourceFile
    || !Number.isInteger(sourceAction.startFrame)
    || !Number.isInteger(sourceAction.endFrame)
    || sourceAction.startFrame < 1
    || sourceAction.endFrame < sourceAction.startFrame) {
    throw new Error("compatible Xstage recipes require complete, safe sourceAction provenance");
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [
    key,
    canonicalize(value[key]),
  ]));
}

function poseRecipeSha256(recipe) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(canonicalize(recipe)))
    .digest("hex");
}

function finiteNumber(value, context) {
  if (!Number.isFinite(value)) throw new Error(`${context} must be finite`);
  return value;
}

function finiteVector(value, length, context) {
  if (!Array.isArray(value) || value.length !== length) {
    throw new Error(`${context} must contain ${length} numbers`);
  }
  return value.map((entry, index) => finiteNumber(entry, `${context}[${index}]`));
}

function validateArmQuality(recipe) {
  const quality = recipe.quality ?? {};
  if (quality.armCompositeMode !== undefined
    && !ARM_COMPOSITE_MODES.has(quality.armCompositeMode)) {
    throw new Error("quality.armCompositeMode must be native-rig or registered-pose-replacement");
  }
  if (quality.armCompositeMode === "registered-pose-replacement"
    && quality.armPaintOrder !== undefined) {
    throw new Error("registered pose replacements cannot declare a native-arm paint order");
  }
  if (quality.armPaintOrder !== undefined
    && !ARM_PAINT_ORDERS.has(quality.armPaintOrder)) {
    throw new Error("quality.armPaintOrder is not a registered native-arm paint policy");
  }
  if (quality.overlayHandSleeveOwner !== undefined
    && quality.overlayHandSleeveOwner !== "Left") {
    throw new Error("quality.overlayHandSleeveOwner may only describe the rig-owned Left OL_Hand channel");
  }
  if (quality.tuckedHands !== undefined || quality.tuckedHandFrames !== undefined) {
    throw new Error("hidden or recipe-declared tucked hands are unsupported; both native hand chains must remain visibly verifiable");
  }

  const openHandCuffs = quality.authoredOpenHandCuffs ?? [];
  if (!Array.isArray(openHandCuffs)
    || openHandCuffs.some((side) => !ARM_SIDES.has(side))
    || new Set(openHandCuffs).size !== openHandCuffs.length) {
    throw new Error("quality.authoredOpenHandCuffs must contain unique Left/Right values");
  }

  const geometry = quality.armGeometryLimits ?? {};
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)
    || Object.keys(geometry).some((side) => !ARM_SIDES.has(side))) {
    throw new Error("quality.armGeometryLimits may contain only Left and Right");
  }
  for (const [side, limits] of Object.entries(geometry)) {
    const context = `quality.armGeometryLimits.${side}`;
    const allowed = new Set(Object.keys(DEFAULT_ARM_LIMITS));
    if (!limits || typeof limits !== "object" || Array.isArray(limits)
      || Object.keys(limits).some((key) => !allowed.has(key))) {
      throw new Error(`${context} contains unsupported limits`);
    }
    for (const [key, value] of Object.entries(limits)) finiteNumber(value, `${context}.${key}`);
    const minimumArea = limits.minimumHandToSleeveAreaRatio
      ?? DEFAULT_ARM_LIMITS.minimumHandToSleeveAreaRatio;
    const maximumArea = limits.maximumHandToSleeveAreaRatio
      ?? DEFAULT_ARM_LIMITS.maximumHandToSleeveAreaRatio;
    const maximumHead = limits.maximumHandToHeadWidthRatio
      ?? DEFAULT_ARM_LIMITS.maximumHandToHeadWidthRatio;
    if (minimumArea < DEFAULT_ARM_LIMITS.minimumHandToSleeveAreaRatio
      || maximumArea < minimumArea
      || maximumArea > ABSOLUTE_ARM_LIMITS.maximumHandToSleeveAreaRatio
      || maximumHead <= 0
      || maximumHead > ABSOLUTE_ARM_LIMITS.maximumHandToHeadWidthRatio) {
      throw new Error(`${context} exceeds the absolute arm-proportion bounds`);
    }
  }
}

function indexNodesByName(scene) {
  const nodes = new Map();
  for (const node of scene.nodes.filter((candidate) => (
    candidate.type === "PEG" || candidate.type === "READ"
  ))) {
    if (nodes.has(node.name)) throw new Error(`rig node name is not unique: ${node.name}`);
    nodes.set(node.name, node);
  }
  return nodes;
}

function controlStateForNode(sampledNode) {
  const attrs = sampledNode.attrs ?? {};
  const sourcePosition = sampledNode.type === "PEG"
    ? (Array.isArray(attrs.position?.attr3dpath)
      ? attrs.position.attr3dpath
      : [attrs.position?.x ?? 0, attrs.position?.y ?? 0, attrs.position?.z ?? 0])
    : [attrs.offset?.x ?? 0, attrs.offset?.y ?? 0, attrs.offset?.z ?? 0];
  return {
    position: sourcePosition.map(Number),
    rotation: Number(attrs.rotation?.anglez ?? attrs.angle ?? 0),
    scale: [
      Number(attrs.scale?.x ?? attrs.scale?.xy ?? 1),
      Number(attrs.scale?.y ?? attrs.scale?.xy ?? 1),
    ],
    skew: Number(attrs.skew ?? 0),
    opacity: Number(attrs.opacity ?? 100),
    flipHorizontal: Boolean(attrs.flipHor),
    flipVertical: Boolean(attrs.flipVert),
  };
}

function validateFrameKeys(keys, durationFrames, context) {
  if (!Array.isArray(keys) || keys.length === 0) throw new Error(`${context} has no keys`);
  let previousFrame = 0;
  for (const [index, key] of keys.entries()) {
    if (!Number.isInteger(key.frame) || key.frame < 1 || key.frame > durationFrames) {
      throw new Error(`${context}[${index}].frame is outside 1-${durationFrames}`);
    }
    if (key.frame <= previousFrame) throw new Error(`${context} frames must be strictly increasing`);
    previousFrame = key.frame;
  }
  if (keys[0].frame !== 1) throw new Error(`${context} must begin at frame 1`);
}

function drawingElementForNode(manifest, scene, node, columns) {
  const columnName = attributeAtPath(node, "drawing.element")?.attributes?.col;
  const column = columns.get(columnName);
  if (!column || column.type !== 0) throw new Error(`${node.name} has no drawing column`);
  const element = manifest.elements.find((candidate) => candidate.id === column.elementId);
  if (!element) throw new Error(`${node.name} references missing element ${column.elementId}`);
  return element;
}

function normalizeExternalDrawingSources(recipe, nodesByName) {
  const configured = new Map();
  const sourceHash = recipe.sourceAction?.sourceXstageSha256;
  for (const [nodeName, drawings] of Object.entries(recipe.drawingSources ?? {})) {
    const node = nodesByName.get(nodeName);
    if (!node || node.type !== "READ") {
      throw new Error(`drawingSources does not resolve to a READ: ${nodeName}`);
    }
    if (!drawings || typeof drawings !== "object" || Array.isArray(drawings)) {
      throw new Error(`drawingSources.${nodeName} must map drawings to Xstage source hashes`);
    }
    for (const [drawing, declaredHash] of Object.entries(drawings)) {
      if (!/^\d+$/.test(drawing)) {
        throw new Error(`drawingSources.${nodeName}.${drawing} must use a numeric drawing ID`);
      }
      if (!/^[a-f0-9]{64}$/.test(declaredHash) || declaredHash !== sourceHash) {
        throw new Error(`drawingSources.${nodeName}.${drawing} must match sourceAction.sourceXstageSha256`);
      }
      configured.set(`${node.path}:${drawing}`, declaredHash);
    }
  }
  return configured;
}

function normalizeDeformationSamples(manifest, scene, recipe) {
  if (recipe.deformationSamples === undefined) return null;
  const sourceAction = recipe.sourceAction;
  if (!sourceAction?.sourceXstageSha256
    || sourceAction.sourceXstageSha256 === manifest.source.sha256) {
    throw new Error("deformationSamples require a distinct sourceAction.sourceXstageSha256");
  }
  const deformationNodes = scene.nodes.filter(({ type }) => DEFORMATION_NODE_TYPES.has(type));
  const configuredPaths = Object.keys(recipe.deformationSamples).sort();
  const expectedPaths = deformationNodes.map(({ path }) => path).sort();
  if (JSON.stringify(configuredPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error("deformationSamples must cover every runtime deformation node exactly once");
  }

  const normalized = new Map();
  for (const node of deformationNodes) {
    const entry = recipe.deformationSamples[node.path];
    const context = `deformationSamples.${node.path}`;
    if (!entry || !Array.isArray(entry.samples) || entry.samples.length === 0
      || !Array.isArray(entry.frameSamples)
      || entry.frameSamples.length !== recipe.durationFrames) {
      throw new Error(`${context} requires samples and one frameSamples index per pose frame`);
    }
    for (const [index, sample] of entry.samples.entries()) {
      if (!sample || sample.path !== node.path || sample.type !== node.type
        || !sample.attrs || typeof sample.attrs !== "object" || Array.isArray(sample.attrs)) {
        throw new Error(`${context}.samples[${index}] does not match the runtime node`);
      }
    }
    if (entry.frameSamples.some((index) => (
      !Number.isInteger(index) || index < 0 || index >= entry.samples.length
    ))) {
      throw new Error(`${context}.frameSamples references an unknown sample`);
    }
    normalized.set(node.path, entry);
  }
  return normalized;
}

function normalizeControlKeys(keys, baseState, durationFrames, context) {
  validateFrameKeys(keys, durationFrames, context);
  let previous = { ...baseState };
  return keys.map((key, index) => {
    const unknown = Object.keys(key).filter((name) => (
      name !== "frame" && name !== "interpolation" && !CONTROL_FIELDS.has(name)
    ));
    if (unknown.length > 0) throw new Error(`${context}[${index}] has unknown fields: ${unknown.join(", ")}`);
    const state = { ...previous };
    if (key.position !== undefined) state.position = finiteVector(key.position, 3, `${context}[${index}].position`);
    if (key.rotation !== undefined) state.rotation = finiteNumber(key.rotation, `${context}[${index}].rotation`);
    if (key.scale !== undefined) state.scale = finiteVector(key.scale, 2, `${context}[${index}].scale`);
    if (key.skew !== undefined) state.skew = finiteNumber(key.skew, `${context}[${index}].skew`);
    if (key.opacity !== undefined) state.opacity = finiteNumber(key.opacity, `${context}[${index}].opacity`);
    if (key.flipHorizontal !== undefined) state.flipHorizontal = Boolean(key.flipHorizontal);
    if (key.flipVertical !== undefined) state.flipVertical = Boolean(key.flipVertical);
    const interpolation = key.interpolation ?? "linear";
    if (!INTERPOLATIONS.has(interpolation)) {
      throw new Error(`${context}[${index}].interpolation must be linear or hold`);
    }
    previous = state;
    return { frame: key.frame, interpolation, state };
  });
}

function mix(left, right, progress) {
  return left + (right - left) * progress;
}

function interpolateState(left, right, progress) {
  return {
    position: left.position.map((value, index) => mix(value, right.position[index], progress)),
    rotation: mix(left.rotation, right.rotation, progress),
    scale: left.scale.map((value, index) => mix(value, right.scale[index], progress)),
    skew: mix(left.skew, right.skew, progress),
    opacity: mix(left.opacity, right.opacity, progress),
    flipHorizontal: left.flipHorizontal,
    flipVertical: left.flipVertical,
  };
}

function sampleControlKeys(keys, frame) {
  if (frame <= keys[0].frame) return keys[0].state;
  if (frame >= keys.at(-1).frame) return keys.at(-1).state;
  for (let index = 1; index < keys.length; index += 1) {
    const right = keys[index];
    if (frame > right.frame) continue;
    const left = keys[index - 1];
    if (frame === right.frame) return right.state;
    if (left.interpolation === "hold") return left.state;
    const progress = (frame - left.frame) / (right.frame - left.frame);
    return interpolateState(left.state, right.state, progress);
  }
  return keys.at(-1).state;
}

function normalizePropKeys(keys, durationFrames, context) {
  validateFrameKeys(keys, durationFrames, context);
  let previous = {
    position: [0.5, 0.5],
    width: 0.25,
    scale: [1, 1],
    rotation: 0,
    opacity: 100,
  };
  return keys.map((key, index) => {
    const state = { ...previous };
    if (key.position !== undefined) state.position = finiteVector(key.position, 2, `${context}[${index}].position`);
    if (key.width !== undefined) state.width = finiteNumber(key.width, `${context}[${index}].width`);
    if (state.width <= 0) throw new Error(`${context}[${index}].width must be positive`);
    if (key.scale !== undefined) state.scale = finiteVector(key.scale, 2, `${context}[${index}].scale`);
    if (state.scale.some((component) => component <= 0)) {
      throw new Error(`${context}[${index}].scale components must be positive`);
    }
    if (key.rotation !== undefined) state.rotation = finiteNumber(key.rotation, `${context}[${index}].rotation`);
    if (key.opacity !== undefined) state.opacity = finiteNumber(key.opacity, `${context}[${index}].opacity`);
    if (state.opacity < 0 || state.opacity > 100) {
      throw new Error(`${context}[${index}].opacity must be between 0 and 100`);
    }
    const interpolation = key.interpolation ?? "linear";
    if (!INTERPOLATIONS.has(interpolation)) {
      throw new Error(`${context}[${index}].interpolation must be linear or hold`);
    }
    previous = state;
    return { frame: key.frame, interpolation, state };
  });
}

function samplePropKeys(keys, frame) {
  if (frame <= keys[0].frame) return keys[0].state;
  if (frame >= keys.at(-1).frame) return keys.at(-1).state;
  for (let index = 1; index < keys.length; index += 1) {
    const right = keys[index];
    if (frame > right.frame) continue;
    const left = keys[index - 1];
    if (frame === right.frame || left.interpolation === "hold") {
      return frame === right.frame ? right.state : left.state;
    }
    const progress = (frame - left.frame) / (right.frame - left.frame);
    return {
      position: left.state.position.map((value, component) => (
        mix(value, right.state.position[component], progress)
      )),
      width: mix(left.state.width, right.state.width, progress),
      scale: left.state.scale.map((value, component) => (
        mix(value, right.state.scale[component], progress)
      )),
      rotation: mix(left.state.rotation, right.state.rotation, progress),
      opacity: mix(left.state.opacity, right.state.opacity, progress),
    };
  }
  return keys.at(-1).state;
}

function applyControlState(baseSample, state) {
  const sampled = structuredClone(baseSample);
  const attrs = sampled.attrs ?? (sampled.attrs = {});
  if (sampled.type === "PEG") {
    attrs.position = { ...(attrs.position ?? {}), attr3dpath: [...state.position] };
  } else {
    attrs.offset = {
      ...(attrs.offset ?? {}),
      x: state.position[0],
      y: state.position[1],
      z: state.position[2],
    };
  }
  if (attrs.rotation && typeof attrs.rotation === "object") {
    attrs.rotation.anglez = state.rotation;
  } else {
    attrs.angle = state.rotation;
  }
  attrs.scale = { ...(attrs.scale ?? {}), x: state.scale[0], y: state.scale[1] };
  attrs.skew = state.skew;
  attrs.opacity = state.opacity;
  attrs.flipHor = state.flipHorizontal;
  attrs.flipVert = state.flipVertical;
  return sampled;
}

function createPoseRuntime(manifest, recipe) {
  if (recipe.schemaVersion !== "shaz-pose-recipe-v1") {
    throw new Error(`unsupported pose recipe ${recipe.schemaVersion}`);
  }
  if (recipe.sourceXstageSha256 !== manifest.source.sha256) {
    throw new Error("pose recipe was authored for a different Xstage source");
  }
  if (!recipe.id || !Number.isInteger(recipe.durationFrames) || recipe.durationFrames < 1) {
    throw new Error("pose recipe requires an id and positive durationFrames");
  }
  if (recipe.fps !== 24) throw new Error("Shaz pose recipes currently require 24 fps");
  if (!Number.isInteger(recipe.baseFrame) || recipe.baseFrame < 1) {
    throw new Error("pose recipe requires a positive baseFrame");
  }
  if (recipe.artistRenderedFramesUsed !== false) {
    throw new Error("pose recipe does not prove artist-frame exclusion");
  }
  if (recipe.quality?.maximumIdenticalFrames !== undefined
    && (!Number.isInteger(recipe.quality.maximumIdenticalFrames)
      || recipe.quality.maximumIdenticalFrames < 1
      || recipe.quality.maximumIdenticalFrames > recipe.durationFrames)) {
    throw new Error("quality.maximumIdenticalFrames must be a positive frame count within the pose duration");
  }
  validateArmQuality(recipe);

  const scene = manifest.scenes[0];
  if (!scene) throw new Error("manifest contains no scene");
  validateCompatibleSourceAction(manifest, recipe);
  const columns = indexColumns(scene);
  const nodesByName = indexNodesByName(scene);
  const externalDrawingSources = normalizeExternalDrawingSources(recipe, nodesByName);
  const deformationSamples = normalizeDeformationSamples(manifest, scene, recipe);
  const baseSamples = new Map(scene.nodes.map((node) => [
    node.path,
    sampleNode(node, columns, recipe.baseFrame),
  ]));
  const deformationFrames = recipe.deformationFrames === undefined
    ? Array.from({ length: recipe.durationFrames }, () => recipe.baseFrame)
    : recipe.deformationFrames;
  const sourceRange = deformationSamples
    ? [recipe.sourceAction?.startFrame, recipe.sourceAction?.endFrame]
    : [scene.startFrame, scene.stopFrame];
  if (!Array.isArray(deformationFrames)
    || deformationFrames.length !== recipe.durationFrames
    || !sourceRange.every(Number.isInteger)
    || deformationFrames.some((sourceFrame) => (
      !Number.isInteger(sourceFrame)
      || sourceFrame < sourceRange[0]
      || sourceFrame > sourceRange[1]
    ))) {
    throw new Error(`deformationFrames must contain exactly ${recipe.durationFrames} valid Xstage frames`);
  }
  const controlKeys = new Map();
  const drawingKeys = new Map();
  const props = [];

  for (const [nodeName, keys] of Object.entries(recipe.controls ?? {})) {
    const node = nodesByName.get(nodeName);
    if (!node || (node.type !== "PEG" && node.type !== "READ")) {
      throw new Error(`pose control does not resolve to a PEG or READ: ${nodeName}`);
    }
    controlKeys.set(node.path, normalizeControlKeys(
      keys,
      controlStateForNode(baseSamples.get(node.path)),
      recipe.durationFrames,
      `controls.${nodeName}`,
    ));
  }

  for (const [nodeName, keys] of Object.entries(recipe.drawings ?? {})) {
    const node = nodesByName.get(nodeName);
    if (!node || node.type !== "READ") throw new Error(`drawing control is not a READ: ${nodeName}`);
    validateFrameKeys(keys, recipe.durationFrames, `drawings.${nodeName}`);
    const element = drawingElementForNode(manifest, scene, node, columns);
    const normalized = keys.map((key, index) => {
      const drawing = key.drawing === null ? null : String(key.drawing);
      const externalSourceXstageSha256 = drawing === null
        ? null
        : externalDrawingSources.get(`${node.path}:${drawing}`);
      if (drawing !== null
        && !element.drawings.map(String).includes(drawing)
        && !externalSourceXstageSha256) {
        throw new Error(`drawings.${nodeName}[${index}] exposes unknown drawing ${drawing}`);
      }
      return { frame: key.frame, drawing, externalSourceXstageSha256 };
    });
    drawingKeys.set(node.path, { element, keys: normalized });
  }

  const propIds = new Set();
  for (const [index, prop] of (recipe.props ?? []).entries()) {
    if (!prop.id || propIds.has(prop.id)) throw new Error(`props[${index}] requires a unique id`);
    propIds.add(prop.id);
    if (!prop.asset || pathLike(prop.asset)) {
      throw new Error(`props[${index}].asset must be a filename without path traversal`);
    }
    if (!/^[a-f0-9]{64}$/.test(prop.sha256 ?? "")) {
      throw new Error(`props[${index}].sha256 must be a lowercase SHA-256`);
    }
    if (!PROP_LAYERS.has(prop.layer)) {
      throw new Error(`props[${index}].layer must be behind, body-front, or front`);
    }
    props.push({
      id: prop.id,
      asset: prop.asset,
      sha256: prop.sha256,
      layer: prop.layer,
      keys: normalizePropKeys(prop.keys, recipe.durationFrames, `props[${index}].keys`),
    });
  }

  function assertLocalFrame(frame) {
    if (!Number.isInteger(frame) || frame < 1 || frame > recipe.durationFrames) {
      throw new Error(`pose frame ${frame} is outside 1-${recipe.durationFrames}`);
    }
  }

  function sampleNodeAtFrame(node, ignoredColumns, frame) {
    assertLocalFrame(frame);
    if (DEFORMATION_NODE_TYPES.has(node.type)) {
      const explicit = deformationSamples?.get(node.path);
      if (explicit) return structuredClone(explicit.samples[explicit.frameSamples[frame - 1]]);
      return sampleNode(node, columns, deformationFrames[frame - 1]);
    }
    const baseSample = baseSamples.get(node.path);
    const keys = controlKeys.get(node.path);
    return keys ? applyControlState(baseSample, sampleControlKeys(keys, frame)) : baseSample;
  }

  function resolveDrawing(node, frame) {
    assertLocalFrame(frame);
    const configured = drawingKeys.get(node.path);
    if (!configured) return resolveReadDrawing(manifest, scene, node, recipe.baseFrame);
    const key = configured.keys.filter((candidate) => candidate.frame <= frame).at(-1);
    if (!key || key.drawing === null) return null;
    return {
      elementId: configured.element.id,
      element: configured.element.name,
      drawing: key.drawing,
      file: `${configured.element.rootFolder}/${configured.element.folder}/${configured.element.folder}-${key.drawing}.tvg`,
      ...(key.externalSourceXstageSha256
        ? { sourceXstageSha256: key.externalSourceXstageSha256 }
        : {}),
    };
  }

  function propsAtFrame(frame) {
    assertLocalFrame(frame);
    return props.map((prop) => ({
      id: prop.id,
      asset: prop.asset,
      sha256: prop.sha256,
      layer: prop.layer,
      ...samplePropKeys(prop.keys, frame),
    }));
  }

  function deformationSourceFrameAtFrame(frame) {
    assertLocalFrame(frame);
    return deformationFrames[frame - 1];
  }

  function deformationCacheIdentityAtFrame(frame) {
    assertLocalFrame(frame);
    return deformationSamples
      ? `explicit-frame:${frame}`
      : `source-frame:${deformationFrames[frame - 1]}`;
  }

  return {
    recipe,
    recipeSha256: poseRecipeSha256(recipe),
    sampleNodeAtFrame,
    resolveDrawing,
    propsAtFrame,
    deformationSourceFrameAtFrame,
    deformationCacheIdentityAtFrame,
  };
}

function pathLike(asset) {
  return asset.includes("/") || asset.includes("\\") || asset === "." || asset === "..";
}

async function loadPoseRecipe(recipePath) {
  return JSON.parse(await fs.readFile(recipePath, "utf8"));
}

export {
  applyControlState,
  controlStateForNode,
  createPoseRuntime,
  loadPoseRecipe,
  poseRecipeSha256,
  sampleControlKeys,
  samplePropKeys,
};
