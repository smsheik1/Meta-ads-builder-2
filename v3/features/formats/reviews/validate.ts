import type { ReviewsAdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";
import { normalizeProofText } from "./evidence";

const isVerbatimTrim = (proofText: string, sourceText: string) => {
  const proof = normalizeProofText(proofText).toLowerCase();
  const source = normalizeProofText(sourceText).toLowerCase();
  return Boolean(proof) && source.includes(proof);
};

export function validateReviewsScene(scene: ReviewsAdScene): FormatValidationResult {
  const errors: string[] = [];
  if (scene.format !== "reviews") errors.push("Reviews scene format is invalid.");
  if (scene.layout.preset !== "reviews-proof-card") errors.push("Reviews layout preset is invalid.");
  if (!scene.brand?.name?.trim()) errors.push("Reviews brand is missing.");
  if (!scene.layout.proof?.text?.trim()) errors.push("Reviews proof is missing.");
  if (!scene.layout.proofText?.trim()) errors.push("Reviews proof text is missing.");
  if (!isVerbatimTrim(scene.layout.proofText || "", scene.layout.proof?.text || "")) {
    errors.push("Reviews proof text must be verbatim from scraped proof.");
  }
  if (scene.layout.proof.provider !== "website") errors.push("Reviews proof provider is invalid.");
  if (!Number.isInteger(scene.layout.proofIndex) || scene.layout.proofIndex < 0) errors.push("Reviews proof index is invalid.");
  if (!scene.layout.headline?.trim()) errors.push("Reviews headline is missing.");
  if (!scene.layout.ctaText?.trim()) errors.push("Reviews CTA is missing.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.backgroundColor)) errors.push("Reviews background color must be a hex color.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.accentColor)) errors.push("Reviews accent color must be a hex color.");

  return {
    valid: errors.length === 0,
    errors,
  };
}
