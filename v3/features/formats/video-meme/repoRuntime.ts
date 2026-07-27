import type { StoredWebsiteResearchResult } from "../../research/types";
import type { VideoMemeAdScene } from "../../scene/types";
import { createVideoMemeAdScene } from "../../scene/createVideoMemeScene";
import {
  extractVideoMemeVariantsFromResponse,
  type VideoMemeMode,
  type VideoMemeVariant,
} from "./generate";
import { getVideoMemeTemplate, type VideoMemeTemplateId } from "./templates";
import { validateVideoMemeScene } from "./validate";

export type VideoMemeEvidenceItem = {
  text: string;
  sourceUrl: string | null;
};

export type VideoMemeResearch = {
  sourceType: "website" | "brief";
  websiteUrl: string | null;
  brandName: string;
  offer: string;
  audience: string;
  buyerMoments: VideoMemeEvidenceItem[];
  proof: VideoMemeEvidenceItem[];
  siteLanguage: VideoMemeEvidenceItem[];
  colors: string[];
  adAngles: Array<{
    buyer: string;
    moment: string;
    pain: string;
    proof: string;
    sitePhrase: string | null;
  }>;
};

export type VideoMemePlan = {
  version: 1;
  angle: string;
  target: string;
  templateId: VideoMemeTemplateId;
  mode: VideoMemeMode;
  slots: {
    caption?: string;
    setupText?: string;
    dreadText?: string;
  };
  selfCheckPassed: string;
  selectedEvidenceIndexes: number[];
};

const text = (value: string) => value.trim();

export const flattenVideoMemeEvidence = (research: VideoMemeResearch) => [
  ...research.buyerMoments,
  ...research.proof,
  ...research.siteLanguage,
];

export function validateVideoMemeResearch(research: VideoMemeResearch) {
  const errors: string[] = [];
  if (!text(research.brandName)) errors.push("brandName is required.");
  if (!text(research.offer)) errors.push("offer is required.");
  if (!text(research.audience)) errors.push("audience is required.");
  if (!research.buyerMoments.some((item) => text(item.text))) {
    errors.push("At least one buyer moment is required.");
  }
  if (research.sourceType === "website") {
    if (!research.websiteUrl) errors.push("websiteUrl is required for website research.");
    for (const item of flattenVideoMemeEvidence(research)) {
      if (text(item.text) && !item.sourceUrl) {
        errors.push(`Website evidence needs a sourceUrl: ${item.text}`);
      }
    }
  }
  return errors;
}

export function toStoredVideoMemeResearch(
  research: VideoMemeResearch,
  runId = "agent-run",
): StoredWebsiteResearchResult {
  const websiteUrl = research.websiteUrl || "https://brief.local";
  const host = research.websiteUrl
    ? new URL(research.websiteUrl).host
    : "brief.local";
  const buyerMoments = research.buyerMoments.map((item) => text(item.text)).filter(Boolean);
  const proof = research.proof.map((item) => text(item.text)).filter(Boolean);
  const siteLanguage = research.siteLanguage.map((item) => text(item.text)).filter(Boolean);

  return {
    websiteUrl,
    finalUrl: websiteUrl,
    host,
    brand: {
      name: text(research.brandName),
      url: websiteUrl,
      host,
      title: text(research.brandName),
      description: text(research.offer),
      faviconUrl: null,
      logoUrl: null,
      ogImageUrl: null,
      screenshotUrl: null,
      colors: research.colors,
      fonts: { feel: "unknown" },
      vibeTags: [],
    },
    brandBrief: {
      brandName: text(research.brandName),
      offer: text(research.offer),
      audience: text(research.audience),
      buyerMoments,
      proof,
      siteLanguage,
      ctaDirection: "Learn more",
      visualNotes: [],
      droppedNoiseSummary: [],
      confidence: research.sourceType === "website" ? "high" : "medium",
    },
    adAngles: research.adAngles,
    evidence: {
      headings: [],
      paragraphs: [],
      receipts: {
        specificClaims: proof,
        buyerMoments,
        exactSiteLanguage: siteLanguage,
        namedProof: proof,
      },
      rawMarkdown: "",
    },
    metadata: {},
    branding: {},
    providerStatus: [],
    sessionId: `video-meme-${runId}`,
    researchRunId: `video-meme-research-${runId}`,
    brandSnapshotId: `video-meme-brand-${runId}`,
  };
}

export function videoMemePlanToVariant(
  plan: VideoMemePlan,
  brandNames: string[] = [],
): VideoMemeVariant {
  const template = getVideoMemeTemplate(plan.templateId);
  if (!template) throw new Error(`Unknown video meme template: ${plan.templateId}`);

  const responseVariant = plan.templateId === "pingu-noot-noot"
    ? {
        angle: plan.angle,
        templateId: plan.templateId,
        slots: {
          setupText: plan.slots.setupText,
          dreadText: plan.slots.dreadText,
        },
        selfCheckPassed: plan.selfCheckPassed,
      }
    : plan.templateId === "darwin-journey"
      ? {
          angle: plan.angle,
          templateId: plan.templateId,
          mode: plan.mode,
          slots: { caption: plan.slots.caption },
          selfCheckPassed: plan.selfCheckPassed,
        }
      : {
          angle: plan.angle,
          target: plan.target,
          clipId: plan.templateId,
          caption: plan.slots.caption,
          mode: plan.mode,
          selfCheckPassed: plan.selfCheckPassed,
        };

  return extractVideoMemeVariantsFromResponse(
    JSON.stringify({ variants: [responseVariant] }),
    {
      brandNames,
      count: 1,
      templateId: plan.templateId,
    },
  )[0]!;
}

export function validateVideoMemePlan(
  research: VideoMemeResearch,
  plan: VideoMemePlan,
) {
  const errors = validateVideoMemeResearch(research);
  const evidence = flattenVideoMemeEvidence(research);
  if (!plan.selectedEvidenceIndexes.length) {
    errors.push("Select at least one evidence item.");
  }
  for (const index of plan.selectedEvidenceIndexes) {
    if (!Number.isInteger(index) || index < 0 || index >= evidence.length) {
      errors.push(`Evidence index ${index} is invalid.`);
    }
  }

  try {
    videoMemePlanToVariant(plan, [research.brandName]);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Video meme plan is invalid.");
  }
  return errors;
}

export function createVideoMemeSceneFromPlan({
  research,
  plan,
  runId = "agent-run",
  now = Date.now(),
}: {
  research: VideoMemeResearch;
  plan: VideoMemePlan;
  runId?: string;
  now?: number;
}): VideoMemeAdScene {
  const errors = validateVideoMemePlan(research, plan);
  if (errors.length) throw new Error(errors.join("\n"));
  const storedResearch = toStoredVideoMemeResearch(research, runId);
  const variant = videoMemePlanToVariant(plan, [research.brandName]);
  const scene = createVideoMemeAdScene({
    research: storedResearch,
    variant,
    candidateIndex: 0,
    generationBatchId: `video-meme-batch-${runId}`,
    model: "host-agent",
    provider: "deterministic",
    now,
  });
  const sceneValidation = validateVideoMemeScene(scene);
  if (!sceneValidation.valid) throw new Error(sceneValidation.errors.join("\n"));
  return scene;
}
