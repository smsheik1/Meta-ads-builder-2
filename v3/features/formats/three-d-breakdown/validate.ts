import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownScriptBeatRole,
  ThreeDBreakdownShotRole,
} from "../../scene/types";
import type { FormatValidationResult } from "../types";
import { THREE_D_BREAKDOWN_DURATION_MS } from "./music";
import { THREE_D_REVEAL_PATTERNS, THREE_D_SCRIPT_BEATS, THREE_D_SHOT_CONTRACT, THREE_D_VISUAL_STYLES } from "./prompt";

export function validateThreeDBreakdownScene(scene: ThreeDBreakdownAdScene): FormatValidationResult {
  const errors: string[] = [];
  if (scene.format !== "three-d-breakdown") errors.push("3D Breakdown format is invalid.");
  if (scene.layout.preset !== "three-d-breakdown") errors.push("3D Breakdown preset is invalid.");
  if (scene.layout.durationMs !== THREE_D_BREAKDOWN_DURATION_MS) errors.push("3D Breakdown duration is invalid.");
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
  if (!THREE_D_VISUAL_STYLES.includes(scene.layout.storyContract?.visualStyle)) errors.push("3D Breakdown visual style is invalid.");
  if (!scene.layout.storyContract?.lighting?.trim()) errors.push("3D Breakdown story lighting is missing.");
  if (!scene.layout.storyContract?.cameraStyle?.trim()) errors.push("3D Breakdown story camera style is missing.");
  if (!Array.isArray(scene.layout.storyContract?.riskFlags)) errors.push("3D Breakdown risk flags must be an array.");
  if (!Array.isArray(scene.layout.storyContract?.recurringObjects) || !scene.layout.storyContract.recurringObjects.length) errors.push("3D Breakdown recurring objects are missing.");
  if (!THREE_D_REVEAL_PATTERNS.includes(scene.layout.storyContract?.wowMomentType)) errors.push("3D Breakdown wow moment pattern is invalid.");
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
  const expectedClipFrameIndexes = [[1, 2], [2, 3], [4, 5], [5, 6]];
  const expectedClipDuration = 5;
  if (!Array.isArray(scene.layout.clipPlans) || scene.layout.clipPlans.length !== expectedClipFrameIndexes.length) {
    errors.push(`3D Breakdown must define ${expectedClipFrameIndexes.length} clip plans.`);
  } else {
    scene.layout.clipPlans.forEach((clipPlan, index) => {
      if (clipPlan.clipIndex !== index + 1) errors.push(`3D Breakdown clip plan ${index + 1} index is invalid.`);
      if (clipPlan.durationSeconds !== expectedClipDuration) errors.push(`3D Breakdown clip plan ${index + 1} duration is invalid.`);
      if (!clipPlan.prompt?.trim()) errors.push(`3D Breakdown clip plan ${index + 1} prompt is missing.`);
      const expectedFrames = expectedClipFrameIndexes[index];
      if (JSON.stringify(clipPlan.frameIndexes) !== JSON.stringify(expectedFrames)) {
        errors.push(`3D Breakdown clip plan ${index + 1} frame mapping is invalid.`);
      }
    });
  }

  if (!Array.isArray(scene.layout.scriptBeats) || scene.layout.scriptBeats.length !== THREE_D_SCRIPT_BEATS.length) {
    errors.push("3D Breakdown script beats are invalid.");
  } else {
    scene.layout.scriptBeats.forEach((beat, index) => {
      const contract = THREE_D_SCRIPT_BEATS[index];
      if (!contract) return;
      if (beat.role !== contract.role as ThreeDBreakdownScriptBeatRole) errors.push(`3D Breakdown beat ${index + 1} role is invalid.`);
      if (beat.startMs !== contract.startMs || beat.endMs !== contract.endMs) errors.push(`3D Breakdown beat ${index + 1} timing is invalid.`);
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
