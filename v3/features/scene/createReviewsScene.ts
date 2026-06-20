import type { ReviewsVariant } from "../formats/reviews/generate";
import { extractReviewBackgroundImages } from "../formats/reviews/evidence";
import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type ReviewsAdScene,
  type ReviewsProductAnchor,
  type ReviewsProofItem,
} from "./types";
import { pickSceneAccentColor } from "./createVisualizerScene";

const toProductAnchor = (
  product: NonNullable<StoredWebsiteResearchResult["productCatalog"]>["products"][number] | undefined,
): ReviewsProductAnchor | undefined => {
  if (!product) return undefined;
  return {
    title: product.title,
    handle: product.handle,
    url: product.url,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    isBestSeller: product.badges.includes("best-seller"),
  };
};

const pickReviewsProductAnchor = (
  research: StoredWebsiteResearchResult,
  proof: ReviewsProofItem,
  selectedProductHandles: string[],
) => {
  const products = research.productCatalog?.products || [];
  const sourceUrl = proof.sourceUrl || "";
  const selected = new Set(selectedProductHandles);
  return toProductAnchor(
    products.find((product) => product.url === sourceUrl || sourceUrl.includes(`/products/${product.handle}`)) ||
    products.find((product) => selected.has(product.handle)) ||
    products.find((product) => product.badges.includes("best-seller")) ||
    products[0],
  );
};

export const createReviewsAdScene = ({
  proofItems,
  research,
  variant,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  selectedProductHandles = [],
  now = Date.now(),
}: {
  proofItems: ReviewsProofItem[];
  research: StoredWebsiteResearchResult;
  variant: ReviewsVariant;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: ReviewsAdScene["metadata"]["provider"];
  selectedProductHandles?: string[];
  now?: number;
}): ReviewsAdScene => {
  const proof = proofItems[variant.proofIndex];
  if (!proof) throw new Error("Reviews scene proof item is missing.");
  const accentColor = pickSceneAccentColor(research.brand.colors);
  const productAnchor = pickReviewsProductAnchor(research, proof, selectedProductHandles);

  return {
    version: AD_SCENE_VERSION,
    format: "reviews",
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
      angleId: `reviews-${candidateIndex + 1}`,
      headline: variant.headline,
      subheadline: variant.proofText,
      ctaText: variant.ctaText || research.brandBrief.ctaDirection || "See proof",
      headlineType: "receipt_drop",
      selectedPain: research.brandBrief.buyerMoments[candidateIndex % Math.max(1, research.brandBrief.buyerMoments.length)] || research.brandBrief.audience,
      selectedProof: variant.proofText,
    },
    style: {
      backgroundColor: "#F8FAFC",
      textColor: "#0F172A",
      accentColor,
      fontFeel: research.brand.fonts.feel,
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "reviews-proof-card",
      proof,
      proofIndex: variant.proofIndex,
      proofTotal: proofItems.length,
      proofText: variant.proofText,
      headline: variant.headline,
      ctaText: variant.ctaText || research.brandBrief.ctaDirection || "See proof",
      productAnchor,
      backgroundImages: extractReviewBackgroundImages(research),
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
