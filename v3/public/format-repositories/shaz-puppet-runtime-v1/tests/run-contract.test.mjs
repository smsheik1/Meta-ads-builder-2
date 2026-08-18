import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateInput } from "../runtime/run-common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

test("packaged skill protects the one-action learning loop", async () => {
  const [skill, playbook] = await Promise.all([
    fs.readFile(path.join(root, "SKILL.md"), "utf8"),
    fs.readFile(path.join(root, "references", "rig-animation-playbook.md"), "utf8"),
  ]);
  const learningQuestion = "What did this teach us, and does the skill, runtime, or test suite need updating?";
  assert.match(skill, /Skill version: \*\*1\*\*/);
  assert.match(skill, /Do not work on several uncertified actions at once/);
  assert.ok(skill.includes(learningQuestion));
  assert.match(skill, /references\/rig-animation-playbook\.md/);
  assert.ok(playbook.includes(learningQuestion));
  assert.match(playbook, /Mechanical invariant/);
  assert.match(playbook, /animate multiple uncertified actions/);
});
