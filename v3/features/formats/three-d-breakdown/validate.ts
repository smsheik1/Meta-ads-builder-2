import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownScriptBeatRole,
  ThreeDBreakdownShotRole,
} from "../../scene/types";
import type { FormatValidationResult } from "../types";
import {
  THREE_D_BREAKDOWN_DURATION_MS,
  THREE_D_BREAKDOWN_LEGACY_DURATION_MS,
  THREE_D_LEGACY_SCRIPT_BEATS,
  THREE_D_REVEAL_PATTERNS,
  THREE_D_SCRIPT_BEATS,
  THREE_D_SHOT_CONTRACT,
  THREE_D_VISUAL_STYLES,
} from "./prompt";

const scriptBeatContracts = [THREE_D_SCRIPT_BEATS, THREE_D_LEGACY_SCRIPT_BEATS] as const;

export function validateThreeDBreakdownScene(scene: ThreeDBreakdownAdScene): FormatValidationResult {
  const errors: string[] = [];
  const isLegacyScene = scene.layout.durationMs === THREE_D_BREAKDOWN_LEGACY_DURATION_MS;
  if (scene.format !== "three-d-breakdown") errors.push("3D Breakdown format is invalid.");
  if (scene.layout.preset !== "three-d-breakdown") errors.push("3D Breakdown preset is invalid.");
  if (scene.layout.durationMs !== THREE_D_BREAKDOWN_DURATION_MS && !isLegacyScene) errors.push("3D Breakdown duration is invalid.");
  if (!scene.layout.groundedEvidence?.text?.trim()) errors.push("3D Breakdown grounded evidence is missing.");
  if (!scene.layout.groundedEvidence?.sourceUrl?.trim()) errors.push("3D Breakdown grounded evidence source URL is missing.");
  if (!scene.layout.groundedEvidence?.evidenceUseType) errors.push("3D Breakdown grounded evidence use type is missing.");
  if (!scene.layout.groundedEvidence?.scrapedAt) errors.push("3D Breakdown grounded evidence timestamp is missing.");
  if (scene.layout.productAnchor) {
    if (!scene.layout.productAnchor.title?.trim()) errors.push("3D Breakdown product anchor title is missing.");
    if (!scene.layout.productAnchor.url?.trim()) errors.push("3D Breakdown product anchor URL is missing.");
    if (!scene.layout.productAnchor.imageUrl?.trim()) errors.push("3D Breakdown product anchor image is missing.");
  }
  if (!scene.layout.storyContract?.visualWorld?.trim()) errors.push("3D Breakdown story visual world is missing.");
  if (!isLegacyScene && !THREE_D_VISUAL_STYLES.includes(scene.layout.storyContract?.visualStyle)) errors.push("3D Breakdown visual style is invalid.");
  if (!scene.layout.storyContract?.lighting?.trim()) errors.push("3D Breakdown story lighting is missing.");
  if (!scene.layout.storyContract?.cameraStyle?.trim()) errors.push("3D Breakdown story camera style is missing.");
  if (!Array.isArray(scene.layout.storyContract?.riskFlags)) errors.push("3D Breakdown risk flags must be an array.");
  if (!Array.isArray(scene.layout.storyContract?.recurringObjects) || !scene.layout.storyContract.recurringObjects.length) errors.push("3D Breakdown recurring objects are missing.");
  const usesActiveRevealPattern = THREE_D_REVEAL_PATTERNS.some((pattern) => pattern === scene.layout.storyContract?.wowMomentType);
  if (!usesActiveRevealPattern && scene.layout.storyContract?.wowMomentType !== "proof-blocks") errors.push("3D Breakdown wow moment pattern is invalid.");
  if (scene.layout.finalVideo) {
    if (scene.layout.finalVideo.status !== "ready") errors.push("3D Breakdown final video status is invalid.");
    if (!scene.layout.finalVideo.url?.trim()) errors.push("3D Breakdown final video URL is missing.");
    if (!scene.layout.finalVideo.storageId?.trim()) errors.push("3D Breakdown final video storage is missing.");
    if (scene.layout.finalVideo.durationMs !== undefined && scene.layout.finalVideo.durationMs !== scene.layout.durationMs) errors.push("3D Breakdown final video duration is invalid.");
  }
  if (scene.layout.storyboardBoard) {
    if (scene.layout.storyboardBoard.frameCount !== 6) errors.push("3D Breakdown storyboard board must have 6 frames.");
    if (!scene.layout.storyboardBoard.imagePrompt?.trim()) errors.push("3D Breakdown storyboard board image prompt is missing.");
    if (!Array.isArray(scene.layout.storyboardBoard.frames) || scene.layout.storyboardBoard.frames.length !== 6) {
      errors.push("3D Breakdown storyboard board must define 6 panel frames.");
	    } else {
	      scene.layout.storyboardBoard.frames.forEach((frame, index) => {
	        if (frame.frameIndex !== index + 1) errors.push(`3D Breakdown storyboard frame ${index + 1} index is invalid.`);
	        if (!frame.label?.trim()) errors.push(`3D Breakdown storyboard frame ${index + 1} label is missing.`);
	      });
	    }
	  }
  const isPresenterStyle = scene.layout.storyContract?.visualStyle === "presenter-teardown-vsl";
  const expectedClipFrameIndexes = isPresenterStyle ? [[1, 2, 3], [4, 5, 6]] : [[1, 2], [2, 3], [4, 5], [5, 6]];
  const expectedClipTimings = isPresenterStyle
    ? [[0, 10_000], [10_000, 20_000]]
    : [[0, 5_000], [5_000, 10_000], [10_000, 15_000], [15_000, 20_000]];
  const expectedClipDuration = isPresenterStyle ? 10 : 5;
  if (isLegacyScene && !scene.layout.clipPlans) {
    // Existing shared scenes predate storyboard clip plans and remain viewable.
  } else if (!Array.isArray(scene.layout.clipPlans) || scene.layout.clipPlans.length !== expectedClipFrameIndexes.length) {
    errors.push(`3D Breakdown must define ${expectedClipFrameIndexes.length} clip plans.`);
  } else {
    scene.layout.clipPlans.forEach((clipPlan, index) => {
      if (clipPlan.clipIndex !== index + 1) errors.push(`3D Breakdown clip plan ${index + 1} index is invalid.`);
      if (clipPlan.durationSeconds !== expectedClipDuration) errors.push(`3D Breakdown clip plan ${index + 1} duration is invalid.`);
      if (!clipPlan.prompt?.trim()) errors.push(`3D Breakdown clip plan ${index + 1} prompt is missing.`);
      const expectedFrames = expectedClipFrameIndexes[index];
      const expectedTiming = expectedClipTimings[index];
      if (JSON.stringify(clipPlan.frameIndexes) !== JSON.stringify(expectedFrames)) {
        errors.push(`3D Breakdown clip plan ${index + 1} frame mapping is invalid.`);
      }
      if (expectedTiming && (clipPlan.startMs !== expectedTiming[0] || clipPlan.endMs !== expectedTiming[1])) {
        errors.push(`3D Breakdown clip plan ${index + 1} timing is invalid.`);
      }
    });
  }

  if (!Array.isArray(scene.layout.scriptBeats) || scene.layout.scriptBeats.length !== THREE_D_SCRIPT_BEATS.length) {
    errors.push("3D Breakdown script beats are invalid.");
  } else {
    const matchingContract = scriptBeatContracts.find((contract) => (
      scene.layout.scriptBeats.every((beat, index) => {
        const expected = contract[index];
        return expected && beat.role === expected.role && beat.startMs === expected.startMs && beat.endMs === expected.endMs;
      })
    ));
    scene.layout.scriptBeats.forEach((beat, index) => {
      const contract = matchingContract?.[index] || THREE_D_SCRIPT_BEATS[index];
      if (!contract) return;
      if (beat.role !== contract.role as ThreeDBreakdownScriptBeatRole) errors.push(`3D Breakdown beat ${index + 1} role is invalid.`);
      if (!matchingContract && (beat.startMs !== contract.startMs || beat.endMs !== contract.endMs)) errors.push(`3D Breakdown beat ${index + 1} timing is invalid.`);
      if (!beat.narration?.trim()) errors.push(`3D Breakdown beat ${index + 1} narration is missing.`);
    });
  }

  if (!Array.isArray(scene.layout.shots) || scene.layout.shots.length !== THREE_D_SHOT_CONTRACT.length) {
    errors.push("3D Breakdown visual shots are invalid.");
  } else {
    scene.layout.shots.forEach((shot, index) => {
      const contract = THREE_D_SHOT_CONTRACT[index];
      if (!contract) return;
      if (shot.shotIndex !== contract.shotIndex) errors.push(`3D Breakdown shot ${index + 1} index is invalid.`);
      if (shot.role !== contract.role as ThreeDBreakdownShotRole) errors.push(`3D Breakdown shot ${index + 1} role is invalid.`);
      if (!shot.captionText?.trim()) errors.push(`3D Breakdown shot ${index + 1} caption is missing.`);
      if (!shot.sceneDescription?.trim()) errors.push(`3D Breakdown shot ${index + 1} scene description is missing.`);
      if (!shot.explainerDevice?.trim()) errors.push(`3D Breakdown shot ${index + 1} explainer device is missing.`);
      if (!shot.physicalAction?.trim()) errors.push(`3D Breakdown shot ${index + 1} physical action is missing.`);
      if (!shot.imagePrompt?.trim()) errors.push(`3D Breakdown shot ${index + 1} image prompt is missing.`);
      if (!shot.animationPrompt?.trim()) errors.push(`3D Breakdown shot ${index + 1} animation prompt is missing.`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
