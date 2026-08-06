import {
  Quaternion,
  Vector3,
} from "three";

const EPSILON = 1e-9;

function vectorAt(values, frame) {
  const offset = frame * 3;
  return new Vector3(values[offset], values[offset + 1], values[offset + 2]);
}

function quaternionAt(values, frame) {
  const offset = frame * 4;
  return new Quaternion(values[offset], values[offset + 1], values[offset + 2], values[offset + 3]).normalize();
}

function boneDepth(bone) {
  let depth = 0;
  let current = bone.parent;
  while (current) {
    depth += 1;
    current = current.parent;
  }
  return depth;
}

function maxComponentDelta(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

function assertClip(clip) {
  if (clip?.kind !== "mixamo-world-delta-v1") throw new Error("Unsupported normalized motion schema");
  if (!Number.isInteger(clip.frameCount) || clip.frameCount < 2) throw new Error("Motion needs at least two frames");
  if (clip.fps !== 30) throw new Error(`Motion must be 30 fps; received ${clip.fps}`);
  if (clip.root?.positions?.length !== clip.frameCount * 3) throw new Error("Root position data is incomplete");
  for (const side of ["left", "right"]) {
    if (clip.feet?.[side]?.positions?.length !== clip.frameCount * 3) throw new Error(`${side} foot position data is incomplete`);
    if (clip.feet?.[side]?.contacts?.length !== clip.frameCount) throw new Error(`${side} foot contact data is incomplete`);
  }
}

/**
 * Retarget normalized Mixamo world-space deltas onto one verified character.
 *
 * Source and target are both evaluated in the renderer's Y-up world space.
 * The target's authored rest orientation is retained; only the source's
 * per-frame world delta is transferred. Face bones are never mapped and every
 * local transform is reset before a frame is evaluated, making random-access
 * rendering deterministic.
 */
export function createMixamoRetargeter({ characterRoot, character, profile, clip }) {
  assertClip(clip);

  const bones = {};
  character.traverse((object) => {
    if (object.isBone) bones[object.name] = object;
  });

  const mapped = Object.entries(profile.boneMap).map(([targetName, sourceName]) => {
    const bone = bones[targetName];
    if (!bone) throw new Error(`Target bone is missing: ${targetName}`);
    const source = clip.bones[sourceName];
    if (!source?.worldDeltaQuaternions || source.worldDeltaQuaternions.length !== clip.frameCount * 4) {
      throw new Error(`Source bone is missing or incomplete: ${sourceName}`);
    }
    return { bone, targetName, sourceName, source };
  }).sort((a, b) => boneDepth(a.bone) - boneDepth(b.bone));

  const rootBone = bones[profile.rootBone];
  const feet = {
    left: bones[profile.feet.left],
    right: bones[profile.feet.right],
  };
  if (!rootBone) throw new Error(`Root bone is missing: ${profile.rootBone}`);
  if (!feet.left || !feet.right) throw new Error("One or more target foot bones are missing");

  const allRest = new Map();
  character.traverse((object) => {
    if (!object.isBone) return;
    allRest.set(object, {
      position: object.position.clone(),
      quaternion: object.quaternion.clone(),
      scale: object.scale.clone(),
    });
  });

  characterRoot.updateMatrixWorld(true);
  const rootOrigin = characterRoot.position.clone();
  const mappedWorldRest = new Map(mapped.map(({ bone }) => [bone, bone.getWorldQuaternion(new Quaternion())]));
  const protectedRest = (profile.protectedBones || []).map((name) => {
    const bone = bones[name];
    if (!bone) throw new Error(`Protected bone is missing: ${name}`);
    const rest = allRest.get(bone);
    return { name, bone, ...rest };
  });
  const rootRestWorld = rootBone.getWorldPosition(new Vector3());
  const footRestWorld = {
    left: feet.left.getWorldPosition(new Vector3()),
    right: feet.right.getWorldPosition(new Vector3()),
  };
  const groundY = Math.min(footRestWorld.left.y, footRestWorld.right.y);
  const targetLegLength = (
    rootRestWorld.distanceTo(footRestWorld.left)
    + rootRestWorld.distanceTo(footRestWorld.right)
  ) * 0.5;
  const sourceLegLength = clip.metrics?.sourceLegLengthMeters;
  if (!(targetLegLength > EPSILON) || !(sourceLegLength > EPSILON)) throw new Error("Cannot measure source or target leg length");
  const motionScale = targetLegLength / sourceLegLength;
  const gain = new Vector3(...(profile.rootMotionGain || [1, 1, 1]));

  function resetPose() {
    for (const [bone, rest] of allRest) {
      bone.position.copy(rest.position);
      bone.quaternion.copy(rest.quaternion);
      bone.scale.copy(rest.scale);
    }
    characterRoot.position.copy(rootOrigin);
    characterRoot.updateMatrixWorld(true);
  }

  function sourceMotion(side, frame) {
    return vectorAt(clip.feet[side].positions, frame).multiplyScalar(motionScale);
  }

  function protectedDeviation() {
    let maximum = 0;
    let maximumScale = 0;
    for (const rest of protectedRest) {
      maximum = Math.max(
        maximum,
        rest.bone.position.distanceTo(rest.position),
        rest.bone.quaternion.angleTo(rest.quaternion),
        maxComponentDelta(rest.bone.scale, rest.scale),
      );
      maximumScale = Math.max(maximumScale, maxComponentDelta(rest.bone.scale, rest.scale));
    }
    return { maximum, maximumScale };
  }

  function applyFrame(frame) {
    if (!Number.isInteger(frame) || frame < 0 || frame >= clip.frameCount) {
      throw new Error(`Frame ${frame} is outside 0-${clip.frameCount - 1}`);
    }
    resetPose();

    for (const entry of mapped) {
      const delta = quaternionAt(entry.source.worldDeltaQuaternions, frame);
      const desiredWorld = delta.multiply(mappedWorldRest.get(entry.bone));
      const parentWorld = entry.bone.parent?.getWorldQuaternion(new Quaternion()) || new Quaternion();
      entry.bone.quaternion.copy(parentWorld.invert().multiply(desiredWorld).normalize());
      entry.bone.updateMatrixWorld(true);
    }

    const requestedRoot = vectorAt(clip.root.positions, frame)
      .multiplyScalar(motionScale)
      .multiply(gain);
    characterRoot.position.copy(rootOrigin).add(requestedRoot);
    characterRoot.updateMatrixWorld(true);

    const contacts = {
      left: Boolean(clip.feet.left.contacts[frame]),
      right: Boolean(clip.feet.right.contacts[frame]),
    };
    const correction = new Vector3();
    let contactingFeet = 0;
    for (const side of ["left", "right"]) {
      if (!contacts[side]) continue;
      const desired = footRestWorld[side].clone().add(sourceMotion(side, frame));
      const actual = feet[side].getWorldPosition(new Vector3());
      correction.add(desired.sub(actual));
      contactingFeet += 1;
    }
    if (contactingFeet) {
      correction.multiplyScalar(1 / contactingFeet);
      // Horizontal source travel is authoritative. Morphology-specific foot
      // correction is vertical only so planting cannot rewrite the clip's path.
      correction.x = 0;
      correction.z = 0;
      characterRoot.position.add(correction);
      characterRoot.updateMatrixWorld(true);
    }

    let currentFeet = {
      left: feet.left.getWorldPosition(new Vector3()),
      right: feet.right.getWorldPosition(new Vector3()),
    };
    const penetrationBeforeClamp = Math.max(0, groundY - currentFeet.left.y, groundY - currentFeet.right.y);
    if (penetrationBeforeClamp > 0) {
      characterRoot.position.y += penetrationBeforeClamp;
      characterRoot.updateMatrixWorld(true);
      currentFeet = {
        left: feet.left.getWorldPosition(new Vector3()),
        right: feet.right.getWorldPosition(new Vector3()),
      };
    }

    const appliedRoot = characterRoot.position.clone().sub(rootOrigin);
    const protectedLocal = protectedDeviation();
    return {
      frame,
      mappedBoneCount: mapped.length,
      targetLegLength,
      sourceLegLength,
      motionScale,
      requestedRoot: requestedRoot.toArray(),
      appliedRoot: appliedRoot.toArray(),
      contactCorrection: correction.toArray(),
      contacts,
      feet: {
        left: currentFeet.left.toArray(),
        right: currentFeet.right.toArray(),
        penetration: Math.max(0, groundY - currentFeet.left.y, groundY - currentFeet.right.y),
        penetrationBeforeClamp,
      },
      protectedTransformDeviation: protectedLocal.maximum,
      protectedScaleDeviation: protectedLocal.maximumScale,
    };
  }

  return {
    applyFrame,
    frameCount: clip.frameCount,
    fps: clip.fps,
    mappedBoneCount: mapped.length,
    motionScale,
    targetLegLength,
    sourceLegLength,
  };
}
