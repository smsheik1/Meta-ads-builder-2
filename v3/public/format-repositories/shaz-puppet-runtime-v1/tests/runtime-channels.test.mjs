import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  drawingAtFrame,
  samplePath3dColumn,
} from "../runtime/vendor/runtime_channels.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("vendored Harmony sampler holds PART2 Mouth-P between authored keys", () => {
  const positionColumn = { path3d: {
    points: [
      { frame: 1852, value: [-1.3072039042002306, -0.2083217091693056, 0] },
      { frame: 1854, value: [6.938893903907228e-18, -5.551115123125783e-17, 0] },
      { frame: 1858, value: [-1.3332778304475967, -0.44648298144848225, 0] },
      { frame: 1860, value: [0, 0, 0] },
    ],
    velocity: { points: [
      { frames: [1852], constantSegment: true },
      { frames: [1854], constantSegment: true },
      { frames: [1858], constantSegment: true },
      { frames: [1860], constantSegment: true },
    ] },
  } };
  const drawingColumn = {
    exposures: [
      { frames: [1852], drawing: "2" },
      { frames: [1860], drawing: "4" },
    ],
    heldFrames: [1853, 1854, 1855, 1856, 1857, 1858, 1859],
  };

  const expectedPositions = new Map([
    [1852, [-1.3072039042002306, -0.2083217091693056, 0]],
    [1853, [-1.3072039042002306, -0.2083217091693056, 0]],
    [1854, [6.938893903907228e-18, -5.551115123125783e-17, 0]],
    [1855, [6.938893903907228e-18, -5.551115123125783e-17, 0]],
    [1856, [6.938893903907228e-18, -5.551115123125783e-17, 0]],
    [1857, [6.938893903907228e-18, -5.551115123125783e-17, 0]],
    [1858, [-1.3332778304475967, -0.44648298144848225, 0]],
    [1859, [-1.3332778304475967, -0.44648298144848225, 0]],
    [1860, [0, 0, 0]],
  ]);

  for (const [frame, position] of expectedPositions) {
    assert.deepEqual(samplePath3dColumn(positionColumn, frame), position, `frame ${frame}`);
  }
  for (let frame = 1852; frame <= 1859; frame += 1) {
    assert.equal(drawingAtFrame(drawingColumn, frame), "2", `drawing at frame ${frame}`);
  }
  assert.equal(drawingAtFrame(drawingColumn, 1860), "4");
});

test("enumerate-list-items retains the imported PART2 Mouth-P keys and exposures", async () => {
  const recipeBytes = await fs.readFile(
    path.join(root, "poses", "candidates", "enumerate-list-items.json"),
  );
  const recipe = JSON.parse(recipeBytes);
  assert.equal(
    crypto.createHash("sha256").update(recipeBytes).digest("hex"),
    "059b231faf5e0517d94afb7ad99436ee0330df66b46ec79ef6cf7e3fd77c1802",
  );
  assert.equal(
    recipe.sourceAction.sourceXstageSha256,
    "0303b090a58f7ab66139e2e5328c29ca7a2528b7508c91fb648bbd80f8d1342f",
  );
  assert.equal(recipe.sourceAction.startFrame, 1795);
  assert.equal(recipe.sourceAction.endFrame, 1959);

  const mouthPositionByFrame = new Map(
    recipe.controls["Mouth-P"].map(({ frame, position }) => [frame, position]),
  );
  assert.deepEqual(mouthPositionByFrame.get(58), [-1.3072039042002306, -0.2083217091693056, 0]);
  assert.deepEqual(mouthPositionByFrame.get(60), [6.938893903907228e-18, -5.551115123125783e-17, 0]);
  assert.deepEqual(mouthPositionByFrame.get(64), [-1.3332778304475967, -0.44648298144848225, 0]);
  assert.deepEqual(mouthPositionByFrame.get(66), [0, 0, 0]);
  assert.deepEqual(
    recipe.drawings.Mouth.filter(({ frame }) => frame >= 58 && frame <= 66),
    [
      { frame: 58, drawing: "2" },
      { frame: 66, drawing: "4" },
    ],
  );
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
