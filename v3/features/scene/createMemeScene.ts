import type { MemeVariant } from "../formats/meme/generate";
import { getMemeTemplate } from "../formats/meme/templates";
import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type AdScene,
  type MemeAdScene,
} from "./types";

export const createMemeAdScene = ({
  research,
  variant,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  now = Date.now(),
}: {
  research: StoredWebsiteResearchResult;
  variant: MemeVariant;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: AdScene["metadata"]["provider"];
  now?: number;
}): MemeAdScene => {
  const template = getMemeTemplate(variant.templateId);
  if (!template) throw new Error(`Unknown meme template: ${variant.templateId}`);
  const headline = Object.values(variant.slots).find((value) => value.trim()) || `${research.brand.name} meme`;

  return {
    version: AD_SCENE_VERSION,
    format: "meme",
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
      angleId: `${template.id}-${candidateIndex + 1}`,
      headline,
      subheadline: template.directorsNotes,
      ctaText: research.brandBrief.ctaDirection || "See more",
      headlineType: "contrast",
      selectedPain: research.brandBrief.buyerMoments[0] || research.brandBrief.audience,
      selectedProof: research.brandBrief.proof[0] || research.brandBrief.offer,
    },
    style: {
      backgroundColor: "#FFFFFF",
      textColor: "#111111",
      accentColor: research.brand.colors[0] || "#111111",
      fontFeel: research.brand.fonts.feel,
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "meme-template",
      templateId: template.id,
      slots: variant.slots,
    },
    metadata: {
      candidateIndex,
      generationBatchId,
      researchRunId: research.researchRunId,
      brandSnapshotId: research.brandSnapshotId,
      model,
      provider,
      generatedAt: now,
    },
  };
};
