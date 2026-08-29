import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inspectPose } from "../runtime/inspect-pose.mjs";
import { poseRecipeSha256 } from "../runtime/pose-recipe.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
import { buildBigEmphasis } from "../poses/candidates/sources/big-emphasis.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "candidates", "big-emphasis.json");
const fileSha256 = "9eba7c8a70f1dc05f1d73cba8de9977c6664cf9fcedb42cc573e89c56f6aaa8d";
const semanticSha256 = "ee877349c1d4306ea2a9a7f737716ec878becb1177bd62376aa14cbbe30c2c0b";

test("Candidate 10 is checksum-bound to the frozen 0826 reference", async () => {
  const bytes = await fs.readFile(recipePath);
  const recipe = JSON.parse(bytes);

  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), fileSha256);
  assert.equal(poseRecipeSha256(recipe), semanticSha256);
  assert.equal(recipe.id, "big-emphasis");
  assert.equal(recipe.durationFrames, 31);
  assert.equal(recipe.fps, 24);
  assert.equal(recipe.artistRenderedFramesUsed, false);
  assert.deepEqual(recipe.promotionReference, {
    candidateNumber: "10",
    label: "Big emphasis",
    sourceName: "0826.mov",
    sourceSha256: "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127",
    sourceStartSeconds: 92.7,
    sourceEndSeconds: 94.55,
    clipName: "10-big-emphasis.mp4",
    clipSha256: "07972d6a4143d576fa6f2f37fa279efa357deba03cfb9e2c00988ecfaad29b41",
  });
});

test("Candidate 10 reproduces from the locked Shrug grammar without the rejected celebration", async () => {
  const [manifest, checkedIn, source] = await Promise.all([
    loadManifest(path.join(root, "rig-v2", "runtime.json")),
    fs.readFile(recipePath, "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "poses", "candidates", "sources", "big-emphasis.mjs"), "utf8"),
  ]);

  assert.deepEqual(await buildBigEmphasis(manifest), checkedIn);
  assert.doesNotMatch(source, /generated\/excited-celebration|buildExcitedCelebration/);
  assert.deepEqual(checkedIn.drawings.Left_Hand.find(({ frame }) => frame === 3), {
    frame: 3,
    drawing: "2",
  });
  assert.deepEqual(checkedIn.drawings.Right_Hand.find(({ frame }) => frame === 3), {
    frame: 3,
    drawing: "2",
  });
  for (const nodeName of [
    "Eyebrows",
    "Eyebrows-P",
    "Eyes-P",
    "Left_Eye-P",
    "Mouth-P",
    "Right_Eye-P",
  ]) {
    assert.equal(checkedIn.controls[nodeName], undefined, `${nodeName} must stay on the face track`);
  }
  for (const nodeName of [
    "Eyebrows",
    "Left_Eye",
    "Left_Pupil",
    "Mouth",
    "Right_Eye",
    "Right_Pupil",
  ]) {
    assert.equal(checkedIn.drawings[nodeName], undefined, `${nodeName} must inherit the neutral face`);
  }
});

test("Candidate 10 remains review-only and cannot be selected by the runner", async () => {
  const [registry, packets, promotion] = await Promise.all([
    fs.readFile(path.join(root, "poses", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "POSE-PROMOTION.md"), "utf8"),
  ]);

  assert.equal(registry.poses.some(({ id }) => id === "big-emphasis"), false);
  assert.equal(
    packets.packets.some((packet) => packet.sources?.some(({ poseId }) => poseId === "big-emphasis")),
    false,
  );
  assert.match(promotion, /10[\s\S]*Review built rig-native candidate[\s\S]*recipe-candidate/);
});

test("Candidate 10 passes the full pose inspector without weakening a gate", async () => {
  const [manifest, recipe] = await Promise.all([
    loadManifest(path.join(root, "rig-v2", "runtime.json")),
    fs.readFile(recipePath, "utf8").then(JSON.parse),
  ]);
  const report = await inspectPose({
    manifest,
    assetRoot: path.join(root, "rig-v2", "assets"),
    propRoot: path.join(root, "assets", "props"),
    recipe,
  });

  assert.equal(report.status, "pass", JSON.stringify(report.failures, null, 2));
  assert.equal(report.frames.length, 31);
  assert.equal(report.maximumIdenticalFrames, 1);
  assert.equal(report.maximumNativeSleeveCrossoverPixels, 0);
  assert.deepEqual(report.failures, []);
});
