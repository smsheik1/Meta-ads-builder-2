import assert from "node:assert/strict";
import test from "node:test";

import { simplifyControlFrames } from "../runtime/extract-pose-recipe.mjs";
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
    rotation: 0,
    opacity: 50,
  });
  assert.ok(Math.abs(prop.width - 0.325) < 1e-12);
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
