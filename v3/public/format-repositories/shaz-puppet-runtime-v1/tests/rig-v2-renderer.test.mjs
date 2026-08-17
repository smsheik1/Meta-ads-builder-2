import assert from "node:assert/strict";
import test from "node:test";

import { applyToPoint } from "../runtime/vendor/scene_transforms.mjs";

import {
  READ_PAINT_ORDER,
  READ_PAINT_PLAN,
  assetFilename,
  fieldGridForManifest,
  propStageMatrix,
  tightStageMatrix,
} from "../runtime/rig-v2-renderer.mjs";

function close(actual, expected, epsilon = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
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

test("drawing substitutions use deterministic main and art-layer filenames", () => {
  const drawing = { element: "Left_Forearm", drawing: "2" };
  assert.equal(assetFilename(drawing), "left-forearm-02.png");
  assert.equal(assetFilename(drawing, "color"), "left-forearm-02--color.png");
  assert.equal(assetFilename(drawing, "overlay"), "left-forearm-02--overlay.png");
});

test("paint order keeps the body between the recovered left and right arm composites", () => {
  const leftArm = READ_PAINT_ORDER.indexOf("Top/Shaz_Rig/Body_Group/Left_Arm");
  const body = READ_PAINT_ORDER.indexOf("Top/Shaz_Rig/Body_Group/Body");
  const rightHand = READ_PAINT_ORDER.indexOf("Top/Shaz_Rig/Body_Group/Right_Hand");
  assert.ok(leftArm < body);
  assert.ok(body < rightHand);
});

test("paint plan reconstructs each AutoPatch above its arm and within its side composite", () => {
  for (const side of ["Left", "Right"]) {
    const forearm = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Forearm`) && entry.variant === "main"
    ));
    const arm = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Arm`) && entry.variant === "main"
    ));
    const patch = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Forearm`) && entry.variant === "color"
    ));
    const overlay = READ_PAINT_PLAN.findIndex((entry) => (
      entry.nodePath.endsWith(`${side}_Forearm`) && entry.variant === "overlay"
    ));
    assert.ok(forearm < arm);
    assert.ok(arm < patch);
    assert.ok(patch < overlay);
  }
});
