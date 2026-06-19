import type { TextMessageVariant } from "../formats/text-message/generate";
import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type TextMessageAdScene,
} from "./types";
import { pickSceneAccentColor } from "./createVisualizerScene";

export const createTextMessageAdScene = ({
  research,
  variant,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  now = Date.now(),
}: {
  research: StoredWebsiteResearchResult;
  variant: TextMessageVariant;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: TextMessageAdScene["metadata"]["provider"];
  now?: number;
}): TextMessageAdScene => {
  const accentColor = pickSceneAccentColor(research.brand.colors);

  return {
    version: AD_SCENE_VERSION,
    format: "text-message",
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
      angleId: `text-message-${candidateIndex + 1}`,
      headline: variant.messages[0]?.text || variant.angle,
      subheadline: variant.messages.map((message) => message.text).join(" "),
      ctaText: research.brandBrief.ctaDirection || "Send it",
      headlineType: "painful_moment",
      selectedPain: variant.angle,
      selectedProof: research.brandBrief.proof[0] || research.brandBrief.offer,
    },
    style: {
      backgroundColor: "#FFFFFF",
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
      preset: "text-message-screenshot",
      contactName: variant.contactName,
      timestampLabel: variant.timestampLabel,
      messages: variant.messages,
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
