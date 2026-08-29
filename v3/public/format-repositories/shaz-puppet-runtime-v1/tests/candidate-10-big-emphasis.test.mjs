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
const fileSha256 = "215ee59e14b13489846f0905e9fa214409174ac8ecec52f325232a7c93cbc23f";
const semanticSha256 = "24032ac06b54cedc3f7790ebdf1c09a5e4bd1480cbcab38a8af420b2899a7520";

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
  assert.equal(checkedIn.drawings.Left_Eye, undefined);
  assert.equal(checkedIn.drawings.Right_Eye, undefined);
  assert.deepEqual(checkedIn.drawings.Mouth, [
    { frame: 1, drawing: "1" },
    { frame: 4, drawing: "2" },
    { frame: 29, drawing: "1" },
  ]);
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
