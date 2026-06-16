import type { JingleVariant } from "../formats/jingle/generate";
import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type AdScene,
  type JingleAdScene,
} from "./types";
import { pickSceneAccentColor } from "./createVisualizerScene";

export const createJingleAdScene = ({
  research,
  variant,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  now = Date.now(),
}: {
  research: StoredWebsiteResearchResult;
  variant: JingleVariant;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: AdScene["metadata"]["provider"];
  now?: number;
}): JingleAdScene => {
  const hook = variant.lyrics[0] || variant.brandPhonetic;
  const accentColor = pickSceneAccentColor(research.brand.colors);

  return {
    version: AD_SCENE_VERSION,
    format: "jingle",
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
      angleId: `jingle-${candidateIndex + 1}`,
      headline: hook,
      subheadline: variant.angle,
      ctaText: research.brandBrief.ctaDirection || "Learn more",
      headlineType: "callout",
      selectedPain: variant.angle,
      selectedProof: variant.angle,
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
      preset: "jingle-lyrics",
      brandPhonetic: variant.brandPhonetic,
      angle: variant.angle,
      lyrics: variant.lyrics,
      musicLengthMs: variant.musicLengthMs,
      compositionPlan: variant.compositionPlan,
      selfCheckPassed: variant.selfCheckPassed,
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
