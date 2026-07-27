import type {
  ProductCatalog,
  ProductCatalogItem,
  StoredWebsiteResearchResult,
} from "../../research/types";
import type {
  ReviewsAdScene,
  ReviewsProofItem,
} from "../../scene/types";
import {
  createReviewsAdScenes,
} from "../../scene/createReviewsScene";
import {
  extractReviewsVariantsFromResponse,
  type ReviewsVariant,
} from "./generate";
import { isActualReviewProof } from "./evidence";
import { REVIEWS_VARIANT_COUNT } from "./prompt";
import { validateReviewsScene } from "./validate";

export type ReviewsSourceProof = {
  text: string;
  sourceUrl: string;
  sourceName?: string;
  rating?: number;
};

export type ReviewsProduct = {
  title: string;
  handle: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  productType?: string | null;
  vendor?: string | null;
  isBestSeller?: boolean;
};

export type ReviewsResearch = {
  websiteUrl: string;
  brandName: string;
  description: string;
  offer: string;
  audience: string;
  ctaDirection: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  colors: string[];
  fontFeel: "serif" | "sans" | "display" | "mono" | "unknown";
  buyerMoments: string[];
  reviews: ReviewsSourceProof[];
  products: ReviewsProduct[];
  selectedProductHandles: string[];
};

export type ReviewsVariantInput = {
  proofIndex: number;
  headline: string;
  ctaText: string;
};

export type ReviewsVariantPack = {
  variants: ReviewsVariantInput[];
};

const clean = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const validUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const promptLikeText = /\b(?:ignore (?:all|any|previous|prior)|system prompt|developer message|assistant instructions?|role change|return only|output format)\b/i;

const toProofItem = (review: ReviewsSourceProof): ReviewsProofItem => ({
  type: "review",
  text: clean(review.text, 360),
  sourceUrl: review.sourceUrl,
  provider: "website",
  ...(clean(review.sourceName, 80) ? { sourceName: clean(review.sourceName, 80) } : {}),
  ...(Number.isFinite(review.rating) ? { rating: Number(review.rating) } : {}),
});

export const reviewsResearchTemplate = (websiteUrl: string): ReviewsResearch => ({
  websiteUrl,
  brandName: "",
  description: "",
  offer: "",
  audience: "",
  ctaDirection: "",
  logoUrl: null,
  faviconUrl: null,
  ogImageUrl: null,
  colors: [],
  fontFeel: "unknown",
  buyerMoments: [],
  reviews: [],
  products: [],
  selectedProductHandles: [],
});

export const validateReviewsResearch = (research: ReviewsResearch) => {
  const errors: string[] = [];
  const website = validUrl(research.websiteUrl);
  if (!website) errors.push("websiteUrl must be a valid URL.");
  if (!clean(research.brandName, 100)) errors.push("brandName is required.");
  if (!clean(research.description, 240)) errors.push("description is required.");
  if (!clean(research.offer, 240)) errors.push("offer is required.");
  if (!clean(research.audience, 180)) errors.push("audience is required.");
  if (!clean(research.ctaDirection, 80)) errors.push("ctaDirection is required.");
  if (!research.colors.length || research.colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) {
    errors.push("colors must contain at least one six-digit hex color.");
  }
  if (research.reviews.length < 2) {
    errors.push("Research needs at least 2 actual review or testimonial lines.");
  }

  const seenReviews = new Set<string>();
  research.reviews.forEach((review, index) => {
    const proof = toProofItem(review);
    const source = validUrl(review.sourceUrl);
    const key = proof.text.toLowerCase();
    if (!proof.text) errors.push(`reviews[${index}].text is required.`);
    if (!source) {
      errors.push(`reviews[${index}].sourceUrl must be a valid URL.`);
    } else if (website && source.host !== website.host) {
      errors.push(`reviews[${index}].sourceUrl must point to the researched website.`);
    }
    if (promptLikeText.test(proof.text)) {
      errors.push(`reviews[${index}].text looks like page instructions, not customer proof.`);
    }
    if (!isActualReviewProof(proof)) {
      errors.push(`reviews[${index}] must be actual first-person review or testimonial text.`);
    }
    if (seenReviews.has(key)) errors.push(`reviews[${index}] duplicates another review.`);
    seenReviews.add(key);
    if (proof.rating !== undefined && (proof.rating < 1 || proof.rating > 5)) {
      errors.push(`reviews[${index}].rating must be between 1 and 5.`);
    }
  });

  const productHandles = new Set<string>();
  research.products.forEach((product, index) => {
    if (!clean(product.title, 120)) errors.push(`products[${index}].title is required.`);
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(product.handle)) {
      errors.push(`products[${index}].handle must use letters, numbers, and hyphens.`);
    }
    if (!validUrl(product.url)) errors.push(`products[${index}].url must be a valid URL.`);
    if (product.imageUrl && !validUrl(product.imageUrl)) {
      errors.push(`products[${index}].imageUrl must be a valid URL or null.`);
    }
    if (productHandles.has(product.handle)) errors.push(`products[${index}].handle is duplicated.`);
    productHandles.add(product.handle);
  });

  research.selectedProductHandles.forEach((handle) => {
    if (!productHandles.has(handle)) {
      errors.push(`selectedProductHandles includes unknown product "${handle}".`);
    }
  });

  return errors;
};

export const toReviewsProofItems = (research: ReviewsResearch) => research.reviews.map(toProofItem);

const toCatalogProduct = (product: ReviewsProduct): ProductCatalogItem => ({
  title: product.title,
  handle: product.handle,
  url: product.url,
  imageUrl: product.imageUrl,
  imageAlt: product.imageAlt,
  productType: product.productType ?? null,
  vendor: product.vendor ?? null,
  priceMin: null,
  priceMax: null,
  currency: null,
  available: null,
  badges: product.isBestSeller ? ["best-seller"] : [],
});

const toProductCatalog = (research: ReviewsResearch): ProductCatalog | null => {
  if (!research.products.length) return null;
  const products = research.products.map(toCatalogProduct);
  const bestSellers = products.filter((product) => product.badges.includes("best-seller"));
  return {
    provider: "shopify-product-sitemap",
    sourceUrl: research.websiteUrl,
    groups: {
      bestSellers: bestSellers.map((product) => product.handle),
    },
    summary: {
      productCount: products.length,
      bestSellerCount: bestSellers.length,
    },
    products,
  };
};

export const toStoredReviewsResearch = (
  research: ReviewsResearch,
  runId: string,
): StoredWebsiteResearchResult => {
  const website = new URL(research.websiteUrl);
  const proof = research.reviews.map((review) => clean(review.text, 360));
  return {
    websiteUrl: research.websiteUrl,
    finalUrl: research.websiteUrl,
    host: website.host,
    brand: {
      name: research.brandName,
      url: research.websiteUrl,
      host: website.host,
      title: research.brandName,
      description: research.description,
      faviconUrl: research.faviconUrl,
      logoUrl: research.logoUrl,
      ogImageUrl: research.ogImageUrl,
      screenshotUrl: null,
      colors: research.colors,
      fonts: { feel: research.fontFeel },
      vibeTags: [],
    },
    brandBrief: {
      brandName: research.brandName,
      offer: research.offer,
      audience: research.audience,
      buyerMoments: research.buyerMoments,
      proof,
      siteLanguage: [],
      ctaDirection: research.ctaDirection,
      visualNotes: [],
      droppedNoiseSummary: [],
      confidence: "high",
    },
    adAngles: [],
    productCatalog: toProductCatalog(research),
    evidence: {
      headings: [],
      paragraphs: proof,
      receipts: {
        specificClaims: [],
        buyerMoments: research.buyerMoments,
        exactSiteLanguage: [],
        namedProof: proof,
      },
      rawMarkdown: "",
    },
    metadata: {},
    branding: {},
    providerStatus: [],
    sessionId: `agent-${runId}`,
    researchRunId: runId,
    brandSnapshotId: `brand-${runId}`,
  };
};

export const parseReviewsVariantPack = (
  pack: ReviewsVariantPack,
  research: ReviewsResearch,
) => {
  const proofItems = toReviewsProofItems(research);
  const variants = extractReviewsVariantsFromResponse(
    JSON.stringify(pack),
    proofItems,
    REVIEWS_VARIANT_COUNT,
    "Host agent",
  );
  const errors: string[] = [];
  const distinctProof = new Set(variants.map((variant) => variant.proofIndex));
  if (proofItems.length >= REVIEWS_VARIANT_COUNT && distinctProof.size !== REVIEWS_VARIANT_COUNT) {
    errors.push("Use four different proof items when four or more valid reviews are available.");
  }
  variants.forEach((variant, index) => {
    const ctaWords = variant.ctaText.split(/\s+/).filter(Boolean).length;
    if (ctaWords < 2 || ctaWords > 5) {
      errors.push(`variants[${index}].ctaText must be 2-5 words.`);
    }
  });
  if (errors.length) throw new Error(errors.join("\n"));
  return variants;
};

export const createReviewsScenesFromRun = ({
  research,
  runId,
  variants,
}: {
  research: ReviewsResearch;
  runId: string;
  variants: ReviewsVariant[];
}): ReviewsAdScene[] => {
  const scenes = createReviewsAdScenes({
    proofItems: toReviewsProofItems(research),
    research: toStoredReviewsResearch(research, runId),
    variants,
    requestedSceneCount: 8,
    generationBatchId: runId,
    model: "host-agent",
    provider: "deterministic",
    selectedProductHandles: research.selectedProductHandles,
  });
  const errors = scenes.flatMap((scene, index) => {
    const result = validateReviewsScene(scene);
    return result.errors.map((error) => `scene ${index + 1}: ${error}`);
  });
  if (errors.length) throw new Error(errors.join("\n"));
  return scenes;
};
