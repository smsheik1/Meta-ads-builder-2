import type { VideoMemeVariant } from "../formats/video-meme/generate";
import { getVideoMemeTemplate } from "../formats/video-meme/templates";
import type { StoredWebsiteResearchResult } from "../research/types";
import {
  AD_SCENE_VERSION,
  type AdScene,
  type VideoMemeAdScene,
} from "./types";
import { pickSceneAccentColor } from "./createVisualizerScene";

export const createVideoMemeAdScene = ({
  research,
  variant,
  candidateIndex,
  generationBatchId,
  model,
  provider,
  now = Date.now(),
}: {
  research: StoredWebsiteResearchResult;
  variant: VideoMemeVariant;
  candidateIndex: number;
  generationBatchId: string;
  model: string;
  provider: AdScene["metadata"]["provider"];
  now?: number;
}): VideoMemeAdScene => {
  const template = getVideoMemeTemplate(variant.clipId);
  if (!template) throw new Error(`Unknown video meme template: ${variant.clipId}`);
  const headline = variant.caption || variant.slots?.dreadText || variant.slots?.setupText || "";

  return {
    version: AD_SCENE_VERSION,
    format: "video-meme",
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
      subheadline: variant.angle,
      ctaText: research.brandBrief.ctaDirection || "Learn more",
      headlineType: "callout",
      selectedPain: variant.target,
      selectedProof: variant.angle,
    },
    style: {
      backgroundColor: "#000000",
      textColor: "#FFFFFF",
      accentColor: pickSceneAccentColor(research.brand.colors),
      fontFeel: research.brand.fonts.feel,
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "video-meme-template",
      templateId: template.id,
      videoSrc: template.videoSrc,
      durationSeconds: template.durationSeconds,
      captionPosition: template.captionPosition,
      slots: {
        ...(variant.caption ? { caption: variant.caption } : {}),
        ...(variant.slots?.setupText ? { setupText: variant.slots.setupText } : {}),
        ...(variant.slots?.dreadText ? { dreadText: variant.slots.dreadText } : {}),
      },
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
