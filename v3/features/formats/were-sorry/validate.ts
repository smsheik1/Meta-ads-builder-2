import type { WereSorryAdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";

export function validateWereSorryScene(scene: WereSorryAdScene): FormatValidationResult {
  const errors: string[] = [];
  if (scene.format !== "were-sorry") errors.push("Scene format must be were-sorry.");
  if (scene.layout.preset !== "were-sorry-poster") errors.push("We're sorry layout preset is invalid.");
  if (!scene.brand?.name?.trim()) errors.push("We're sorry brand is missing.");
  if (!scene.creative?.headline?.trim()) errors.push("We're sorry apology is missing.");
  if (!scene.creative?.subheadline?.trim()) errors.push("We're sorry make-good line is missing.");
  if (!scene.creative?.ctaText?.trim()) errors.push("We're sorry CTA is missing.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.backgroundColor)) errors.push("We're sorry background color must be a hex color.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.accentColor)) errors.push("We're sorry accent color must be a hex color.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
