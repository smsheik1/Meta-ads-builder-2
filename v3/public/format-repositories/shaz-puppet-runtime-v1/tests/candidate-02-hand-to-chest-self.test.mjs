import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inspectPose } from "../runtime/inspect-pose.mjs";
import { poseRecipeSha256 } from "../runtime/pose-recipe.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
import { buildHandToChestSelf } from "../poses/candidates/sources/hand-to-chest-self.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "candidates", "hand-to-chest-self.json");
const sourcePath = path.join(root, "poses", "candidates", "sources", "hand-to-chest-self.mjs");
const fileSha256 = "b7ac9906ce330e7f051bed16958014dbd30e64c3a3c28473a6ce16e974deab16";
const semanticSha256 = "524b5af675677a465c065b3989f009be59dc080a234b19384632a721cde34438";
const generatorSha256 = "6925cd1a0c1d8f43ac60c7db62a4359137ee3d2f45ee261b264ce7b6cd271a94";

test("Candidate 02 is checksum-bound to the one-hand 0826 reference", async () => {
  const bytes = await fs.readFile(recipePath);
  const recipe = JSON.parse(bytes);

  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), fileSha256);
  assert.equal(poseRecipeSha256(recipe), semanticSha256);
  assert.equal(recipe.id, "hand-to-chest-self");
  assert.equal(recipe.durationFrames, 27);
  assert.equal(recipe.fps, 24);
  assert.equal(recipe.artistRenderedFramesUsed, false);
  assert.deepEqual(recipe.reference, {
    candidate: 2,
    sourceSha256: "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127",
    clipSha256: "b1ba1e99f92915cf7f75b34c3a8288b5a15387e249212b3abfde0df3634aacfc",
    startSeconds: 11.967,
    endSeconds: 13.067,
    sourceFps: 30,
    cameraMotionUsed: false,
    facialMotionUsed: false,
    artistRenderedFramesUsed: false,
    boundary: "hands-on-hips setup to held chest contact; no authored release in the selected clip",
  });
});

test("Candidate 02 reproduces from locked native rig vocabulary without Heartfelt", async () => {
  const [manifest, checkedIn, sourceBytes] = await Promise.all([
    loadManifest(path.join(root, "rig-v2", "runtime.json")),
    fs.readFile(recipePath, "utf8").then(JSON.parse),
    fs.readFile(sourcePath),
  ]);
  const source = sourceBytes.toString("utf8");

  assert.deepEqual(await buildHandToChestSelf(manifest), checkedIn);
  assert.equal(crypto.createHash("sha256").update(sourceBytes).digest("hex"), generatorSha256);
  assert.doesNotMatch(source, /heartfelt/i);
  assert.deepEqual(checkedIn.sourceAction.selectedLocalFrames, [3, 4, 5]);
  assert.deepEqual(checkedIn.drawings.Right_Hand, [
    { frame: 1, drawing: "1" },
    { frame: 3, drawing: "2" },
  ]);
  assert.deepEqual(checkedIn.drawings.Left_Hand, [
    { frame: 1, drawing: "1" },
    { frame: 3, drawing: "9" },
  ]);
  assert.equal(checkedIn.drawings.Mouth, undefined);
  assert.equal(checkedIn.controls.Eyebrows, undefined);
  assert.equal(checkedIn.quality.armCompositeMode, "native-rig");
  assert.equal(checkedIn.quality.armPaintOrder, undefined);
  assert.equal(checkedIn.quality.armGeometryLimits, undefined);
});

test("Candidate 02 keeps lifecycle state out of immutable recipe and generator bytes", async () => {
  const [recipe, source, registry, packets, promotion, evidence] = await Promise.all([
    fs.readFile(recipePath, "utf8").then(JSON.parse),
    fs.readFile(sourcePath, "utf8"),
    fs.readFile(path.join(root, "poses", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "POSE-PROMOTION.md"), "utf8"),
    fs.readFile(path.join(root, "evidence", "candidate-02-hand-to-chest-blocked.md"), "utf8"),
  ]);

  assert.equal(recipe.promotion, undefined);
  assert.doesNotMatch(source, /promotion:|status:|blockedAt|attemptLimitReached|resumeCondition|creativeReview|safeListed|packetEligible|registered:/);
  assert.equal(registry.poses.some(({ id }) => id === "hand-to-chest-self"), false);
  assert.equal(
    packets.packets.some((packet) => packet.sources?.some(({ poseId }) => poseId === "hand-to-chest-self")),
    false,
  );
  assert.match(promotion, /02[\s\S]*three bounded candidates exhausted[\s\S]*blocked/);
  assert.match(promotion, /0\.594 exceeds the fixed 0\.56 limit/);
  assert.match(evidence, /Status: \*\*blocked at mechanical inspection\*\*/);
  assert.match(evidence, /0\.594[\s\S]*maximum `0\.56`/);
  assert.match(evidence, /Multiply both Candidate 3 right-wrist scale axes by exactly `0\.97`/);
});

test("Candidate 02 preserves its failed mechanical gate without weakening it", async () => {
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

  assert.equal(report.status, "fail");
  assert.equal(report.frames.length, 27);
  assert.equal(report.maximumIdenticalFrames, 25);
  assert.equal(report.maximumNativeSleeveCrossoverPixels, 0);
  assert.equal(report.failures.length, 25);
  assert.deepEqual(report.failures.map(({ frame }) => frame), Array.from({ length: 25 }, (_, index) => index + 3));
  assert.ok(report.failures.every(({ gate, detail }) => (
    gate === "limb-proportion"
      && detail === "right hand/sleeve alpha-area ratio 0.594 is outside 0.1–0.56"
  )));
});
