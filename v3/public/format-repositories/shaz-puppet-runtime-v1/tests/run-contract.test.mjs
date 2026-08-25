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
  ["aha", pose("aha", 30)],
]) };

test("sequence validation resolves registered poses and exact timeline frames", () => {
  const result = validateInput({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Thought to realization",
    sequence: [
      { poseId: "think", holdFrames: 8, gapFrames: 3 },
      { poseId: "aha", holdFrames: 12, gapFrames: 0 },
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
  assert.match(skill, /Skill version: \*\*1\.2\*\*/);
  assert.match(skill, /Do not work on several uncertified actions at once/);
  assert.ok(skill.includes(learningQuestion));
  assert.match(skill, /references\/rig-animation-playbook\.md/);
  assert.match(skill, /Normal speed is the certification view|normal speed; slow motion is diagnostic/);
  assert.match(skill, /stepped exposure/);
  assert.ok(playbook.includes(learningQuestion));
  assert.match(playbook, /Mechanical invariant/);
  assert.match(playbook, /animate multiple uncertified actions/);
  assert.match(playbook, /slow motion is diagnostic only/);
  assert.match(playbook, /exposure-change frames/);
  assert.match(playbook, /atomic contact silhouette/);
  assert.match(playbook, /Never animate the component sleeve, forearm, hand, or fist assets independently/);
  assert.match(playbook, /at most one registered limb assembly/);
  assert.match(skill, /An asset-ID allowlist is not proof of topology/);
});

test("full Point cancels demo-shot motion at the master and preserves artist exposure cadence", async () => {
  const point = JSON.parse(await fs.readFile(
    path.join(root, "poses", "authored", "point.json"),
    "utf8",
  ));
  const rigX = point.controls["Shaz_Rig-P"].map(({ position }) => position[0]);
  assert.ok(Math.max(...rigX) - Math.min(...rigX) > 0.8, "the torso branch must retain its authored motion");
  assert.equal(point.authoringCorrections[0].control, "Shaz_Master-P");
  assert.equal(point.authoringCorrections[0].operation, "inverse-linear-stage-registration");
  assert.match(point.authoringCorrections[0].reason, /torso, head, arms, and hands/);
  assert.equal(point.authoringCorrections[1].operation, "artist-authored-step-exposures");

  const changeFrames = [1, 3, 5, 7, 9, 11, 37, 39, 40, 42, 44, 46, 56, 58, 60, 62, 64, 68, 70, 72, 74, 76];
  assert.deepEqual(point.quality.sourceExposureChangeFrames, changeFrames);
  assert.equal(point.quality.maximumIdenticalFrames, 26);
  assert.deepEqual(
    point.quality.sourceApprovedHolds.map(({ startFrame, endFrame }) => [startFrame, endFrame]),
    [[11, 36], [46, 55]],
  );

  for (const [control, keys] of Object.entries(point.controls)) {
    assert.deepEqual(keys.map(({ frame }) => frame), changeFrames, `${control} must use the certified exposure changes`);
    assert.ok(keys.every(({ interpolation }) => interpolation === "hold"), `${control} must not invent in-betweens`);
  }

  let currentChange = 1;
  const expectedDeformationFrames = Array.from({ length: point.durationFrames }, (_, index) => {
    const frame = index + 1;
    if (changeFrames.includes(frame)) currentChange = frame;
    return 188 + currentChange;
  });
  assert.deepEqual(point.deformationFrames, expectedDeformationFrames);
});

test("Confident preserves its source-proven on-twos exposure cadence", async () => {
  const confident = JSON.parse(await fs.readFile(
    path.join(root, "poses", "authored", "confident.json"),
    "utf8",
  ));
  const changeFrames = [1, 3, 5, 7, 9, 11, 13];
  assert.deepEqual(confident.quality.sourceExposureChangeFrames, changeFrames);
  assert.equal(confident.quality.maximumIdenticalFrames, 2);
  assert.equal(
    confident.authoringCorrections[0].operation,
    "artist-authored-step-exposures",
  );

  for (const [control, keys] of Object.entries(confident.controls)) {
    assert.deepEqual(
      keys.map(({ frame }) => frame),
      changeFrames,
      `${control} must use only the certified exposure changes`,
    );
    assert.ok(
      keys.every(({ interpolation }) => interpolation === "hold"),
      `${control} must not invent in-betweens`,
    );
  }

  let currentChange = 1;
  const expectedDeformationFrames = Array.from(
    { length: confident.durationFrames },
    (_, index) => {
      const frame = index + 1;
      if (changeFrames.includes(frame)) currentChange = frame;
      return 286 + currentChange;
    },
  );
  assert.deepEqual(confident.deformationFrames, expectedDeformationFrames);
});
