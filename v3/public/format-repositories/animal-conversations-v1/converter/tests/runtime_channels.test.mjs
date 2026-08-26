import assert from "node:assert/strict";
import test from "node:test";

import {
  drawingAtFrame,
  indexColumns,
  resolveReadDrawing,
  sampleAttribute,
  sampleNode,
  samplePath3dColumn,
  sampleScalarColumn,
} from "../runtime_channels.mjs";

test("scalar channels interpolate unlocked segments and hold constant segments", () => {
  const interpolated = {
    points: [
      { frames: [1], value: 10, constantSegment: false },
      { frames: [5], value: 18, constantSegment: false },
    ],
  };
  assert.equal(sampleScalarColumn(interpolated, 3), 14);

  const held = {
    points: [
      { frames: [1], value: 10, constantSegment: true },
      { frames: [5], value: 18, constantSegment: false },
    ],
  };
  assert.equal(sampleScalarColumn(held, 3), 10);
  assert.equal(sampleScalarColumn(held, 5), 18);
});

test("path3d channels interpolate every axis and clamp outside the keyed range", () => {
  const column = { path3d: { points: [
    { frame: 2, value: [0, 2, 4] },
    { frame: 6, value: [8, 6, 4] },
  ] } };
  assert.deepEqual(samplePath3dColumn(column, 1), [0, 2, 4]);
  assert.deepEqual(samplePath3dColumn(column, 4), [4, 4, 4]);
  assert.deepEqual(samplePath3dColumn(column, 8), [8, 6, 4]);
});

test("drawing channels distinguish explicit exposure, held exposure, and empty exposure", () => {
  const column = {
    exposures: [{ frames: [1, 2], drawing: "1" }, { frames: [5], drawing: "2" }],
    heldFrames: [3, 4, 6],
  };
  assert.equal(drawingAtFrame(column, 2), "1");
  assert.equal(drawingAtFrame(column, 4), "1");
  assert.equal(drawingAtFrame(column, 6), "2");
  assert.equal(drawingAtFrame(column, 7), null);
});

test("a blank exposure breaks a later held sequence", () => {
  const column = {
    exposures: [{ frames: [2], drawing: "1" }],
    heldFrames: [3, 5, 6],
  };
  assert.equal(drawingAtFrame(column, 3), "1");
  assert.equal(drawingAtFrame(column, 5), null);
  assert.equal(drawingAtFrame(column, 6), null);
});

test("node attributes resolve their exact animation columns", () => {
  const scene = { columns: [
    { name: "position", type: 2, path3d: { points: [{ frame: 1, value: [3, 4, 0] }] } },
    { name: "angle", type: 3, points: [{ frames: [1], value: 12, constantSegment: false }] },
  ] };
  const node = {
    path: "Top/Arm-P",
    attrs: { children: {
      position: [{ children: { attr3dpath: [{ attributes: { col: "position" } }] } }],
      rotation: [{ children: { anglez: [{ attributes: { col: "angle", val: "0" } }] } }],
      skew: [{ attributes: { val: "2" } }],
    } },
  };
  const columns = indexColumns(scene);
  assert.deepEqual(sampleAttribute(node, "position.attr3dpath", columns, 1), [3, 4, 0]);
  assert.equal(sampleAttribute(node, "rotation.anglez", columns, 1), 12);
  assert.equal(sampleAttribute(node, "skew", columns, 1), 2);
  assert.equal(sampleAttribute(node, "missing", columns, 1), null);
});

test("whole-node sampling resolves drawing substitutions and deformer channels", () => {
  const scene = { columns: [
    { name: "drawing", type: 0, exposures: [{ frames: [1], drawing: "4" }], heldFrames: [] },
    { name: "length", type: 3, points: [{ frames: [1], value: 2.5, constantSegment: false }] },
  ] };
  const node = {
    path: "Top/Curve",
    type: "CurveModule",
    attrs: { children: {
      drawing: [{ children: { element: [{ attributes: { col: "drawing" } }] } }],
      length0: [{ attributes: { col: "length", val: "1" } }],
      influence: [{ attributes: { val: "INFINITE_INFLUENCE" } }],
    } },
  };
  assert.deepEqual(sampleNode(node, indexColumns(scene), 1), {
    path: "Top/Curve",
    type: "CurveModule",
    options: null,
    attrs: { drawing: { element: "4" }, length0: 2.5, influence: "INFINITE_INFLUENCE" },
  });
});

test("READ nodes resolve drawing columns to exact TVG files", () => {
  const manifest = { elements: [{ id: 7, name: "Arm", rootFolder: "elements", folder: "Arm", drawings: ["1", "2"] }] };
  const scene = { columns: [{
    name: "arm-drawing",
    type: 0,
    elementId: 7,
    exposures: [{ frames: [1], drawing: "2" }],
    heldFrames: [],
  }] };
  const node = {
    path: "Top/Arm",
    type: "READ",
    attrs: { children: { drawing: [{ children: { element: [{ attributes: { col: "arm-drawing" } }] } }] } },
  };
  assert.deepEqual(resolveReadDrawing(manifest, scene, node, 1), {
    elementId: 7,
    element: "Arm",
    drawing: "2",
    file: "elements/Arm/Arm-2.tvg",
  });
});
