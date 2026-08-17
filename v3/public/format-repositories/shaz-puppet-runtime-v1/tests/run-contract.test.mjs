import assert from "node:assert/strict";
import test from "node:test";

import { validateInput } from "../runtime/run-common.mjs";

const pose = (id, durationFrames = 24) => ({ id, recipe: { durationFrames } });
const registry = { byId: new Map([
  ["think", pose("think")],
  ["idea", pose("idea", 30)],
]) };

test("sequence validation resolves registered poses and exact timeline frames", () => {
  const result = validateInput({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Thought to idea",
    sequence: [
      { poseId: "think", holdFrames: 8, gapFrames: 3 },
      { poseId: "idea", holdFrames: 12, gapFrames: 0 },
    ],
  }, registry);
  assert.equal(result.totalFrames, 77);
  assert.equal(result.durationSeconds, 77 / 24);
});

test("sequence validation rejects unregistered pose paths", () => {
  assert.throws(() => validateInput({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Bypass",
    sequence: [{ poseId: "../poses/private.json", gapFrames: 0 }],
  }, registry), /unknown pose/);
});

test("sequence validation rejects a trailing separator", () => {
  assert.throws(() => validateInput({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Trailing gap",
    sequence: [{ poseId: "think", gapFrames: 3 }],
  }, registry), /final sequence entry/);
});

test("sequence validation rejects unsupported fields", () => {
  assert.throws(() => validateInput({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Hidden fallback",
    sequence: [{ poseId: "think", gapFrames: 0, renderer: "fallback" }],
  }, registry), /unsupported key/);
});
