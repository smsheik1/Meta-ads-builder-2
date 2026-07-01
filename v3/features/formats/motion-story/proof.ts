import type { StoredWebsiteResearchResult } from "../../research/types";
import type { ReviewsProofItem } from "../../scene/types";
import { extractWebsiteReviewProofItems, fetchWebsiteReviewProofItems, normalizeProofText } from "../reviews/evidence";

export type MotionStoryStrongProof = ReviewsProofItem & {
  proofIndex: number;
  traits: string[];
  strengthReason: string;
};

const vagueProofPatterns = [
  /^"?great product\.?"?$/i,
  /^"?yum\.?"?$/i,
  /^"?good quality\.?"?$/i,
  /^"?fast shipping\.?"?$/i,
  /^"?delicious\.?"?$/i,
];

const traitChecks: Array<{ id: string; label: string; test: (text: string, productTitle: string) => boolean }> = [
  {
    id: "product",
    label: "product-specific detail",
    test: (text, productTitle) => {
      const productWords = productTitle.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
      return productWords.some((word) => text.includes(word)) || /\b(cookie|cookies|brownie|brownies|cake|cheesecake|tin|box|gift|product|item)\b/.test(text);
    },
  },
  {
    id: "emotion",
    label: "emotional reaction",
    test: (text) => /\b(love|loved|obsessed|happy|thrilled|amazing|favorite|best|perfect|cried|crying|excited|delighted)\b/.test(text),
  },
  {
    id: "use-case",
    label: "use-case or gifting context",
    test: (text) => /\b(gift|birthday|party|holiday|office|family|mom|dad|kids|client|thank you|occasion|event|sent|shared)\b/.test(text),
  },
  {
    id: "quality",
    label: "freshness, quality, or shipping detail",
    test: (text) => /\b(fresh|arrived|delivered|shipping|shipped|packed|packaging|quality|homemade|melt|soft|warm|flavor|tasted)\b/.test(text),
  },
  {
    id: "repeat",
    label: "repeat purchase or recommendation",
    test: (text) => /\b(order again|ordered again|reorder|buy again|purchase again|recommend|recommended|will order|would order|asked where)\b/.test(text),
  },
  {
    id: "vivid",
    label: "vivid language",
    test: (text) => /\b(devoured|could not stop|can't stop|melt(?:s|ed)? in (?:my|your|the) mouth|backup plan|remembered|crowd|gone in|hit)\b/.test(text),
  },
];

export function scoreMotionStoryProof(
  item: ReviewsProofItem,
  proofIndex: number,
  productTitle: string,
): MotionStoryStrongProof | null {
  const normalized = normalizeProofText(item.text);
  const lower = normalized.toLowerCase().replace(/^["“”]+|["“”]+$/g, "").trim();
  if (!lower || vagueProofPatterns.some((pattern) => pattern.test(lower))) return null;
  const traits = traitChecks
    .filter((trait) => trait.test(lower, productTitle))
    .map((trait) => trait.label);
  if (traits.length < 2) return null;
  return {
    ...item,
    proofIndex,
    traits,
    strengthReason: `Strong proof because it has ${traits.slice(0, 3).join(", ")}.`,
  };
}

export async function getMotionStoryStrongProofItems(
  research: StoredWebsiteResearchResult,
  productTitle: string,
  selectedProductHandles: string[],
  reviewFetcher: typeof fetch = fetch,
) {
  let proofItems = extractWebsiteReviewProofItems(research);
  if (selectedProductHandles.length || proofItems.length < 4) {
    const fetchedProofItems = await fetchWebsiteReviewProofItems(research, reviewFetcher, {
      preferredProductHandles: selectedProductHandles,
    });
    if (fetchedProofItems.length) proofItems = fetchedProofItems;
  }
  return proofItems
    .map((item, index) => scoreMotionStoryProof(item, index, productTitle))
    .filter((item): item is MotionStoryStrongProof => Boolean(item));
}
