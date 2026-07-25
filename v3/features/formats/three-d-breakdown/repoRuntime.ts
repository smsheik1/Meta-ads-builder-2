import type { ThreeDBreakdownAdScene } from "../../scene/types";
import { validateThreeDBreakdownScene } from "./validate";

export type ThreeDBreakdownRepoStage = "plan" | "images" | "voice" | "video" | "final";

export type ThreeDBreakdownRepoRequirementManifest = {
  environment: Record<string, {
    requiredFor: ThreeDBreakdownRepoStage[];
    secret: boolean;
  }>;
  tools: Record<string, {
    requiredFor: ThreeDBreakdownRepoStage[];
  }>;
  disabledStages: Partial<Record<ThreeDBreakdownRepoStage, string>>;
};

export type ThreeDBreakdownRepoInspection = {
  status: "invalid" | "planned" | "ready-for-video" | "video-in-progress" | "clips-ready";
  checks: Record<string, boolean>;
  problems: string[];
  requiredAnchorFrameIndexes: number[];
};

export const THREE_D_BREAKDOWN_REPO_IMAGE_ATTEMPT_LIMIT = 3;
export const THREE_D_BREAKDOWN_REPO_VIDEO_ATTEMPT_LIMIT = 3;

export function evaluateThreeDBreakdownRepoRequirements({
  environment,
  manifest,
  stage,
  tools,
}: {
  environment: Record<string, string | undefined>;
  manifest: ThreeDBreakdownRepoRequirementManifest;
  stage: ThreeDBreakdownRepoStage;
  tools: Record<string, boolean>;
}) {
  const missingEnvironment = Object.entries(manifest.environment)
    .filter(([, requirement]) => requirement.requiredFor.includes(stage))
    .map(([name]) => name)
    .filter((name) => !environment[name]?.trim());
  const missingTools = Object.entries(manifest.tools)
    .filter(([, requirement]) => requirement.requiredFor.includes(stage))
    .map(([name]) => name)
    .filter((name) => !tools[name]);
  const disabledReason = manifest.disabledStages[stage];
  return {
    ok: !disabledReason && missingEnvironment.length === 0 && missingTools.length === 0,
    missingEnvironment,
    missingTools,
    disabledReason,
  };
}

export function assertThreeDBreakdownImageCallAllowed({
  approved,
  attempts,
  scene,
}: {
  approved: boolean;
  attempts: number;
  scene: ThreeDBreakdownAdScene;
}) {
  if (!approved) throw new Error("Approve one image generation before running this command.");
  if (attempts >= THREE_D_BREAKDOWN_REPO_IMAGE_ATTEMPT_LIMIT) {
    throw new Error(`The image attempt limit is ${THREE_D_BREAKDOWN_REPO_IMAGE_ATTEMPT_LIMIT}. Inspect the current result before spending again.`);
  }
  const validation = validateThreeDBreakdownScene(scene);
  if (!validation.valid) throw new Error(`Fix the scene before image generation:\n${validation.errors.join("\n")}`);
  if (scene.layout.storyContract.visualStyle !== "presenter-teardown-vsl") {
    throw new Error("This Repo version supports Style B (presenter-teardown-vsl) only.");
  }
}

export function assertThreeDBreakdownVideoCallAllowed({
  approved,
  attempts,
  clipIndex,
  scene,
}: {
  approved: boolean;
  attempts: number;
  clipIndex: number;
  scene: ThreeDBreakdownAdScene;
}) {
  if (!approved) throw new Error("Approve this paid video clip before running the command.");
  if (attempts >= THREE_D_BREAKDOWN_REPO_VIDEO_ATTEMPT_LIMIT) {
    throw new Error(`The video attempt limit is ${THREE_D_BREAKDOWN_REPO_VIDEO_ATTEMPT_LIMIT}. Inspect the current result before spending again.`);
  }
  const validation = validateThreeDBreakdownScene(scene);
  if (!validation.valid) throw new Error(`Fix the scene before video generation:\n${validation.errors.join("\n")}`);
  if (scene.layout.storyContract.visualStyle !== "presenter-teardown-vsl") {
    throw new Error("This Repo version supports Style B (presenter-teardown-vsl) only.");
  }
  const clipPlans = scene.layout.clipPlans || [];
  if (!Number.isInteger(clipIndex) || !clipPlans.some((clip) => clip.clipIndex === clipIndex)) {
    throw new Error("Video clip must be one of the two approved clip plans.");
  }
  const requiredAnchors = getThreeDBreakdownRequiredAnchorFrameIndexes(scene);
  const frames = scene.layout.storyboardBoard?.frames || [];
  if (!requiredAnchors.every((frameIndex) => {
    const image = frames.find((frame) => frame.frameIndex === frameIndex)?.image;
    return image?.status === "ready" && Boolean(image.url);
  })) {
    throw new Error("Generate and inspect all four full-quality video endpoints before video.");
  }
  const clip = clipPlans.find((plan) => plan.clipIndex === clipIndex)!;
  if (clip.video?.status === "ready") throw new Error(`Video clip ${clipIndex} is already ready.`);
  if (clipIndex > 1) {
    const previous = clipPlans.find((plan) => plan.clipIndex === clipIndex - 1);
    if (previous?.video?.status !== "ready") throw new Error(`Generate and inspect video clip ${clipIndex - 1} before clip ${clipIndex}.`);
  }
}

export function getThreeDBreakdownRequiredAnchorFrameIndexes(scene: ThreeDBreakdownAdScene) {
  return Array.from(new Set(
    (scene.layout.clipPlans || [])
      .flatMap((clip) => [clip.frameIndexes[0], clip.frameIndexes.at(-1)])
      .filter((frameIndex) => frameIndex !== undefined),
  ));
}

export function inspectThreeDBreakdownRepoScene(
  scene: ThreeDBreakdownAdScene,
  mediaExists: (url: string) => boolean = () => true,
): ThreeDBreakdownRepoInspection {
  const validation = validateThreeDBreakdownScene(scene);
  const board = scene.layout.storyboardBoard;
  const requiredAnchorFrameIndexes = getThreeDBreakdownRequiredAnchorFrameIndexes(scene);
  const requiredAnchors = requiredAnchorFrameIndexes.map((frameIndex) => (
    board?.frames?.find((frame) => frame.frameIndex === frameIndex)?.image
  ));
  const missingProductionEndpointFrameIndexes = requiredAnchorFrameIndexes.filter((frameIndex) => {
    const image = board?.frames?.find((frame) => frame.frameIndex === frameIndex)?.image;
    return image?.status !== "ready" || !image.url || !mediaExists(image.url);
  });
  const clipPlans = scene.layout.clipPlans || [];
  const videoStarted = clipPlans.some((clip) => clip.video && clip.video.status !== "idle");
  const fourProductionEndpointsReady = requiredAnchorFrameIndexes.length === 4
    && requiredAnchors.every((image) => image?.status === "ready"
      && Boolean(image.url && mediaExists(image.url)));
  const twoVideoClipsReady = fourProductionEndpointsReady && clipPlans.length === 2
    && clipPlans.every((clip) => clip.video?.status === "ready"
      && Boolean(clip.video.url && mediaExists(clip.video.url)));
  const checks = {
    sceneContractValid: validation.valid,
    styleBSelected: scene.layout.storyContract.visualStyle === "presenter-teardown-vsl",
    fiveScriptBeats: scene.layout.scriptBeats.length === 5,
    sixStoryboardFrames: board?.frameCount === 6 && board.frames?.length === 6,
    twoTenSecondClipPlans: scene.layout.clipPlans?.length === 2
      && scene.layout.clipPlans.every((clip) => clip.durationSeconds === 10),
    storyboardReady: board?.image?.status === "ready"
      && Boolean(board.image.url && mediaExists(board.image.url)),
    fourProductionEndpointsReady,
    noVideoWasGenerated: !videoStarted && !scene.layout.finalVideo,
    twoVideoClipsReady,
  };
  const requiredChecks = [
    "sceneContractValid",
    "styleBSelected",
    "fiveScriptBeats",
    "sixStoryboardFrames",
    "twoTenSecondClipPlans",
    "storyboardReady",
    "fourProductionEndpointsReady",
  ];
  const problems = [
    ...validation.errors,
    ...Object.entries(checks)
      .filter(([name, passed]) => requiredChecks.includes(name) && !passed)
      .map(([name]) => `Check failed: ${name}.`),
    ...(missingProductionEndpointFrameIndexes.length
      ? [`Missing or unreadable full-quality production endpoints: frames ${missingProductionEndpointFrameIndexes.join(", ")}.`]
      : []),
    ...(videoStarted && missingProductionEndpointFrameIndexes.length
      ? ["Existing clips are not approved because they were created without all required full-quality endpoints."]
      : []),
    ...(videoStarted && !twoVideoClipsReady ? ["Check failed: twoVideoClipsReady."] : []),
  ];
  const imageReady = checks.storyboardReady && checks.fourProductionEndpointsReady;
  return {
    status: !validation.valid
      ? "invalid"
      : twoVideoClipsReady
        ? "clips-ready"
        : videoStarted
          ? "video-in-progress"
          : imageReady
            ? "ready-for-video"
            : "planned",
    checks,
    problems,
    requiredAnchorFrameIndexes,
  };
}
