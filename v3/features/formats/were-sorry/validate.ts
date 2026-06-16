import type { WereSorryAdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";

export function validateWereSorryScene(scene: WereSorryAdScene): FormatValidationResult {
  const errors: string[] = [];
  if (scene.format !== "were-sorry") errors.push("Scene format must be were-sorry.");
  if (scene.layout.preset !== "were-sorry-poster") errors.push("We're sorry layout preset is invalid.");
  if (!scene.brand?.name?.trim()) errors.push("We're sorry brand is missing.");
  if (!scene.layout.apologyHeader?.trim()) errors.push("We're sorry apology header is missing.");
  if (!scene.layout.legalOpener?.trim()) errors.push("We're sorry legal opener is missing.");
  if (!scene.layout.signoff?.trim()) errors.push("We're sorry signoff is missing.");
  if (!Array.isArray(scene.layout.confessions) || scene.layout.confessions.length < 2) {
    errors.push("We're sorry confessions are missing.");
  }
  if (!scene.creative?.ctaText?.trim()) errors.push("We're sorry CTA is missing.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.backgroundColor)) errors.push("We're sorry background color must be a hex color.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.accentColor)) errors.push("We're sorry accent color must be a hex color.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
