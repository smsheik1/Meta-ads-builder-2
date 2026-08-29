import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inspectPose } from "../runtime/inspect-pose.mjs";
import { poseRecipeSha256 } from "../runtime/pose-recipe.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
import { buildHeartfeltChestClaspHold } from "../poses/candidates/sources/heartfelt-chest-clasp-hold.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "candidates", "heartfelt-chest-clasp-hold.json");
const fileSha256 = "41b5e2befdfd4c6ac47430503cc502cc9bf0c340edfddbc41d06fa1e283bbb8a";
const semanticSha256 = "0291e18c3e7a848c0a5f6b8c432a470c7319f627451032958a289192d39d8dce";

test("Candidate 08 is checksum-bound to the frozen Heartfelt reference", async () => {
  const bytes = await fs.readFile(recipePath);
  const recipe = JSON.parse(bytes);

  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), fileSha256);
  assert.equal(poseRecipeSha256(recipe), semanticSha256);
  assert.equal(recipe.id, "heartfelt-chest-clasp-hold");
  assert.equal(recipe.durationFrames, 48);
  assert.equal(recipe.fps, 24);
  assert.equal(recipe.baseFrame, 95);
  assert.equal(recipe.artistRenderedFramesUsed, false);
  assert.deepEqual(recipe.sourceAction.referenceHoldLocalFrames, [8, 96]);
  assert.deepEqual(recipe.reference, {
    candidate: 8,
    label: "Heartfelt",
    sourceName: "0826.mov",
    sourceSha256: "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127",
    clipName: "08-heartfelt.mp4",
    clipSha256: "20056ed75665b64ef628bff8522f3fe17d3e1b2d6a4b03fa884881bf4dc6506d",
    startSeconds: 68.2,
    endSeconds: 71.6,
    sourceFps: 30,
    clipFrameCount: 102,
    cameraMotionUsed: false,
    facialMotionUsed: false,
    artistRenderedFramesUsed: false,
    boundary: "Local frames 8-96 provide the two-hand chest-clasp hold; frames 1-7 are inherited lead-in and frames 97-102 are a hard edit, so no authentic entry or release is claimed.",
  });
});

test("Candidate 08 reproduces as its own native bilateral clasp vocabulary", async () => {
  const [manifest, checkedIn, source] = await Promise.all([
    loadManifest(path.join(root, "rig-v2", "runtime.json")),
    fs.readFile(recipePath, "utf8").then(JSON.parse),
    fs.readFile(path.join(
      root,
      "poses",
      "candidates",
      "sources",
      "heartfelt-chest-clasp-hold.mjs",
    ), "utf8"),
  ]);

  assert.deepEqual(buildHeartfeltChestClaspHold(manifest), checkedIn);
  assert.doesNotMatch(source, /hand-to-chest-self|poses\/authored/);
  assert.deepEqual(checkedIn.drawings.Left_Hand, [{ frame: 1, drawing: "2" }]);
  assert.deepEqual(checkedIn.drawings.Right_Hand, [{ frame: 1, drawing: "9" }]);
  assert.deepEqual(checkedIn.drawings.Mouth, [{ frame: 1, drawing: "1" }]);
  assert.equal(checkedIn.drawings.Left_Eye, undefined);
  assert.equal(checkedIn.drawings.Right_Eye, undefined);
  assert.deepEqual(checkedIn.controls["Left_Hand-P"][0].scale, [
    0.911158923262414,
    0.6595558719813729,
  ]);
  assert.equal(checkedIn.quality.armCompositeMode, "native-rig");
  assert.equal(checkedIn.quality.armPaintOrder, "both-front-left-under-right");
});

test("Candidate 08 remains unapproved and unavailable to blind sequencing", async () => {
  const [recipe, registry, packets, promotion, candidates] = await Promise.all([
    fs.readFile(recipePath, "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "poses", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "POSE-PROMOTION.md"), "utf8"),
    fs.readFile(path.join(root, "poses", "candidates", "README.md"), "utf8"),
  ]);

  assert.deepEqual(recipe.promotion, {
    status: "recipe-candidate",
    attemptsUsed: 3,
    mechanicalInspection: "pass",
    creativeReview: "pending",
    registered: false,
    safeListed: false,
    packetEligible: false,
    blocker: "Exact-output normal-speed creative review is pending, and the frozen source supplies no authentic entry or release boundary.",
  });
  assert.equal(registry.poses.some(({ id }) => id === recipe.id), false);
  assert.equal(
    packets.packets.some((packet) => packet.sources?.some(({ poseId }) => poseId === recipe.id)),
    false,
  );
  assert.match(promotion, /08[\s\S]*Heartfelt[\s\S]*recipe-candidate/);
  assert.match(candidates, /08 — Heartfelt chest-clasp hold[\s\S]*recipe-candidate/);
});

test("Candidate 08 passes every frame through the unchanged pose inspector", async () => {
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
  assert.equal(report.frames.length, 48);
  assert.equal(report.maximumIdenticalFrames, 1);
  assert.equal(report.maximumNativeSleeveCrossoverPixels, 148);
  assert.deepEqual(report.failures, []);
});
