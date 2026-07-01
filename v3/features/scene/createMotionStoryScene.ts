import type { MotionStoryVariant } from "../formats/motion-story/generate";
import { getMotionStoryMusicBed, getMotionStoryMusicBedId } from "../formats/motion-story/music";
import type { MotionStoryStrongProof } from "../formats/motion-story/proof";
import type { ProductCatalogItem, StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type MotionStoryAdScene,
} from "./types";
import { pickSceneAccentColor } from "./createVisualizerScene";

export const createMotionStoryAdScene = ({
  candidateIndex,
  count,
  cutoutUrl,
  generationBatchId,
  model,
  now = Date.now(),
  product,
  proofItems,
  provider,
  research,
  selectedProductHandles = [],
  variant,
}: {
  candidateIndex: number;
  count: number;
  cutoutUrl: string;
  generationBatchId: string;
  model: string;
  now?: number;
  product: ProductCatalogItem;
  proofItems: MotionStoryStrongProof[];
  provider: MotionStoryAdScene["metadata"]["provider"];
  research: StoredWebsiteResearchResult;
  selectedProductHandles?: string[];
  variant: MotionStoryVariant;
}): MotionStoryAdScene => {
  const proof = proofItems.find((item) => item.proofIndex === variant.proofIndex);
  if (!proof) throw new Error("Motion Story proof item is missing.");
  const accentColor = pickSceneAccentColor(research.brand.colors);
  const musicBedId = getMotionStoryMusicBedId(candidateIndex, count);
  const musicBed = getMotionStoryMusicBed(musicBedId);
  const ctaBeat = variant.beats.find((beat) => beat.role === "cta");
  const hookBeat = variant.beats.find((beat) => beat.role === "hook");

  return {
    version: AD_SCENE_VERSION,
    format: "motion-story",
    brand: {
      ...research.brand,
      receipts: {
        specificClaims: research.brandBrief.proof,
        buyerMoments: research.brandBrief.buyerMoments,
        exactSiteLanguage: research.brandBrief.siteLanguage,
        namedProof: research.evidence.receipts.namedProof,
      },
    },
    creative: {
      angleId: `motion-story-${candidateIndex + 1}`,
      headline: hookBeat?.headline || variant.hookAngle,
      subheadline: variant.proofDisplayText,
      ctaText: ctaBeat?.headline || research.brandBrief.ctaDirection || "Shop now",
      headlineType: "receipt_drop",
      selectedPain: variant.hookAngle,
      selectedProof: variant.proofDisplayText,
    },
    style: {
      backgroundColor: "#070B1D",
      textColor: "#FFFFFF",
      accentColor,
      fontFeel: research.brand.fonts.feel,
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "motion-story-product",
      durationMs: 20_000,
      product: {
        title: product.title,
        handle: product.handle,
        imageUrl: product.imageUrl || "",
        cutoutUrl,
        ...(product.url ? { url: product.url } : {}),
        isBestSeller: product.badges.includes("best-seller"),
      },
      proof: {
        originalText: proof.text,
        displayText: variant.proofDisplayText,
        ...(proof.sourceName ? { sourceName: proof.sourceName } : {}),
        ...(proof.rating ? { rating: proof.rating } : {}),
        proofIndex: proof.proofIndex,
        strengthReason: variant.proofStrengthReason || proof.strengthReason,
      },
      beats: variant.beats,
      brandLockup: {
        ...(research.brand.logoUrl ? { logoUrl: research.brand.logoUrl } : {}),
        fallbackText: research.brandBrief.brandName || research.brand.name,
      },
      musicBed,
      shareCopy: variant.shareCopy,
    },
    metadata: {
      candidateIndex,
      generationBatchId,
      researchRunId: research.researchRunId,
      brandSnapshotId: research.brandSnapshotId,
      model,
      provider,
      generatedAt: now,
      adAngles: research.adAngles || [],
      selectedProductHandles,
    },
  };
};
