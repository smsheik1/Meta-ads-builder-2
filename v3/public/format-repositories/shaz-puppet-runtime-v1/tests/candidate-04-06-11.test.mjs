import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { include } from "../build-kit.mjs";
import { inspectPose } from "../runtime/inspect-pose.mjs";
import { poseRecipeSha256 } from "../runtime/pose-recipe.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";
import {
  buildPresentScreenLeft,
  buildPresentScreenRight,
  DIRECTIONAL_PRESENT_REFERENCES,
} from "../poses/candidates/sources/directional-presents.mjs";
import {
  buildOpenWide,
  OPEN_WIDE_REFERENCE,
} from "../poses/candidates/sources/open-wide.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const records = Object.freeze([
  {
    id: "open-wide",
    fileSha256: "e1e5554d834085e9b8164d666aaba7c0640b9c8949b1aec1823f95653e77bcfa",
    semanticSha256: "37fb2215cbcfa2280af4eb8b14488f707cac1f1c6499dc4533bd8e72f0224a6f",
    durationFrames: 31,
    maximumIdenticalFrames: 1,
    build: buildOpenWide,
  },
  {
    id: "present-screen-left",
    fileSha256: "0d1a2aa6a4c253db2bbb16d61f7b4070d87fe52b5feead92d661f35058e4b9c7",
    semanticSha256: "7d16a37dcb6e74d12532552a802eb29b0ddd6eb5570bcefb4f1772561751fae2",
    durationFrames: 19,
    maximumIdenticalFrames: 1,
    build: buildPresentScreenLeft,
  },
  {
    id: "present-screen-right",
    fileSha256: "76f99ac7e90d678df5c87a2b0126a93b2d1a18934315f600cf42c96c5ac55525",
    semanticSha256: "8d6d883074e9d1f0da720ba1b6fc658c482a6afe18880e69c757a7793b948cbf",
    durationFrames: 31,
    maximumIdenticalFrames: 10,
    build: buildPresentScreenRight,
  },
]);

test("Candidates 04, 06, and 11 reproduce from native rig vocabulary", async () => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  for (const record of records) {
    const recipePath = path.join(root, "poses", "candidates", `${record.id}.json`);
    const bytes = await fs.readFile(recipePath);
    const recipe = JSON.parse(bytes);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), record.fileSha256);
    assert.equal(poseRecipeSha256(recipe), record.semanticSha256);
    assert.equal(recipe.id, record.id);
    assert.equal(recipe.durationFrames, record.durationFrames);
    assert.equal(recipe.artistRenderedFramesUsed, false);
    assert.deepEqual(record.build(manifest), recipe);
    assert.equal(include(recipePath), true);
  }

  assert.equal(OPEN_WIDE_REFERENCE.clipSha256, "a67b799cc733ea2f8296f5f388bf064bac5c2e38e352b37c85215b7b1dce5592");
  assert.equal(DIRECTIONAL_PRESENT_REFERENCES.left.clipSha256, "f48bb751f215006cfcde078efd5a179715a849bca5d8145eb157ee3d30ff60a9");
  assert.equal(DIRECTIONAL_PRESENT_REFERENCES.right.clipSha256, "dc531adc7c95039cf21339427d3b6b1a42109555cac6bb51b65e5a19ae4bf3e1");
});

test("Candidate 04 owns body language only and inherits the complete neutral face", async () => {
  const recipe = await fs.readFile(
    path.join(root, "poses", "candidates", "open-wide.json"),
    "utf8",
  ).then(JSON.parse);
  const faceControls = [
    "Eyebrows",
    "Eyebrows-P",
    "Eyes-P",
    "Left_Eye-P",
    "Mouth-P",
    "Right_Eye-P",
  ];
  const faceDrawings = [
    "Eyebrows",
    "Left_Eye",
    "Left_Pupil",
    "Mouth",
    "Right_Eye",
    "Right_Pupil",
  ];

  for (const nodeName of faceControls) assert.equal(recipe.controls[nodeName], undefined);
  for (const nodeName of faceDrawings) assert.equal(recipe.drawings[nodeName], undefined);
});

test("Candidate 06 describes its fixed waist-up crop without promising hidden fingertips", async () => {
  const recipe = await fs.readFile(
    path.join(root, "poses", "candidates", "present-screen-left.json"),
    "utf8",
  ).then(JSON.parse);
  const [bottomEdge] = recipe.quality.sourceApprovedEdgeContacts;
  assert.equal(
    bottomEdge.reason,
    "The source-authored opposite hand intentionally continues below the bottom edge in the fixed waist-up crop; its native cuff/wrist chain remains intact.",
  );
  assert.doesNotMatch(bottomEdge.reason, /restores? .*fingertips/i);
});

test("Candidates 04, 06, and 11 remain unavailable to blind runs", async () => {
  const [registry, packets] = await Promise.all([
    fs.readFile(path.join(root, "poses", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8").then(JSON.parse),
  ]);
  for (const { id } of records) {
    assert.equal(registry.poses.some((pose) => pose.id === id), false, `${id} entered the registry`);
    assert.equal(
      packets.packets.some((packet) => packet.sources?.some(({ poseId }) => poseId === id)),
      false,
      `${id} entered a motion packet`,
    );
  }
});

test("Candidates 04, 06, and 11 pass the unmodified full pose inspector", async () => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  for (const record of records) {
    const recipe = await fs.readFile(
      path.join(root, "poses", "candidates", `${record.id}.json`),
      "utf8",
    ).then(JSON.parse);
    const report = await inspectPose({
      manifest,
      assetRoot: path.join(root, "rig-v2", "assets"),
      propRoot: path.join(root, "assets", "props"),
      recipe,
    });
    assert.equal(report.status, "pass", `${record.id}: ${JSON.stringify(report.failures, null, 2)}`);
    assert.equal(report.frames.length, record.durationFrames);
    assert.equal(report.maximumIdenticalFrames, record.maximumIdenticalFrames);
    assert.deepEqual(report.failures, []);
  }
});
