import type { MotionStoryAdScene, MotionStoryBeatMotion, MotionStoryBeatRole } from "../../scene/types";
import type { FormatValidationResult } from "../types";
import { MOTION_STORY_DURATION_MS, MOTION_STORY_MUSIC_BEDS } from "./music";

const beatContract: Array<{ role: MotionStoryBeatRole; motion: MotionStoryBeatMotion; startMs: number; endMs: number }> = [
  { role: "hook", motion: "kinetic-reveal", startMs: 0, endMs: 3000 },
  { role: "product", motion: "image-expand", startMs: 3000, endMs: 8000 },
  { role: "proof", motion: "proof-card", startMs: 8000, endMs: 16000 },
  { role: "cta", motion: "cta-slam", startMs: 16000, endMs: 20000 },
];

export function validateMotionStoryScene(scene: MotionStoryAdScene): FormatValidationResult {
  const errors: string[] = [];
  if (scene.format !== "motion-story") errors.push("Motion Story format is invalid.");
  if (scene.layout.preset !== "motion-story-product") errors.push("Motion Story preset is invalid.");
  if (scene.layout.durationMs !== MOTION_STORY_DURATION_MS) errors.push("Motion Story duration is invalid.");
  if (!scene.layout.product?.title?.trim()) errors.push("Motion Story product title is missing.");
  if (!scene.layout.product?.imageUrl?.trim()) errors.push("Motion Story product image is missing.");
  if (!scene.layout.product?.cutoutUrl?.trim()) errors.push("Motion Story product cutout is missing.");
  if (!scene.layout.proof?.originalText?.trim()) errors.push("Motion Story original proof is missing.");
  if (!scene.layout.proof?.displayText?.trim()) errors.push("Motion Story display proof is missing.");
  if (!scene.layout.proof?.strengthReason?.trim()) errors.push("Motion Story proof strength reason is missing.");
  if (!scene.layout.shareCopy?.trim()) errors.push("Motion Story share copy is missing.");
  if (!scene.layout.brandLockup?.fallbackText?.trim()) errors.push("Motion Story brand lockup is missing.");
  if (!scene.layout.musicBed?.id || !MOTION_STORY_MUSIC_BEDS[scene.layout.musicBed.id]) errors.push("Motion Story music bed is invalid.");
  if (!scene.layout.musicBed?.src?.trim()) errors.push("Motion Story music bed source is missing.");
  if (scene.layout.musicBed?.volume !== 0.18) errors.push("Motion Story music bed volume is invalid.");
  if (scene.layout.musicBed?.loop !== true) errors.push("Motion Story music bed must loop.");

  if (!Array.isArray(scene.layout.beats) || scene.layout.beats.length !== beatContract.length) {
    errors.push("Motion Story beats are invalid.");
  } else {
    scene.layout.beats.forEach((beat, index) => {
      const contract = beatContract[index];
      if (!contract) return;
      if (beat.role !== contract.role) errors.push(`Motion Story beat ${index + 1} role is invalid.`);
      if (beat.motion !== contract.motion) errors.push(`Motion Story beat ${index + 1} motion is invalid.`);
      if (beat.startMs !== contract.startMs || beat.endMs !== contract.endMs) errors.push(`Motion Story beat ${index + 1} timing is invalid.`);
      if (!beat.headline?.trim()) errors.push(`Motion Story beat ${index + 1} headline is missing.`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
