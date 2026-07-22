import type { ProductCatalogItem, StoredWebsiteResearchResult } from "../../research/types";

export const THREE_D_STORY_SUBJECT_KINDS = [
  "product",
  "brand",
  "customer-problem",
  "custom",
] as const;

export type ThreeDBreakdownStorySubjectKind = (typeof THREE_D_STORY_SUBJECT_KINDS)[number];

export type ThreeDBreakdownStorySubject = {
  kind: ThreeDBreakdownStorySubjectKind;
  productHandle?: string;
  brief?: string;
};

export type ThreeDBreakdownResolvedStorySubject = {
  kind: ThreeDBreakdownStorySubjectKind;
  product?: ProductCatalogItem;
  brief?: string;
  brandName?: string;
};

const cleanText = (value: string | undefined) => String(value || "").replace(/\s+/g, " ").trim();

export const resolveThreeDBreakdownStorySubject = (
  research: StoredWebsiteResearchResult,
  subject: ThreeDBreakdownStorySubject | null | undefined,
): ThreeDBreakdownResolvedStorySubject => {
  const kind = subject?.kind || "brand";
  if (kind === "product") {
    const productHandle = cleanText(subject?.productHandle);
    const product = (research.productCatalog?.products || []).find((item) => item.handle === productHandle);
    if (!product) throw new Error("Choose a product before generating 3D story directions.");
    if (!product.imageUrl) throw new Error(`${product.title} has no usable product image for a 3D Breakdown. Choose another product.`);
    return { kind, product };
  }

  if (kind === "custom") {
    const brief = cleanText(subject?.brief);
    if (brief.length < 8) throw new Error("Describe what this 3D Breakdown should be about before generating story directions.");
    return { kind, brief: brief.slice(0, 600) };
  }

  return {
    kind,
    brandName: cleanText(research.brandBrief.brandName || research.brand.name),
  };
};

export const formatThreeDBreakdownStorySubject = (
  subject: ThreeDBreakdownResolvedStorySubject,
) => {
  if (subject.kind === "product" && subject.product) {
    return [
      "USER-SELECTED SUBJECT: one specific product.",
      `Advertise only this product: ${subject.product.title}.`,
      `Product type: ${subject.product.productType || "not specified"}.`,
      `Product URL: ${subject.product.url}.`,
      `Every direction, script, visual product reference, and CTA must describe ${subject.product.title}. Never substitute another catalog item, collection, or generic brand offer.`,
      "Use product-specific evidence only. When outcome proof is unavailable, use observable handling, components, usage, or another documented product detail.",
    ].join("\n");
  }

  if (subject.kind === "customer-problem") {
    return [
      "USER-SELECTED SUBJECT: one customer problem or hidden truth.",
      "Choose the sharpest evidence-backed customer friction or incomplete mental model. Make all five directions different explanations of that problem, not generic slogans.",
      "Use the brand or evidence-linked offer as the payoff without inventing a specific product.",
    ].join("\n");
  }

  if (subject.kind === "custom") {
    return [
      "USER-SELECTED SUBJECT: a custom creative brief.",
      `Brief: ${subject.brief}.`,
      "Treat the brief as creative focus, not evidence. Use only website evidence for factual claims.",
    ].join("\n");
  }

  return [
    "USER-SELECTED SUBJECT: the overall brand story.",
    `Tell an evidence-grounded story about why ${subject.brandName || "this brand"} exists. Use founder or origin history only when the website explicitly supports it.`,
    `Every card must name ${subject.brandName || "the brand"} in its hook or subheadline.`,
    "Make the five cards use different evidence lenses and keep the payoff brand-level.",
    "Do not turn the brand story into isolated component demos, generic category facts, or invented competitor comparisons.",
  ].join("\n");
};
