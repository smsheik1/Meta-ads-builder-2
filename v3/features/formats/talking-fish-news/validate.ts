import type { TalkingFishNewsProofScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function validateTalkingFishNewsScene(scene: TalkingFishNewsProofScene): FormatValidationResult {
  const errors: string[] = [];
  const durationMs = scene.layout.durationMs;
  const script = scene.layout.beats.map((beat) => beat.line).join(" ");

  if (scene.format !== "talking-fish-news") errors.push("Talking Fish News format is invalid.");
  if (scene.layout.preset !== "talking-fish-news-report") errors.push("Talking Fish News preset is invalid.");
  if (!Number.isFinite(durationMs) || durationMs < 14000 || durationMs > 20000) {
    errors.push("Talking Fish News duration must be 14-20 seconds.");
  }
  if (scene.layout.beats.length !== 4) errors.push("Talking Fish News requires four report beats.");
  if (!scene.layout.beats[0]?.line.startsWith("Breaking news.")) {
    errors.push("Talking Fish News must start with Breaking news.");
  }
  if (wordCount(script) < 38 || wordCount(script) > 60) {
    errors.push("Talking Fish News script must be 38-60 words.");
  }
  if (!scene.layout.anchorOpenImageSrc.trim()) errors.push("Talking Fish News open-mouth anchor image is missing.");
  if (!scene.layout.anchorClosedImageSrc.trim()) errors.push("Talking Fish News closed-mouth anchor image is missing.");
  if (!scene.layout.stationName.trim()) errors.push("Talking Fish News station name is missing.");
  if (!scene.layout.linkText.trim()) errors.push("Talking Fish News final link is missing.");
  if (scene.backgroundMusic) errors.push("Talking Fish News proof cannot use a music bed.");
  if (scene.audio.status !== "generated" || !scene.audio.url) {
    errors.push("Talking Fish News narration is missing.");
  }

  let previousEnd = 0;
  for (const [index, beat] of scene.layout.beats.entries()) {
    if (!beat.line.trim()) errors.push(`Talking Fish News beat ${index + 1} line is missing.`);
    if (!beat.proofSrc.trim()) errors.push(`Talking Fish News beat ${index + 1} proof is missing.`);
    if (wordCount(beat.caption) < 2 || wordCount(beat.caption) > 7) {
      errors.push(`Talking Fish News beat ${index + 1} caption must be 2-7 words.`);
    }
    if (!Number.isFinite(beat.startMs) || !Number.isFinite(beat.endMs) || beat.startMs < previousEnd || beat.endMs <= beat.startMs) {
      errors.push(`Talking Fish News beat ${index + 1} timing is invalid.`);
    }
    previousEnd = beat.endMs;
  }
  if (previousEnd !== durationMs) errors.push("Talking Fish News beats must fill the full duration.");

  return { valid: errors.length === 0, errors };
}
