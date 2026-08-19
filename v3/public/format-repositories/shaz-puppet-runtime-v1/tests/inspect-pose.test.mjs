import assert from "node:assert/strict";
import test from "node:test";

import {
  alphaStats,
  armCompositeValid,
  armTopologyValid,
  eyeEnvelopeCompositeValid,
  expectedEdgesForFrame,
  hairCompositeValid,
  maximumConsecutiveEqual,
  nearWhitePixelCount,
  opaqueMaskOverlapPixelCount,
  paintOrderValid,
  registeredCrossedArmCompositeValid,
  registeredPhoneInteractionCompositeValid,
} from "../runtime/inspect-pose.mjs";
import { READ_PAINT_PLAN } from "../runtime/rig-v2-renderer.mjs";

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

test("arm-composite inspection requires finished sleeve unions and rejects construction layers", () => {
  const arm = (side) => [
    {
      nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
      variant: "main",
      compositeRole: "finished-sleeve-union",
    },
    { nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`, variant: "color" },
    { nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`, variant: "overlay" },
    { nodePath: `Top/Shaz_Rig/Body_Group/${side}_Hand`, variant: "main" },
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
    compositeRole: "finished-artwork",
  });
  assert.equal(armCompositeValid([...thinkingLeft, ...arm("Right")]), true);
});

test("crossed arms permit one registered assembly and reject independent limb pieces", () => {
  const recipe = { quality: { armCompositeMode: "registered-crossed-rig-assembly" } };
  const layers = ["Left", "Right"].map((side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Arm`,
    variant: "main",
    compositeRole: "hidden-construction-fill",
  }));
  const props = [{
    id: "crossed-arms-assembly",
    asset: "crossed-arms-assembly.png",
    layer: "front",
  }];
  assert.equal(registeredCrossedArmCompositeValid(layers, props, recipe), true);
  assert.equal(armTopologyValid(layers, props, recipe), true);
  assert.equal(registeredCrossedArmCompositeValid(layers, [], recipe), false);
  const detachedPieces = [
    { id: "crossed-left-hand", asset: "crossed-left-hand.png", layer: "front" },
    { id: "crossed-left-sleeve", asset: "crossed-left-sleeve.png", layer: "front" },
  ];
  assert.equal(armTopologyValid(layers, detachedPieces, recipe), false);
  assert.equal(registeredCrossedArmCompositeValid([
    ...layers,
    { nodePath: "Top/Shaz_Rig/Body_Group/Left_Hand", variant: "main" },
  ], props, recipe), false);
  assert.equal(registeredCrossedArmCompositeValid(layers, props, { quality: {} }), false);
});

test("phone interaction accepts exactly one registered contact-hand substitution", () => {
  const recipe = { quality: { armCompositeMode: "registered-phone-interaction" } };
  const sleeve = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
    variant: "main",
    compositeRole: "finished-sleeve-union",
  });
  const layers = [
    sleeve("Left"),
    sleeve("Right"),
    {
      nodePath: "Top/Shaz_Rig/Body_Group/Right_Hand",
      variant: "main",
      compositeRole: "finished-artwork",
    },
  ];
  const props = [
    { id: "phone", asset: "phone.svg", layer: "front" },
    { id: "phone-tap-hand", asset: "phone-tap-hand.png", layer: "front" },
  ];
  assert.equal(registeredPhoneInteractionCompositeValid(layers, props, recipe), true);
  assert.equal(armTopologyValid(layers, props, recipe), true);
  assert.equal(registeredPhoneInteractionCompositeValid(layers, props.slice(1), recipe), true);
  assert.equal(armTopologyValid(layers, [
    ...props,
    { id: "floating-second-hand", asset: "other-hand.png", layer: "front" },
  ], recipe), false);
  assert.equal(registeredPhoneInteractionCompositeValid(layers, props, { quality: {} }), false);
});

test("independent screen-space limb pieces cannot bypass a valid native arm chain", () => {
  const sleeve = (side) => ({
    nodePath: `Top/Shaz_Rig/Body_Group/${side}_Forearm`,
    variant: "main",
    compositeRole: "finished-sleeve-union",
  });
  const layers = [
    sleeve("Left"),
    { nodePath: "Top/Shaz_Rig/Body_Group/Left_Hand", variant: "main" },
    sleeve("Right"),
    { nodePath: "Top/Shaz_Rig/Body_Group/Right_Hand", variant: "main" },
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

test("temporal inspection measures the longest identical-frame run", () => {
  assert.equal(maximumConsecutiveEqual(["a", "b", "b", "b", "c", "c"]), 3);
  assert.equal(maximumConsecutiveEqual([]), 0);
});
