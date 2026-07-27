import {
  applyVoiceVisualizerPreset,
  explainVoiceVisualizerPresetFromAnalysis,
} from "../../audio/visualizerPresets";
import { createVisualizerAdScene } from "../../scene/createVisualizerScene";
import type {
  AdSceneAudioAnalysis,
  AdSceneCaption,
  HeadlineType,
  VisualizerAdScene,
} from "../../scene/types";
import type {
  BrandAdAngle,
  StoredWebsiteResearchResult,
} from "../../research/types";
import {
  cleanDialogueScriptForVoiceover,
  type DialogueScript,
} from "../../dialogue/dialogueScripts";

export const VISUALIZER_DIALOGUE_COUNT = 5;
export const VISUALIZER_LINES_PER_DIALOGUE = 6;
export const VISUALIZER_TTS_MODEL = "gemini-3.1-flash-tts-preview";
export const VISUALIZER_TTS_AUDIO_TOKENS_PER_SECOND = 25;
export const VISUALIZER_TTS_OUTPUT_PRICE_PER_MILLION_TOKENS_USD = 20;

export type VisualizerEvidence = {
  text: string;
  sourceUrl: string;
};

export type VisualizerResearch = {
  websiteUrl: string;
  brandName: string;
  description: string;
  offer: string;
  audience: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: string[];
  fontFeel: "serif" | "sans" | "display" | "mono" | "unknown";
  buyerMoments: VisualizerEvidence[];
  specificClaims: VisualizerEvidence[];
  exactSiteLanguage: VisualizerEvidence[];
  namedProof: VisualizerEvidence[];
  adAngles: BrandAdAngle[];
  creative: {
    angleId: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    headlineType: HeadlineType;
    selectedPain: string;
    selectedProof: string;
  };
};

export type VisualizerDialogueOptions = {
  scripts: DialogueScript[];
};

export type VisualizerDialogueSelection = {
  selectedIndex: number;
  reason: string;
};

export type VisualizerAudioArtifact = {
  path: string;
  publicUrl: string;
  mimeType: string;
  durationMs: number;
  transcript: string;
  captions: AdSceneCaption[];
  analysis?: AdSceneAudioAnalysis;
  provider: "gemini" | "upload";
  model: string;
};

const clean = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/[—–]/g, ", ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const unique = (values: string[]) => values.filter((value, index, all) => (
  all.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index
));

const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

const validateEvidence = (
  items: VisualizerEvidence[],
  label: string,
) => items.flatMap((item, index) => {
  const errors: string[] = [];
  if (!clean(item.text, 240)) errors.push(`${label}[${index}].text is required.`);
  try {
    new URL(item.sourceUrl);
  } catch {
    errors.push(`${label}[${index}].sourceUrl must be a valid URL.`);
  }
  return errors;
});

export const estimateVisualizerVoiceCost = (durationSeconds: number) => {
  const seconds = Math.max(0, Number(durationSeconds) || 0);
  const audioTokens = seconds * VISUALIZER_TTS_AUDIO_TOKENS_PER_SECOND;
  return Math.round(
    (audioTokens / 1_000_000) *
    VISUALIZER_TTS_OUTPUT_PRICE_PER_MILLION_TOKENS_USD *
    100_000,
  ) / 100_000;
};

export const validateVisualizerResearch = (research: VisualizerResearch) => {
  const errors: string[] = [];
  try {
    new URL(research.websiteUrl);
  } catch {
    errors.push("websiteUrl must be a valid URL.");
  }
  if (!clean(research.brandName, 100)) errors.push("brandName is required.");
  if (!clean(research.description, 240)) errors.push("description is required.");
  if (!clean(research.offer, 240)) errors.push("offer is required.");
  if (!clean(research.audience, 180)) errors.push("audience is required.");
  if (!research.colors.length || research.colors.some((color) => !isHex(color))) {
    errors.push("colors must contain at least one six-digit hex color.");
  }
  if (!clean(research.creative.angleId, 100)) errors.push("creative.angleId is required.");
  if (!clean(research.creative.headline, 120)) errors.push("creative.headline is required.");
  if (!clean(research.creative.subheadline, 220)) errors.push("creative.subheadline is required.");
  if (!clean(research.creative.ctaText, 80)) errors.push("creative.ctaText is required.");
  if (!clean(research.creative.selectedPain, 180)) errors.push("creative.selectedPain is required.");
  if (!clean(research.creative.selectedProof, 180)) errors.push("creative.selectedProof is required.");
  errors.push(...validateEvidence(research.buyerMoments, "buyerMoments"));
  errors.push(...validateEvidence(research.specificClaims, "specificClaims"));
  errors.push(...validateEvidence(research.exactSiteLanguage, "exactSiteLanguage"));
  errors.push(...validateEvidence(research.namedProof, "namedProof"));
  if (![
    ...research.specificClaims,
    ...research.namedProof,
  ].some((item) => clean(item.text) && item.sourceUrl)) {
    errors.push("Research needs at least one specific claim or named proof with a source URL.");
  }
  return errors;
};

const expectedSpeaker = (lineIndex: number) => (lineIndex % 2 === 0 ? "Ava" : "Sam");

export const validateVisualizerDialogueOptions = (
  options: VisualizerDialogueOptions,
  selection: VisualizerDialogueSelection,
) => {
  const errors: string[] = [];
  if (options.scripts.length !== VISUALIZER_DIALOGUE_COUNT) {
    errors.push(`dialogue-options.json must contain exactly ${VISUALIZER_DIALOGUE_COUNT} scripts.`);
  }

  options.scripts.forEach((script, scriptIndex) => {
    if (script.lines.length !== VISUALIZER_LINES_PER_DIALOGUE) {
      errors.push(`Script ${scriptIndex + 1} must contain exactly ${VISUALIZER_LINES_PER_DIALOGUE} lines.`);
    }
    if (!clean(script.title, 80)) errors.push(`Script ${scriptIndex + 1} needs a title.`);
    if (!clean(script.angle, 160)) errors.push(`Script ${scriptIndex + 1} needs an angle.`);
    script.lines.forEach((line, lineIndex) => {
      if (line.speaker !== expectedSpeaker(lineIndex)) {
        errors.push(`Script ${scriptIndex + 1} line ${lineIndex + 1} must use ${expectedSpeaker(lineIndex)}.`);
      }
      if (!clean(line.text, 180)) {
        errors.push(`Script ${scriptIndex + 1} line ${lineIndex + 1} needs text.`);
      }
    });
  });

  if (
    !Number.isInteger(selection.selectedIndex) ||
    selection.selectedIndex < 0 ||
    selection.selectedIndex >= options.scripts.length
  ) {
    errors.push("selection.json selectedIndex must point to one of the five scripts.");
  }
  if (!clean(selection.reason, 240)) errors.push("selection.json reason is required.");

  const uniqueAngles = unique(options.scripts.map((script) => clean(script.angle, 160)).filter(Boolean));
  if (uniqueAngles.length < Math.min(VISUALIZER_DIALOGUE_COUNT, options.scripts.length)) {
    errors.push("The five scripts must use distinct angles.");
  }
  return errors;
};

export const getSelectedVisualizerDialogue = (
  options: VisualizerDialogueOptions,
  selection: VisualizerDialogueSelection,
) => {
  const script = options.scripts[selection.selectedIndex];
  if (!script) throw new Error("The selected dialogue script is missing.");
  return cleanDialogueScriptForVoiceover(script);
};

const textList = (items: VisualizerEvidence[]) => items.map((item) => clean(item.text, 220)).filter(Boolean);

export const toStoredVisualizerResearch = (
  research: VisualizerResearch,
  runId: string,
): StoredWebsiteResearchResult => {
  const url = new URL(research.websiteUrl);
  const proof = textList(research.specificClaims);
  const buyerMoments = textList(research.buyerMoments);
  const siteLanguage = textList(research.exactSiteLanguage);
  const namedProof = textList(research.namedProof);
  return {
    websiteUrl: research.websiteUrl,
    finalUrl: research.websiteUrl,
    host: url.host,
    brand: {
      name: research.brandName,
      url: research.websiteUrl,
      host: url.host,
      title: research.brandName,
      description: research.description,
      faviconUrl: research.faviconUrl,
      logoUrl: research.logoUrl,
      ogImageUrl: null,
      screenshotUrl: null,
      colors: research.colors,
      fonts: {
        feel: research.fontFeel,
      },
      vibeTags: [],
    },
    brandBrief: {
      brandName: research.brandName,
      offer: research.offer,
      audience: research.audience,
      buyerMoments,
      proof,
      siteLanguage,
      ctaDirection: research.creative.ctaText,
      visualNotes: [],
      droppedNoiseSummary: [],
      confidence: "high",
    },
    adAngles: research.adAngles,
    evidence: {
      headings: [],
      paragraphs: [],
      receipts: {
        specificClaims: proof,
        buyerMoments,
        exactSiteLanguage: siteLanguage,
        namedProof,
      },
      rawMarkdown: "",
    },
    metadata: {},
    branding: {},
    providerStatus: [],
    sessionId: `agent-${runId}`,
    researchRunId: runId,
    brandSnapshotId: `brand-${runId}`,
  };
};

export const createVisualizerSceneFromRun = ({
  audio,
  research,
  runId,
}: {
  audio?: VisualizerAudioArtifact;
  research: VisualizerResearch;
  runId: string;
}): VisualizerAdScene => {
  const scene = createVisualizerAdScene({
    research: toStoredVisualizerResearch(research, runId),
    candidate: research.creative,
    candidateIndex: 0,
    generationBatchId: runId,
    model: "host-agent",
    provider: "deterministic",
    now: Date.now(),
  });
  if (!audio) return scene;

  const nextVisualizer = audio.analysis
    ? applyVoiceVisualizerPreset(
      scene.style.visualizer!,
      explainVoiceVisualizerPresetFromAnalysis(audio.analysis, audio.durationMs).presetId,
    )
    : scene.style.visualizer;

  return {
    ...scene,
    style: {
      ...scene.style,
      visualizer: nextVisualizer,
    },
    audio: {
      status: "generated",
      storageId: `agent-${runId}`,
      url: audio.publicUrl,
      mimeType: audio.mimeType,
      durationMs: audio.durationMs,
      durationSeconds: audio.durationMs / 1000,
      transcript: audio.transcript,
      captions: audio.captions,
      analysis: audio.analysis,
      provider: audio.provider,
      model: audio.model,
      generatedAt: Date.now(),
    },
  };
};
