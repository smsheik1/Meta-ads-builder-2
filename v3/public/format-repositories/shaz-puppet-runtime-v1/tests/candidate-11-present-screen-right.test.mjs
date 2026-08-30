import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { include } from "../build-kit.mjs";
import { inspectPose } from "../runtime/inspect-pose.mjs";
import { createPoseRuntime } from "../runtime/pose-recipe.mjs";
import { validateInput } from "../runtime/run-common.mjs";
import {
  loadManifest,
  renderRigFrame,
} from "../runtime/rig-v2-renderer.mjs";
import {
  buildPresentScreenRight,
  buildPresentScreenRightDestinationStudy,
  DIRECTIONAL_PRESENT_REFERENCES,
} from "../poses/candidates/sources/directional-presents.mjs";
import {
  assertAngleNear,
  assertPointNear,
  measureScreenRightPresentPhase,
} from "./helpers/pose-reference-geometry.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const recipePath = path.join(root, "poses", "candidates", "present-screen-right.json");
const studyPath = path.join(
  root,
  "poses",
  "candidates",
  "present-screen-right-destination-study.json",
);
const generatorPath = path.join(
  root,
  "poses",
  "candidates",
  "sources",
  "directional-presents.mjs",
);
const targetPath = path.join(root, "evidence", "candidate-11-present-screen-right-target.json");
const manifestPath = path.join(root, "rig-v2", "runtime.json");
const assetRoot = path.join(root, "rig-v2", "assets");
const propRoot = path.join(root, "assets", "props");

const RIGHT_ARM_CONTROLS = Object.freeze([
  "Right_Arm-P",
  "Right_Arm_MOVE-P",
  "Right_Arm_Pivot-P",
  "Right_Forearm-P",
  "Right_Forearm_Pivot-P",
  "Right_Hand-P",
]);
const BODY_CONTROLS = Object.freeze(["Body-P", "Head_Movement-P"]);
const ACTION_KEY_FRAMES = Object.freeze([1, 2, 4, 6, 50, 52, 54, 56, 58]);
const SOURCE_PHASES = Object.freeze({
  entry: [0, 5],
  holdA: [6, 60],
  counterShift: [61, 70],
  holdB: [71, 103],
});
const RUNTIME_PHASES = Object.freeze({
  entry: [1, 5],
  holdA: [6, 49],
  counterShift: [50, 57],
  holdB: [58, 83],
});
const PHASE_TARGETS = Object.freeze([
  ["entry-cross-chest", 0, 1, 1],
  ["entry-nose-touch", 1, 2, 3],
  ["entry-cheek-palm", 4, 4, 5],
  ["hold-a", 11, 6, 49],
  ["counter-shift-1", 61, 50, 51],
  ["counter-shift-2", 64, 52, 53],
  ["counter-shift-3", 66, 54, 55],
  ["counter-shift-4", 69, 56, 57],
  ["hold-b-arrival", 71, 58, 64],
  ["hold-b-gold", 80, 65, 83],
]);
const CORE_GEOMETRY_FIELDS = Object.freeze([
  "shoulder",
  "elbow",
  "palmCentroid",
  "palmAxisDegrees",
  "sleeveCentroid",
  "torsoBandAxisDegrees",
]);
const POINT_FIELDS = new Set([
  "faceCentroid",
  "shoulder",
  "elbow",
  "upperWristAnchor",
  "palmCentroid",
  "sleeveCentroid",
]);
const ANGLE_FIELDS = new Set(["palmAxisDegrees", "torsoBandAxisDegrees"]);
const ENTRY_GEOMETRY_CONTRACT = Object.freeze({
  "entry-cross-chest": Object.freeze({
    faceCentroid: 7,
    palmCentroid: 1,
    palmAxisDegrees: 0.5,
    sleeveCentroid: 1,
  }),
  "entry-nose-touch": Object.freeze({
    shoulder: 4,
    elbow: 2,
    palmCentroid: 1,
    palmAxisDegrees: 0.5,
    sleeveCentroid: 2,
  }),
});

const loadJson = (file) => fs.readFile(file, "utf8").then(JSON.parse);

function assertCanonicalAction(recipe) {
  assert.equal(recipe.durationFrames, 83, "the canonical action must cover all 83 runtime frames");
  assert.equal(recipe.id, "present-screen-right");
  assert.equal(recipe.fps, 24);
  assert.deepEqual(recipe.sourceAction?.phases, RUNTIME_PHASES);
  assert.equal(recipe.sourceAction?.releasePresent, false);
}

function assertNumberNear(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} drifted: ${actual} != ${expected}`,
  );
}

function phaseStateSignature(manifest, runtime, recipe, frame) {
  const nodesByName = new Map(manifest.scenes[0].nodes.map((node) => [node.name, node]));
  const nodeNames = [...new Set([
    ...Object.keys(recipe.controls ?? {}),
    ...Object.keys(recipe.drawings ?? {}),
  ])].sort();
  const sampled = nodeNames.map((nodeName) => {
    const node = nodesByName.get(nodeName);
    assert.ok(node, `missing rig node ${nodeName}`);
    return {
      nodeName,
      attrs: runtime.sampleNodeAtFrame(node, null, frame).attrs,
      drawing: node.type === "READ" ? runtime.resolveDrawing(node, frame)?.drawing ?? null : null,
    };
  });
  return crypto.createHash("sha256").update(JSON.stringify(sampled)).digest("hex");
}

function assertAllEqual(values, label) {
  assert.ok(values.length > 0, `${label} has no frames`);
  assert.equal(new Set(values).size, 1, `${label} must remain an exact authored hold`);
}

test("Candidate 11 is the complete 104-frame source action, not its old one-frame endpoint", async () => {
  const [manifest, recipe, study, target] = await Promise.all([
    loadManifest(manifestPath),
    loadJson(recipePath),
    loadJson(studyPath),
    loadJson(targetPath),
  ]);

  assertCanonicalAction(recipe);
  assert.deepEqual(buildPresentScreenRight(manifest), recipe);
  assert.deepEqual(buildPresentScreenRightDestinationStudy(manifest), study);
  assert.equal(recipe.baseFrame, 32);
  assert.equal(recipe.artistRenderedFramesUsed, false);
  assert.equal(
    target.source.sha256,
    "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127",
  );
  assert.equal(
    target.source.clipSha256,
    "dc531adc7c95039cf21339427d3b6b1a42109555cac6bb51b65e5a19ae4bf3e1",
  );
  assert.equal(target.source.clipFps, 30);
  assert.equal(target.source.clipFrameCount, 104);
  assert.ok(
    Math.abs((target.source.clipEndSeconds - target.source.clipStartSeconds) - (104 / 30))
      <= (1 / 30) + Number.EPSILON,
    "the extracted clip must cover the complete source action within one source frame",
  );
  assert.ok(
    Math.abs((recipe.durationFrames / recipe.fps) - (104 / 30)) <= 1 / recipe.fps,
    "the runtime must preserve full-action duration within one runtime frame",
  );
  assert.deepEqual(target.segmentation.source, SOURCE_PHASES);
  assert.deepEqual(target.segmentation.runtime, RUNTIME_PHASES);
  assert.equal(target.segmentation.releasePresent, false);
  assert.equal(target.goldFrameZeroBased, 80);
  assert.equal(target.goldRuntimeFrameOneBased, 65);
  assert.equal(
    target.goldFramePngSha256,
    "318ce0e8a7f548029a2e0d3a36fcfd91ed12360fad1e58451ac4681b443d6a81",
  );
  assert.equal(DIRECTIONAL_PRESENT_REFERENCES.right.clipSha256, target.source.clipSha256);

  assert.equal(study.id, "present-screen-right-destination-study");
  assert.equal(study.durationFrames, 1);
  assert.throws(
    () => assertCanonicalAction(study),
    /83 runtime frames/,
    "a destination study must never satisfy the canonical action contract",
  );

  for (const file of [recipePath, studyPath, generatorPath, targetPath]) {
    assert.equal(include(file), true, `${path.relative(root, file)} must ship in the kit`);
  }
});

test("Candidate 11 owns only the complete native right-arm chain and narrow body registration", async () => {
  const recipe = await loadJson(recipePath);
  const controlNames = Object.keys(recipe.controls).sort();
  const bodyControls = controlNames.filter((name) => !RIGHT_ARM_CONTROLS.includes(name));

  for (const name of RIGHT_ARM_CONTROLS) {
    assert.ok(controlNames.includes(name), `${name} is required for a complete native arm chain`);
  }
  assert.deepEqual(bodyControls, BODY_CONTROLS, "Candidate 11 may register only body and head placement");
  assert.deepEqual(Object.keys(recipe.drawings).sort(), ["Right_Forearm", "Right_Hand"]);
  assert.deepEqual(recipe.props ?? [], []);
  assert.equal(recipe.deformationFrames, undefined);
  assert.equal(recipe.quality.armCompositeMode, "native-rig");
  assert.equal(recipe.quality.armPaintOrder, "right-front-of-head");
  assert.deepEqual(recipe.quality.authoredOpenHandCuffs, ["Right"]);

  for (const nodeName of [...controlNames, ...Object.keys(recipe.drawings)]) {
    assert.doesNotMatch(nodeName, /(?:eye|eyebrow|pupil|mouth)/i, `${nodeName} belongs to the face track`);
    assert.doesNotMatch(nodeName, /^Left_/, `${nodeName} moves the opposite arm`);
  }
});

test("Candidate 11 phase targets preserve exact source/runtime timing and normalization", async () => {
  const target = await loadJson(targetPath);
  assert.deepEqual(
    target.phaseTargets.map((phase) => [
      phase.id,
      phase.sourceFrameZeroBased,
      phase.runtimeFrameOneBased,
      phase.holdThroughRuntimeFrame,
    ]),
    PHASE_TARGETS,
  );

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
    "normalization face centroid x",
  );
  assertNumberNear(
    target.normalization.sourceFaceCentroid.y * scale + translateY,
    target.normalization.runtimeFaceCentroid.y,
    1e-9,
    "normalization face centroid y",
  );

  for (const phase of target.phaseTargets) {
    const entryContract = ENTRY_GEOMETRY_CONTRACT[phase.id];
    let required = [...CORE_GEOMETRY_FIELDS];
    if (entryContract) required = Object.keys(entryContract);
    if (phase.id === "hold-b-gold") required.push("upperWristAnchor");
    for (const field of required) {
      assert.ok(phase.sourceGeometry[field] !== undefined, `${phase.id} lacks source ${field}`);
      assert.ok(phase.geometry[field] !== undefined, `${phase.id} lacks normalized ${field}`);
    }
    assert.deepEqual(
      Object.keys(phase.geometry).sort(),
      Object.keys(phase.sourceGeometry).sort(),
      `${phase.id} source and normalized geometry must stay paired`,
    );
    if (entryContract) {
      assert.deepEqual(
        Object.keys(phase.geometry).sort(),
        Object.keys(entryContract).sort(),
        `${phase.id} must contain only its independently reliable geometry fields`,
      );
      for (const [field, ceiling] of Object.entries(entryContract)) {
        const tolerance = POINT_FIELDS.has(field)
          ? phase.geometry[field].tolerancePixels
          : phase.geometry[field].toleranceDegrees;
        assert.ok(tolerance > 0, `${phase.id} ${field} needs a positive tolerance`);
        assert.ok(
          tolerance <= ceiling,
          `${phase.id} ${field} tolerance ${tolerance} exceeds its ${ceiling} ceiling`,
        );
      }
    }
    for (const [field, source] of Object.entries(phase.sourceGeometry)) {
      const normalized = phase.geometry[field];
      if (POINT_FIELDS.has(field)) {
        assertNumberNear(source.x * scale + translateX, normalized.x, 1e-9, `${phase.id} ${field} x`);
        assertNumberNear(source.y * scale + translateY, normalized.y, 1e-9, `${phase.id} ${field} y`);
      } else if (ANGLE_FIELDS.has(field)) {
        assert.equal(source, normalized.value, `${phase.id} ${field} must not rotate during normalization`);
      } else {
        assert.fail(`${phase.id} has an untested geometry field: ${field}`);
      }
    }
  }

  const crossChest = target.phaseTargets.find(({ id }) => id === "entry-cross-chest");
  assert.match(crossChest.measurementNote, /upperWristAnchor.*unrelated component extrema/);
  assert.match(crossChest.measurementNote, /torsoBandAxisDegrees.*occludes and splits/);
  const noseTouch = target.phaseTargets.find(({ id }) => id === "entry-nose-touch");
  assert.match(noseTouch.measurementNote, /upperWristAnchor.*unrelated component extrema/);
});

test("Candidate 11 keys the observed entry, stepped counter-shift, and two real holds", async () => {
  const [manifest, recipe] = await Promise.all([
    loadManifest(manifestPath),
    loadJson(recipePath),
  ]);
  const runtime = createPoseRuntime(manifest, recipe);

  assert.deepEqual(recipe.quality.sourceExposureChangeFrames, ACTION_KEY_FRAMES);
  assert.deepEqual(recipe.quality.sourceApprovedHolds, [
    { startFrame: 6, endFrame: 49 },
    { startFrame: 58, endFrame: 83 },
  ]);
  assert.equal(recipe.quality.maximumIdenticalFrames, 44);

  for (const name of RIGHT_ARM_CONTROLS) {
    const keys = recipe.controls[name];
    assert.deepEqual(keys.map(({ frame }) => frame), ACTION_KEY_FRAMES, `${name} lost an action phase`);
    assert.ok(keys.every(({ interpolation }) => interpolation === "hold"), `${name} invented an in-between`);
  }
  for (const [name, keys] of Object.entries(recipe.controls)) {
    assert.ok(
      keys.every(({ frame }) => ACTION_KEY_FRAMES.includes(frame)),
      `${name} invents motion between observed phase changes`,
    );
    assert.equal(keys.at(-1).frame, 58, `${name} invents a release after Hold B`);
  }
  for (const [name, keys] of Object.entries(recipe.drawings)) {
    assert.equal(keys[0].frame, 1, `${name} must begin with a native drawing`);
    assert.ok(
      keys.every(({ frame }) => ACTION_KEY_FRAMES.includes(frame)),
      `${name} changes outside an observed phase boundary`,
    );
    assert.ok(keys.at(-1).frame <= 58, `${name} invents a release drawing`);
  }

  const signatureAt = (frame) => phaseStateSignature(manifest, runtime, recipe, frame);
  assert.equal(new Set([1, 2, 4, 6].map(signatureAt)).size, 4, "entry must cross, touch, open, and present");
  assertAllEqual(Array.from({ length: 44 }, (_, index) => signatureAt(index + 6)), "Hold A");
  assert.equal(
    new Set([50, 52, 54, 56, 58].map(signatureAt)).size,
    5,
    "the counter-shift must retain all five observed steps",
  );
  assertAllEqual(Array.from({ length: 26 }, (_, index) => signatureAt(index + 58)), "Hold B");
  assert.notEqual(signatureAt(49), signatureAt(50), "the counter-shift never starts");
  assert.equal(signatureAt(58), signatureAt(83), "the source has no release to invent");
});

test("Candidate 11 rendered phase anchors stay inside every normalized artist target", async () => {
  const [manifest, recipe, study, target] = await Promise.all([
    loadManifest(manifestPath),
    loadJson(recipePath),
    loadJson(studyPath),
    loadJson(targetPath),
  ]);
  const runtime = createPoseRuntime(manifest, recipe);
  const assetCache = new Map();

  for (const phase of target.phaseTargets) {
    const rendered = await renderRigFrame({
      manifest,
      frame: phase.runtimeFrameOneBased,
      assetRoot,
      propRoot,
      poseRuntime: runtime,
      includeLayerBuffers: true,
      assetCache,
    });
    const actual = await measureScreenRightPresentPhase(rendered);
    for (const [field, expected] of Object.entries(phase.geometry)) {
      if (POINT_FIELDS.has(field)) {
        assertPointNear(assert, actual[field], expected, `${phase.id} ${field}`);
      } else if (ANGLE_FIELDS.has(field)) {
        assertAngleNear(assert, actual[field], expected, `${phase.id} ${field}`);
      }
    }
  }

  const holdB = target.phaseTargets.find(({ id }) => id === "hold-b-gold");
  const studyRendered = await renderRigFrame({
    manifest,
    frame: 1,
    assetRoot,
    propRoot,
    poseRuntime: createPoseRuntime(manifest, study),
    includeLayerBuffers: true,
    assetCache,
  });
  const studyActual = await measureScreenRightPresentPhase(studyRendered);
  for (const [field, expected] of Object.entries(holdB.geometry)) {
    if (POINT_FIELDS.has(field)) {
      assertPointNear(assert, studyActual[field], expected, `destination study ${field}`);
    } else if (ANGLE_FIELDS.has(field)) {
      assertAngleNear(assert, studyActual[field], expected, `destination study ${field}`);
    }
  }
});

test("Candidate 11 passes every inspector frame including the face-front palm crossing", async () => {
  const [manifest, recipe] = await Promise.all([
    loadManifest(manifestPath),
    loadJson(recipePath),
  ]);
  const report = await inspectPose({ manifest, assetRoot, propRoot, recipe });

  assert.equal(report.status, "pass", JSON.stringify(report.failures, null, 2));
  assert.equal(report.frames.length, 83);
  assert.equal(report.maximumIdenticalFrames, 44);
  assert.ok(
    report.maximumRightArmHeadBaseOverlapPixels >= 20,
    "the face-front paint policy must be justified by a real native arm/head overlap",
  );
  assert.deepEqual(report.failures, []);
});

test("Candidate 11 and its destination study remain review-only and unknown to blind runs", async () => {
  const [registry, packets] = await Promise.all([
    loadJson(path.join(root, "poses", "index.json")),
    loadJson(path.join(root, "motion-packets", "index.json")),
  ]);
  const candidateIds = ["present-screen-right", "present-screen-right-destination-study"];

  for (const id of candidateIds) {
    assert.equal(registry.poses.some((pose) => pose.id === id), false, `${id} entered the registry`);
    assert.equal(
      packets.packets.some((packet) => packet.sources?.some(({ poseId }) => poseId === id)),
      false,
      `${id} entered a motion packet`,
    );
  }

  const runnerRegistry = {
    byId: new Map(registry.poses.map(({ id }) => [id, { id, recipe: { durationFrames: 1 } }])),
  };
  assert.throws(() => validateInput({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Unreviewed Candidate 11",
    sequence: [{ poseId: "present-screen-right", holdFrames: 0, gapFrames: 0 }],
  }, runnerRegistry), /unknown pose present-screen-right/);
});
