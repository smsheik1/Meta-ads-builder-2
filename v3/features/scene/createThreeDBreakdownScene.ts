import type { ThreeDBreakdownSiteContract, ThreeDBreakdownVariant } from "../formats/three-d-breakdown/generate";
import type { ThreeDBreakdownEvidenceItem } from "../formats/three-d-breakdown/evidence";
import { THREE_D_BREAKDOWN_DURATION_MS } from "../formats/three-d-breakdown/prompt";
import { createThreeDClipPlans } from "../formats/three-d-breakdown/storyboardContracts";
import type { ProductCatalogItem, StoredWebsiteResearchResult } from "../research/types";
import type { ThreeDBreakdownStorySubject } from "../formats/three-d-breakdown/storySubject";
import { pickSceneAccentColor } from "./createVisualizerScene";
import {
  AD_SCENE_VERSION,
  type ThreeDBreakdownAdScene,
} from "./types";

const missingProductImageMessage = "3D Breakdown needs a real product image for this site. Use a product page, add a product image, or switch to Reviews/Visualizer.";
const buyerActionPattern = /\b(shop|try|get|buy|order|start|choose|book|download|subscribe|visit)\b/i;
const unusableCtaPattern = /\b(see the mechanism|the journey is the product|visible mechanism|start\b.{0,64}\bfrom\b)\b/i;

const cleanCtaText = (value: string | null | undefined) => String(value || "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 90);

const isUsableBuyerCta = (value: string) => (
  buyerActionPattern.test(value) && !unusableCtaPattern.test(value)
);

export const selectThreeDBreakdownBuyerCta = ({
  generatedCta,
  siteCta,
  productTitle,
  brandName,
}: {
  generatedCta?: string;
  siteCta?: string;
  productTitle?: string;
  brandName: string;
}) => {
  const candidates = [generatedCta, siteCta]
    .map(cleanCtaText)
    .filter(Boolean);
  const supportedCta = candidates.find(isUsableBuyerCta);
  if (supportedCta) return supportedCta;

  const subject = cleanCtaText(productTitle) || cleanCtaText(brandName) || "this product";
  return `Shop ${subject}`.slice(0, 90);
};

const normalizeProductText = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ü/gi, "u");

const apparelTerms = /\b(apparel|clothing|fashion|wear|wearing|shirt|t-shirt|tee|hoodie|hudie|sweatshirt|jacket|pants|leggings|shorts|hat|cap|beanie|sock|socks)\b/i;
const merchTerms = /\b(merch|merchandise|hat|cap|beanie|shirt|t-shirt|tee|hoodie|hudie|sweatshirt|sticker|tote|poster|gift card|keychain|bodega|trucker)\b/i;
const productHeroTerms = /\b(gumm(?:y|ies)|capsule|capsules|jar|bottle|pouch|pack|package|box|tin|bag|bundle|kit|supplement|probiotic|synbiotic|vitamin|greens?|gruns|cookie|cookies|brownie|brownies|snack|bar|serum|cream|lotion|shampoo|drink|can|bottle)\b/i;
const logoOnlyTerms = /\b(logo|favicon|icon|mark)\b/i;

const productText = (product: ProductCatalogItem) => [
  product.title,
  product.productType || "",
  product.imageAlt || "",
  product.url,
].join(" ");

const metadataText = (research: StoredWebsiteResearchResult, ...keys: string[]) => keys
  .map((key) => research.metadata[key])
  .filter((value): value is string => typeof value === "string")
  .join(" ");

const selectProductOgImage = (
  research: StoredWebsiteResearchResult,
): ThreeDBreakdownAdScene["layout"]["productAnchor"] => {
  const imageUrl = research.brand.ogImageUrl?.trim();
  if (!imageUrl || imageUrl === research.brand.logoUrl || imageUrl === research.brand.faviconUrl) return undefined;

  const imageAlt = metadataText(research, "og:image:alt", "twitter:image:alt").trim();
  const productEvidence = normalizeProductText([
    imageAlt,
    research.brand.description,
    research.brandBrief.offer,
    ...research.brandBrief.siteLanguage,
  ].join(" "));
  const imageIdentity = normalizeProductText(`${imageUrl} ${imageAlt}`);
  if (!productHeroTerms.test(productEvidence) || logoOnlyTerms.test(imageIdentity)) return undefined;

  return {
    title: `${research.brand.name || "Featured"} products`,
    url: research.finalUrl || research.websiteUrl,
    imageUrl,
    imageAlt: imageAlt || research.brand.title,
  };
};

const isApparelSite = (research: StoredWebsiteResearchResult) => {
  const products = research.productCatalog?.products || [];
  const copy = [
    research.brand.description,
    research.brandBrief.offer,
    research.brandBrief.audience,
    ...research.brandBrief.siteLanguage,
  ].join(" ");
  if (/\b(apparel|clothing|fashion|wardrobe|wearable basics|activewear|streetwear)\b/i.test(copy)) return true;
  if (!products.length) return false;
  const apparelCount = products.filter((product) => apparelTerms.test(productText(product))).length;
  return apparelCount >= Math.max(2, Math.ceil(products.length * 0.6));
};

const scoreProductHeroCandidate = (
  research: StoredWebsiteResearchResult,
  product: ProductCatalogItem,
) => {
  if (!product.imageUrl) return Number.NEGATIVE_INFINITY;
  const text = normalizeProductText(productText(product));
  const apparelSite = isApparelSite(research);
  const hasProductHeroLanguage = productHeroTerms.test(text);
  const brandName = normalizeProductText(research.brand.name).trim().toLowerCase();
  const productTitle = normalizeProductText(product.title).trim().toLowerCase();
  let score = apparelSite ? 0 : -20;
  if (product.badges.includes("best-seller")) score += 20;
  if (product.available === true) score += 4;
  if (hasProductHeroLanguage) score += 35;
  if (brandName && productTitle === brandName) score += 20;
  if (/\b(best seller|daily|starter|welcome|signature|assorted|original)\b/i.test(text)) score += 6;
  if (logoOnlyTerms.test(text)) score -= 45;
  if (merchTerms.test(text) && !apparelSite) score -= 90;
  return score;
};

export const selectThreeDBreakdownProductAnchor = (
  research: StoredWebsiteResearchResult,
  selectedProductHandle?: string,
): ThreeDBreakdownAdScene["layout"]["productAnchor"] => {
  if (selectedProductHandle) {
    const selected = (research.productCatalog?.products || []).find((product) => product.handle === selectedProductHandle);
    if (!selected?.imageUrl) return undefined;
    return {
      title: selected.title,
      url: selected.url,
      imageUrl: selected.imageUrl,
      imageAlt: selected.imageAlt,
    };
  }
  const scoredProducts = (research.productCatalog?.products || [])
    .map((product, index) => ({
      product,
      index,
      score: scoreProductHeroCandidate(research, product),
    }))
    .filter((item) => item.product.imageUrl && item.score > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = scoredProducts.find((item) => item.score >= 0)?.product;
  if (!selected?.imageUrl) return selectProductOgImage(research);
  return {
    title: selected.title,
    url: selected.url,
    imageUrl: selected.imageUrl,
    imageAlt: selected.imageAlt,
  };
};

export function createThreeDBreakdownAdScene({
  candidateIndex,
  evidenceItems,
  generationBatchId,
  model,
  now = Date.now(),
  provider,
  research,
  siteContract,
  storySubject,
  variant,
}: {
  candidateIndex: number;
  evidenceItems: ThreeDBreakdownEvidenceItem[];
  generationBatchId: string;
  model: string;
  now?: number;
  provider: ThreeDBreakdownAdScene["metadata"]["provider"];
  research: StoredWebsiteResearchResult;
  siteContract: ThreeDBreakdownSiteContract;
  storySubject?: ThreeDBreakdownStorySubject | null;
  variant: ThreeDBreakdownVariant;
}): ThreeDBreakdownAdScene {
  const evidence = evidenceItems.find((item) => item.evidenceIndex === variant.evidenceIndex);
  if (!evidence) throw new Error("3D Breakdown evidence item is missing.");
  const accentColor = pickSceneAccentColor(research.brand.colors);
  const productAnchor = selectThreeDBreakdownProductAnchor(
    research,
    storySubject?.kind === "product" ? storySubject.productHandle : undefined,
  );
  if (variant.visualStyle === "presenter-teardown-vsl" && !productAnchor?.imageUrl) {
    throw new Error(missingProductImageMessage);
  }
  const productImageUrls = productAnchor?.imageUrl ? [productAnchor.imageUrl] : [];
  const brandImageUrls = [research.brand.ogImageUrl, research.brand.screenshotUrl, research.brand.logoUrl]
    .filter((url): url is string => Boolean(url))
    .slice(0, 2);
  const firstBeat = variant.scriptBeats[0]!;
  const revelationBeat = variant.scriptBeats.find((beat) => beat.role === "revelation") || variant.scriptBeats[3]!;
  const buyerCtaText = selectThreeDBreakdownBuyerCta({
    generatedCta: variant.ctaLine,
    siteCta: research.brandBrief.ctaDirection,
    productTitle: productAnchor?.title,
    brandName: research.brand.name,
  });
  if (!variant.storyboardBoard.frames?.length) throw new Error("3D Breakdown storyboard frames are missing.");
  const storyContract: ThreeDBreakdownAdScene["layout"]["storyContract"] = {
    ...siteContract,
    visualStyle: variant.visualStyle,
    variantAngle: variant.variantAngle,
    customerProblem: variant.customerProblem,
    mechanismSummary: variant.mechanismSummary,
    visualMetaphor: variant.visualMetaphor,
    referenceScript: variant.referenceScript,
    ctaLine: buyerCtaText,
    evidenceIndex: variant.evidenceIndex,
    evidenceUseType: variant.evidenceUseType,
    wowMomentType: variant.wowMomentType,
    wowMoment: variant.wowMoment,
    viewerLearns: variant.viewerLearns,
    claimRisk: variant.claimRisk,
    claimRiskReason: variant.claimRiskReason,
  };

  return {
    version: AD_SCENE_VERSION,
    format: "three-d-breakdown",
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
      angleId: `three-d-breakdown-${candidateIndex + 1}`,
      headline: firstBeat.narration,
      subheadline: variant.variantAngle,
      ctaText: buyerCtaText,
      headlineType: "receipt_drop",
      selectedPain: variant.customerProblem,
      selectedProof: revelationBeat.narration,
    },
    style: {
      backgroundColor: "#07111F",
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
      preset: "three-d-breakdown",
      durationMs: THREE_D_BREAKDOWN_DURATION_MS,
      scriptBeats: variant.scriptBeats as ThreeDBreakdownAdScene["layout"]["scriptBeats"],
      shots: variant.shots as ThreeDBreakdownAdScene["layout"]["shots"],
      storyboardBoard: {
        ...variant.storyboardBoard,
        frames: variant.storyboardBoard.frames,
      },
      clipPlans: createThreeDClipPlans({
        scriptBeats: variant.scriptBeats as ThreeDBreakdownAdScene["layout"]["scriptBeats"],
        storyboardBoard: variant.storyboardBoard,
        storyContract,
      }),
      referenceImages: {
        productImageUrls,
        brandImageUrls,
      },
      productAnchor,
      storyContract,
      groundedEvidence: {
        ...evidence,
        scrapedAt: now,
      },
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
    },
  };
}
