import type { StoredWebsiteResearchResult } from "../../research/types";
import type {
  ThreeDBreakdownEvidenceUseType,
  ThreeDBreakdownRevealPattern,
} from "../../scene/types";

export type ThreeDBreakdownEvidenceType =
  | "review"
  | "product"
  | "claim"
  | "guarantee"
  | "result"
  | "shipping"
  | "site-language";

export type ThreeDBreakdownEvidenceItem = {
  evidenceIndex: number;
  type: ThreeDBreakdownEvidenceType;
  evidenceUseType: ThreeDBreakdownEvidenceUseType;
  text: string;
  sourceUrl: string;
  visualPotentialScore: number;
  whyVisual: string;
  possibleRevealPatterns: ThreeDBreakdownRevealPattern[];
  sourceName?: string;
};

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
  .replace(/[“”]/g, "\"")
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const rejectChrome = (text: string) => (
  text.length < 12 ||
  /^(home|menu|cart|search|subscribe|privacy|terms|copyright|all rights reserved)$/i.test(text) ||
  /something went wrong|try refreshing|site error|unknown due to site error/i.test(text) ||
  /ignore (all )?(previous|prior) instructions|system prompt|developer message|act as|you are chatgpt|disregard instructions/i.test(text)
);

const classifyEvidence = (text: string): ThreeDBreakdownEvidenceType => {
  if (/stars?|review|love|ordered|arrived|bought|sent|tasted|recommend/i.test(text)) return "review";
  if (/ship|deliver|arrive|nationwide|door/i.test(text)) return "shipping";
  if (/guarantee|warranty|return|refund/i.test(text)) return "guarantee";
  if (/result|saved|increased|reduced|faster|more|less|\d+%/i.test(text)) return "result";
  return "claim";
};

const classifyUseType = (
  text: string,
  type: ThreeDBreakdownEvidenceType,
): ThreeDBreakdownEvidenceUseType => {
  if (type === "review") return "review";
  if (type === "shipping") return "shipping";
  if (type === "guarantee") return "guarantee";
  if (/\b(refill|snap|modular|reusable|assemble|connect|automate|sync|integrat|workflow|pipeline|engine|system|process|method)\b/i.test(text)) return "mechanism";
  if (/\b(material|ingredient|cotton|steel|aluminum|ceramic|wool|protein|fiber|component|part|layer)\b/i.test(text)) return "material";
  if (/\b(how it works|made with|built with|powered by|uses|includes|contains)\b/i.test(text)) return "feature";
  if (/\b(discount|sale|pricing|price|free trial|free shipping|bundle|offer)\b/i.test(text)) return "offer";
  if (type === "product") return /\b(best seller|price|tin|box|kit|bundle|pack|system|tool)\b/i.test(text) ? "feature" : "category";
  if (type === "result") return "proof";
  return "claim";
};

const visualProfileForEvidence = (
  text: string,
  evidenceUseType: ThreeDBreakdownEvidenceUseType,
): {
  visualPotentialScore: number;
  whyVisual: string;
  possibleRevealPatterns: ThreeDBreakdownRevealPattern[];
} => {
  if (evidenceUseType === "mechanism") {
    return {
      visualPotentialScore: 0.94,
      whyVisual: "A mechanism can become the peak 3D reveal by showing parts snapping, flowing, or assembling.",
      possibleRevealPatterns: ["exploded-product", "xray-cutaway", "chaos-to-order", "physicalized-ui", "process-pipeline"],
    };
  }
  if (evidenceUseType === "material" || evidenceUseType === "feature") {
    return {
      visualPotentialScore: 0.82,
      whyVisual: "A concrete feature or material can be opened, layered, or shown as a physical transformation.",
      possibleRevealPatterns: ["exploded-product", "xray-cutaway", "miniature-world", "process-pipeline"],
    };
  }
  if (evidenceUseType === "review" || evidenceUseType === "proof") {
    return {
      visualPotentialScore: 0.74,
      whyVisual: "Real proof can become blocks, receipts, or reactions locking into the final payoff.",
      possibleRevealPatterns: ["proof-blocks", "impact-chain", "before-after-reconstruction"],
    };
  }
  if (evidenceUseType === "offer" || evidenceUseType === "shipping" || evidenceUseType === "guarantee") {
    return {
      visualPotentialScore: 0.58,
      whyVisual: "Offer or delivery proof can support the payoff, but is usually less visually explosive than mechanism evidence.",
      possibleRevealPatterns: ["process-pipeline", "proof-blocks", "impact-chain"],
    };
  }
  if (/\b(grow|easy|quality|premium|modern|simple|trusted|better|solution)\b/i.test(text)) {
    return {
      visualPotentialScore: 0.26,
      whyVisual: "Generic benefit language is weak visual evidence unless paired with a concrete mechanism.",
      possibleRevealPatterns: ["invisible-problem"],
    };
  }
  return {
    visualPotentialScore: evidenceUseType === "category" ? 0.18 : 0.42,
    whyVisual: evidenceUseType === "category"
      ? "A product category alone is not enough for a proof-grounded 3D reveal."
      : "This claim may support a script, but needs stronger visual grounding.",
    possibleRevealPatterns: ["invisible-problem", "before-after-reconstruction"],
  };
};

export function extractThreeDBreakdownEvidence(research: StoredWebsiteResearchResult): ThreeDBreakdownEvidenceItem[] {
  const defaultSourceUrl = research.finalUrl || research.websiteUrl || research.brand.url;
  const candidates: Array<{ type?: ThreeDBreakdownEvidenceType; text: string; sourceUrl?: string; sourceName?: string }> = [
    ...research.brandBrief.proof.map((text) => ({ text, sourceName: "brand proof" })),
    ...research.evidence.receipts.namedProof.map((text) => ({ text, sourceName: "named proof" })),
    ...research.evidence.receipts.specificClaims.map((text) => ({ type: "claim" as const, text, sourceName: "specific claim" })),
    ...research.evidence.receipts.exactSiteLanguage.map((text) => ({ type: "site-language" as const, text, sourceName: "site language" })),
    ...research.evidence.receipts.buyerMoments.map((text) => ({ type: "claim" as const, text, sourceName: "buyer moment" })),
    ...research.brandBrief.siteLanguage.map((text) => ({ type: "site-language" as const, text, sourceName: "site language" })),
    ...research.brandBrief.buyerMoments.map((text) => ({ type: "claim" as const, text, sourceName: "buyer moment" })),
    ...((research.productCatalog?.products || [])
      .filter((product) => product.title || product.productType)
      .slice(0, 12)
      .map((product) => ({
        type: "product" as const,
        text: [
          product.title,
          product.badges.includes("best-seller") ? "best seller" : "",
          product.productType || "",
          product.priceMin ? `${product.currency || "$"}${product.priceMin}` : "",
        ].filter(Boolean).join(" - "),
        sourceUrl: product.url || research.productCatalog?.sourceUrl || defaultSourceUrl,
        sourceName: product.title || product.productType || "product",
      }))),
    ...research.evidence.paragraphs.slice(0, 18).map((text) => ({ text, sourceName: "page paragraph" })),
  ];

  const seen = new Set<string>();
  const evidence: ThreeDBreakdownEvidenceItem[] = [];
  for (const candidate of candidates) {
    const text = cleanText(candidate.text);
    const key = text.toLowerCase();
    if (rejectChrome(text) || seen.has(key)) continue;
    seen.add(key);
    const type = candidate.type || classifyEvidence(text);
    const evidenceUseType = classifyUseType(text, type);
    const visualProfile = visualProfileForEvidence(text, evidenceUseType);
    evidence.push({
      evidenceIndex: evidence.length,
      type,
      evidenceUseType,
      text,
      sourceUrl: candidate.sourceUrl || defaultSourceUrl,
      sourceName: candidate.sourceName,
      ...visualProfile,
    });
    if (evidence.length >= 16) break;
  }
  return evidence.sort((a, b) => b.visualPotentialScore - a.visualPotentialScore)
    .map((item, evidenceIndex) => ({ ...item, evidenceIndex }));
}
