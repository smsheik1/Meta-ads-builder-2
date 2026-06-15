import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type AdSceneCandidate,
  type VisualizerAdScene,
} from "./types";
import {
  createTintedVisualizerBackground,
  getVisualizerVariantForCandidate,
  pickVisualizerColorForCandidate,
} from "./visualizerVariants";

const defaultAccent = "#7DD3FC";

const isUsefulColor = (value: string) => (
  /^#[0-9A-F]{6}$/i.test(value) &&
  !/^#(?:000000|111111|FFFFFF|F9FAFB|F8FAFC)$/i.test(value)
);

export const pickSceneAccentColor = (colors: string[]) => (
  colors.find(isUsefulColor) || defaultAccent
);

export const createVisualizerAdScene = ({
  research,
  candidate,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  now = Date.now(),
}: {
  research: StoredWebsiteResearchResult;
  candidate: AdSceneCandidate;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: VisualizerAdScene["metadata"]["provider"];
  now?: number;
}): VisualizerAdScene => {
  const accentColor = pickSceneAccentColor(research.brand.colors);
  const visualizerVariant = getVisualizerVariantForCandidate(candidateIndex);
  const visualizerColor = pickVisualizerColorForCandidate(research.brand.colors, candidateIndex);

  return {
    version: AD_SCENE_VERSION,
    format: "visualizer",
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
      angleId: candidate.angleId,
      headline: candidate.headline,
      subheadline: candidate.subheadline,
      ctaText: candidate.ctaText,
      headlineType: candidate.headlineType,
      selectedPain: candidate.selectedPain,
      selectedProof: candidate.selectedProof,
    },
    style: {
      backgroundColor: createTintedVisualizerBackground(visualizerColor),
      textColor: "#070B1D",
      accentColor,
      visualizerColor,
      visualizer: visualizerVariant.visualizer,
      fontFeel: research.brand.fonts.feel,
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "centered-hero",
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
