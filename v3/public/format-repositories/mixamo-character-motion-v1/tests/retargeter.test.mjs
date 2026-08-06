import assert from "node:assert/strict";
import test from "node:test";
import { Bone, Group, Quaternion } from "three";
import { createMixamoRetargeter } from "../runtime/renderer/mixamo-retarget.js";

function syntheticFixture() {
  const characterRoot = new Group();
  const character = new Group();
  characterRoot.add(character);
  const targetNames = ["root", "left-foot", "right-foot", ...Array.from({ length: 32 }, (_, index) => `body-${index}`)];
  const boneMap = {};
  for (const [index, name] of targetNames.entries()) {
    const bone = new Bone();
    bone.name = name;
    if (name === "root") bone.position.y = 2;
    if (name === "left-foot") bone.position.set(-0.35, 0, 0);
    if (name === "right-foot") bone.position.set(0.35, 0, 0);
    character.add(bone);
    boneMap[name] = `source-${index}`;
  }
  const face = new Bone();
  face.name = "protected-eye";
  face.position.set(0.1, 0.2, 0.3);
  character.add(face);
  const turn = new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, 0.25);
  const bones = Object.fromEntries(targetNames.map((_, index) => [`source-${index}`, {
    worldDeltaQuaternions: [0, 0, 0, 1, turn.x, turn.y, turn.z, turn.w],
  }]));
  const clip = {
    kind: "mixamo-world-delta-v2",
    source: { referencePose: "inverse-bind-matrices" },
    fps: 30,
    frameCount: 2,
    metrics: { sourceLegLengthMeters: 2, sourceLegLengthsMeters: { left: 2, right: 2 } },
    root: { positions: [0, 0, 0, 1, 2, 3] },
    feet: {
      left: { positions: [0, 0, 0, 1, 2, 3], upperLegToFootVectors: [0, -2, 0, 0, -2, 0], bindUpperLegToFootVector: [0, -2, 0], floorOffsetFromRestMeters: 0, contacts: [1, 1] },
      right: { positions: [0, 0, 0, 1, 2, 3], upperLegToFootVectors: [0, -2, 0, 0, -2, 0], bindUpperLegToFootVector: [0, -2, 0], floorOffsetFromRestMeters: 0, contacts: [1, 1] },
    },
    bones,
  };
  return {
    characterRoot,
    character,
    clip,
    face,
    profile: {
      rootBone: "root",
      feet: { left: "left-foot", right: "right-foot" },
      legChains: { left: ["body-0", "body-1"], right: ["body-2", "body-3"] },
      pairedBoneChains: [{ driver: ["body-0", "body-1"], follower: ["body-4", "body-5"] }],
      rootMotionGain: [1, 1, 1],
      boneMap,
      protectedBones: ["protected-eye"],
    },
  };
}

test("random-access frames are deterministic, preserve planar root travel, and protect eyes", () => {
  const fixture = syntheticFixture();
  const eyeRest = {
    position: fixture.face.position.clone(),
    quaternion: fixture.face.quaternion.clone(),
    scale: fixture.face.scale.clone(),
  };
  const retargeter = createMixamoRetargeter(fixture);
  const first = retargeter.applyFrame(1);
  const second = retargeter.applyFrame(1);
  assert.deepEqual(second, first);
  assert.equal(first.mappedBoneCount, 35);
  assert.equal(first.appliedRoot[0], first.requestedRoot[0]);
  assert.equal(first.appliedRoot[2], first.requestedRoot[2]);
  assert.ok(first.footReachRatios.left <= 1 + 1e-6);
  assert.ok(first.footReachRatios.right <= 1 + 1e-6);
  assert.ok(first.feet.penetration <= 1e-12);
  assert.ok(first.protectedTransformDeviation <= 1e-6);
  assert.ok(first.preConstraintMappedWorldAngularError <= 1e-6);
  assert.ok(fixture.face.position.equals(eyeRest.position));
  assert.ok(fixture.face.quaternion.equals(eyeRest.quaternion));
  assert.ok(fixture.face.scale.equals(eyeRest.scale));
  for (const [driverName, followerName] of [["body-0", "body-4"], ["body-1", "body-5"]]) {
    const driver = fixture.character.getObjectByName(driverName);
    const follower = fixture.character.getObjectByName(followerName);
    assert.ok(follower.position.equals(driver.position));
    assert.ok(follower.quaternion.equals(driver.quaternion));
    assert.ok(follower.scale.equals(driver.scale));
  }
});

test("vertical root grounding is bounded when a planted short leg becomes unreachable", () => {
  const characterRoot = new Group();
  const character = new Group();
  characterRoot.add(character);
  const root = new Bone();
  root.name = "root";
  root.position.y = 0.4;
  character.add(root);
  const buildLeg = (side, x) => {
    const thigh = new Bone();
    const knee = new Bone();
    const foot = new Bone();
    thigh.name = `${side}-thigh`;
    knee.name = `${side}-knee`;
    foot.name = `${side}-foot`;
    thigh.position.x = x;
    knee.position.y = -0.2;
    foot.position.y = -0.2;
    root.add(thigh);
    thigh.add(knee);
    knee.add(foot);
    return { thigh, knee, foot };
  };
  const left = buildLeg("left", 0.2);
  const right = buildLeg("right", -0.2);
  const turn = new Quaternion().setFromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
  const clip = {
    kind: "mixamo-world-delta-v2",
    source: { referencePose: "inverse-bind-matrices" },
    fps: 30,
    frameCount: 2,
    metrics: { sourceLegLengthMeters: 2, sourceLegLengthsMeters: { left: 2, right: 2 } },
    root: { positions: [0, 0, 0, 0, 0, 0] },
    feet: {
      left: { positions: [0, 0, 0, 0, 0, 0], upperLegToFootVectors: [0, -2, 0, 0, -2, 0], bindUpperLegToFootVector: [0, -2, 0], floorOffsetFromRestMeters: 0, contacts: [1, 1] },
      right: { positions: [0, 0, 0, 0, 0, 0], upperLegToFootVectors: [0, -2, 0, 0, -2, 0], bindUpperLegToFootVector: [0, -2, 0], floorOffsetFromRestMeters: 0, contacts: [1, 0] },
    },
    bones: { hips: { worldDeltaQuaternions: [0, 0, 0, 1, turn.x, turn.y, turn.z, turn.w] } },
  };
  const retargeter = createMixamoRetargeter({
    characterRoot,
    character,
    clip,
    profile: {
      rootBone: "root",
      feet: { left: left.foot.name, right: right.foot.name },
      legChains: { left: [left.thigh.name, left.knee.name], right: [right.thigh.name, right.knee.name] },
      rootMotionGain: [1, 1, 1],
      maximumVerticalRootCorrection: 0.1,
      boneMap: { root: "hips" },
      protectedBones: [],
    },
  });
  const result = retargeter.applyFrame(1);
  assert.ok(result.requiredVerticalRootCorrection > 0.19);
  assert.ok(Math.abs(result.verticalRootCorrection - 0.1) <= 1e-9);
  assert.ok(Math.abs(result.appliedRoot[1] + 0.1) <= 1e-9);
});
