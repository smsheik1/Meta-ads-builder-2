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
  if (
    scene.layout.speechSegments.length === 0
    || scene.layout.speechSegments.some((segment) => (
      !Number.isFinite(segment.startMs)
      || !Number.isFinite(segment.endMs)
      || segment.startMs < 0
      || segment.endMs <= segment.startMs
      || segment.endMs > durationMs
    ))
  ) {
    errors.push("Talking Fish News speech timing is invalid.");
  }
  if (!scene.layout.stationName.trim()) errors.push("Talking Fish News station name is missing.");
  if (!scene.layout.linkText.trim()) errors.push("Talking Fish News final link is missing.");
  if (!scene.layout.musicBed.src.trim()) errors.push("Talking Fish News theme music is missing.");
  if (scene.layout.musicBed.volume !== 0.11) errors.push("Talking Fish News theme music volume is invalid.");
  if (scene.layout.musicBed.loop !== true) errors.push("Talking Fish News theme music must loop.");
  if (scene.backgroundMusic) errors.push("Talking Fish News cannot add a second music bed.");
  if (scene.audio.status !== "generated" || !scene.audio.url) {
    errors.push("Talking Fish News narration is missing.");
  } else {
    const captionText = scene.audio.captions.map((caption) => caption.text).join(" ");
    if (captionText !== scene.audio.transcript) {
      errors.push("Talking Fish News captions must match the narration exactly.");
    }
    if (
      scene.audio.captions.length === 0
      || scene.audio.captions.some((caption) => (
        wordCount(caption.text) > 7
        || caption.startMs < 0
        || caption.endMs <= caption.startMs
        || caption.endMs > durationMs
      ))
    ) {
      errors.push("Talking Fish News caption timing is invalid.");
    }
  }

  let previousEnd = 0;
  for (const [index, beat] of scene.layout.beats.entries()) {
    if (!beat.line.trim()) errors.push(`Talking Fish News beat ${index + 1} line is missing.`);
    if (!beat.proofSrc.trim()) errors.push(`Talking Fish News beat ${index + 1} proof is missing.`);
    if (!Number.isFinite(beat.startMs) || !Number.isFinite(beat.endMs) || beat.startMs < previousEnd || beat.endMs <= beat.startMs) {
      errors.push(`Talking Fish News beat ${index + 1} timing is invalid.`);
    }
    previousEnd = beat.endMs;
  }
  if (previousEnd !== durationMs) errors.push("Talking Fish News beats must fill the full duration.");

  return { valid: errors.length === 0, errors };
}
