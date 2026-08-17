import assert from "node:assert/strict";
import test from "node:test";

import {
  applyToPoint,
  buildTransformGraph,
  inverse,
  localMatrix,
  multiply,
} from "../scene_transforms.mjs";

function peg(path, groupPath, position = [0, 0, 0]) {
  return {
    path,
    groupPath,
    type: "PEG",
    attrs: {},
    sampled: {
      path,
      type: "PEG",
      attrs: {
        position: { attr3dpath: position },
        pivot: { x: 0, y: 0 },
        rotation: { anglez: 0 },
        scale: { x: 1, y: 1 },
        skew: 0,
      },
    },
  };
}

test("affine inversion preserves points", () => {
  const matrix = [1.2, 0.1, -0.2, 0.8, 42, -17];
  const point = [9, 12];
  const roundTrip = applyToPoint(inverse(matrix), applyToPoint(matrix, point));
  assert.ok(Math.abs(roundTrip[0] - point[0]) < 1e-9);
  assert.ok(Math.abs(roundTrip[1] - point[1]) < 1e-9);
});

test("local matrices match the established Harmony field conversion", () => {
  const sampled = peg("Top/Peg", "Top", [2, 3, 0]).sampled;
  const point = applyToPoint(localMatrix(sampled), [0, 0]);
  assert.deepEqual(point, [416.65625, -468.75]);
});

test("nested group multiport inputs resolve to their external PEG parent", () => {
  const parent = peg("Top/Parent-P", "Top");
  const child = peg("Top/Rig/Child-P", "Top/Rig");
  const input = { path: "Top/Rig/Input", groupPath: "Top/Rig", type: "MULTIPORT_IN", attrs: {} };
  const scene = {
    groups: [{ path: "Top", name: "Top" }, { path: "Top/Rig", name: "Rig" }],
    nodes: [parent, input, child],
    links: [
      { groupPath: "Top", from: "Top/Parent-P", to: "Top/Rig", fromPort: null, toPort: null },
      { groupPath: "Top/Rig", from: "Top/Rig/Input", to: "Top/Rig/Child-P", fromPort: null, toPort: null },
    ],
  };
  assert.equal(buildTransformGraph(scene).parentPath("Top/Rig/Child-P"), "Top/Parent-P");
});

test("matrix multiplication applies child space before parent space", () => {
  const parent = [1, 0, 0, 1, 10, 0];
  const child = [2, 0, 0, 2, 0, 0];
  assert.deepEqual(applyToPoint(multiply(parent, child), [3, 4]), [16, 8]);
});
