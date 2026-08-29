import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inspectPose } from "../runtime/inspect-pose.mjs";
import { poseRecipeSha256 } from "../runtime/pose-recipe.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "candidates", "low-side-present.json");
const fileSha256 = "53fd11c8850ec7514b01ecee6627adc2cd357e2d00132d6a95e3120bcfb77447";
const semanticSha256 = "e0bbd203cddc26966e8555ee0c3ac3d36f4103c8e2797a1080195683ab5a339e";

test("Candidate 09 preserves the exact recovered recipe and Xstage provenance", async () => {
  const bytes = await fs.readFile(recipePath);
  const recipe = JSON.parse(bytes);

  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), fileSha256);
  assert.equal(poseRecipeSha256(recipe), semanticSha256);
  assert.equal(recipe.id, "low-side-present");
  assert.equal(recipe.fps, 24);
  assert.equal(recipe.durationFrames, 7);
  assert.equal(recipe.baseFrame, 32);
  assert.equal(recipe.sourceXstageSha256, "507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca");
  assert.equal(recipe.artistRenderedFramesUsed, false);
  assert.deepEqual(recipe.sourceAction, {
    startFrame: 37,
    endFrame: 43,
    generatedFrom: "xstage-control-channels-and-drawing-exposures",
  });
});

test("Candidate 09 remains review-only and cannot be selected by the runner", async () => {
  const [registry, packets, promotion] = await Promise.all([
    fs.readFile(path.join(root, "poses", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "POSE-PROMOTION.md"), "utf8"),
  ]);

  assert.equal(registry.poses.some(({ id }) => id === "low-side-present"), false);
  assert.equal(
    packets.packets.some((packet) => packet.sources?.some(({ poseId }) => poseId === "low-side-present")),
    false,
  );
  assert.match(promotion, /09[\s\S]*Promote recovered recipe[\s\S]*recipe-candidate/);
});

test("Candidate 09 passes the full pose inspector without weakening a gate", async () => {
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
  assert.equal(report.frames.length, 7);
  assert.equal(report.maximumIdenticalFrames, 1);
  assert.deepEqual(report.failures, []);
});
