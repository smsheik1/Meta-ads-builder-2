import test from "node:test";
import assert from "node:assert/strict";
import { validateTimeline } from "../validate.mjs";
import { LAYOUTS, visualState } from "../render.mjs";

test("timeline accepts only contiguous approved conversation beats", () => {
  assert.deepEqual(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Hello" },
    { start: 1, end: 2, speaker: "bunny", camera: "bunny-close", caption: "Hi" },
  ], 2), []);
  assert.match(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "wide", caption: "Hello" },
  ], 1).join(" "), /camera/);
});

test("only the active speaker receives the talking pose", () => {
  const beat = { start: 0, end: 2, speaker: "cat", camera: "two-shot", caption: "Hello" };
  const open = visualState(beat, 3);
  assert.equal(open.catPose, "mouth-open");
  assert.notEqual(open.bunnyPose, "mouth-open");
});

test("the left-side bunny is mirrored inward only in the two-shot", () => {
  assert.equal(LAYOUTS["two-shot"].bunny.mirrorX, true);
  assert.equal(LAYOUTS["two-shot"].cat.mirrorX, undefined);
  assert.equal(LAYOUTS["bunny-close"].bunny.mirrorX, undefined);
});
