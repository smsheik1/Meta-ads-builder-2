import assert from "node:assert/strict";
import test from "node:test";

import {
  deformationFramesForExposureChanges,
  simplifyControlFrames,
  validateExposureChangeFrames,
} from "../runtime/extract-pose-recipe.mjs";
import {
  createPoseRuntime,
  poseRecipeSha256,
} from "../runtime/pose-recipe.mjs";

function value(val) {
  return { attributes: { val: String(val) } };
}

function transformAttrs() {
  return {
    children: {
      position: [{ children: { x: [value(0)], y: [value(0)], z: [value(0)] } }],
      pivot: [{ children: { x: [value(0)], y: [value(0)], z: [value(0)] } }],
      angle: [value(0)],
      scale: [{ children: { x: [value(1)], y: [value(1)] } }],
      skew: [value(0)],
      opacity: [value(100)],
    },
  };
}

function fixture() {
  const peg = {
    path: "Top/Body-P",
    name: "Body-P",
    groupPath: "Top",
    type: "PEG",
    attrs: transformAttrs(),
  };
  const readAttrs = transformAttrs();
  delete readAttrs.children.position;
  readAttrs.children.offset = [{ children: { x: [value(0)], y: [value(0)], z: [value(0)] } }];
  readAttrs.children.drawing = [{
    children: { element: [{ attributes: { col: "DRAWING" } }] },
  }];
  const read = {
    path: "Top/Hand",
    name: "Hand",
    groupPath: "Top",
    type: "READ",
    attrs: readAttrs,
  };
  return {
    schemaVersion: "harmony-xstage-runtime-v1",
    source: { sha256: "source-sha" },
    elements: [{
      id: "hand-element",
      name: "Hand",
      rootFolder: "elements",
      folder: "Hand",
      drawings: ["1", "2"],
    }],
    scenes: [{
      startFrame: 1,
      stopFrame: 10,
      nodes: [
        peg,
        read,
        { path: "Top/Curve", name: "Curve", type: "CurveModule", attrs: {} },
        { path: "Top/Composite-A", name: "Composite", type: "COMPOSITE", attrs: {} },
        { path: "Top/Composite-B", name: "Composite", type: "COMPOSITE", attrs: {} },
      ],
      groups: [{ path: "Top", name: "Top" }],
      links: [],
      columns: [{
        name: "DRAWING",
        type: 0,
        elementId: "hand-element",
        exposures: [{ drawing: "1", frames: [1] }],
        heldFrames: [],
      }],
    }],
  };
}

function recipe() {
  return {
    schemaVersion: "shaz-pose-recipe-v1",
    id: "wave",
    fps: 24,
    durationFrames: 5,
    baseFrame: 1,
    sourceXstageSha256: "source-sha",
    artistRenderedFramesUsed: false,
    controls: {
      "Body-P": [
        { frame: 1, position: [0, 0, 0], rotation: 0 },
        { frame: 5, position: [4, 2, 0], rotation: 20 },
      ],
    },
    drawings: {
      Hand: [
        { frame: 1, drawing: "1" },
        { frame: 3, drawing: "2" },
      ],
    },
    props: [{
      id: "screen",
      asset: "screen.svg",
      sha256: "a".repeat(64),
      layer: "behind",
      keys: [
        { frame: 1, position: [0.2, 0.5], width: 0.3, opacity: 0 },
        { frame: 5, position: [0.25, 0.5], width: 0.35, opacity: 100 },
      ],
    }],
  };
}

function state(position, rotation = 0) {
  return {
    position,
    rotation,
    scale: [1, 1],
    skew: 0,
    opacity: 100,
    flipHorizontal: false,
    flipVertical: false,
  };
}

test("pose recipes interpolate named controls and hold drawing substitutions", () => {
  const runtime = createPoseRuntime(fixture(), recipe());
  const scene = fixture().scenes[0];
  const body = runtime.sampleNodeAtFrame(scene.nodes[0], new Map(), 3);
  assert.deepEqual(body.attrs.position.attr3dpath, [2, 1, 0]);
  assert.equal(body.attrs.angle, 10);
  assert.equal(runtime.resolveDrawing(scene.nodes[1], 2).drawing, "1");
  assert.equal(runtime.resolveDrawing(scene.nodes[1], 4).drawing, "2");
  const prop = runtime.propsAtFrame(3)[0];
  assert.deepEqual({ ...prop, width: 0.325 }, {
    id: "screen",
    asset: "screen.svg",
    sha256: "a".repeat(64),
    layer: "behind",
    position: [0.225, 0.5],
    width: 0.325,
    scale: [1, 1],
    rotation: 0,
    opacity: 50,
  });
  assert.ok(Math.abs(prop.width - 0.325) < 1e-12);
});

test("prop transforms support explicit local aspect scaling", () => {
  const input = recipe();
  input.props[0].keys[0].scale = [0.7, 1.6];
  input.props[0].keys[1].scale = [0.7, 1.6];
  const runtime = createPoseRuntime(fixture(), input);
  assert.deepEqual(runtime.propsAtFrame(3)[0].scale, [0.7, 1.6]);
});

test("pose recipe hashing ignores object key order", () => {
  assert.equal(
    poseRecipeSha256({ b: 2, a: { d: 4, c: 3 } }),
    poseRecipeSha256({ a: { c: 3, d: 4 }, b: 2 }),
  );
});

test("pose recipes reject a source-rig mismatch", () => {
  assert.throws(
    () => createPoseRuntime(fixture(), { ...recipe(), sourceXstageSha256: "other" }),
    /different Xstage source/,
  );
});

test("pose recipes reject prop path traversal", () => {
  const invalid = recipe();
  invalid.props[0].asset = "../screen.svg";
  assert.throws(() => createPoseRuntime(fixture(), invalid), /without path traversal/);
});

test("pose recipes cannot self-certify unbounded arm anatomy", () => {
  const unbounded = recipe();
  unbounded.quality = {
    authoredOpenHandCuffs: ["Left"],
    armGeometryLimits: {
      Left: { maximumHandToSleeveAreaRatio: 999 },
    },
  };
  assert.throws(() => createPoseRuntime(fixture(), unbounded), /absolute arm-proportion bounds/);

  const relaxedWithoutException = recipe();
  relaxedWithoutException.quality = {
    armGeometryLimits: {
      Left: { maximumHandToSleeveAreaRatio: 0.6 },
    },
  };
  assert.doesNotThrow(() => createPoseRuntime(fixture(), relaxedWithoutException),
    "recipe limits may be syntactically wider because inspection clamps them to the observed hand role");

  const globalTuck = recipe();
  globalTuck.quality = { tuckedHands: ["Left"] };
  assert.throws(() => createPoseRuntime(fixture(), globalTuck), /both native hand chains/);

  const invalidRange = recipe();
  invalidRange.quality = {
    tuckedHandFrames: [{ side: "Left", startFrame: 3, endFrame: 6 }],
  };
  assert.throws(() => createPoseRuntime(fixture(), invalidRange), /both native hand chains/);

  const wrongOverlayOwner = recipe();
  wrongOverlayOwner.quality = { overlayHandSleeveOwner: "Right" };
  assert.throws(() => createPoseRuntime(fixture(), wrongOverlayOwner), /rig-owned Left OL_Hand/);

  const reviewed = recipe();
  reviewed.quality = {
    authoredOpenHandCuffs: ["Left"],
    armGeometryLimits: {
      Left: {
        maximumHandToSleeveAreaRatio: 0.56,
        maximumHandToHeadWidthRatio: 0.78,
      },
    },
  };
  assert.doesNotThrow(() => createPoseRuntime(fixture(), reviewed));
});

test("pose replacement mode cannot also claim a native arm paint order", () => {
  const replacement = recipe();
  replacement.quality = { armCompositeMode: "registered-pose-replacement" };
  assert.doesNotThrow(() => createPoseRuntime(fixture(), replacement));

  replacement.quality.armPaintOrder = "both-front-left-under-right";
  assert.throws(
    () => createPoseRuntime(fixture(), replacement),
    /cannot declare a native-arm paint order/,
  );
});

test("pose recipes accept only the exact registered native arm paint-order enums", () => {
  for (const armPaintOrder of [
    "both-front-left-under-right",
    "right-front-of-head",
  ]) {
    const input = recipe();
    input.quality = { armCompositeMode: "native-rig", armPaintOrder };
    assert.doesNotThrow(() => createPoseRuntime(fixture(), input));
  }

  const misspelled = recipe();
  misspelled.quality = {
    armCompositeMode: "native-rig",
    armPaintOrder: "right-in-front-of-head",
  };
  assert.throws(
    () => createPoseRuntime(fixture(), misspelled),
    /not a registered native-arm paint policy/,
  );

  const replacement = recipe();
  replacement.quality = {
    armCompositeMode: "registered-pose-replacement",
    armPaintOrder: "right-front-of-head",
  };
  assert.throws(
    () => createPoseRuntime(fixture(), replacement),
    /cannot declare a native-arm paint order/,
  );
});

test("pose recipes map each local frame to an explicit Xstage deformation frame", () => {
  const mapped = recipe();
  mapped.deformationFrames = [2, 3, 4, 5, 6];
  const runtime = createPoseRuntime(fixture(), mapped);
  assert.deepEqual(
    Array.from({ length: mapped.durationFrames }, (_, index) => (
      runtime.deformationSourceFrameAtFrame(index + 1)
    )),
    mapped.deformationFrames,
  );
});

test("pose recipes reject incomplete or out-of-range deformation timing", () => {
  const incomplete = recipe();
  incomplete.deformationFrames = [1, 2];
  assert.throws(
    () => createPoseRuntime(fixture(), incomplete),
    /exactly 5 valid Xstage frames/,
  );

  const outsideScene = recipe();
  outsideScene.deformationFrames = [1, 2, 3, 4, 11];
  assert.throws(
    () => createPoseRuntime(fixture(), outsideScene),
    /exactly 5 valid Xstage frames/,
  );
});

test("compatible Xstage drawings remain source-bound instead of entering the base rig silently", () => {
  const sourceHash = "a".repeat(64);
  const compatible = recipe();
  compatible.sourceAction = {
    sourceXstageSha256: sourceHash,
    sourceFile: "compatible.xstage",
    sourceXstagePath: "source/compatible.xstage",
    sourceArchiveName: "compatible.zip",
    sourceArchiveSha256: "c".repeat(64),
    startFrame: 100,
    endFrame: 104,
  };
  compatible.drawingSources = { Hand: { 3: sourceHash } };
  compatible.drawings.Hand = [{ frame: 1, drawing: "3" }];
  const runtime = createPoseRuntime(fixture(), compatible);
  assert.deepEqual(runtime.resolveDrawing(fixture().scenes[0].nodes[1], 1), {
    elementId: "hand-element",
    element: "Hand",
    drawing: "3",
    file: "elements/Hand/Hand-3.tvg",
    sourceXstageSha256: sourceHash,
  });

  compatible.drawingSources.Hand[3] = "b".repeat(64);
  assert.throws(
    () => createPoseRuntime(fixture(), compatible),
    /must match sourceAction.sourceXstageSha256/,
  );

  compatible.drawingSources = { Hand: { foo: sourceHash } };
  assert.throws(
    () => createPoseRuntime(fixture(), compatible),
    /must use a numeric drawing ID/,
  );

  const canonicalBound = recipe();
  canonicalBound.sourceAction = {
    sourceXstageSha256: sourceHash,
    sourceFile: "compatible.xstage",
    sourceXstagePath: "source/compatible.xstage",
    sourceArchiveName: "compatible.zip",
    sourceArchiveSha256: "c".repeat(64),
    startFrame: 100,
    endFrame: 104,
  };
  canonicalBound.drawingSources = { Hand: { 1: sourceHash } };
  assert.throws(
    () => createPoseRuntime(fixture(), canonicalBound),
    /source-binds canonical drawing 1/,
  );
});

test("compatible Xstage actions can carry exact compact deformation samples", () => {
  const sourceHash = "a".repeat(64);
  const input = recipe();
  input.sourceAction = {
    sourceXstageSha256: sourceHash,
    sourceFile: "compatible.xstage",
    sourceXstagePath: "source/compatible.xstage",
    sourceArchiveName: "compatible.zip",
    sourceArchiveSha256: "c".repeat(64),
    startFrame: 100,
    endFrame: 104,
  };
  input.deformationFrames = [100, 100, 100, 100, 100];
  input.deformationSamples = {
    "Top/Curve": {
      samples: [
        { path: "Top/Curve", type: "CurveModule", attrs: { offset: 1 } },
        { path: "Top/Curve", type: "CurveModule", attrs: { offset: 2 } },
      ],
      frameSamples: [0, 0, 1, 1, 0],
    },
  };
  const runtime = createPoseRuntime(fixture(), input);
  const curve = fixture().scenes[0].nodes[2];
  assert.equal(runtime.sampleNodeAtFrame(curve, new Map(), 2).attrs.offset, 1);
  assert.equal(runtime.sampleNodeAtFrame(curve, new Map(), 3).attrs.offset, 2);
  assert.equal(runtime.deformationSourceFrameAtFrame(5), 100);
  assert.notEqual(
    runtime.deformationCacheIdentityAtFrame(2),
    runtime.deformationCacheIdentityAtFrame(3),
    "explicit deformation samples must not share a cache entry merely because their source frame repeats",
  );

  input.deformationSamples["Top/Curve"].frameSamples = [0, 2, 1, 1, 0];
  assert.throws(
    () => createPoseRuntime(fixture(), input),
    /references an unknown sample/,
  );

  const incompleteProvenance = recipe();
  incompleteProvenance.sourceAction = {
    sourceXstageSha256: "x",
    startFrame: 100,
    endFrame: 104,
  };
  incompleteProvenance.deformationSamples = {
    "Top/Curve": {
      samples: [{ path: "Top/Curve", type: "CurveModule", attrs: { offset: 1 } }],
      frameSamples: [0, 0, 0, 0, 0],
    },
  };
  assert.throws(
    () => createPoseRuntime(fixture(), incompleteProvenance),
    /complete, safe sourceAction provenance/,
  );
});

test("control simplification keeps overshoots but removes exact linear in-betweens", () => {
  const frames = [
    { frame: 1, state: state([0, 0, 0]) },
    { frame: 2, state: state([1, 0, 0]) },
    { frame: 3, state: state([2, 0, 0]) },
    { frame: 4, state: state([4, 0, 0]) },
    { frame: 5, state: state([3, 0, 0]) },
  ];
  assert.deepEqual(
    simplifyControlFrames(frames).map(({ frame }) => frame),
    [1, 3, 4, 5],
  );
});

test("authored exposure cadence repeats deformation sources without invented in-betweens", () => {
  const changes = validateExposureChangeFrames([1, 3, 5, 7], 7);
  assert.deepEqual(
    deformationFramesForExposureChanges(287, 7, changes),
    [287, 287, 289, 289, 291, 291, 293],
  );
  assert.throws(
    () => validateExposureChangeFrames([1, 3, 5], 7),
    /from 1 through 7/,
  );
});
