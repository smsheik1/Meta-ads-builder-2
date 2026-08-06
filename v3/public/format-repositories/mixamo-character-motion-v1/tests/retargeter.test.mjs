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
    kind: "mixamo-world-delta-v1",
    fps: 30,
    frameCount: 2,
    metrics: { sourceLegLengthMeters: 2 },
    root: { positions: [0, 0, 0, 1, 2, 3] },
    feet: {
      left: { positions: [0, 0, 0, 1, 2, 3], contacts: [1, 1] },
      right: { positions: [0, 0, 0, 1, 2, 3], contacts: [1, 1] },
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
  assert.ok(first.feet.penetration <= 1e-12);
  assert.ok(first.protectedTransformDeviation <= 1e-6);
  assert.ok(fixture.face.position.equals(eyeRest.position));
  assert.ok(fixture.face.quaternion.equals(eyeRest.quaternion));
  assert.ok(fixture.face.scale.equals(eyeRest.scale));
});
