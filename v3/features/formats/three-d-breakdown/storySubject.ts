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
};

const cleanBrief = (value: string | undefined) => String(value || "").replace(/\s+/g, " ").trim();

export const resolveThreeDBreakdownStorySubject = (
  research: StoredWebsiteResearchResult,
  subject: ThreeDBreakdownStorySubject | null | undefined,
): ThreeDBreakdownResolvedStorySubject => {
  const kind = subject?.kind || "brand";
  if (kind === "product") {
    const productHandle = String(subject?.productHandle || "").trim();
    const product = (research.productCatalog?.products || []).find((item) => item.handle === productHandle);
    if (!product) throw new Error("Choose a product before generating 3D story directions.");
    if (!product.imageUrl) throw new Error(`${product.title} has no usable product image for a 3D Breakdown. Choose another product or a product page with imagery.`);
    return { kind, product };
  }

  if (kind === "custom") {
    const brief = cleanBrief(subject?.brief);
    if (brief.length < 8) throw new Error("Describe what this 3D Breakdown should be about before generating story directions.");
    return { kind, brief: brief.slice(0, 600) };
  }

  return { kind };
};

export const formatThreeDBreakdownStorySubject = (
  subject: ThreeDBreakdownResolvedStorySubject,
) => {
  if (subject.kind === "product" && subject.product) {
    return [
      "USER-SELECTED SUBJECT: a specific product.",
      `Advertise only this product: ${subject.product.title}.`,
      `Product type: ${subject.product.productType || "not specified"}.`,
      `Product URL: ${subject.product.url}.`,
      "Every direction, script, visual product reference, and CTA must describe this exact selected product. Do not substitute another catalog item, collection, or generic brand offer.",
    ].join("\n");
  }
  if (subject.kind === "customer-problem") {
    return [
      "USER-SELECTED SUBJECT: a customer problem or hidden truth.",
      "Choose the sharpest concrete customer friction, hidden mechanism, or proof-backed insight from the website. Make the five directions different explanations of that insight, not generic brand slogans.",
      "Use the brand or the evidence-linked offer as the payoff without inventing a specific product.",
    ].join("\n");
  }
  if (subject.kind === "custom") {
    return [
      "USER-SELECTED SUBJECT: a custom creative brief.",
      `Brief: ${subject.brief}.`,
      "Treat this as creative focus, not evidence. Use only website evidence for factual claims and do not invent missing product details.",
    ].join("\n");
  }
  return [
    "USER-SELECTED SUBJECT: the overall brand story.",
    "Explain what makes this brand or its core offer different. Keep the payoff brand-level unless the evidence clearly names a product.",
  ].join("\n");
};
