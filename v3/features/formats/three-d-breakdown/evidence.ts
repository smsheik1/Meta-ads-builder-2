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
  if (/\b(ship|ships|shipping|delivery|delivered|delivering|arrives?|arrived|nationwide|door)\b/i.test(text)) return "shipping";
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
  if (
    /\b(refill|snap|modular|reusable|assemble|connect|automate|automatic|automatically|sync|integrat|workflow|pipeline|engine|system|process|method)\b/i.test(text) ||
    /\b(answer|answers|book|books|schedule|schedules|resolve|resolves|route|routes|convert|converts|turn|turns|capture|captures)\b/i.test(text) ||
    /\b(ai agent|ai receptionist|help desk|omnichannel|support channels?|booking path)\b/i.test(text) ||
    /\b(delivery system|targeted delivery|delayed release|release|survive|survives|survival|protect|protects|shield|shields|carry|carries|transport|bioavailability|absorb|absorbs|absorption|disperse|dispersed)\b/i.test(text) ||
    /\b(capsule-in-capsule|capsule inside|outer capsule|inner capsule|nested capsule|viacap|via cap|stomach acid|colon|gut barrier)\b/i.test(text)
  ) return "mechanism";
  if (/\b(standardized|extract|formula|formulation|blend|strain|strains|cfu|prebiotic|probiotic|postbiotic|bacteria|bacterial|ingredient|turmeric|curcumin|piperine|black pepper|mct oil|ginger|vitamin|mineral|component|part|layer|material|cotton|steel|aluminum|ceramic|wool|protein|fiber)\b/i.test(text)) return "material";
  if (/\b(clinical trial|clinically studied|tested|study|studies|validated|assayed|sequenced|stability|potency|standardized)\b/i.test(text)) return "process";
  if (/\b(how it works|made with|built with|powered by|uses|includes|contains)\b/i.test(text)) return "feature";
  if (/\b(discount|sale|pricing|price|free trial|free shipping|bundle|offer)\b/i.test(text)) return "offer";
  if (type === "product") {
    if (/\bbest seller\b/i.test(text)) return "proof";
    if (/\b(price|\$|discount|sale|bundle|offer)\b/i.test(text)) return "offer";
    if (/\b(system|tool|kit)\b/i.test(text)) return "feature";
    return "category";
  }
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
  if (
    /\b(clinically studied|clinical|health transformations?|reduces? bloating|healthy regularity|sustained support)\b/i.test(text) &&
    !/\b(outer capsule|inner capsule|capsule-in-capsule|viacap|stomach acid|probiotic core|delivery system|protect|shields?|survive|24 probiotic strains|prebiotics?)\b/i.test(text)
  ) {
    return {
      visualPotentialScore: 0.46,
      whyVisual: "This is claim or proof language, but it does not expose a concrete visual mechanism for the 3D reveal.",
      possibleRevealPatterns: ["proof-blocks", "impact-chain"],
    };
  }
  if (
    /\b(microbes?|bacteria)\b/i.test(text) &&
    !/\b(strains?|probiotic|prebiotic|capsule|core|viacap|outer|inner|shield|protect|survive)\b/i.test(text)
  ) {
    return {
      visualPotentialScore: 0.72,
      whyVisual: "A quantified hidden-world fact can become a strong curiosity hook and miniature-world reveal.",
      possibleRevealPatterns: ["miniature-world", "invisible-problem"],
    };
  }
  if (evidenceUseType === "mechanism") {
    return {
      visualPotentialScore: 0.94,
      whyVisual: "A mechanism can become the peak 3D reveal by showing parts protecting, flowing, surviving, snapping, or assembling.",
      possibleRevealPatterns: ["exploded-product", "xray-cutaway", "process-pipeline", "invisible-problem", "chaos-to-order"],
    };
  }
  if (evidenceUseType === "material" || evidenceUseType === "feature" || evidenceUseType === "process") {
    return {
      visualPotentialScore: evidenceUseType === "process" ? 0.86 : 0.82,
      whyVisual: "A concrete feature, process, ingredient, or material can be opened, layered, measured, or shown as a formula stack.",
      possibleRevealPatterns: ["exploded-product", "xray-cutaway", "miniature-world", "process-pipeline", "proof-blocks"],
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
