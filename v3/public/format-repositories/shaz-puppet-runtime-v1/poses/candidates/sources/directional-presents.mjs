#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  adjustedState,
  controlKey,
  generatedRecipe,
  sourceControlState,
  sourceDrawing,
  writePoseRecipe,
} from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const SOURCE_SHA256 = "237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127";
const DIRECTIONAL_PRESENT_REFERENCES = Object.freeze({
  left: Object.freeze({
    candidateNumber: "06",
    sourceName: "0826.mov",
    sourceSha256: SOURCE_SHA256,
    sourceStartSeconds: 47.25,
    sourceEndSeconds: 50.75,
    clipSha256: "f48bb751f215006cfcde078efd5a179715a849bca5d8145eb157ee3d30ff60a9",
  }),
  right: Object.freeze({
    candidateNumber: "11",
    sourceName: "0826.mov",
    sourceSha256: SOURCE_SHA256,
    sourceStartSeconds: 118.35,
    sourceEndSeconds: 121.85,
    clipSha256: "dc531adc7c95039cf21339427d3b6b1a42109555cac6bb51b65e5a19ae4bf3e1",
    targetClipFrame: 80,
    targetHoldRange: [71, 103],
    targetDescription: "settled audience-facing screen-right presentation hold after the clip's counter-shift",
  }),
});

const RIGHT_ARM_CONTROL_NAMES = Object.freeze([
  "Right_Arm-P",
  "Right_Arm_MOVE-P",
  "Right_Arm_Pivot-P",
  "Right_Forearm-P",
  "Right_Forearm_Pivot-P",
  "Right_Hand-P",
]);
const ACTION_KEY_FRAMES = Object.freeze([1, 2, 4, 6, 50, 52, 54, 56, 58]);
const ENTRY_RIGHT_ARM_STATES = Object.freeze({
  "Right_Arm-P": Object.freeze([
    { position: [0.18172653311230455, -0.10559763017161394, 0], rotation: -5.018934696261011, scale: [1.0000418556402995, 0.9999581472734062], skew: 0.0022539718224128345, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [-0.14901941072919317, -0.21988842932306552, 0], rotation: 0, scale: [1, 1], skew: 0, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [0, 0, 0], rotation: 0, scale: [1, 1], skew: 0, opacity: 100, flipHorizontal: false, flipVertical: false },
  ]),
  "Right_Arm_MOVE-P": Object.freeze([
    { position: [-1.130518358787301, -0.43234372506664387, -0.02300929488909217], rotation: 1.6336153246784884, scale: [1.0000101553653735, 0.9999898447438094], skew: -0.00019633807157040694, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [-1.1649452410214152, -1.0323287419910803, -0.04400047731847265], rotation: 1.647775744106277, scale: [1.0000100653785946, 0.9999899347287617], skew: -0.0001977460872908352, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [0.457099186000625, -0.928866714916136, 0], rotation: -8.277613844363607, scale: [0.9999471004328773, 1.0000529023660159], skew: -0.00005013191950963761, opacity: 100, flipHorizontal: false, flipVertical: false },
  ]),
  "Right_Arm_Pivot-P": Object.freeze([
    { position: [0.8287444860909882, 0.42634120617407534, -0.00405120849609375], rotation: 6.291233859118844, scale: [0.9998515922714148, 1.0001484530891274], skew: -0.0022331393999729973, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [1.8666387991966458, 0.7798866328647103, -0.007965087890625], rotation: -3.256648190949857, scale: [0.9998927661711058, 1.0001072440827414], skew: -0.007225133859964133, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [-0.02853656038852964, 0.28162651666868205, 0], rotation: 20.213177772478435, scale: [1.0001304408764988, 0.9998695953040169], skew: -0.011218982367053655, opacity: 100, flipHorizontal: false, flipVertical: false },
  ]),
  "Right_Forearm-P": Object.freeze([
    { position: [-0.015541760564013804, -0.2538356485516911, 0], rotation: -5.020728016905912, scale: [1.0000243116559164, 0.9999756892060656], skew: -0.0013337646512358134, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [0.2189544572150054, -0.033739882018564156, 0], rotation: -9.007991013469448, scale: [1.0000356270151138, 0.999964374912372], skew: -0.0020789061470495164, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [0, 0, 0], rotation: 0, scale: [1, 1], skew: 0, opacity: 100, flipHorizontal: false, flipVertical: false },
  ]),
  "Right_Forearm_Pivot-P": Object.freeze([
    { position: [-1.2490009027033011e-15, 7.327471962526033e-15, 0], rotation: -74.15080909401868, scale: [1.000411243046285, 0.9995890026645495], skew: 0.028031441605721255, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [-0.03469288264109552, -0.008726613968065067, 0.10334014892578125], rotation: -149.4588410236099, scale: [0.9998955345303627, 1.0001045245102047], skew: 0.02126320939796887, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [-0.13235526834520733, 0.05455556388303362, 0], rotation: 144.74235832145197, scale: [0.9998153905052021, 1.0001847502876922], skew: -0.026466212016951252, opacity: 100, flipHorizontal: false, flipVertical: false },
  ]),
  "Right_Hand-P": Object.freeze([
    { position: [-0.5397083196565611, -0.8198220290891253, 0], rotation: -23.892784441705363, scale: [0.9699731579870025, 0.9700268439580084], skew: -0.00048792499070959963, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [-0.4834583196565612, -0.45419702908912507, 0], rotation: 22.607215558294637, scale: [0.9499737114305694, 0.9500262904743382], skew: -0.00048792499070959963, opacity: 100, flipHorizontal: false, flipVertical: false },
    { position: [-1.0103121472484466, 0.31408992193312735, 0.15875244140625], rotation: 35.76282748752414, scale: [1.0000812481045807, 0.9999187595111072], skew: -0.002581555654833063, opacity: 100, flipHorizontal: false, flipVertical: false },
  ]),
});
const HOLD_A_RIGHT_ARM_STATES = Object.freeze({
  "Right_Arm-P": { position: [0, 0, 0], rotation: 0, scale: [1, 1], skew: 0, opacity: 100, flipHorizontal: false, flipVertical: false },
  "Right_Arm_MOVE-P": { position: [0.3758491860006259, -0.8138667149161353, 0], rotation: -10.933401987453507, scale: [0.9999304125457725, 1.0000695923259297], skew: -0.00043598455979018165, opacity: 100, flipHorizontal: false, flipVertical: false },
  "Right_Arm_Pivot-P": { position: [0.07146343961147036, 0.28162651666868205, 0], rotation: 21.713177772478435, scale: [1.0001304408764988, 0.9998695953040169], skew: -0.011218982367053655, opacity: 100, flipHorizontal: false, flipVertical: false },
  "Right_Forearm-P": { position: [0, 0, 0], rotation: 0, scale: [1, 1], skew: 0, opacity: 100, flipHorizontal: false, flipVertical: false },
  "Right_Forearm_Pivot-P": { position: [-0.13235526834520991, 0.05455556388303063, 0], rotation: 108.15798232924544, scale: [0.9998262117812842, 1.0001739545051036], skew: -0.02988787713649219, opacity: 100, flipHorizontal: false, flipVertical: false },
  "Right_Hand-P": { position: [-0.12179533336437404, 1.3284338338159847, 0.15875244140625], rotation: 24.996992378839654, scale: [1.0000143635790806, 0.999985636629764], skew: -0.00012899320758995658, opacity: 100, flipHorizontal: false, flipVertical: false },
});
const COUNTER_RIGHT_ARM_PARAMETERS = Object.freeze({
  50: Object.freeze({
    armMovePosition: [0.36397418600062587, -0.7788667149161352, 0],
    armPivotPosition: [0.06146343961147036, 0.28162651666868205, 0],
    armPivotRotation: 22.313177772478436,
    forearmPivotRotation: 107.67048232924544,
    handPosition: [0.06289216663562597, 1.5009338338159848, 0.15875244140625],
    handRotation: 24.834492378839652,
  }),
  52: Object.freeze({
    armMovePosition: [0.3253804360006259, -0.6651167149161352, 0],
    armPivotPosition: [0.02896343961147036, 0.28162651666868205, 0],
    armPivotRotation: 24.263177772478436,
    forearmPivotRotation: 106.08610732924544,
    handPosition: [0.17328279163562596, 1.5857775838159847, 0.15875244140625],
    handRotation: 25.478242378839653,
  }),
  54: Object.freeze({
    armMovePosition: [0.25709918600062587, -0.46386671491613524, 0],
    armPivotPosition: [-0.02853656038852964, 0.28162651666868205, 0],
    armPivotRotation: 27.713177772478435,
    forearmPivotRotation: 103.28298232924544,
    handPosition: [0.04695466663562598, 1.3846838338159848, 0.15875244140625],
    handRotation: 28.371992378839654,
  }),
  56: Object.freeze({
    armMovePosition: [0.25709918600062587, -0.46386671491613524, 0],
    armPivotPosition: [-0.02853656038852964, 0.28162651666868205, 0],
    armPivotRotation: 27.713177772478435,
    forearmPivotRotation: 103.28298232924544,
    handPosition: [-0.07492033336437402, 1.1971838338159848, 0.15875244140625],
    handRotation: 25.246992378839654,
  }),
});

function drawingTimeline(manifest, nodeName, sourceFrames) {
  const keys = [];
  let previous = Symbol("unset");
  sourceFrames.forEach((sourceFrame, index) => {
    const drawing = sourceDrawing(manifest, nodeName, sourceFrame);
    if (drawing !== previous) {
      keys.push({ frame: index + 1, drawing });
      previous = drawing;
    }
  });
  return keys;
}

function controlTimeline(manifest, nodeName, sourceFrames) {
  return sourceFrames.map((sourceFrame, index) => (
    controlKey(index + 1, sourceControlState(manifest, nodeName, sourceFrame))
  ));
}

function neutralFaceDrawings(manifest) {
  return Object.fromEntries([
    "Left_Eye",
    "Right_Eye",
    "Left_Pupil",
    "Right_Pupil",
    "Mouth",
  ].map((nodeName) => [
    nodeName,
    [{ frame: 1, drawing: sourceDrawing(manifest, nodeName, 32) }],
  ]));
}

function buildDirectionalPresent(manifest, {
  id,
  sourceFrames,
  controlNames,
  drawingNames,
  learnedFrom,
  authoredOpenHandCuffs,
  extraControls = {},
  maximumIdenticalFrames = 3,
  sourceAction = null,
  sourceApprovedEdgeContacts = null,
}) {
  const recipe = generatedRecipe(manifest, {
    id,
    durationFrames: sourceFrames.length,
    controls: {
      ...Object.fromEntries(controlNames.map((nodeName) => [
        nodeName,
        controlTimeline(manifest, nodeName, sourceFrames),
      ])),
      ...extraControls,
    },
    drawings: {
      ...Object.fromEntries(drawingNames.map((nodeName) => [
        nodeName,
        drawingTimeline(manifest, nodeName, sourceFrames),
      ])),
      ...neutralFaceDrawings(manifest),
    },
    learnedFrom,
    deformationFrames: sourceFrames,
    quality: {
      maximumIdenticalFrames,
      armCompositeMode: "native-rig",
      authoredOpenHandCuffs,
      ...(sourceApprovedEdgeContacts ? { sourceApprovedEdgeContacts } : {}),
    },
  });
  recipe.baseFrame = 32;
  if (sourceAction) recipe.sourceAction = sourceAction;
  return recipe;
}

function buildPresentScreenLeft(manifest) {
  return buildDirectionalPresent(manifest, {
    id: "present-screen-left",
    sourceFrames: Array.from({ length: 19 }, (_, index) => 37 + index),
    controlNames: [
      "Left_Arm-P",
      "Left_Arm_MOVE-P",
      "Left_Arm_Pivot-P",
      "Left_Forearm-P",
      "Left_Forearm_Pivot-P",
      "Left_Hand-P",
      "OL_Hand-P",
    ],
    drawingNames: ["Left_Hand"],
    learnedFrom: [
      "authored/present source frames 37-55: complete left open-palm entry and settle",
      "Candidate 06 acceptance silhouette: leftward offer with the opposite arm relaxed",
    ],
    authoredOpenHandCuffs: ["Left"],
    sourceAction: {
      startFrame: 37,
      endFrame: 55,
      generatedFrom: "xstage-control-channels-and-drawing-exposures",
    },
    sourceApprovedEdgeContacts: [{
      edge: "bottom",
      frames: [1, 19],
      reason: "The source-authored opposite hand intentionally continues below the bottom edge in the fixed waist-up crop; its native cuff/wrist chain remains intact.",
    }],
  });
}

function buildPresentScreenRightDestinationStudy(manifest) {
  const holdSourceFrame = 82;
  const controls = Object.fromEntries(RIGHT_ARM_CONTROL_NAMES.map((nodeName) => {
    const source = sourceControlState(manifest, nodeName, holdSourceFrame);
    let fitted = source;
    if (nodeName === "Right_Arm_MOVE-P") {
      fitted = adjustedState(source, { positionDelta: [0.10, -0.51, 0] });
    } else if (nodeName === "Right_Forearm_Pivot-P") {
      fitted = adjustedState(source, { rotationDelta: -14 });
    } else if (nodeName === "Right_Hand-P") {
      fitted = adjustedState(source, { rotationDelta: 18 });
    }
    return [nodeName, [controlKey(1, fitted)]];
  }));
  const recipe = generatedRecipe(manifest, {
    id: "present-screen-right-destination-study",
    durationFrames: 1,
    controls,
    drawings: {
      Right_Forearm: [{ frame: 1, drawing: sourceDrawing(manifest, "Right_Forearm", holdSourceFrame) }],
      Right_Hand: [{ frame: 1, drawing: sourceDrawing(manifest, "Right_Hand", holdSourceFrame) }],
    },
    learnedFrom: [
      "Candidate 11 clip frame 80: settled screen-right open-palm destination after the clip's counter-shift",
      "authored/shrug source frame 82: native right sleeve, wrist, and open-hand vocabulary only",
      "reference-fit target: solve shoulder, elbow, wrist, and palm independently without importing Shrug body deformation, face, timing, or release",
    ],
    quality: {
      maximumIdenticalFrames: 1,
      armCompositeMode: "native-rig",
      authoredOpenHandCuffs: ["Right"],
    },
  });
  recipe.baseFrame = 32;
  return recipe;
}

function keyState(key) {
  const { frame: ignoredFrame, interpolation: ignoredInterpolation, ...state } = key;
  return structuredClone(state);
}

function holdKey(frame, state) {
  return controlKey(frame, state, "hold");
}

function counterRightArmState(frame, nodeName, holdB) {
  if (frame === 58) return holdB;
  const parameters = COUNTER_RIGHT_ARM_PARAMETERS[frame];
  if (nodeName === "Right_Arm_MOVE-P") {
    return adjustedState(holdB, { position: parameters.armMovePosition });
  }
  if (nodeName === "Right_Arm_Pivot-P") {
    return adjustedState(holdB, {
      position: parameters.armPivotPosition,
      rotation: parameters.armPivotRotation,
    });
  }
  if (nodeName === "Right_Forearm_Pivot-P") {
    return adjustedState(holdB, { rotation: parameters.forearmPivotRotation });
  }
  if (nodeName === "Right_Hand-P") {
    return adjustedState(holdB, {
      position: parameters.handPosition,
      rotation: parameters.handRotation,
    });
  }
  return holdB;
}

function buildPresentScreenRight(manifest) {
  const destinationStudy = buildPresentScreenRightDestinationStudy(manifest);
  const controls = Object.fromEntries(RIGHT_ARM_CONTROL_NAMES.map((nodeName) => {
    const [crossChest, noseTouch, cheekPalm] = ENTRY_RIGHT_ARM_STATES[nodeName];
    const holdA = HOLD_A_RIGHT_ARM_STATES[nodeName];
    const holdB = keyState(destinationStudy.controls[nodeName][0]);
    return [nodeName, [
      holdKey(1, crossChest),
      holdKey(2, noseTouch),
      holdKey(4, cheekPalm),
      holdKey(6, holdA),
      ...[50, 52, 54, 56, 58].map((frame) => (
        holdKey(frame, counterRightArmState(frame, nodeName, holdB))
      )),
    ]];
  }));

  const baseBody = sourceControlState(manifest, "Body-P", 32);
  const baseHead = sourceControlState(manifest, "Head_Movement-P", 32);
  controls["Body-P"] = [
    holdKey(1, adjustedState(baseBody, { rotation: -2.92 })),
    holdKey(50, adjustedState(baseBody, { rotation: -2.6326836504760744 })),
    holdKey(52, adjustedState(baseBody, { rotation: -1.5621813549276187 })),
    holdKey(54, adjustedState(baseBody, { rotation: -0.3506537858193029 })),
    holdKey(56, baseBody),
    holdKey(58, baseBody),
  ];
  controls["Head_Movement-P"] = [
    holdKey(1, adjustedState(baseHead, {
      position: [0.5610613715332716, -0.06521405256725124, 0],
    })),
    holdKey(50, adjustedState(baseHead, {
      position: [0.5037351354560601, -0.059016787946509885, 0],
    })),
    holdKey(52, adjustedState(baseHead, {
      position: [0.2901452460623923, -0.03592660872901147, 0],
    })),
    holdKey(54, adjustedState(baseHead, {
      position: [0.0484175631239382, -0.009794587514317148, 0],
    })),
    holdKey(56, baseHead),
    holdKey(58, baseHead),
  ];

  const recipe = generatedRecipe(manifest, {
    id: "present-screen-right",
    durationFrames: 83,
    controls,
    drawings: {
      Right_Forearm: [
        { frame: 1, drawing: "1" },
        { frame: 2, drawing: "3" },
        { frame: 4, drawing: "2" },
      ],
      Right_Hand: [
        { frame: 1, drawing: "1" },
        { frame: 2, drawing: "2" },
      ],
    },
    learnedFrom: [
      "Candidate 11 source frames 0-103: cross-chest entry, nose touch, cheek palm, Hold A, stepped counter-shift, and Hold B",
      "mirrored authored/think local frames 3 and 5: native right-chain cross-chest and nose-touch grammar",
      "authored/shrug local frame 4: native right-chain open-palm cheek grammar only",
      "present-screen-right-destination-study: exact settled Hold B destination without Shrug timing, face, deformation, or release",
    ],
    quality: {
      maximumIdenticalFrames: 44,
      armCompositeMode: "native-rig",
      armPaintOrder: "right-front-of-head",
      authoredOpenHandCuffs: ["Right"],
      sourceExposureChangeFrames: ACTION_KEY_FRAMES,
      sourceApprovedHolds: [
        { startFrame: 6, endFrame: 49 },
        { startFrame: 58, endFrame: 83 },
      ],
    },
  });
  recipe.baseFrame = 32;
  recipe.sourceAction = {
    phases: {
      entry: [1, 5],
      holdA: [6, 49],
      counterShift: [50, 57],
      holdB: [58, 83],
    },
    releasePresent: false,
    generatedFrom: "bounded rig-native reconstruction from source landmarks and authored drawing vocabulary",
  };
  return recipe;
}

async function main() {
  const [manifestPath, leftOutputPath, rightOutputPath, studyOutputPath] = process.argv.slice(2);
  if (!manifestPath || !leftOutputPath || !rightOutputPath || !studyOutputPath) {
    throw new Error(
      "usage: directional-presents.mjs runtime.json left.json right.json right-destination-study.json",
    );
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  await writePoseRecipe(leftOutputPath, buildPresentScreenLeft(manifest));
  await writePoseRecipe(rightOutputPath, buildPresentScreenRight(manifest));
  await writePoseRecipe(studyOutputPath, buildPresentScreenRightDestinationStudy(manifest));
  process.stdout.write(
    `${path.resolve(leftOutputPath)}\n${path.resolve(rightOutputPath)}\n${path.resolve(studyOutputPath)}\n`,
  );
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildPresentScreenLeft,
  buildPresentScreenRight,
  buildPresentScreenRightDestinationStudy,
  DIRECTIONAL_PRESENT_REFERENCES,
};
