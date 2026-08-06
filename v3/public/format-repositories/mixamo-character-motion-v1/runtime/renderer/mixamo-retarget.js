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
  if (clip?.kind !== "mixamo-world-delta-v2" || clip?.source?.referencePose !== "inverse-bind-matrices") {
    throw new Error("Unsupported normalized motion schema");
  }
  if (!Number.isInteger(clip.frameCount) || clip.frameCount < 2) throw new Error("Motion needs at least two frames");
  if (clip.fps !== 30) throw new Error(`Motion must be 30 fps; received ${clip.fps}`);
  if (clip.root?.positions?.length !== clip.frameCount * 3) throw new Error("Root position data is incomplete");
  for (const side of ["left", "right"]) {
    if (clip.feet?.[side]?.positions?.length !== clip.frameCount * 3) throw new Error(`${side} foot position data is incomplete`);
    if (clip.feet?.[side]?.upperLegToFootVectors?.length !== clip.frameCount * 3) throw new Error(`${side} upper-leg-to-foot data is incomplete`);
    if (clip.feet?.[side]?.bindUpperLegToFootVector?.length !== 3) throw new Error(`${side} bind-pose leg vector is incomplete`);
    if (!Number.isFinite(clip.feet?.[side]?.floorOffsetFromRestMeters)) throw new Error(`${side} floor offset is missing`);
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
  const legChains = Object.fromEntries(["left", "right"].map((side) => {
    const names = profile.legChains?.[side];
    if (!Array.isArray(names) || names.length < 2) throw new Error(`Target ${side} leg chain is incomplete`);
    return [side, names.map((name) => {
      const bone = bones[name];
      if (!bone) throw new Error(`Target leg bone is missing: ${name}`);
      return bone;
    })];
  }));

  const allRest = new Map();
  character.traverse((object) => {
    if (!object.isBone) return;
    allRest.set(object, {
      position: object.position.clone(),
      quaternion: object.quaternion.clone().normalize(),
      scale: object.scale.clone(),
    });
  });
  const pairedBoneChains = (profile.pairedBoneChains || []).map(({ driver, follower }) => {
    if (!Array.isArray(driver) || !Array.isArray(follower) || driver.length !== follower.length || !driver.length) {
      throw new Error("Paired bone chains must declare equally sized driver and follower arrays");
    }
    return driver.map((driverName, index) => {
      const driverBone = bones[driverName];
      const followerBone = bones[follower[index]];
      if (!driverBone || !followerBone) throw new Error(`Paired bone is missing: ${driverName} -> ${follower[index]}`);
      return { driverBone, followerBone };
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
  const footRestWorld = {
    left: feet.left.getWorldPosition(new Vector3()),
    right: feet.right.getWorldPosition(new Vector3()),
  };
  const thighRestWorld = {
    left: legChains.left[0].getWorldPosition(new Vector3()),
    right: legChains.right[0].getWorldPosition(new Vector3()),
  };
  const groundY = Math.min(footRestWorld.left.y, footRestWorld.right.y);
  const chainLength = (side) => {
    const points = [...legChains[side], feet[side]].map((bone) => bone.getWorldPosition(new Vector3()));
    return points.slice(1).reduce((total, point, index) => total + points[index].distanceTo(point), 0);
  };
  const targetLegLengths = { left: chainLength("left"), right: chainLength("right") };
  const targetLegLength = (targetLegLengths.left + targetLegLengths.right) * 0.5;
  const sourceLegLength = clip.metrics?.sourceLegLengthMeters;
  const sourceLegLengths = clip.metrics?.sourceLegLengthsMeters;
  if (!(targetLegLength > EPSILON) || !(sourceLegLength > EPSILON)) throw new Error("Cannot measure source or target leg length");
  if (!(sourceLegLengths?.left > EPSILON) || !(sourceLegLengths?.right > EPSILON)) throw new Error("Per-leg source measurements are missing");
  const motionScale = targetLegLength / sourceLegLength;
  const gain = new Vector3(...(profile.rootMotionGain || [1, 1, 1]));
  const targetRestLegVectors = {
    left: footRestWorld.left.clone().sub(thighRestWorld.left),
    right: footRestWorld.right.clone().sub(thighRestWorld.right),
  };
  const restDirectionAlignments = {};
  const sourceRestExtensionRatios = {};
  const targetRestExtensionRatios = {};
  for (const side of ["left", "right"]) {
    const sourceRestVector = new Vector3(...clip.feet[side].bindUpperLegToFootVector);
    restDirectionAlignments[side] = new Quaternion().setFromUnitVectors(
      sourceRestVector.clone().normalize(),
      targetRestLegVectors[side].clone().normalize(),
    );
    sourceRestExtensionRatios[side] = sourceRestVector.length() / sourceLegLengths[side];
    targetRestExtensionRatios[side] = targetRestLegVectors[side].length() / targetLegLengths[side];
  }

  function resetPose() {
    for (const [bone, rest] of allRest) {
      bone.position.copy(rest.position);
      bone.quaternion.copy(rest.quaternion);
      bone.scale.copy(rest.scale);
    }
    characterRoot.position.copy(rootOrigin);
    characterRoot.updateMatrixWorld(true);
  }

  function joinPairedBoneChains() {
    for (const chain of pairedBoneChains) {
      for (const { driverBone, followerBone } of chain) {
        followerBone.position.copy(driverBone.position);
        followerBone.quaternion.copy(driverBone.quaternion);
        followerBone.scale.copy(driverBone.scale);
      }
    }
  }

  function sourceMotion(side, frame) {
    return vectorAt(clip.feet[side].positions, frame).multiplyScalar(motionScale);
  }

  function authoritativeFootY(side, frame) {
    const sourceFloorOffset = clip.feet[side].floorOffsetFromRestMeters * motionScale;
    return groundY + sourceMotion(side, frame).y - sourceFloorOffset;
  }

  function desiredFootPosition(side, frame) {
    const sourceLegVector = vectorAt(clip.feet[side].upperLegToFootVectors, frame);
    const sourceExtensionRatio = sourceLegVector.length() / sourceLegLengths[side];
    const targetExtensionRatio = Math.max(0.08, Math.min(
      1,
      targetRestExtensionRatios[side] + sourceExtensionRatio - sourceRestExtensionRatios[side],
    ));
    let targetLength = targetLegLengths[side] * targetExtensionRatio;
    const alignedDirection = sourceLegVector.normalize().applyQuaternion(restDirectionAlignments[side]);
    const thighPosition = legChains[side][0].getWorldPosition(new Vector3());
    const desiredY = authoritativeFootY(side, frame);
    targetLength = Math.min(targetLegLengths[side], Math.max(targetLength, Math.abs(desiredY - thighPosition.y)));
    const relativeY = Math.max(-targetLength, Math.min(targetLength, desiredY - thighPosition.y));
    const horizontalDirection = new Vector3(alignedDirection.x, 0, alignedDirection.z);
    if (horizontalDirection.lengthSq() < EPSILON) {
      horizontalDirection.set(targetRestLegVectors[side].x, 0, targetRestLegVectors[side].z);
    }
    horizontalDirection.normalize();
    const horizontalLength = Math.sqrt(Math.max(0, targetLength * targetLength - relativeY * relativeY));
    return thighPosition.addScaledVector(horizontalDirection, horizontalLength).setY(thighPosition.y + relativeY);
  }

  function solveLeg(side, target) {
    const chain = [...legChains[side], feet[side]];
    const points = chain.map((bone) => bone.getWorldPosition(new Vector3()));
    const lengths = points.slice(1).map((point, index) => point.distanceTo(points[index]));
    const base = points[0].clone();
    const totalLength = lengths.reduce((sum, length) => sum + length, 0);
    if (base.distanceTo(target) >= totalLength) {
      const direction = target.clone().sub(base).normalize();
      for (let index = 0; index < lengths.length; index += 1) {
        points[index + 1].copy(points[index]).addScaledVector(direction, lengths[index]);
      }
    } else {
      for (let iteration = 0; iteration < 16; iteration += 1) {
        points.at(-1).copy(target);
        for (let index = points.length - 2; index >= 0; index -= 1) {
          const direction = points[index].clone().sub(points[index + 1]).normalize();
          points[index].copy(points[index + 1]).addScaledVector(direction, lengths[index]);
        }
        points[0].copy(base);
        for (let index = 0; index < lengths.length; index += 1) {
          const direction = points[index + 1].clone().sub(points[index]).normalize();
          points[index + 1].copy(points[index]).addScaledVector(direction, lengths[index]);
        }
        if (points.at(-1).distanceToSquared(target) <= 1e-10) break;
      }
    }

    const currentDirection = new Vector3();
    const desiredDirection = new Vector3();
    const jointPosition = new Vector3();
    const childPosition = new Vector3();
    const deltaWorld = new Quaternion();
    const currentWorld = new Quaternion();
    const parentWorld = new Quaternion();
    for (let index = 0; index < legChains[side].length; index += 1) {
      const joint = legChains[side][index];
      const child = chain[index + 1];
      joint.getWorldPosition(jointPosition);
      child.getWorldPosition(childPosition);
      currentDirection.copy(childPosition).sub(jointPosition);
      desiredDirection.copy(points[index + 1]).sub(points[index]);
      if (currentDirection.lengthSq() < EPSILON || desiredDirection.lengthSq() < EPSILON) continue;
      deltaWorld.setFromUnitVectors(currentDirection.normalize(), desiredDirection.normalize());
      joint.getWorldQuaternion(currentWorld);
      const desiredWorld = deltaWorld.multiply(currentWorld).normalize();
      joint.parent.getWorldQuaternion(parentWorld);
      joint.quaternion.copy(parentWorld.invert().multiply(desiredWorld).normalize());
      joint.updateMatrixWorld(true);
    }
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

    const desiredWorldByBone = new Map();
    for (const entry of mapped) {
      const delta = quaternionAt(entry.source.worldDeltaQuaternions, frame);
      const desiredWorld = delta.multiply(mappedWorldRest.get(entry.bone));
      desiredWorldByBone.set(entry.bone, desiredWorld.clone());
      const parentWorld = entry.bone.parent?.getWorldQuaternion(new Quaternion()) || new Quaternion();
      entry.bone.quaternion.copy(parentWorld.invert().multiply(desiredWorld).normalize());
      entry.bone.updateMatrixWorld(true);
    }

    let maximumPreConstraintMappedWorldAngularError = 0;
    let maximumPreConstraintMappedWorldAngularErrorBone = null;
    for (const entry of mapped) {
      const actualWorld = entry.bone.getWorldQuaternion(new Quaternion());
      const angularError = actualWorld.angleTo(desiredWorldByBone.get(entry.bone));
      if (angularError > maximumPreConstraintMappedWorldAngularError) {
        maximumPreConstraintMappedWorldAngularError = angularError;
        maximumPreConstraintMappedWorldAngularErrorBone = entry.targetName;
      }
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
    let requiredVerticalRootCorrection = 0;
    for (const side of ["left", "right"]) {
      if (!contacts[side]) continue;
      const thighY = legChains[side][0].getWorldPosition(new Vector3()).y;
      requiredVerticalRootCorrection = Math.max(
        requiredVerticalRootCorrection,
        thighY - authoritativeFootY(side, frame) - targetLegLengths[side],
      );
    }
    requiredVerticalRootCorrection = Math.max(0, requiredVerticalRootCorrection);
    const maximumVerticalRootCorrection = Math.max(0, profile.maximumVerticalRootCorrection || 0);
    const verticalRootCorrection = Math.min(requiredVerticalRootCorrection, maximumVerticalRootCorrection);
    if (verticalRootCorrection > 0) {
      characterRoot.position.y -= verticalRootCorrection;
      characterRoot.updateMatrixWorld(true);
    }

    const desiredFeet = {
      left: desiredFootPosition("left", frame),
      right: desiredFootPosition("right", frame),
    };
    const footReachRatios = {
      left: legChains.left[0].getWorldPosition(new Vector3()).distanceTo(desiredFeet.left) / targetLegLengths.left,
      right: legChains.right[0].getWorldPosition(new Vector3()).distanceTo(desiredFeet.right) / targetLegLengths.right,
    };
    solveLeg("left", desiredFeet.left);
    solveLeg("right", desiredFeet.right);
    joinPairedBoneChains();
    characterRoot.updateMatrixWorld(true);

    const currentFeet = {
      left: feet.left.getWorldPosition(new Vector3()),
      right: feet.right.getWorldPosition(new Vector3()),
    };

    const appliedRoot = characterRoot.position.clone().sub(rootOrigin);
    const protectedLocal = protectedDeviation();
    const contactVerticalErrors = {
      left: contacts.left ? Math.abs(currentFeet.left.y - desiredFeet.left.y) : 0,
      right: contacts.right ? Math.abs(currentFeet.right.y - desiredFeet.right.y) : 0,
    };
    const contactGroundClearances = {
      left: contacts.left ? Math.max(0, currentFeet.left.y - groundY) : 0,
      right: contacts.right ? Math.max(0, currentFeet.right.y - groundY) : 0,
    };
    const footTargetErrors = {
      left: currentFeet.left.distanceTo(desiredFeet.left),
      right: currentFeet.right.distanceTo(desiredFeet.right),
    };
    return {
      frame,
      mappedBoneCount: mapped.length,
      targetLegLength,
      sourceLegLength,
      motionScale,
      requestedRoot: requestedRoot.toArray(),
      appliedRoot: appliedRoot.toArray(),
      requiredVerticalRootCorrection,
      verticalRootCorrection,
      contacts,
      contactVerticalErrors,
      contactGroundClearances,
      footTargetErrors,
      footTargets: { left: desiredFeet.left.toArray(), right: desiredFeet.right.toArray() },
      footReachRatios,
      feet: {
        left: currentFeet.left.toArray(),
        right: currentFeet.right.toArray(),
        penetration: Math.max(0, groundY - currentFeet.left.y, groundY - currentFeet.right.y),
      },
      protectedTransformDeviation: protectedLocal.maximum,
      protectedScaleDeviation: protectedLocal.maximumScale,
      preConstraintMappedWorldAngularError: maximumPreConstraintMappedWorldAngularError,
      preConstraintMappedWorldAngularErrorBone: maximumPreConstraintMappedWorldAngularErrorBone,
    };
  }

  return {
    applyFrame,
    frameCount: clip.frameCount,
    fps: clip.fps,
    mappedBoneCount: mapped.length,
    motionScale,
    resetPose,
    targetLegLength,
    sourceLegLength,
  };
}
