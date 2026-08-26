import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  alphaContactPixelCount,
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
  registeredNonLimbProp,
  registeredPoseReplacement,
  shoulderAnchorValid,
} from "../runtime/inspect-pose.mjs";
import { loadManifest, READ_PAINT_PLAN } from "../runtime/rig-v2-renderer.mjs";

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

test("temporal inspection measures the longest identical-frame run", () => {
  assert.equal(maximumConsecutiveEqual(["a", "b", "b", "b", "c", "c"]), 3);
  assert.equal(maximumConsecutiveEqual([]), 0);
});
