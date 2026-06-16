import type { VideoMemeAdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";
import { getVideoMemeTemplate } from "./templates";

export function validateVideoMemeScene(scene: VideoMemeAdScene): FormatValidationResult {
  const errors: string[] = [];
  const template = getVideoMemeTemplate(scene.layout.templateId);

  if (scene.format !== "video-meme") errors.push("Scene format must be video-meme.");
  if (scene.layout.preset !== "video-meme-template") errors.push("Video meme layout preset is invalid.");
  if (!template) errors.push("Video meme template is invalid.");
  if (template && scene.layout.videoSrc !== template.videoSrc) errors.push("Video meme video source is invalid.");
  if (scene.layout.captionPosition !== "top") errors.push("Video meme caption position is invalid.");
  if (!scene.creative?.headline?.trim()) errors.push("Video meme headline is missing.");
  if (template?.id === "pingu-noot-noot") {
    const setupText = scene.layout.slots.setupText || "";
    const dreadText = scene.layout.slots.dreadText || "";
    if (!setupText.trim()) errors.push("Pingu setup text is missing.");
    if (!dreadText.trim()) errors.push("Pingu dread text is missing.");
    if (setupText.length > template.captionMaxChars || dreadText.length > template.captionMaxChars) {
      errors.push("Pingu text is too long.");
    }
  } else {
    const caption = scene.layout.slots.caption || "";
    if (!caption.trim()) errors.push("Video meme caption is missing.");
    if (caption.length > (template?.captionMaxChars || 90)) errors.push("Video meme caption is too long.");
    if (template && template.patternPrefixes.length && !template.patternPrefixes.some((prefix) => caption.toLowerCase().startsWith(prefix.toLowerCase()))) {
      errors.push("Video meme caption does not match the selected template pattern.");
    }
  }
  if (!scene.layout.videoSrc?.trim()) errors.push("Video meme video source is missing.");
  if (!Number.isFinite(scene.layout.durationSeconds) || scene.layout.durationSeconds <= 0) errors.push("Video meme duration is invalid.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
