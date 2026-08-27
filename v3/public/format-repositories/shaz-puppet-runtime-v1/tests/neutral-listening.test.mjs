import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inspectPose } from "../runtime/inspect-pose.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
import { loadPoseRegistry } from "../runtime/run-common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "authored", "neutral-listening.json");
const expectedSha256 = "ca91808736aca7c2b4be3881a688abf9c755617bc61c9b21516a8e2361540406";

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function sha256(file) {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

test("neutral listening is checksum-bound to recovered Xstage frame 32 in both registries", async () => {
  const [recipe, publicRegistry, authoredRegistry, actualSha256] = await Promise.all([
    readJson(recipePath),
    readJson(path.join(root, "poses", "index.json")),
    readJson(path.join(root, "poses", "authored", "index.json")),
    sha256(recipePath),
  ]);

  assert.equal(actualSha256, expectedSha256);
  assert.deepEqual(
    publicRegistry.poses.find(({ id }) => id === "neutral-listening"),
    {
      id: "neutral-listening",
      kind: "authored-neutral-anchor",
      path: "authored/neutral-listening.json",
      sha256: expectedSha256,
    },
  );
  assert.deepEqual(
    authoredRegistry.actions.find(({ id }) => id === "neutral-listening"),
    {
      id: "neutral-listening",
      recipe: "neutral-listening.json",
      sourceFrames: [32, 32],
      sha256: expectedSha256,
    },
  );
  assert.equal(recipe.sourceXstageSha256, authoredRegistry.sourceXstageSha256);
  assert.equal(recipe.baseFrame, 32);
  assert.equal(recipe.durationFrames, 1);
  assert.deepEqual(
    [recipe.sourceAction.startFrame, recipe.sourceAction.endFrame],
    [32, 32],
  );
  assert.equal(recipe.artistRenderedFramesUsed, false);
});

test("neutral listening inherits the recovered frame without arbitrary animation or props", async () => {
  const recipe = await readJson(recipePath);

  assert.deepEqual(recipe.controls, {});
  assert.deepEqual(recipe.drawings, {});
  assert.equal(Object.hasOwn(recipe, "props"), false);
});

test("neutral listening loads through the official registry and passes full pose inspection", async () => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const registry = await loadPoseRegistry(root, manifest);
  const pose = registry.byId.get("neutral-listening");

  assert.ok(pose, "neutral listening must load from the official registry");
  assert.equal(pose.sha256, expectedSha256);
  const report = await inspectPose({
    manifest,
    assetRoot: path.join(root, "rig-v2", "assets"),
    propRoot: path.join(root, "assets", "props"),
    recipe: pose.recipe,
  });
  assert.equal(report.status, "pass", JSON.stringify(report.failures));
  assert.equal(report.poseRecipeSha256, pose.poseRuntime.recipeSha256);
  assert.equal(report.artistRenderedFramesUsed, false);
  assert.equal(report.frames.length, 1);
  assert.deepEqual(report.failures, []);
});
