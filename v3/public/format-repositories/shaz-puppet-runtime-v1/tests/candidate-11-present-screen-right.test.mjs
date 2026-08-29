import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { include } from "../build-kit.mjs";
import { inspectPose } from "../runtime/inspect-pose.mjs";
import {
  createPoseRuntime,
  poseRecipeSha256,
} from "../runtime/pose-recipe.mjs";
import {
  loadManifest,
  renderRigFrame,
} from "../runtime/rig-v2-renderer.mjs";
import {
  buildPresentScreenRight,
  DIRECTIONAL_PRESENT_REFERENCES,
} from "../poses/candidates/sources/directional-presents.mjs";
import {
  assertAngleNear,
  assertPointNear,
  measureScreenRightPresent,
} from "./helpers/pose-reference-geometry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "candidates", "present-screen-right.json");
const targetPath = path.join(root, "evidence", "candidate-11-present-screen-right-target.json");
const fileSha256 = "6fb4a6ae1d5f4c72055675e23c5af6c1c8003c402ea46896c9393848c6bd39f8";
const semanticSha256 = "5d2d5546d5d05c119ace4e40f3d58345d3f3930ebebf09664802b95a46e1ddb3";

function assertNumberNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} drifted: ${actual} != ${expected}`,
  );
}

test("Candidate 11 reproduces the settled destination hold from native rig controls", async () => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const bytes = await fs.readFile(recipePath);
  const recipe = JSON.parse(bytes);
  const target = await fs.readFile(targetPath, "utf8").then(JSON.parse);

  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), fileSha256);
  assert.equal(poseRecipeSha256(recipe), semanticSha256);
  assert.deepEqual(buildPresentScreenRight(manifest), recipe);
  assert.equal(include(recipePath), true);
  assert.equal(include(targetPath), true);
  assert.equal(recipe.durationFrames, 1);
  assert.equal(recipe.baseFrame, 32);
  assert.equal(recipe.deformationFrames, undefined);
  assert.equal(recipe.artistRenderedFramesUsed, false);
  assert.equal(target.goldFrameZeroBased, 80);
  assert.deepEqual(target.segmentation.holdBFrames, [71, 103]);
  assert.equal(target.segmentation.releasePresent, false);
  assert.equal(DIRECTIONAL_PRESENT_REFERENCES.right.targetClipFrame, 80);
  assert.deepEqual(DIRECTIONAL_PRESENT_REFERENCES.right.targetHoldRange, [71, 103]);
});

test("Candidate 11 changes only the complete native screen-right arm chain", async () => {
  const recipe = await fs.readFile(recipePath, "utf8").then(JSON.parse);
  assert.deepEqual(Object.keys(recipe.controls).sort(), [
    "Right_Arm-P",
    "Right_Arm_MOVE-P",
    "Right_Arm_Pivot-P",
    "Right_Forearm-P",
    "Right_Forearm_Pivot-P",
    "Right_Hand-P",
  ]);
  assert.deepEqual(Object.keys(recipe.drawings).sort(), ["Right_Forearm", "Right_Hand"]);
  for (const faceNode of [
    "Eyebrows",
    "Eyebrows-P",
    "Eyes-P",
    "Left_Eye",
    "Left_Eye-P",
    "Left_Pupil",
    "Mouth",
    "Mouth-P",
    "Right_Eye",
    "Right_Eye-P",
    "Right_Pupil",
  ]) {
    assert.equal(recipe.controls[faceNode], undefined);
    assert.equal(recipe.drawings[faceNode], undefined);
  }
});

test("Candidate 11 target normalization reproduces every stored landmark", async () => {
  const target = await fs.readFile(targetPath, "utf8").then(JSON.parse);
  const [numerator, denominator] = target.normalization.scaleFraction;
  const scale = numerator / denominator;
  const [translateX, translateY] = target.normalization.translation;
  assert.equal(scale, target.normalization.scale);
  assert.equal(
    target.normalization.runtimeHairWidthPixels / target.normalization.sourceHairWidthPixels,
    scale,
  );
  assertNumberNear(
    target.normalization.sourceFaceCentroid.x * scale + translateX,
    target.normalization.runtimeFaceCentroid.x,
    1e-9,
    "face centroid x",
  );
  assertNumberNear(
    target.normalization.sourceFaceCentroid.y * scale + translateY,
    target.normalization.runtimeFaceCentroid.y,
    1e-9,
    "face centroid y",
  );
  for (const name of [
    "shoulder",
    "elbow",
    "upperWristAnchor",
    "palmCentroid",
    "sleeveCentroid",
  ]) {
    const source = target.sourceFrameGeometry[name];
    const normalized = target.geometry[name];
    assertNumberNear(source.x * scale + translateX, normalized.x, 1e-9, `${name} x`);
    assertNumberNear(source.y * scale + translateY, normalized.y, 1e-9, `${name} y`);
  }
  assert.equal(
    target.sourceFrameGeometry.palmAxisDegrees,
    target.geometry.palmAxisDegrees.value,
  );
  assert.equal(
    target.sourceFrameGeometry.torsoBandAxisDegrees,
    target.geometry.torsoBandAxisDegrees.value,
  );
});

test("Candidate 11 stays inside the locked artist-reference geometry", async () => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const recipe = await fs.readFile(recipePath, "utf8").then(JSON.parse);
  const target = await fs.readFile(targetPath, "utf8").then(JSON.parse);
  const rendered = await renderRigFrame({
    manifest,
    frame: 1,
    assetRoot: path.join(root, "rig-v2", "assets"),
    propRoot: path.join(root, "assets", "props"),
    poseRuntime: createPoseRuntime(manifest, recipe),
  });
  const actual = await measureScreenRightPresent(rendered.buffer);
  assertPointNear(assert, actual.shoulder, target.geometry.shoulder, "shoulder");
  assertPointNear(assert, actual.elbow, target.geometry.elbow, "elbow");
  assertPointNear(
    assert,
    actual.upperWristAnchor,
    target.geometry.upperWristAnchor,
    "upper wrist anchor",
  );
  assertPointNear(assert, actual.palmCentroid, target.geometry.palmCentroid, "palm centroid");
  assertPointNear(assert, actual.sleeveCentroid, target.geometry.sleeveCentroid, "sleeve centroid");
  assertAngleNear(assert, actual.palmAxisDegrees, target.geometry.palmAxisDegrees, "palm axis");
  assertAngleNear(
    assert,
    actual.torsoBandAxisDegrees,
    target.geometry.torsoBandAxisDegrees,
    "torso band axis",
  );
});

test("Candidate 11 passes the unchanged inspector but remains unavailable to blind runs", async () => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const recipe = await fs.readFile(recipePath, "utf8").then(JSON.parse);
  const [registry, packets, report] = await Promise.all([
    fs.readFile(path.join(root, "poses", "index.json"), "utf8").then(JSON.parse),
    fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8").then(JSON.parse),
    inspectPose({
      manifest,
      assetRoot: path.join(root, "rig-v2", "assets"),
      propRoot: path.join(root, "assets", "props"),
      recipe,
    }),
  ]);
  assert.equal(report.status, "pass", JSON.stringify(report.failures, null, 2));
  assert.equal(report.frames.length, 1);
  assert.deepEqual(report.failures, []);
  assert.equal(registry.poses.some(({ id }) => id === recipe.id), false);
  assert.equal(
    packets.packets.some((packet) => packet.sources?.some(({ poseId }) => poseId === recipe.id)),
    false,
  );
});
