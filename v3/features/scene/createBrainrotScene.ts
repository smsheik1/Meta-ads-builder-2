import type { BrainrotVariant } from "../formats/brainrot/generate";
import {
  BRAINROT_BACKGROUND_VIDEO_SRC,
  BRAINROT_BEAT_GAP_MS,
  BRAINROT_LEFT_SPRITE_SRC,
  BRAINROT_RIGHT_SPRITE_SRC,
} from "../formats/brainrot/prompt";
import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type AdScene,
  type BrainrotAdScene,
} from "./types";
import { pickSceneAccentColor } from "./createVisualizerScene";

export const createBrainrotAdScene = ({
  research,
  variant,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  now = Date.now(),
}: {
  research: StoredWebsiteResearchResult;
  variant: BrainrotVariant;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: AdScene["metadata"]["provider"];
  now?: number;
}): BrainrotAdScene => {
  const headline = variant.beats[0]?.text || variant.angle;
  const accentColor = pickSceneAccentColor(research.brand.colors);

  return {
    version: AD_SCENE_VERSION,
    format: "brainrot",
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
      angleId: `brainrot-${candidateIndex + 1}`,
      headline,
      subheadline: variant.angle,
      ctaText: research.brandBrief.ctaDirection || "Learn more",
      headlineType: "callout",
      selectedPain: variant.angle,
      selectedProof: variant.angle,
    },
    style: {
      backgroundColor: "#000000",
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
      preset: "brainrot-dialogue",
      backgroundVideoSrc: BRAINROT_BACKGROUND_VIDEO_SRC,
      characters: {
        leftSpriteSrc: BRAINROT_LEFT_SPRITE_SRC,
        rightSpriteSrc: BRAINROT_RIGHT_SPRITE_SRC,
      },
      beats: variant.beats,
      beatGapMs: BRAINROT_BEAT_GAP_MS,
      ctaText: research.brandBrief.ctaDirection || "Learn more",
      angle: variant.angle,
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
