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
    fileSha256: "b75de5d2367198174dd0dc035a1fd1777fd8717a05edd889a02447163a9231d7",
    semanticSha256: "750990adc52d4bcf8300610b9d613f1f9d70d6f841a3013c6f4d5e621091f63f",
    durationFrames: 31,
    maximumIdenticalFrames: 1,
    build: buildOpenWide,
  },
  {
    id: "present-screen-left",
    fileSha256: "b01a461b0b292533e3f02c9ecb60fce936ac279b8d82d71a1b417522f9df8635",
    semanticSha256: "eabcb4284ef53ef747bbcd33fab6d5c6e24ede69ddd7a4eda59fc1ba70072098",
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
