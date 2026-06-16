import type { WereSorryVariant } from "../formats/were-sorry/generate";
import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type WereSorryAdScene,
} from "./types";
import { pickSceneAccentColor } from "./createVisualizerScene";

export const createWereSorryAdScene = ({
  research,
  variant,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  now = Date.now(),
}: {
  research: StoredWebsiteResearchResult;
  variant: WereSorryVariant;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: WereSorryAdScene["metadata"]["provider"];
  now?: number;
}): WereSorryAdScene => {
  const accentColor = pickSceneAccentColor(research.brand.colors);

  return {
    version: AD_SCENE_VERSION,
    format: "were-sorry",
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
      angleId: `were-sorry-${candidateIndex + 1}`,
      headline: variant.apologyHeader,
      subheadline: variant.legalOpener,
      ctaText: research.brandBrief.ctaDirection || "Learn more",
      headlineType: "contrast",
      selectedPain: variant.angle,
      selectedProof: variant.confessions[0] || research.brandBrief.proof[0] || research.brandBrief.offer,
    },
    style: {
      backgroundColor: "#FFF7ED",
      textColor: "#111827",
      accentColor,
      fontFeel: research.brand.fonts.feel,
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "were-sorry-poster",
      apologyHeader: variant.apologyHeader,
      legalOpener: variant.legalOpener,
      confessions: variant.confessions,
      signoff: variant.signoff,
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
};
