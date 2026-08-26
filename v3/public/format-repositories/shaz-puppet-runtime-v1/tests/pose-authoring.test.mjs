import assert from "node:assert/strict";
import test from "node:test";

import {
  adjustedState,
  controlKey,
} from "../runtime/pose-authoring.mjs";

const source = {
  position: [1, 2, 3],
  rotation: 5,
  scale: [2, 4],
  skew: 0,
  opacity: 100,
  flipHorizontal: false,
  flipVertical: false,
};

test("pose authoring applies explicit, inspectable control deltas", () => {
  const state = adjustedState(source, {
    positionDelta: [0.5, -1, 0],
    rotationDelta: 7,
    scaleMultiply: [0.5, 0.25],
  });
  assert.deepEqual(state.position, [1.5, 1, 3]);
  assert.equal(state.rotation, 12);
  assert.deepEqual(state.scale, [1, 1]);
  assert.deepEqual(source.position, [1, 2, 3]);
});

test("pose authoring emits ordinary recipe keys", () => {
  assert.deepEqual(controlKey(8, source, "hold"), {
    frame: 8,
    ...source,
    interpolation: "hold",
  });
});
