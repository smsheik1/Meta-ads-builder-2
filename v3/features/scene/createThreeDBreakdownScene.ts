import type { ThreeDBreakdownSiteContract, ThreeDBreakdownVariant } from "../formats/three-d-breakdown/generate";
import { getThreeDBreakdownMusicBed, getThreeDBreakdownMusicBedId, THREE_D_BREAKDOWN_DURATION_MS } from "../formats/three-d-breakdown/music";
import type { ThreeDBreakdownEvidenceItem } from "../formats/three-d-breakdown/evidence";
import type { StoredWebsiteResearchResult } from "../research/types";
import { pickSceneAccentColor } from "./createVisualizerScene";
import {
  AD_SCENE_VERSION,
  type ThreeDBreakdownAdScene,
} from "./types";

export function createThreeDBreakdownAdScene({
  candidateIndex,
  evidenceItems,
  generationBatchId,
  model,
  now = Date.now(),
  provider,
  research,
  siteContract,
  variant,
}: {
  candidateIndex: number;
  evidenceItems: ThreeDBreakdownEvidenceItem[];
  generationBatchId: string;
  model: string;
  now?: number;
  provider: ThreeDBreakdownAdScene["metadata"]["provider"];
  research: StoredWebsiteResearchResult;
  siteContract: ThreeDBreakdownSiteContract;
  variant: ThreeDBreakdownVariant;
}): ThreeDBreakdownAdScene {
  const evidence = evidenceItems.find((item) => item.evidenceIndex === variant.evidenceIndex);
  if (!evidence) throw new Error("3D Breakdown evidence item is missing.");
  const accentColor = pickSceneAccentColor(research.brand.colors);
  const musicBed = getThreeDBreakdownMusicBed(getThreeDBreakdownMusicBedId(candidateIndex));
  const firstBeat = variant.scriptBeats[0]!;
  const revelationBeat = variant.scriptBeats.find((beat) => beat.role === "revelation") || variant.scriptBeats[3]!;
  const punchlineBeat = variant.scriptBeats.find((beat) => beat.role === "punchline") || variant.scriptBeats[4]!;

  return {
    version: AD_SCENE_VERSION,
    format: "three-d-breakdown",
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
      angleId: `three-d-breakdown-${candidateIndex + 1}`,
      headline: firstBeat.narration,
      subheadline: variant.variantAngle,
      ctaText: punchlineBeat.narration,
      headlineType: "receipt_drop",
      selectedPain: variant.customerProblem,
      selectedProof: revelationBeat.narration,
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
      preset: "three-d-breakdown",
      durationMs: THREE_D_BREAKDOWN_DURATION_MS,
      scriptBeats: variant.scriptBeats as ThreeDBreakdownAdScene["layout"]["scriptBeats"],
      shots: variant.shots as ThreeDBreakdownAdScene["layout"]["shots"],
      storyboardBoard: variant.storyboardBoard,
      musicBed,
      storyContract: {
        ...siteContract,
        variantAngle: variant.variantAngle,
        customerProblem: variant.customerProblem,
        mechanismSummary: variant.mechanismSummary,
        visualMetaphor: variant.visualMetaphor,
        evidenceIndex: variant.evidenceIndex,
        evidenceUseType: variant.evidenceUseType,
        wowMomentType: variant.wowMomentType,
        wowMoment: variant.wowMoment,
        viewerLearns: variant.viewerLearns,
        claimRisk: variant.claimRisk,
        claimRiskReason: variant.claimRiskReason,
      },
      groundedEvidence: {
        ...evidence,
        scrapedAt: now,
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
}
