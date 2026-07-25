import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractThreeDBreakdownEvidence } from "../features/formats/three-d-breakdown/evidence";
import {
  assertThreeDBreakdownImageCallAllowed,
  assertThreeDBreakdownVideoCallAllowed,
  evaluateThreeDBreakdownRepoRequirements,
  getThreeDBreakdownRequiredAnchorFrameIndexes,
  inspectThreeDBreakdownRepoScene,
  type ThreeDBreakdownRepoRequirementManifest,
} from "../features/formats/three-d-breakdown/repoRuntime";
import { createThreeDBreakdownAdScene } from "../features/scene/createThreeDBreakdownScene";
import type { ThreeDBreakdownAdScene } from "../features/scene/types";
import { makeResearch } from "./helpers/research";

const research = makeResearch({
  brand: {
    ...makeResearch().brand,
    name: "LEGO",
    title: "LEGO History: The Beginning",
    description: "The founder moved from furniture into wooden toys in 1932.",
  },
  brandBrief: {
    ...makeResearch().brandBrief,
    brandName: "LEGO",
    offer: "The documented origin of LEGO and its first wooden toys.",
    proof: ["The workshop started making wooden toys in 1932."],
  },
  evidence: {
    ...makeResearch().evidence,
    paragraphs: ["The workshop started making wooden toys in 1932."],
    receipts: {
      specificClaims: ["The workshop started making wooden toys in 1932."],
      buyerMoments: [],
      exactSiteLanguage: ["wooden toys", "1932"],
      namedProof: [],
    },
  },
});
const evidence = extractThreeDBreakdownEvidence(research);
const evidenceItem = evidence[0]!;
const frames = [
  ["problem", "Problem state"],
  ["escalation", "Escalation"],
  ["mechanism-setup", "Mechanism setup"],
  ["wow-reveal", "Wow reveal"],
  ["payoff", "Evidence payoff"],
  ["final-state", "Final state"],
].map(([role, label], index) => ({
  frameIndex: index + 1,
  role,
  label,
  visual: `Frame ${index + 1} shows one physical workshop action.`,
  camera: "Macro push-in.",
  motion: "One object changes state.",
  overlayText: `Beat ${index + 1}`,
  image: { status: "idle" as const },
}));

const plannedScene = createThreeDBreakdownAdScene({
  candidateIndex: 0,
  evidenceItems: evidence,
  generationBatchId: "repo-test",
  model: "fixture",
  provider: "nvidia-nim",
  research,
  siteContract: {
    primarySiteType: "ecommerce",
    riskFlags: [],
    visualWorld: "feature-animation CGI workshop on a blue grid",
    lighting: "warm workshop spotlights",
    cameraStyle: "macro push-ins and tactile cutaways",
    recurringObjects: ["wooden duck", "workbench"],
  },
  storySubject: { kind: "brand" },
  variant: {
    visualStyle: "presenter-teardown-vsl",
    variantAngle: "the workshop pivot",
    customerProblem: "the furniture business stopped working",
    mechanismSummary: "the workshop shifted into wooden toys",
    visualMetaphor: "a workbench rebuilds itself into a toy line",
    referenceScript: "A workshop loses its old path. The furniture orders disappear. Then one workbench changes jobs. Wood becomes toys instead. That small pivot becomes the first step in a much bigger story.",
    ctaLine: "Watch the full story.",
    evidenceIndex: evidenceItem.evidenceIndex,
    evidenceUseType: evidenceItem.evidenceUseType,
    wowMomentType: "before-after-reconstruction",
    wowMoment: "The furniture workbench rebuilds itself into a wooden toy line.",
    viewerLearns: "The company changed direction by moving from furniture to toys.",
    claimRisk: "low",
    claimRiskReason: "The story uses the saved origin evidence.",
    scriptBeats: [
      { role: "consequence", narration: "A workshop loses its old path.", startMs: 0, endMs: 3000 },
      { role: "context", narration: "The furniture orders disappear.", startMs: 3000, endMs: 7000 },
      { role: "mechanism", narration: "Then one workbench changes jobs.", startMs: 7000, endMs: 12000 },
      { role: "revelation", narration: "Wood becomes toys instead.", startMs: 12000, endMs: 16000 },
      { role: "punchline", narration: "Watch the full story.", startMs: 16000, endMs: 20000 },
    ],
    storyboardBoard: {
      frameCount: 6,
      imagePrompt: "One 2-by-3 contact sheet with six clean CGI workshop stills and no readable text.",
      frames: frames as NonNullable<ThreeDBreakdownAdScene["layout"]["storyboardBoard"]>["frames"],
    },
    shots: [
      {
        shotIndex: 1,
        role: "consequence",
        captionText: "The old work stopped.",
        sceneDescription: "A workshop stands still.",
        explainerDevice: "Miniature workshop",
        physicalAction: "Tools stop moving.",
        imagePrompt: "CGI workshop with still tools and no text.",
        animationPrompt: "Tools stop in sequence.",
      },
      {
        shotIndex: 2,
        role: "mechanism",
        captionText: "The bench changed jobs.",
        sceneDescription: "Furniture parts turn into toy parts.",
        explainerDevice: "Before-after reconstruction",
        physicalAction: "The workbench rearranges the parts.",
        imagePrompt: "CGI workbench rebuilding wood parts and no text.",
        animationPrompt: "Wood parts rearrange into a toy.",
      },
      {
        shotIndex: 3,
        role: "revelation",
        captionText: "The first toy appears.",
        sceneDescription: "A wooden toy rolls off the bench.",
        explainerDevice: "Product reveal",
        physicalAction: "The toy rolls forward.",
        imagePrompt: "CGI wooden toy rolling off a workbench and no text.",
        animationPrompt: "The toy rolls into the final frame.",
      },
    ],
  },
});

assert.deepEqual(getThreeDBreakdownRequiredAnchorFrameIndexes(plannedScene), [1, 3, 4, 6]);
const plannedInspection = inspectThreeDBreakdownRepoScene(plannedScene);
assert.equal(plannedInspection.status, "planned");
assert.equal(plannedInspection.checks.sceneContractValid, true);
assert.equal(plannedInspection.checks.noVideoWasGenerated, true);
assert.equal(plannedInspection.checks.storyboardReady, false);
assert.throws(
  () => assertThreeDBreakdownImageCallAllowed({ approved: false, attempts: 0, scene: plannedScene }),
  /Approve one image generation/,
);
assert.doesNotThrow(
  () => assertThreeDBreakdownImageCallAllowed({ approved: true, attempts: 0, scene: plannedScene }),
);
assert.throws(
  () => assertThreeDBreakdownImageCallAllowed({ approved: true, attempts: 3, scene: plannedScene }),
  /attempt limit is 3/,
);

const readyScene = structuredClone(plannedScene);
readyScene.layout.storyboardBoard!.image = {
  status: "ready",
  storageId: "local:board",
  url: "agent-runs/test/images/storyboard-board.jpg",
  mimeType: "image/jpeg",
};
const startAnchorsOnlyScene = structuredClone(readyScene);
startAnchorsOnlyScene.layout.storyboardBoard!.frames = startAnchorsOnlyScene.layout.storyboardBoard!.frames!.map((frame) => (
  frame.frameIndex === 1 || frame.frameIndex === 4
    ? {
      ...frame,
      image: {
        status: "ready",
        storageId: `local:anchor-${frame.frameIndex}`,
        url: `agent-runs/test/images/anchor-${frame.frameIndex}.jpg`,
        mimeType: "image/jpeg",
      },
    }
    : frame
));
const startAnchorsOnlyInspection = inspectThreeDBreakdownRepoScene(startAnchorsOnlyScene, () => true);
assert.equal(startAnchorsOnlyInspection.status, "planned");
assert.ok(startAnchorsOnlyInspection.problems.includes("Missing or unreadable full-quality production endpoints: frames 3, 6."));
assert.throws(
  () => assertThreeDBreakdownVideoCallAllowed({
    approved: true,
    attempts: 0,
    clipIndex: 1,
    scene: startAnchorsOnlyScene,
  }),
  /all four full-quality video endpoints/,
);
readyScene.layout.storyboardBoard!.frames = readyScene.layout.storyboardBoard!.frames!.map((frame) => (
  [1, 3, 4, 6].includes(frame.frameIndex)
    ? {
      ...frame,
      image: {
        status: "ready",
        storageId: `local:anchor-${frame.frameIndex}`,
        url: `agent-runs/test/images/anchor-${frame.frameIndex}.jpg`,
        mimeType: "image/jpeg",
      },
    }
    : frame
));
const readyInspection = inspectThreeDBreakdownRepoScene(readyScene, () => true);
assert.equal(readyInspection.status, "ready-for-video");
assert.equal(readyInspection.checks.fourProductionEndpointsReady, true);
assert.deepEqual(readyInspection.problems, []);
assert.throws(
  () => assertThreeDBreakdownVideoCallAllowed({
    approved: false,
    attempts: 0,
    clipIndex: 1,
    scene: readyScene,
  }),
  /Approve this paid video clip/,
);
assert.doesNotThrow(
  () => assertThreeDBreakdownVideoCallAllowed({
    approved: true,
    attempts: 0,
    clipIndex: 1,
    scene: readyScene,
  }),
);
assert.throws(
  () => assertThreeDBreakdownVideoCallAllowed({
    approved: true,
    attempts: 0,
    clipIndex: 2,
    scene: readyScene,
  }),
  /clip 1 before clip 2/,
);
assert.throws(
  () => assertThreeDBreakdownVideoCallAllowed({
    approved: true,
    attempts: 3,
    clipIndex: 1,
    scene: readyScene,
  }),
  /attempt limit is 3/,
);

const oneClipScene = structuredClone(readyScene);
oneClipScene.layout.clipPlans![0]!.video = {
  status: "ready",
  storageId: "local:clip-1",
  url: "agent-runs/test/videos/clip-1.mp4",
  mimeType: "video/mp4",
};
const inProgressInspection = inspectThreeDBreakdownRepoScene(oneClipScene, () => true);
assert.equal(inProgressInspection.status, "video-in-progress");
assert.match(inProgressInspection.problems.join("\n"), /twoVideoClipsReady/);
assert.doesNotThrow(
  () => assertThreeDBreakdownVideoCallAllowed({
    approved: true,
    attempts: 0,
    clipIndex: 2,
    scene: oneClipScene,
  }),
);

const clipsReadyScene = structuredClone(oneClipScene);
clipsReadyScene.layout.clipPlans![1]!.video = {
  status: "ready",
  storageId: "local:clip-2",
  url: "agent-runs/test/videos/clip-2.mp4",
  mimeType: "video/mp4",
};
const clipsReadyInspection = inspectThreeDBreakdownRepoScene(clipsReadyScene, () => true);
assert.equal(clipsReadyInspection.status, "clips-ready");
assert.equal(clipsReadyInspection.checks.twoVideoClipsReady, true);
assert.equal(clipsReadyInspection.checks.noVideoWasGenerated, false);
assert.deepEqual(clipsReadyInspection.problems, []);

const manifest: ThreeDBreakdownRepoRequirementManifest = {
  environment: {
    NVIDIA_NIM_API_KEY: { requiredFor: ["plan"], secret: true },
    REPLICATE_API_TOKEN: { requiredFor: ["images", "video"], secret: true },
  },
  tools: {
    node: { requiredFor: ["plan", "images", "video"] },
    ffmpeg: { requiredFor: ["video"] },
    ffprobe: { requiredFor: ["video"] },
  },
  disabledStages: {},
};
assert.deepEqual(evaluateThreeDBreakdownRepoRequirements({
  stage: "images",
  environment: {},
  manifest,
  tools: { node: true },
}).missingEnvironment, ["REPLICATE_API_TOKEN"]);
const readyVideo = evaluateThreeDBreakdownRepoRequirements({
  stage: "video",
  environment: { REPLICATE_API_TOKEN: "present" },
  manifest,
  tools: { node: true, ffmpeg: true, ffprobe: true },
});
assert.equal(readyVideo.ok, true);
const runnerSource = readFileSync("scripts/three-d-breakdown-format.ts", "utf8");
assert.match(runnerSource, /commandAvailable\("ffmpeg", "-version"\)/);
assert.match(runnerSource, /commandAvailable\("ffprobe", "-version"\)/);
assert.match(runnerSource, /attempt\.predictionId = predictionId;[\s\S]*await saveState\(state\)/);
assert.ok(runnerSource.includes("predictionId: activeAttempt?.predictionId"));
assert.match(runnerSource, /error instanceof ReplicatePredictionStillRunningError/);
assert.match(runnerSource, /marked as generating but has no saved Replicate prediction ID/);
const sceneContract = JSON.parse(readFileSync("public/format-repositories/three-d-breakdown-v1/scene-contract.json", "utf8"));
assert.deepEqual(sceneContract.storyboard.worldSequence.map((stage: { role: string }) => stage.role), [
  "lifestyle-setup",
  "blue-breakdown",
  "lifestyle-payoff",
]);
assert.deepEqual(sceneContract.productionAnchors.frameIndexes, [1, 3, 4, 6]);

console.log("3D Breakdown Repo tests passed.");
