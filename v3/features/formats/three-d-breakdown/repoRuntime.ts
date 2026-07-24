import type { ThreeDBreakdownAdScene } from "../../scene/types";
import { validateThreeDBreakdownScene } from "./validate";

export type ThreeDBreakdownRepoStage = "plan" | "images" | "voice" | "video";

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
  status: "invalid" | "planned" | "ready-for-video";
  checks: Record<string, boolean>;
  problems: string[];
  requiredAnchorFrameIndexes: number[];
};

export const THREE_D_BREAKDOWN_REPO_IMAGE_ATTEMPT_LIMIT = 3;

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

export function getThreeDBreakdownRequiredAnchorFrameIndexes(scene: ThreeDBreakdownAdScene) {
  return Array.from(new Set(
    (scene.layout.clipPlans || [])
      .map((clip) => clip.frameIndexes[0])
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
  const checks = {
    sceneContractValid: validation.valid,
    styleBSelected: scene.layout.storyContract.visualStyle === "presenter-teardown-vsl",
    fiveScriptBeats: scene.layout.scriptBeats.length === 5,
    sixStoryboardFrames: board?.frameCount === 6 && board.frames?.length === 6,
    twoTenSecondClipPlans: scene.layout.clipPlans?.length === 2
      && scene.layout.clipPlans.every((clip) => clip.durationSeconds === 10),
    storyboardReady: board?.image?.status === "ready"
      && Boolean(board.image.url && mediaExists(board.image.url)),
    twoProductionAnchorsReady: requiredAnchorFrameIndexes.length === 2
      && requiredAnchors.every((image) => image?.status === "ready"
        && Boolean(image.url && mediaExists(image.url))),
    noVideoWasGenerated: !scene.layout.clipPlans?.some((clip) => clip.video?.status === "ready")
      && !scene.layout.finalVideo,
  };
  const problems = [
    ...validation.errors,
    ...Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => `Check failed: ${name}.`),
  ];
  const imageReady = checks.storyboardReady && checks.twoProductionAnchorsReady;
  return {
    status: !validation.valid ? "invalid" : imageReady ? "ready-for-video" : "planned",
    checks,
    problems,
    requiredAnchorFrameIndexes,
  };
}
