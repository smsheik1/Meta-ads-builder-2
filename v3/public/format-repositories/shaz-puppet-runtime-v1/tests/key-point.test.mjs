import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inspectPose } from "../runtime/inspect-pose.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "authored", "key-point.json");
const fileSha256 = "6fc4f1da6fea7392bd8879e39c336c4e54641c2d805993025af9ad6865d9f8c5";

test("Key Point replays only the recovered neutral lead-in and authored Aha source range", async () => {
  const recipe = JSON.parse(await fs.readFile(recipePath, "utf8"));
  assert.equal(recipe.id, "key-point");
  assert.equal(recipe.baseFrame, 32);
  assert.equal(recipe.durationFrames, 27);
  assert.deepEqual(recipe.sourceAction, {
    startFrame: 175,
    endFrame: 201,
    generatedFrom: "xstage-control-channels-and-drawing-exposures",
  });
  assert.deepEqual(
    recipe.deformationFrames,
    Array.from({ length: 27 }, (_, index) => 175 + index),
  );
  assert.equal(recipe.artistRenderedFramesUsed, false);
  assert.deepEqual(recipe.bodyLanguageIsolation, {
    mouth: "neutral-base-frame",
    reason: "Body-language packets must not replay source-dialogue mouth shapes against unrelated user audio",
  });
  assert.equal(recipe.drawings.Mouth, undefined);
  assert.deepEqual(recipe.quality.sourceApprovedEdgeContacts, [
    {
      edge: "bottom",
      frames: [1, 12],
      reason: "The recovered neutral lead-in continues the fingertips beyond the lower frame edge in the supplied Xstage source",
    },
    {
      edge: "top",
      frames: [19, 22],
      reason: "The raised index finger intentionally touches the upper frame edge in the supplied Xstage source",
    },
  ]);
  assert.deepEqual(recipe.authoringCorrections, [
    {
      control: "Shaz_Rig-P",
      field: "position.x",
      operation: "constant-source-boundary-registration",
      value: 1.5107877176248605,
      reason: "Align the supplied demo-shot action to the official Neutral frame without altering its artist-authored local motion",
    },
    {
      control: "Shaz_Master-P",
      field: "rotation",
      operation: "constant-source-boundary-registration",
      value: 1.1011440901703864,
      reason: "Align the supplied demo-shot action to the official Neutral frame without altering its artist-authored local motion",
    },
  ]);
  assert.equal(recipe.controls["Shaz_Rig-P"][0].position[0], 1.51472126084801);
  assert.equal(recipe.controls["Shaz_Master-P"][0].rotation, 0.4660542972896109);
});

test("Key Point is exact-checksum registered without claiming packet certification", async () => {
  const [bytes, poses, authored] = await Promise.all([
    fs.readFile(recipePath),
    fs.readFile(path.join(root, "poses", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "poses", "authored", "index.json"), "utf8").then(JSON.parse),
  ]);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), fileSha256);
  assert.deepEqual(poses.poses.find(({ id }) => id === "key-point"), {
    id: "key-point",
    kind: "authored-body-replay",
    path: "authored/key-point.json",
    sha256: fileSha256,
  });
  assert.deepEqual(authored.actions.find(({ id }) => id === "key-point"), {
    id: "key-point",
    recipe: "key-point.json",
    sourceFrames: [175, 201],
    sha256: fileSha256,
  });
});

test("Key Point passes the same full pose inspector used for delivery", async () => {
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
  assert.equal(report.frames.length, 27);
  assert.deepEqual(report.failures, []);
});
