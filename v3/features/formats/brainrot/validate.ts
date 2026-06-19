import type { BrainrotAdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";
import { BRAINROT_MAX_BEAT_CHARS, BRAINROT_MAX_BEATS, BRAINROT_MIN_BEATS } from "./prompt";

export function validateBrainrotScene(scene: BrainrotAdScene): FormatValidationResult {
  const errors: string[] = [];
  const beats = scene.layout.beats || [];

  if (scene.format !== "brainrot") errors.push("Brainrot scene format is invalid.");
  if (scene.layout.preset !== "brainrot-dialogue") errors.push("Brainrot layout preset is invalid.");
  if (!scene.layout.backgroundVideoSrc?.trim()) errors.push("Brainrot background video is missing.");
  if (!scene.layout.characters?.leftSpriteSrc?.trim() || !scene.layout.characters?.rightSpriteSrc?.trim()) {
    errors.push("Brainrot character sprites are missing.");
  }
  if (beats.length < BRAINROT_MIN_BEATS || beats.length > BRAINROT_MAX_BEATS) {
    errors.push("Brainrot beat count is invalid.");
  }
  if (!beats.some((beat) => beat.speaker === "left") || !beats.some((beat) => beat.speaker === "right")) {
    errors.push("Brainrot script must include both speakers.");
  }
  if (beats.some((beat) => beat.speaker !== "left" && beat.speaker !== "right")) errors.push("Brainrot speaker is invalid.");
  if (beats.some((beat) => !beat.text.trim())) errors.push("Brainrot beat text is missing.");
  if (beats.some((beat) => beat.text.length > BRAINROT_MAX_BEAT_CHARS)) errors.push("Brainrot beat text is too long.");
  if (!Number.isFinite(scene.layout.beatGapMs) || scene.layout.beatGapMs < 0) errors.push("Brainrot beat gap is invalid.");

  return { valid: errors.length === 0, errors };
}
