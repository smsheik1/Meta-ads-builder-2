import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeRequestedOutlinePalette,
  parseCompileArgs,
  requestedDrawings,
} from "../runtime/compile-tvg-assets.mjs";

const requiredArgs = [
  "--manifest", "runtime.json",
  "--rig", "source-rig",
  "--output", "compiled-assets",
];

test("TVG compilation parses drawing selectors and complete RGBA normalization", () => {
  const parsed = parseCompileArgs([
    ...requiredArgs,
    "--drawings", "Left_Hand:14,Mouth:2",
    "--outline-source-color", "77,17,3,255",
    "--outline-color", "0,0,0,255",
  ]);
  assert.deepEqual(parsed.drawings, [
    { element: "Left_Hand", drawing: "14" },
    { element: "Mouth", drawing: "2" },
  ]);
  assert.deepEqual(parsed.outlineSourceColor, [77, 17, 3, 255]);
  assert.deepEqual(parsed.outlineColor, [0, 0, 0, 255]);

  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--frames", "1", "--drawings", "Mouth:2"]),
    /mutually exclusive/,
  );
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--outline-color", "0,0,0,255"]),
    /requires both source and destination colors/,
  );
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--outline-source-color", "77,17,3", "--outline-color", "0,0,0,255"]),
    /four comma-separated bytes/,
  );
  assert.throws(
    () => parseCompileArgs([...requiredArgs, "--drawings", "Left_Hand"]),
    /Element:Drawing selectors/,
  );
});

test("TVG drawing selection resolves only declared element drawings", () => {
  const manifest = {
    scenes: [{ nodes: [] }],
    elements: [{
      id: 42,
      name: "Left_Hand",
      drawings: ["1", "14"],
      rootFolder: "elements",
      folder: "Left_Hand",
    }],
  };
  assert.deepEqual(
    requestedDrawings(manifest, null, [{ element: "Left_Hand", drawing: "14" }]),
    [{
      elementId: 42,
      element: "Left_Hand",
      drawing: "14",
      file: "elements/Left_Hand/Left_Hand-14.tvg",
    }],
  );
  assert.throws(
    () => requestedDrawings(manifest, null, [{ element: "Left_Hand", drawing: "99" }]),
    /unknown drawing selector Left_Hand:99/,
  );
});

test("requested outline normalization fails closed for main artwork", () => {
  const sourceColor = [77, 17, 3, 255];
  const destinationColor = [0, 0, 0, 255];
  const main = {
    strokes: [
      { color: [...sourceColor], d: "M 0 0 L 1 1" },
      { color: [1, 2, 3, 255], d: "M 1 1 L 2 2" },
    ],
  };
  assert.equal(normalizeRequestedOutlinePalette({
    spec: main,
    sourceColor,
    destinationColor,
    variant: "main",
    element: "Left_Hand",
    drawing: "14",
  }), 1);
  assert.deepEqual(main.strokes.map(({ color }) => color), [
    destinationColor,
    [1, 2, 3, 255],
  ]);

  assert.equal(normalizeRequestedOutlinePalette({
    spec: { strokes: [{ color: [1, 2, 3, 255] }] },
    sourceColor,
    destinationColor,
    variant: "color",
    element: "Left_Hand",
    drawing: "14",
  }), 0, "an art-layer variant may legitimately contain no outline color");

  assert.throws(
    () => normalizeRequestedOutlinePalette({
      spec: { strokes: [{ color: [1, 2, 3, 255] }] },
      sourceColor,
      destinationColor,
      variant: "main",
      element: "Left_Hand",
      drawing: "14",
    }),
    /outline source color was not found in Left_Hand:14 main artwork/,
  );
});
