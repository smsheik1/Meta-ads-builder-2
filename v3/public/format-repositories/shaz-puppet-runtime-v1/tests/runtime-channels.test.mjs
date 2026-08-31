import assert from "node:assert/strict";
import test from "node:test";

import { samplePath3dColumn } from "../runtime/vendor/runtime_channels.mjs";

test("vendored Harmony sampler holds constant path3D segments", () => {
  const column = { path3d: {
    points: [
      { frame: 1852, value: [-1.3072, -0.2083, 0] },
      { frame: 1854, value: [0, 0, 0] },
    ],
    velocity: { points: [
      { frames: [1852], constantSegment: true },
      { frames: [1854], constantSegment: true },
    ] },
  } };

  assert.deepEqual(samplePath3dColumn(column, 1853), [-1.3072, -0.2083, 0]);
  assert.deepEqual(samplePath3dColumn(column, 1854), [0, 0, 0]);
});

test("vendored Harmony sampler rejects unimplemented curved path3D segments", () => {
  const column = { path3d: {
    points: [
      { frame: 1, value: [0, 0, 0] },
      { frame: 5, value: [4, 2, 0] },
    ],
    velocity: { points: [
      { frames: [1], constantSegment: false },
      { frames: [5], constantSegment: false },
    ] },
  } };

  assert.throws(
    () => samplePath3dColumn(column, 3),
    /unsupported nonconstant Harmony path3D segment <unnamed> 1-5/,
  );
});

test("vendored Harmony sampler returns an exact interior key before checking its following curve", () => {
  const column = { path3d: {
    points: [
      { frame: 1, value: [0, 0, 0] },
      { frame: 5, value: [4, 2, 0] },
      { frame: 9, value: [12, 6, 0] },
    ],
    velocity: { points: [
      { frames: [1], constantSegment: true },
      { frames: [5], constantSegment: false },
      { frames: [9], constantSegment: false },
    ] },
  } };

  assert.deepEqual(samplePath3dColumn(column, 5), [4, 2, 0]);
  assert.throws(
    () => samplePath3dColumn(column, 7),
    /unsupported nonconstant Harmony path3D segment <unnamed> 5-9/,
  );
});
