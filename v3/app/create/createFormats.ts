import type { AdFormatId } from "@/features/scene/types";

export const PRODUCT_PHOTOSHOOT_FORMAT = "product-photoshoot" as const;

export type CreateFormatId = AdFormatId | typeof PRODUCT_PHOTOSHOOT_FORMAT;

export function isComingSoonCreateFormat(format: CreateFormatId) {
  return format === "motion-story";
}

export function isAdSceneCreateFormat(format: CreateFormatId): format is AdFormatId {
  return format !== PRODUCT_PHOTOSHOOT_FORMAT;
}
