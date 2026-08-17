import assert from "node:assert/strict";
import test from "node:test";

import {
  alphaStats,
  expectedEdgesForFrame,
  paintOrderValid,
} from "../runtime/inspect-pose.mjs";
import { READ_PAINT_PLAN } from "../runtime/rig-v2-renderer.mjs";

test("alpha inspection reports clipping bounds and disconnected components", async () => {
  const image = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
      + '<rect x="0" y="10" width="20" height="20" fill="black"/>'
      + '<rect x="70" y="70" width="20" height="20" fill="black"/>'
      + "</svg>",
  );
  const stats = await alphaStats(image, 100);
  assert.deepEqual(stats.bbox, { minX: 0, minY: 10, maxX: 89, maxY: 89 });
  assert.equal(stats.componentPixels.length, 2);
});

test("edge-contact exceptions are source-only and frame-bounded", () => {
  const sourceRecipe = {
    sourceAction: { generatedFrom: "xstage-control-channels-and-drawing-exposures" },
    quality: { sourceApprovedEdgeContacts: [{ edge: "top", frames: [5, 8] }] },
  };
  assert.deepEqual([...expectedEdgesForFrame(sourceRecipe, 6)], ["top"]);
  assert.deepEqual([...expectedEdgesForFrame(sourceRecipe, 9)], []);
  assert.throws(
    () => expectedEdgesForFrame({
      quality: { sourceApprovedEdgeContacts: [{ edge: "top", frames: [1, 2] }] },
    }, 1),
    /only for Xstage calibration/,
  );
});

test("paint inspection accepts only monotonic subsets of the recovered plan", () => {
  assert.equal(paintOrderValid([
    READ_PAINT_PLAN[0],
    READ_PAINT_PLAN[3],
    READ_PAINT_PLAN.at(-1),
  ]), true);
  assert.equal(paintOrderValid([
    READ_PAINT_PLAN[3],
    READ_PAINT_PLAN[0],
  ]), false);
});
