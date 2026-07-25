import type {
  ThreeDBreakdownAdScene,
  ThreeDBreakdownScriptBeatRole,
  ThreeDBreakdownShotRole,
} from "../../scene/types";
import type { FormatValidationResult } from "../types";
import {
  THREE_D_BREAKDOWN_DURATION_MS,
  THREE_D_BREAKDOWN_LEGACY_DURATION_MS,
  THREE_D_MAX_SCRIPT_WORDS,
  THREE_D_MIN_SCRIPT_WORDS,
  THREE_D_LEGACY_SCRIPT_BEATS,
  THREE_D_REVEAL_PATTERNS,
  THREE_D_SCRIPT_BEATS,
  THREE_D_SHOT_CONTRACT,
  THREE_D_VISUAL_STYLES,
} from "./prompt";
import { getThreeDBreakdownCtaError } from "./cta";
import { isThreeDBreakdownEvidenceForProduct } from "./evidence";

const scriptBeatContracts = [THREE_D_SCRIPT_BEATS, THREE_D_LEGACY_SCRIPT_BEATS] as const;
const countWords = (value: string) => (
  value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?/g)?.length || 0
);
const sentenceCount = (value: string) => {
  const sentences = value
    .replace(/\d[.,]\d/g, "0")
    .split(/[.!?]+(?=\s|$)/)
    .map((part) => part.trim())
    .filter(Boolean);
  return Math.max(1, sentences.length);
};
const requestsGeneratedText = (value: string | undefined) => {
  if (!value) return false;
  const withoutNegativeRules = value.replace(
    /\b(?:no|without|avoid|never|do not|don't)\b[^.!?\n]{0,80}\b(?:text|caption|headline|cta|logo|label|letters|numbers|typography)\b/gi,
    "",
  );
  return /\b(?:render|generate|write|spell|display|include|add)\b[^.!?\n]{0,60}\b(?:readable\s+)?(?:text|caption|headline|cta|logo|label|letters|numbers|typography)\b/i
    .test(withoutNegativeRules);
};

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
    if (scene.layout.storyContract.storySubject?.kind === "product") {
      if (!isThreeDBreakdownEvidenceForProduct(scene.layout.groundedEvidence, scene.layout.productAnchor)) {
        errors.push("3D Breakdown selected product evidence belongs to a different product or page.");
      }
    }
  }
  if (!scene.layout.storyContract?.visualWorld?.trim()) errors.push("3D Breakdown story visual world is missing.");
  if (!isLegacyScene && !THREE_D_VISUAL_STYLES.includes(scene.layout.storyContract?.visualStyle)) errors.push("3D Breakdown visual style is invalid.");
  if (!scene.layout.storyContract?.lighting?.trim()) errors.push("3D Breakdown story lighting is missing.");
  if (!scene.layout.storyContract?.cameraStyle?.trim()) errors.push("3D Breakdown story camera style is missing.");
  if (!Array.isArray(scene.layout.storyContract?.riskFlags)) errors.push("3D Breakdown risk flags must be an array.");
  if (!Array.isArray(scene.layout.storyContract?.recurringObjects) || !scene.layout.storyContract.recurringObjects.length) errors.push("3D Breakdown recurring objects are missing.");
  const usesActiveRevealPattern = THREE_D_REVEAL_PATTERNS.some((pattern) => pattern === scene.layout.storyContract?.wowMomentType);
  if (!usesActiveRevealPattern) errors.push("3D Breakdown wow moment pattern is invalid.");
  if (scene.layout.finalVideo) {
    if (scene.layout.finalVideo.status !== "ready") errors.push("3D Breakdown final video status is invalid.");
    if (!scene.layout.finalVideo.url?.trim()) errors.push("3D Breakdown final video URL is missing.");
    if (!scene.layout.finalVideo.storageId?.trim()) errors.push("3D Breakdown final video storage is missing.");
    if (scene.layout.finalVideo.durationMs !== undefined && scene.layout.finalVideo.durationMs !== scene.layout.durationMs) errors.push("3D Breakdown final video duration is invalid.");
  }
  if (scene.layout.storyboardBoard) {
    if (scene.layout.storyboardBoard.frameCount !== 6) errors.push("3D Breakdown storyboard board must have 6 frames.");
    if (!scene.layout.storyboardBoard.imagePrompt?.trim()) errors.push("3D Breakdown storyboard board image prompt is missing.");
    if (scene.layout.storyboardBoard.creativePrompt !== undefined && !scene.layout.storyboardBoard.creativePrompt.trim()) errors.push("3D Breakdown storyboard creative prompt is missing.");
    if (requestsGeneratedText(scene.layout.storyboardBoard.imagePrompt) || requestsGeneratedText(scene.layout.storyboardBoard.creativePrompt)) {
      errors.push("3D Breakdown storyboard prompt must not request generated readable text.");
    }
    if (!Array.isArray(scene.layout.storyboardBoard.frames) || scene.layout.storyboardBoard.frames.length !== 6) {
      errors.push("3D Breakdown storyboard board must define 6 panel frames.");
	    } else {
	      scene.layout.storyboardBoard.frames.forEach((frame, index) => {
	        if (frame.frameIndex !== index + 1) errors.push(`3D Breakdown storyboard frame ${index + 1} index is invalid.`);
	        if (!frame.label?.trim()) errors.push(`3D Breakdown storyboard frame ${index + 1} label is missing.`);
	        if (!frame.visual?.trim()) errors.push(`3D Breakdown storyboard frame ${index + 1} visual is missing.`);
	        if (!frame.camera?.trim()) errors.push(`3D Breakdown storyboard frame ${index + 1} camera is missing.`);
	        if (!frame.motion?.trim()) errors.push(`3D Breakdown storyboard frame ${index + 1} motion is missing.`);
	        if (frame.anchorPrompt !== undefined && !frame.anchorPrompt.trim()) errors.push(`3D Breakdown storyboard frame ${index + 1} anchor prompt is missing.`);
	        if (requestsGeneratedText(frame.anchorPrompt)) errors.push(`3D Breakdown storyboard frame ${index + 1} prompt must not request generated readable text.`);
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
      if (requestsGeneratedText(clipPlan.prompt)) errors.push(`3D Breakdown clip plan ${index + 1} prompt must not request generated readable text.`);
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
      if (!isLegacyScene && sentenceCount(beat.narration) !== 1) errors.push(`3D Breakdown beat ${index + 1} must be one sentence.`);
    });
    if (!isLegacyScene) {
      const scriptWordCount = countWords(scene.layout.scriptBeats.map((beat) => beat.narration).join(" "));
      if (scriptWordCount < THREE_D_MIN_SCRIPT_WORDS || scriptWordCount > THREE_D_MAX_SCRIPT_WORDS) {
        errors.push(`3D Breakdown script must have ${THREE_D_MIN_SCRIPT_WORDS}-${THREE_D_MAX_SCRIPT_WORDS} words.`);
      }
      const ctaError = getThreeDBreakdownCtaError(
        scene.creative.ctaText || scene.layout.scriptBeats[4]?.narration,
        scene.layout.storyContract.storySubject?.kind,
      );
      if (ctaError) errors.push(`3D Breakdown ${ctaError}`);
    }
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
      if (requestsGeneratedText(shot.imagePrompt)) errors.push(`3D Breakdown shot ${index + 1} image prompt must not request generated readable text.`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
