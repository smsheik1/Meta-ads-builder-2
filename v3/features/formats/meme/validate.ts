import type { MemeAdScene } from "../../scene/types";
import { getMemeTemplate } from "./templates";

export function validateMemeScene(scene: MemeAdScene) {
  const errors: string[] = [];
  if (scene.format !== "meme") errors.push("Scene format must be meme.");

  const template = getMemeTemplate(scene.layout.templateId);
  if (!template) {
    errors.push("Meme template is missing.");
  } else {
    for (const slot of template.slots) {
      const value = scene.layout.slots[slot.id];
      if (!value?.trim()) errors.push(`Meme slot ${slot.id} is missing.`);
    }
  }

  if (!scene.brand?.name?.trim()) errors.push("Meme brand is missing.");
  if (!scene.creative?.headline?.trim()) errors.push("Meme headline is missing.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
