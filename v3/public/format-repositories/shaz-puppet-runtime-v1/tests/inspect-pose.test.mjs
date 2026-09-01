import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  alphaContactPixelCount,
  alphaOverlapPixelCount,
  alphaStats,
  armCompositeValid,
  armTopologyValid,
  crossedPaintOrderEligible,
  effectiveHandLimits,
  finishedSleeveValid,
  eyeEnvelopeCompositeValid,
  expectedEdgesForFrame,
  hairCompositeValid,
  inspectPose,
  maximumConsecutiveEqual,
  nearWhitePixelCount,
  opaqueMaskOverlapPixelCount,
  observedHandLimits,
  paintOrderValid,
  pupilVisibilityObservations,
  registeredNonLimbProp,
  registeredPoseReplacement,
  rightFrontPaintOrderEligible,
  shoulderAnchorValid,
} from "../runtime/inspect-pose.mjs";
import { createPoseRuntime } from "../runtime/pose-recipe.mjs";
import {
  loadManifest,
  READ_PAINT_PLAN,
  renderRigFrame,
} from "../runtime/rig-v2-renderer.mjs";

test("mouth color inspection distinguishes authored white teeth from skin-colored gaps", async () => {
  const teeth = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
      + '<rect x="5" y="5" width="10" height="6" fill="white"/>'
      + '<rect x="5" y="11" width="10" height="4" fill="#960015"/>'
      + "</svg>",
  );
  const missingTeeth = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
      + '<rect x="5" y="5" width="10" height="6" fill="#ffbb98"/>'
      + '<rect x="5" y="11" width="10" height="4" fill="#960015"/>'
      + "</svg>",
  );
  assert.equal(await nearWhitePixelCount(teeth), 60);
  assert.equal(await nearWhitePixelCount(missingTeeth), 0);
});

test("alpha inspection reports clipping bounds and disconnected components", async () => {
  const image = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
      + '<rect x="0" y="10" width="20" height="20" fill="black"/>'
      + '<rect x="70" y="70" width="20" height="20" fill="black"/>'
      + "</svg>",
  );
  const stats = await alphaStats(image, 100);
  assert.deepEqual(stats.bbox, { minX: 0, minY: 10, maxX: 89, maxY: 89 });
  assert.equal(stats.componentPixels.length, 2);
  assert.deepEqual(stats.components, [
    { pixels: 400, bbox: { minX: 0, minY: 10, maxX: 19, maxY: 29 } },
    { pixels: 400, bbox: { minX: 70, minY: 70, maxX: 89, maxY: 89 } },
  ]);
});

test("a finished sleeve cannot split into detached upper-arm and forearm islands", () => {
  assert.equal(finishedSleeveValid({
    empty: false,
    components: [{ pixels: 6155 }],
  }), true);
  assert.equal(finishedSleeveValid({
    empty: false,
    components: [{ pixels: 6155 }, { pixels: 4062 }],
  }), false, "whole-character contact must not hide a disconnected sleeve union");
  assert.equal(finishedSleeveValid({ empty: true }), false);
});

test("arm-composite inspection requires finished sleeve unions and rejects construction layers", () => {
  const arm = (side) => [
    {
      nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
      variant: "main",
      compositeRole: "finished-sleeve-union",
    },
    { nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`, variant: "color" },
    { nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`, variant: "overlay" },
    {
      nodePath: `Top/Shaz_Rig/Body_Group/${side}_Hand`,
      variant: "main",
      compositeRole: `hand-matted-to-${side.toLowerCase()}-sleeve`,
      cuffOwner: side,
    },
  ];
  assert.equal(armCompositeValid([...arm("Left"), ...arm("Right")]), true);
  assert.equal(armCompositeValid([
    ...arm("Left"),
    ...arm("Right").filter(({ variant }) => variant !== "color"),
  ]), true);
  assert.equal(armCompositeValid([
    ...arm("Left"),
    ...arm("Right").filter(({ nodePath }) => !nodePath.endsWith("Right_Hand")),
  ]), false);
  const visibleRight = arm("Right");
  visibleRight.unshift({
    nodePath: "Top/Shaz_Rig/Body_Group/Right_Arm",
    variant: "main",
    compositeRole: "hidden-construction-fill",
  });
  assert.equal(armCompositeValid([...arm("Left"), ...visibleRight]), false);

  const thinkingLeft = arm("Left").filter(({ nodePath }) => !nodePath.endsWith("Left_Hand"));
  thinkingLeft.push({
    nodePath: "Top/Shaz_Rig/Head_Group/OL_Hand",
    variant: "main",
    compositeRole: "overlay-hand-matted-to-left-sleeve",
    cuffOwner: "Left",
  });
  assert.equal(armCompositeValid([...thinkingLeft, ...arm("Right")]), true);

  const duplicateLeftHands = [
    ...arm("Left"),
    {
      nodePath: "Top/Shaz_Rig/Head_Group/OL_Hand",
      variant: "main",
      compositeRole: "overlay-hand-matted-to-left-sleeve",
      cuffOwner: "Left",
    },
    ...arm("Right"),
  ];
  assert.equal(armCompositeValid(duplicateLeftHands), false,
    "native and overlay hand channels may not be visible together");

  const detachedByPaint = arm("Left");
  detachedByPaint.at(-1).compositeRole = "finished-artwork";
  assert.equal(armCompositeValid([...detachedByPaint, ...arm("Right")]), false,
    "alpha contact alone cannot certify a hand whose outline was not matted to its sleeve");
  const wrongCuff = arm("Left");
  wrongCuff.at(-1).cuffOwner = "Right";
  assert.equal(armCompositeValid([...wrongCuff, ...arm("Right")]), false,
    "a hand matted against the wrong sleeve cannot claim native ownership");

  const authoredOpenPalm = arm("Left");
  authoredOpenPalm.at(-1).compositeRole = "authored-open-hand-cuff";
  assert.equal(armCompositeValid([...authoredOpenPalm, ...arm("Right")]), true,
    "the renderer-observed authored drawing role is sufficient without recipe self-certification");
});

test("crossed arms require two complete native sleeve-and-hand chains", () => {
  const sleeve = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
    variant: "main",
    compositeRole: "finished-sleeve-union",
  });
  const hand = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Hand`,
    variant: "main",
    compositeRole: `hand-matted-to-${side.toLowerCase()}-sleeve`,
    cuffOwner: side,
  });
  const recipe = {
    quality: {
      armCompositeMode: "native-rig",
      armPaintOrder: "both-front-left-under-right",
    },
  };
  const nativeLayers = [sleeve("Left"), hand("Left"), sleeve("Right"), hand("Right")];
  assert.equal(armCompositeValid(nativeLayers, recipe, 15), true);
  assert.equal(armTopologyValid(nativeLayers, [], recipe, 15), true);
  assert.equal(armCompositeValid(nativeLayers.filter(({ nodePath }) => (
    !nodePath.endsWith("/Left_Hand")
  )), recipe, 15), false, "a hidden hand cannot be waived by recipe metadata");

  const rejectedAssembly = [{
    id: "crossed-arms-assembly",
    asset: "crossed-arms-assembly.png",
    layer: "front",
  }];
  assert.equal(armTopologyValid(nativeLayers, rejectedAssembly, recipe, 15), false,
    "a full-canvas limb assembly must not bypass the native shoulder chains");
  const detachedPieces = [
    { id: "crossed-left-hand", asset: "crossed-left-hand.png", layer: "front" },
    { id: "crossed-left-sleeve", asset: "crossed-left-sleeve.png", layer: "front" },
  ];
  assert.equal(armTopologyValid(nativeLayers, detachedPieces, recipe, 15), false);
  assert.equal(armTopologyValid(nativeLayers, [
    { id: "crossover", asset: "flattened-anatomy.png", layer: "front" },
  ], recipe, 15), false,
  "renaming a flattened limb assembly cannot bypass prop topology checks");
});

test("registered crossed-arm drawing is exact-hash and exact-placement locked", () => {
  const sleeve = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
    variant: "main",
    compositeRole: "finished-sleeve-union",
  });
  const hand = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Hand`,
    variant: "main",
    compositeRole: `hand-matted-to-${side.toLowerCase()}-sleeve`,
    cuffOwner: side,
  });
  const nativeLayers = [sleeve("Left"), hand("Left"), sleeve("Right"), hand("Right")];
  const recipe = { quality: { armCompositeMode: "registered-pose-replacement" } };
  const replacement = {
    id: "crossed-arms-pose",
    asset: "crossed-arms-pose.png",
    sha256: "73e73755a77822989fd466ab6fe79591b176bbe9ea68940a46359c999a84e311",
    layer: "body-front",
    position: [0.41796875, 0.621875],
    width: 0.2578125,
    scale: [1, 1],
    rotation: 0,
    opacity: 100,
  };
  assert.equal(registeredPoseReplacement(replacement), true);
  assert.equal(armTopologyValid(nativeLayers, [], recipe), true,
    "native anticipation must remain valid before the substitution");
  assert.equal(armTopologyValid([], [replacement], recipe), true,
    "the exact replacement may stand in for hidden native arm artwork");
  assert.equal(armTopologyValid(nativeLayers, [replacement], recipe), false,
    "native arms and the replacement may never be double-painted");
  assert.equal(armTopologyValid([], [{ ...replacement, width: 0.3 }], recipe), false,
    "a resized replacement must fail its locked placement");
  assert.equal(armTopologyValid([], [{ ...replacement, sha256: "0".repeat(64) }], recipe), false,
    "different bytes cannot spoof the registered pose drawing");
  assert.equal(armTopologyValid([], [replacement], {
    quality: { armCompositeMode: "native-rig" },
  }), false, "ordinary poses cannot opt into a limb replacement implicitly");
});

test("native hand and sleeve chains cannot pop between unchanged drawings", async () => {
  const [manifest, baseline] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    fs.readFile(new URL("../poses/generated/excited-celebration.json", import.meta.url), "utf8")
      .then(JSON.parse),
  ]);
  const common = {
    manifest,
    assetRoot: fileURLToPath(new URL("../rig-v2/assets", import.meta.url)),
    propRoot: fileURLToPath(new URL("../assets/props", import.meta.url)),
  };

  const flippedHand = structuredClone(baseline);
  flippedHand.controls["Left_Hand-P"].find(({ frame }) => frame === 28).rotation += 180;
  const handReport = await inspectPose({ ...common, recipe: flippedHand });
  assert.ok(handReport.failures.some(({ gate, frame }) => (
    gate === "limb-temporal-continuity" && frame === 28
  )), "an unchanged hand drawing cannot flip backward for one frame");

  const flippedSleeve = structuredClone(baseline);
  flippedSleeve.controls["Left_Forearm_Pivot-P"]
    .find(({ frame }) => frame === 28).rotation += 180;
  const sleeveReport = await inspectPose({ ...common, recipe: flippedSleeve });
  assert.ok(sleeveReport.failures.some(({ gate, frame }) => (
    gate === "limb-temporal-continuity" && frame === 28
  )), "a connected sleeve chain cannot snap below the torso for one frame");
});

test("screen-space phone hands are rejected even when a phone prop is valid", () => {
  const recipe = { quality: { armCompositeMode: "native-rig" } };
  const sleeve = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
    variant: "main",
    compositeRole: "finished-sleeve-union",
  });
  const layers = [
    sleeve("Left"),
    {
      nodePath: "Top/Shaz_Rig/Head_Group/OL_Hand",
      variant: "main",
      compositeRole: "overlay-hand-matted-to-left-sleeve",
      cuffOwner: "Left",
    },
    sleeve("Right"),
    {
      nodePath: "Top/Shaz_Rig/Body_Group/Right_Hand",
      variant: "main",
      compositeRole: "hand-matted-to-right-sleeve",
      cuffOwner: "Right",
    },
  ];
  assert.equal(armTopologyValid(layers, [
    { id: "phone", asset: "phone.svg", sha256: "aadcadb428f4f63ad54ed9575e5120a8519a3520af3b2460714a337a1fd21975", layer: "front" },
  ], recipe), true, "non-limb props do not replace the native hand");
  assert.equal(armTopologyValid(layers, [
    { id: "phone", asset: "phone.svg", sha256: "aadcadb428f4f63ad54ed9575e5120a8519a3520af3b2460714a337a1fd21975", layer: "front" },
    { id: "phone-tap-hand", asset: "phone-tap-hand.png", layer: "front" },
  ], recipe), false, "a detached screen-space hand must never be accepted as native topology");
  assert.equal(registeredNonLimbProp({
    id: "crossover",
    asset: "phone.svg",
    sha256: "aadcadb428f4f63ad54ed9575e5120a8519a3520af3b2460714a337a1fd21975",
  }), false, "renaming anatomy to an allowlisted filename cannot spoof the canonical prop tuple");
  assert.equal(registeredNonLimbProp({
    id: "phone",
    asset: "phone.svg",
    sha256: "0".repeat(64),
  }), false, "a canonical prop name with the wrong bytes cannot pass");
});

test("arm geometry limits follow rendered roles and real shoulder sides", () => {
  assert.deepEqual(observedHandLimits({ compositeRole: "hand-matted-to-left-sleeve" }), {
    maximumHandToSleeveAreaRatio: 0.45,
    maximumHandToHeadWidthRatio: 0.8,
  });
  assert.deepEqual(observedHandLimits({ compositeRole: "authored-open-hand-cuff" }), {
    maximumHandToSleeveAreaRatio: 0.56,
    maximumHandToHeadWidthRatio: 0.82,
  });
  assert.deepEqual(observedHandLimits({ compositeRole: "overlay-hand-matted-to-left-sleeve" }), {
    maximumHandToSleeveAreaRatio: 0.65,
    maximumHandToHeadWidthRatio: 0.9,
  });
  assert.deepEqual(effectiveHandLimits(
    { compositeRole: "hand-matted-to-left-sleeve" },
    { maximumHandToSleeveAreaRatio: 0.7, maximumHandToHeadWidthRatio: 0.95 },
  ), {
    minimumHandToSleeveAreaRatio: 0.1,
    maximumHandToSleeveAreaRatio: 0.45,
    maximumHandToHeadWidthRatio: 0.8,
  }, "recipe prose cannot widen the envelope of the hand role that actually rendered");
  const body = {
    empty: false,
    centroid: { x: 300, y: 300 },
    bbox: { minX: 225, minY: 200, maxX: 374, maxY: 500 },
  };
  assert.equal(shoulderAnchorValid("Left", { empty: false, centroid: { x: 230, y: 300 } }, body), true);
  assert.equal(shoulderAnchorValid("Right", { empty: false, centroid: { x: 380, y: 300 } }, body), true);
  assert.equal(shoulderAnchorValid("Left", { empty: false, centroid: { x: 315, y: 300 } }, body), false,
    "a left upper arm crossing the torso center must fail even if it overlaps more body pixels");
  assert.equal(shoulderAnchorValid("Right", { empty: false, centroid: { x: 298, y: 300 } }, body), false,
    "a right upper arm crossing the torso center must fail even if it overlaps more body pixels");
  assert.equal(shoulderAnchorValid("Left", { empty: false, centroid: { x: 289, y: 300 } }, body), false,
    "barely remaining on the nominal side cannot excuse a shoulder collapsed into the neck");
  assert.equal(shoulderAnchorValid("Left", { empty: false, centroid: { x: 380, y: 300 } }, body, true), true,
    "whole-rig horizontal mirroring swaps the screen side without changing anatomical ownership");
  assert.equal(shoulderAnchorValid("Right", { empty: false, centroid: { x: 230, y: 300 } }, body, true), true);
});

test("joint contact inspection catches a detached hand even when it touches another body part", async () => {
  const sleeve = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
      + '<rect x="10" y="40" width="35" height="20" fill="black"/>'
      + "</svg>",
  );
  const attachedHand = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
      + '<circle cx="49" cy="50" r="8" fill="black"/>'
      + "</svg>",
  );
  const detachedHandTouchingFace = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
      + '<circle cx="75" cy="20" r="8" fill="black"/>'
      + "</svg>",
  );
  assert.ok(await alphaContactPixelCount(attachedHand, sleeve, 3, 100) > 0);
  assert.equal(await alphaContactPixelCount(detachedHandTouchingFace, sleeve, 3, 100), 0);
});

test("independent screen-space limb pieces cannot bypass a valid native arm chain", () => {
  const sleeve = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
    variant: "main",
    compositeRole: "finished-sleeve-union",
  });
  const layers = [
    sleeve("Left"),
    {
      nodePath: "Top/Shaz_Rig/Body_Group/Left_Hand",
      variant: "main",
      compositeRole: "hand-matted-to-left-sleeve",
      cuffOwner: "Left",
    },
    sleeve("Right"),
    {
      nodePath: "Top/Shaz_Rig/Body_Group/Right_Hand",
      variant: "main",
      compositeRole: "hand-matted-to-right-sleeve",
      cuffOwner: "Right",
    },
  ];
  assert.equal(armTopologyValid(layers, [], { quality: { armCompositeMode: "native-rig" } }), true);
  assert.equal(armTopologyValid(layers, [
    { id: "floating-left-hand", asset: "left.png", layer: "front" },
  ], { quality: { armCompositeMode: "native-rig" } }), false);
  assert.equal(armTopologyValid(layers, [
    { id: "floating-left-hand", asset: "left.png", layer: "front" },
    { id: "floating-left-sleeve", asset: "sleeve.png", layer: "front" },
  ], { quality: { armCompositeMode: "registered-crossed-rig-assembly" } }), false);
});

test("hair-composite inspection requires the masked visible back-bang component", () => {
  const rearHair = {
    nodePath: "Top/Shaz_Rig/Head_Group/Hair",
    variant: "main",
    compositeRole: "rear-hair-with-artist-forehead-shade",
    foreheadShadePixelCount: 100,
    replacedForeheadShadowPixelCount: 40,
  };
  const headBase = {
    nodePath: "Top/Shaz_Rig/Head_Group/Head_Base",
    variant: "main",
    compositeRole: "finished-artwork",
  };
  const valid = {
    nodePath: "Top/Shaz_Rig/Head_Group/Bangs_back",
    drawing: "1",
    variant: "main",
    compositeRole: "finished-back-bang-with-upper-patch-hidden",
    sourceFillComponentCount: 3,
    hiddenFillComponentCount: 1,
  };
  assert.equal(hairCompositeValid([rearHair, headBase, valid]), true);
  assert.equal(hairCompositeValid([rearHair, headBase, { ...valid, compositeRole: "finished-artwork" }]), false);
  assert.equal(hairCompositeValid([rearHair, headBase, { ...valid, hiddenFillComponentCount: 3 }]), false);
  assert.equal(hairCompositeValid([rearHair, headBase, {
    ...valid,
    drawing: "2",
    compositeRole: "finished-artwork",
    sourceFillComponentCount: undefined,
    hiddenFillComponentCount: undefined,
  }]), true);
  assert.equal(hairCompositeValid([
    { ...rearHair, replacedForeheadShadowPixelCount: 0 },
    headBase,
    valid,
  ]), false);
});

test("hair-composite inspection accepts only the checksum-registered PART2 native family", () => {
  const sourceXstageSha256 = "0303b090a58f7ab66139e2e5328c29ca7a2528b7508c91fb648bbd80f8d1342f";
  const layer = (node, drawing = "4") => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${node}`,
    drawing,
    sourceXstageSha256,
    variant: "main",
    compositeRole: "finished-artwork",
  });
  const family = [layer("Hair"), layer("Bangs_back"), layer("Head_Base")];
  assert.equal(hairCompositeValid(family), true);
  assert.equal(hairCompositeValid([
    family[0],
    { ...family[1], sourceXstageSha256: "f".repeat(64) },
    family[2],
  ]), false);
  assert.equal(hairCompositeValid([family[0], layer("Bangs_back", "3"), family[2]]), false);
});

test("eye-occlusion inspection requires two semantic eye envelopes and front-bang clearance", () => {
  const frontBang = {
    nodePath: "Top/Shaz_Rig/Head_Group/Bangs_front",
    variant: "main",
    eyeEnvelopeClearancePixelCount: 0,
  };
  const eye = (side) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_Eye`,
    variant: "main",
    eyeEnvelopePixelCount: 200,
  });
  assert.equal(eyeEnvelopeCompositeValid([frontBang, eye("Left"), eye("Right")]), true);
  assert.equal(eyeEnvelopeCompositeValid([frontBang, eye("Left")]), false);
  assert.equal(eyeEnvelopeCompositeValid([
    { ...frontBang, eyeEnvelopeClearancePixelCount: undefined },
    eye("Left"),
    eye("Right"),
  ]), false);
  assert.equal(eyeEnvelopeCompositeValid([
    frontBang,
    { ...eye("Left"), eyeEnvelopePixelCount: 0 },
    eye("Right"),
  ]), false);
});

test("eye-occlusion inspection detects opaque hair inside an owned eye region", async () => {
  const hair = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
      + '<rect x="2" y="2" width="16" height="16" fill="#ad6845"/>'
      + "</svg>",
  );
  const eyeEnvelope = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
      + '<circle cx="10" cy="10" r="5" fill="white"/>'
      + "</svg>",
  );
  const noHair = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>',
  );
  assert.ok(await opaqueMaskOverlapPixelCount(hair, [eyeEnvelope]) > 0);
  assert.equal(await opaqueMaskOverlapPixelCount(noHair, [eyeEnvelope]), 0);
});

test("pupil visibility rejects alpha specks and exact-hash-locks null blink exposures", async () => {
  const eye = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<ellipse cx="320" cy="180" rx="30" ry="35" fill="white"/>'
      + "</svg>",
  );
  const visiblePupil = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<circle cx="320" cy="180" r="8" fill="black"/>'
      + "</svg>",
  );
  const pupilSpeck = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<rect x="320" y="180" width="1" height="1" fill="black"/>'
      + "</svg>",
  );
  const layer = (side, feature, input, assetSha256 = null) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    input,
    ...(assetSha256 ? { assetSha256 } : {}),
  });
  const receipt = (side, feature, drawing) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    drawing,
  });

  const openEyes = await pupilVisibilityObservations([
    layer("Left", "Eye", eye),
    layer("Left", "Pupil", visiblePupil),
    layer("Right", "Eye", eye),
    layer("Right", "Pupil", pupilSpeck),
  ], [
    receipt("Left", "Eye", "1"),
    receipt("Left", "Pupil", "1"),
    receipt("Right", "Eye", "1"),
    receipt("Right", "Pupil", "8"),
  ]);
  assert.equal(openEyes.find(({ side }) => side === "Left").visible, true);
  const rejected = openEyes.find(({ side }) => side === "Right");
  assert.equal(rejected.required, true);
  assert.equal(rejected.visible, false,
    "a present pupil receipt cannot let a negligible rendered speck pass");
  assert.ok(rejected.largestComponentPixels < 24);

  const missingLayer = await pupilVisibilityObservations([
    layer("Left", "Eye", eye),
    layer("Left", "Pupil", visiblePupil),
    layer("Right", "Eye", eye),
  ], [
    receipt("Left", "Eye", "1"),
    receipt("Left", "Pupil", "1"),
    receipt("Right", "Eye", "1"),
    receipt("Right", "Pupil", "8"),
  ]);
  assert.deepEqual(missingLayer.find(({ side }) => side === "Right"), {
    side: "Right",
    eyeDrawing: "1",
    pupilDrawing: "8",
    required: true,
    visible: false,
    opaquePixels: 0,
    largestComponentPixels: 0,
    largestComponentSolidity: 0,
    solidityFloor: 0.6,
  }, "a non-null pupil receipt fails closed when its analysis layer is missing");

  const missingExposure = await pupilVisibilityObservations([
    layer("Left", "Eye", eye),
    layer("Right", "Eye", eye),
  ], [
    receipt("Left", "Eye", "1"),
    receipt("Right", "Eye", "1"),
  ]);
  assert.ok(missingExposure.every(({ required, visible, pupilDrawing }) => (
    required === true && visible === false && pupilDrawing === null
  )), "open-eye drawings fail closed when their pupil exposure is missing entirely");

  const blink = await pupilVisibilityObservations([
    layer("Left", "Eye", eye, "d1f8b7f50cb7835a59a8f851020d711bbf2f761f2495bae1f7ad317796f18ddb"),
    layer("Right", "Eye", eye, "a5d718eee6fa33affe67cb88427504dc589e3e4e54ddee48675ea7d6d452537a"),
  ], [
    receipt("Left", "Eye", "5"),
    receipt("Right", "Eye", "5"),
  ]);
  assert.ok(blink.every(({ required, visible, pupilDrawing }) => (
    required === false && visible === null && pupilDrawing === null
  )), "the two canonical closed-eye assets remain valid without pupil exposures");

  const changedBlink = await pupilVisibilityObservations([
    layer("Left", "Eye", eye, "0".repeat(64)),
    layer("Right", "Eye", eye, "a5d718eee6fa33affe67cb88427504dc589e3e4e54ddee48675ea7d6d452537a"),
  ], [
    receipt("Left", "Eye", "5"),
    receipt("Right", "Eye", "5"),
  ]);
  assert.deepEqual(
    changedBlink.map(({ side, required, visible }) => ({ side, required, visible })),
    [
      { side: "Left", required: true, visible: false },
      { side: "Right", required: false, visible: null },
    ],
    "drawing 5 from changed artwork cannot inherit the canonical no-pupil exemption",
  );

  const wrongSideBlink = await pupilVisibilityObservations([
    layer("Left", "Eye", eye, "a5d718eee6fa33affe67cb88427504dc589e3e4e54ddee48675ea7d6d452537a"),
    layer("Right", "Eye", eye, "d1f8b7f50cb7835a59a8f851020d711bbf2f761f2495bae1f7ad317796f18ddb"),
  ], [
    receipt("Left", "Eye", "5"),
    receipt("Right", "Eye", "5"),
  ]);
  assert.ok(wrongSideBlink.every(({ required, visible }) => (
    required === true && visible === false
  )), "closed-eye asset hashes remain bound to their anatomical side");
});

test("pupil visibility rejects an opaque white pupil-shaped oval", async () => {
  const eye = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<ellipse cx="320" cy="180" rx="30" ry="35" fill="white"/>'
      + "</svg>",
  );
  const pupil = (fill) => Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + `<ellipse cx="320" cy="180" rx="12" ry="10" fill="${fill}"/>`
      + "</svg>",
  );
  const layer = (side, feature, input) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    input,
  });
  const receipt = (side, feature) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    drawing: "1",
  });

  const observations = await pupilVisibilityObservations([
    layer("Left", "Eye", eye),
    layer("Left", "Pupil", pupil("white")),
    layer("Right", "Eye", eye),
    layer("Right", "Pupil", pupil("black")),
  ], [
    receipt("Left", "Eye"),
    receipt("Left", "Pupil"),
    receipt("Right", "Eye"),
    receipt("Right", "Pupil"),
  ]);
  const white = observations.find(({ side }) => side === "Left");
  const black = observations.find(({ side }) => side === "Right");
  assert.ok(white.opaquePixels >= white.visibilityFloorPixels,
    "the negative fixture is large enough to pass the old alpha-only gate");
  assert.equal(white.darkOpaquePixels, 0);
  assert.equal(white.visible, false,
    "opaque light artwork cannot impersonate a black pupil");
  assert.equal(black.visible, true);
});

test("pupil visibility rejects a solid black pupil translated outside its eye", async () => {
  const eye = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<ellipse cx="320" cy="180" rx="30" ry="35" fill="white"/>'
      + "</svg>",
  );
  const pupil = (cx, cy) => Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + `<circle cx="${cx}" cy="${cy}" r="8" fill="black"/>`
      + "</svg>",
  );
  const layer = (side, feature, input) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    input,
  });
  const receipt = (side, feature) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    drawing: "1",
  });

  const observations = await pupilVisibilityObservations([
    layer("Left", "Eye", eye),
    layer("Left", "Pupil", pupil(520, 300)),
    layer("Right", "Eye", eye),
    layer("Right", "Pupil", pupil(320, 180)),
  ], [
    receipt("Left", "Eye"),
    receipt("Left", "Pupil"),
    receipt("Right", "Eye"),
    receipt("Right", "Pupil"),
  ]);
  const offEye = observations.find(({ side }) => side === "Left");
  const centered = observations.find(({ side }) => side === "Right");
  assert.ok(offEye.largestComponentPixels >= offEye.visibilityFloorPixels);
  assert.ok(offEye.largestComponentSolidity >= offEye.solidityFloor,
    "the negative fixture passes the old connected-solid-alpha checks");
  assert.equal(offEye.eyeOverlapPixels, 0);
  assert.equal(offEye.visible, false,
    "a valid-looking pupil component must still overlap its transformed eye envelope");
  assert.equal(centered.visible, true);
  assert.ok(centered.eyeOverlapPixels >= centered.eyeOverlapFloorPixels);
});

test("pupil visibility rejects a large but hollow wedge", async () => {
  const eye = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<ellipse cx="320" cy="180" rx="30" ry="35" fill="white"/>'
      + "</svg>",
  );
  const authoredPupil = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<ellipse cx="320" cy="180" rx="12" ry="10" fill="black"/>'
      + "</svg>",
  );
  const hollowWedge = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<path d="M300 160 H340 V164 H304 V196 H300 Z" fill="black"/>'
      + "</svg>",
  );
  const layer = (side, feature, input) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    input,
  });
  const receipt = (side, feature, drawing) => ({
    nodePath: `Top/Shaz_Rig/Head_Group/${side}_${feature}`,
    variant: "main",
    drawing,
  });
  const observations = await pupilVisibilityObservations([
    layer("Left", "Eye", eye),
    layer("Left", "Pupil", authoredPupil),
    layer("Right", "Eye", eye),
    layer("Right", "Pupil", hollowWedge),
  ], [
    receipt("Left", "Eye", "1"),
    receipt("Left", "Pupil", "1"),
    receipt("Right", "Eye", "1"),
    receipt("Right", "Pupil", "13"),
  ]);

  const authored = observations.find(({ side }) => side === "Left");
  const rejected = observations.find(({ side }) => side === "Right");
  assert.equal(authored.visible, true);
  assert.ok(authored.largestComponentSolidity >= authored.solidityFloor);
  assert.ok(rejected.largestComponentPixels >= rejected.visibilityFloorPixels,
    "the regression shape is large enough to bypass the component-area gate");
  assert.ok(rejected.largestComponentSolidity < rejected.solidityFloor);
  assert.equal(rejected.visible, false,
    "an open wedge cannot pass merely because it contains many connected pixels");
});

test("the authored canonical squint exception is exact-asset and exact-drawing bound", async () => {
  const eye = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<ellipse cx="320" cy="180" rx="30" ry="12" fill="white"/>'
      + "</svg>",
  );
  const narrowPupil = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<rect x="309" y="180" width="23" height="1" fill="black"/>'
      + "</svg>",
  );
  const layer = (assetSha256) => ({
    nodePath: "Top/Shaz_Rig/Head_Group/Left_Pupil",
    variant: "main",
    input: narrowPupil,
    assetSha256,
  });
  const receiptLayers = [
    {
      nodePath: "Top/Shaz_Rig/Head_Group/Left_Eye",
      variant: "main",
      drawing: "4",
    },
    {
      nodePath: "Top/Shaz_Rig/Head_Group/Left_Pupil",
      variant: "main",
      drawing: "10",
    },
    {
      nodePath: "Top/Shaz_Rig/Head_Group/Right_Eye",
      variant: "main",
      drawing: "5",
    },
  ];
  const analysisLayers = [{
    nodePath: "Top/Shaz_Rig/Head_Group/Left_Eye",
    variant: "main",
    input: eye,
  }];

  const approved = await pupilVisibilityObservations([
    ...analysisLayers,
    layer("651902c0c8055175737e772ad915e67365f8fb160ed8c71cf9021f819377ed83"),
  ], receiptLayers);
  const approvedLeft = approved.find(({ side }) => side === "Left");
  assert.equal(approvedLeft.largestComponentPixels, 23);
  assert.equal(approvedLeft.visibilityFloorPixels, 23);
  assert.equal(approvedLeft.visible, true);

  const changedAsset = await pupilVisibilityObservations([
    ...analysisLayers,
    layer("051902c0c8055175737e772ad915e67365f8fb160ed8c71cf9021f819377ed83"),
  ], receiptLayers);
  const changedLeft = changedAsset.find(({ side }) => side === "Left");
  assert.equal(changedLeft.visibilityFloorPixels, 24);
  assert.equal(changedLeft.visible, false,
    "a changed asset cannot inherit the one-pixel authored exception");
});

test("the authored right squint solidity exception is exact-asset and exact-drawing bound", async () => {
  const eye = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<ellipse cx="320" cy="180" rx="30" ry="12" fill="white"/>'
      + "</svg>",
  );
  const narrowPupil = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">'
      + '<path d="M300 180 H307 V184 H301 V188 H300 Z" fill="black"/>'
      + "</svg>",
  );
  const pupilLayer = (assetSha256) => ({
    nodePath: "Top/Shaz_Rig/Head_Group/Right_Pupil",
    variant: "main",
    input: narrowPupil,
    assetSha256,
  });
  const receiptLayers = [
    {
      nodePath: "Top/Shaz_Rig/Head_Group/Left_Eye",
      variant: "main",
      drawing: "5",
    },
    {
      nodePath: "Top/Shaz_Rig/Head_Group/Right_Eye",
      variant: "main",
      drawing: "4",
    },
    {
      nodePath: "Top/Shaz_Rig/Head_Group/Right_Pupil",
      variant: "main",
      drawing: "10",
    },
  ];
  const analysisLayers = [{
    nodePath: "Top/Shaz_Rig/Head_Group/Right_Eye",
    variant: "main",
    input: eye,
  }];

  const approved = await pupilVisibilityObservations([
    ...analysisLayers,
    pupilLayer("2615b8e39bce476f98181f6a7211348da50c4a807a8826e8f3385179de513ed4"),
  ], receiptLayers);
  const approvedRight = approved.find(({ side }) => side === "Right");
  assert.ok(approvedRight.largestComponentPixels >= approvedRight.visibilityFloorPixels);
  assert.equal(approvedRight.solidityFloor, 0.57);
  assert.equal(approvedRight.visible, true);

  const changedAsset = await pupilVisibilityObservations([
    ...analysisLayers,
    pupilLayer("0615b8e39bce476f98181f6a7211348da50c4a807a8826e8f3385179de513ed4"),
  ], receiptLayers);
  const changedRight = changedAsset.find(({ side }) => side === "Right");
  assert.equal(changedRight.solidityFloor, 0.6);
  assert.equal(changedRight.visible, false,
    "a changed asset cannot inherit the authored solidity exception");
});

test("edge-contact exceptions are source-only and frame-bounded", () => {
  const sourceRecipe = {
    sourceAction: { generatedFrom: "xstage-control-channels-and-drawing-exposures" },
    quality: { sourceApprovedEdgeContacts: [{ edge: "top", frames: [5, 8] }] },
  };
  assert.deepEqual([...expectedEdgesForFrame(sourceRecipe, 6)], ["top"]);
  assert.deepEqual([...expectedEdgesForFrame(sourceRecipe, 9)], []);
  assert.throws(
    () => expectedEdgesForFrame({
      quality: { sourceApprovedEdgeContacts: [{ edge: "top", frames: [1, 2] }] },
    }, 1),
    /only for Xstage calibration/,
  );
});

test("paint inspection accepts only monotonic subsets of the recovered plan", () => {
  assert.equal(paintOrderValid([
    READ_PAINT_PLAN[0],
    READ_PAINT_PLAN[3],
    READ_PAINT_PLAN.at(-1),
  ]), true);
  assert.equal(paintOrderValid([
    READ_PAINT_PLAN[3],
    READ_PAINT_PLAN[0],
  ]), false);
});

test("paint inspection recognizes only the declared native crossed-arm depth policy", () => {
  const bySuffix = (suffix, variant = "main") => READ_PAINT_PLAN.find((entry) => (
    entry.nodePath.endsWith(suffix) && entry.variant === variant
  ));
  const ordinary = [
    bySuffix("/Left_Forearm"),
    bySuffix("/Left_Hand"),
    bySuffix("/Body"),
    bySuffix("/Collar"),
    bySuffix("/Right_Forearm"),
    bySuffix("/Right_Hand"),
    bySuffix("/Head_Base"),
  ];
  const crossed = [
    bySuffix("/Body"),
    bySuffix("/Collar"),
    bySuffix("/Left_Forearm"),
    bySuffix("/Left_Hand"),
    bySuffix("/Right_Forearm"),
    bySuffix("/Right_Hand"),
    bySuffix("/Head_Base"),
  ];
  const recipe = { quality: { armPaintOrder: "both-front-left-under-right" } };
  assert.equal(paintOrderValid(crossed, recipe), true);
  assert.equal(paintOrderValid(ordinary, recipe), false,
    "declaring the crossover policy must require both native arms in front of the torso");
  assert.equal(paintOrderValid(crossed), false,
    "custom paint order must not leak into ordinary poses without an explicit recipe policy");
  assert.equal(crossedPaintOrderEligible(recipe, 0), false,
    "recipe prose alone cannot certify a custom crossover depth policy");
  assert.equal(crossedPaintOrderEligible(recipe, 20), true,
    "the policy becomes eligible only after the native sleeves actually cross");
});

test("right-front-of-head moves only the complete native right arm after every head layer", () => {
  const bySuffix = (suffix, variant = "main") => READ_PAINT_PLAN.find((entry) => (
    entry.nodePath.endsWith(suffix) && entry.variant === variant
  ));
  const ordinary = [
    bySuffix("/Left_Forearm"),
    bySuffix("/Left_Hand"),
    bySuffix("/Body"),
    bySuffix("/Collar"),
    bySuffix("/Right_Forearm"),
    bySuffix("/Right_Hand"),
    bySuffix("/Head_Base"),
    bySuffix("/Mouth"),
    bySuffix("/OL_Hand"),
  ];
  const rightFront = [
    bySuffix("/Left_Forearm"),
    bySuffix("/Left_Hand"),
    bySuffix("/Body"),
    bySuffix("/Collar"),
    bySuffix("/Head_Base"),
    bySuffix("/Mouth"),
    bySuffix("/OL_Hand"),
    bySuffix("/Right_Forearm"),
    bySuffix("/Right_Hand"),
  ];
  const recipe = { quality: { armPaintOrder: "right-front-of-head" } };
  assert.equal(paintOrderValid(rightFront, recipe), true);
  assert.equal(paintOrderValid(ordinary, recipe), false);
  assert.equal(paintOrderValid(rightFront), false,
    "the front-of-face arm order must not leak into recipes without the policy");
  assert.deepEqual(
    rightFront.slice(0, 2),
    ordinary.slice(0, 2),
    "the left forearm and hand must remain at their ordinary depth",
  );
});

test("right-front-of-head eligibility requires a meaningful observed right-arm/head overlap", async () => {
  const recipe = { quality: { armPaintOrder: "right-front-of-head" } };
  assert.equal(rightFrontPaintOrderEligible(recipe, 0), false);
  assert.equal(rightFrontPaintOrderEligible(recipe, 19), false,
    "antialias or accidental contact cannot self-certify the policy");
  assert.equal(rightFrontPaintOrderEligible(recipe, 20), true);
  assert.equal(rightFrontPaintOrderEligible({}, 0), true,
    "ordinary paint order does not need a front-of-face overlap");

  const left = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
      + '<rect x="2" y="2" width="8" height="8" fill="black"/>'
      + "</svg>",
  );
  const secondLeftPiece = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
      + '<rect x="10" y="2" width="4" height="8" fill="black"/>'
      + "</svg>",
  );
  const right = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
      + '<rect x="6" y="4" width="6" height="4" fill="black"/>'
      + "</svg>",
  );
  assert.equal(await alphaOverlapPixelCount([left, secondLeftPiece], right, 20), 24,
    "overlap counts the union of complete arm pieces without double-counting pixels");
});

test("source-bound enumerate pupil 13 stays visibly inside both real eye envelopes", async () => {
  const [manifest, recipe] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    fs.readFile(new URL("../poses/candidates/enumerate-list-items.json", import.meta.url), "utf8")
      .then(JSON.parse),
  ]);
  const poseRuntime = createPoseRuntime(manifest, recipe);
  const assetRoot = fileURLToPath(new URL("../rig-v2/assets", import.meta.url));
  const propRoot = fileURLToPath(new URL("../assets/props", import.meta.url));
  const assetCache = new Map();
  const propCache = new Map();
  const sourceSha256 = recipe.sourceAction.sourceXstageSha256;

  for (const frame of [106, 122]) {
    const rendered = await renderRigFrame({
      manifest,
      frame,
      assetRoot,
      propRoot,
      poseRuntime,
      assetCache,
      propCache,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      includeLayerBuffers: true,
    });
    const observations = await pupilVisibilityObservations(
      rendered.analysisLayers,
      rendered.receipt.layers,
    );

    for (const observation of observations) {
      const receipt = rendered.receipt.layers.find((layer) => (
        layer.nodePath.endsWith(`/${observation.side}_Pupil`) && layer.variant === "main"
      ));
      assert.equal(receipt?.drawing, "13", `${observation.side} frame ${frame} drawing`);
      assert.equal(receipt?.sourceXstageSha256, sourceSha256,
        `${observation.side} frame ${frame} source binding`);
      assert.equal(observation.required, true);
      assert.equal(observation.visible, true,
        `${observation.side} pupil 13 must pass the real transformed gate at frame ${frame}: ${JSON.stringify(observation)}`);
      assert.ok(observation.darkOpaquePixels >= observation.visibilityFloorPixels);
      assert.ok(observation.eyeOverlapPixels >= observation.eyeOverlapFloorPixels);
      assert.ok(observation.eyeOverlapRatio >= observation.eyeOverlapRatioFloor);
    }
  }
});

test("the real renderer and inspector agree on a qualified front-of-head right arm", async () => {
  const [manifest, recipe] = await Promise.all([
    loadManifest(new URL("../rig-v2/runtime.json", import.meta.url)),
    fs.readFile(new URL("../poses/authored/confident.json", import.meta.url), "utf8")
      .then(JSON.parse),
  ]);
  recipe.quality = { ...recipe.quality, armPaintOrder: "right-front-of-head" };
  const report = await inspectPose({
    manifest,
    assetRoot: fileURLToPath(new URL("../rig-v2/assets", import.meta.url)),
    propRoot: fileURLToPath(new URL("../assets/props", import.meta.url)),
    recipe,
  });
  assert.equal(report.status, "pass", JSON.stringify(report.failures, null, 2));
  assert.ok(report.maximumRightArmHeadBaseOverlapPixels >= 20);
  assert.ok(report.frames.some(({ rightArmHeadBaseOverlapPixels }) => (
    rightArmHeadBaseOverlapPixels >= 20
  )));
  assert.ok(report.frames.every(({ rightArmHeadBaseOverlapPixels }) => (
    Number.isInteger(rightArmHeadBaseOverlapPixels)
  )));
  assert.ok(report.gates.includes("pupil-visibility"));
  assert.ok(report.frames.some(({ pupilVisibility }) => (
    pupilVisibility.every(({ required, visible }) => required && visible)
  )), "open-eye frames report two meaningfully visible pupils");
  assert.ok(report.frames.some(({ pupilVisibility }) => (
    pupilVisibility.every(({ required, visible, pupilDrawing }) => (
      required === false && visible === null && pupilDrawing === null
    ))
  )), "closed-eye frames preserve their legitimate null pupil exposures");
});

test("temporal inspection measures the longest identical-frame run", () => {
  assert.equal(maximumConsecutiveEqual(["a", "b", "b", "b", "c", "c"]), 3);
  assert.equal(maximumConsecutiveEqual([]), 0);
});
