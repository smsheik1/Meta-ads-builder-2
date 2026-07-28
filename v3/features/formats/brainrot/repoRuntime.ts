import type {
  AdSceneAudioAnalysis,
  AdSceneCaption,
  BrainrotAdScene,
} from "../../scene/types";
import type {
  BrandAdAngle,
  StoredWebsiteResearchResult,
} from "../../research/types";
import { createBrainrotAdScene } from "../../scene/createBrainrotScene";
import {
  extractBrainrotVariantsFromResponse,
  type BrainrotBeat,
  type BrainrotVariant,
} from "./generate";
import { BRAINROT_VARIANT_COUNT, buildBrainrotPrompt } from "./prompt";

export type BrainrotEvidence = {
  text: string;
  sourceUrl: string;
};

export type BrainrotResearch = {
  websiteUrl: string;
  brandName: string;
  description: string;
  offer: string;
  audience: string;
  ctaDirection: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: string[];
  fontFeel: "serif" | "sans" | "display" | "mono" | "unknown";
  buyerMoments: BrainrotEvidence[];
  proof: BrainrotEvidence[];
  siteLanguage: BrainrotEvidence[];
  adAngles: BrandAdAngle[];
};

export type BrainrotScriptOption = BrainrotVariant & {
  evidenceRefs: string[];
};

export type BrainrotScriptOptions = {
  variants: BrainrotScriptOption[];
};

export type BrainrotSelection = {
  selectedIndex: number;
  reason: string;
};

export type BrainrotAudioArtifact = {
  path: string;
  publicUrl: string;
  mimeType: string;
  durationMs: number;
  transcript: string;
  captions: AdSceneCaption[];
  analysis?: AdSceneAudioAnalysis;
  beats: BrainrotBeat[];
  provider: "fish-studio" | "fixture";
  model: string;
};

const clean = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const fingerprint = (value: string) => clean(value, 600)
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

const promptLikeText = /\b(?:(?:ignore|disregard|forget|override|bypass|follow|obey|reveal|expose|print|show|repeat|send|replace)\b.{0,100}\b(?:(?:previous|prior|earlier|above|system|developer|assistant|hidden|internal|all|every|requested)\s+)?(?:instructions?|directions?|prompts?|messages?|rules?|policies?|secrets?|json|output|environment variables?)|(?:use|treat)\b.{0,60}\b(?:website|page|text|content|evidence)\b.{0,40}\bas instructions?|(?:you are now|act as|pretend to be|switch (?:to|into))\b.{0,60}\b(?:system|developer|assistant|administrator|admin|agent|role|mode)|system prompt|developer message|assistant instructions?|role change|return only|output format|environment variables?)\b/i;
const unsupportedAbsolute = /\b(?:guarantee(?:d|s)?|risk[- ]?free)\b|\b(?:always|never|instantly)\b.{0,60}\b(?:cure(?:s|d)?|deliver(?:s|ed)?|fix(?:es|ed)?|improve(?:s|d)?|increase(?:s|d)?|prevent(?:s|ed)?|solve(?:s|d)?|succeed(?:s|ed)?|work(?:s|ed)?|win(?:s|ning)?)\b|\bevery\b.{0,30}\b(?:ad|campaign|customer|order|problem|result|sale)\b/i;
const measurableClaim = /\b\d+(?:\.\d+)?%?\b/g;
const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

const validateEvidence = (items: BrainrotEvidence[], label: string) => items.flatMap((item, index) => {
  const errors: string[] = [];
  const text = clean(item.text, 280);
  if (!text) errors.push(`${label}[${index}].text is required.`);
  if (promptLikeText.test(text)) errors.push(`${label}[${index}].text looks like page instructions.`);
  if (!URL.canParse(item.sourceUrl)) errors.push(`${label}[${index}].sourceUrl must be a valid URL.`);
  return errors;
});

export const brainrotResearchTemplate = (websiteUrl: string): BrainrotResearch => ({
  websiteUrl,
  brandName: "",
  description: "",
  offer: "",
  audience: "",
  ctaDirection: "",
  logoUrl: null,
  faviconUrl: null,
  colors: [],
  fontFeel: "unknown",
  buyerMoments: [],
  proof: [],
  siteLanguage: [],
  adAngles: [],
});

export const validateBrainrotResearch = (research: BrainrotResearch) => {
  const errors: string[] = [];
  if (!URL.canParse(research.websiteUrl)) errors.push("websiteUrl must be a valid URL.");
  if (!clean(research.brandName, 100)) errors.push("brandName is required.");
  if (!clean(research.description, 240)) errors.push("description is required.");
  if (!clean(research.offer, 240)) errors.push("offer is required.");
  if (!clean(research.audience, 180)) errors.push("audience is required.");
  if (!clean(research.ctaDirection, 80)) errors.push("ctaDirection is required.");
  if (!research.colors.length || research.colors.some((color) => !isHex(color))) {
    errors.push("colors must contain at least one six-digit hex color.");
  }
  if (research.buyerMoments.length < 2) errors.push("Research needs at least two buyer moments.");
  if (research.proof.length < 1) errors.push("Research needs at least one supported proof point.");
  errors.push(...validateEvidence(research.buyerMoments, "buyerMoments"));
  errors.push(...validateEvidence(research.proof, "proof"));
  errors.push(...validateEvidence(research.siteLanguage, "siteLanguage"));

  for (const [field, value] of Object.entries({
    brandName: research.brandName,
    description: research.description,
    offer: research.offer,
    audience: research.audience,
    ctaDirection: research.ctaDirection,
  })) {
    if (promptLikeText.test(clean(value, 400))) errors.push(`${field} looks like page instructions.`);
  }

  return errors;
};

const evidenceText = (items: BrainrotEvidence[]) => items.map((item) => clean(item.text, 280)).filter(Boolean);

export const toStoredBrainrotResearch = (
  research: BrainrotResearch,
  runId: string,
): StoredWebsiteResearchResult => {
  const url = new URL(research.websiteUrl);
  const buyerMoments = evidenceText(research.buyerMoments);
  const proof = evidenceText(research.proof);
  const siteLanguage = evidenceText(research.siteLanguage);
  return {
    websiteUrl: research.websiteUrl,
    finalUrl: research.websiteUrl,
    host: url.host,
    brand: {
      name: clean(research.brandName, 100),
      url: research.websiteUrl,
      host: url.host,
      title: clean(research.brandName, 100),
      description: clean(research.description, 240),
      faviconUrl: research.faviconUrl,
      logoUrl: research.logoUrl,
      ogImageUrl: null,
      screenshotUrl: null,
      colors: research.colors,
      fonts: { feel: research.fontFeel },
      vibeTags: [],
    },
    brandBrief: {
      brandName: clean(research.brandName, 100),
      offer: clean(research.offer, 240),
      audience: clean(research.audience, 180),
      buyerMoments,
      proof,
      siteLanguage,
      ctaDirection: clean(research.ctaDirection, 80),
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
        namedProof: [],
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

export const buildBrainrotRepoPrompt = (research: BrainrotResearch, runId: string) => `${buildBrainrotPrompt(
  toStoredBrainrotResearch(research, runId),
  BRAINROT_VARIANT_COUNT,
)}

AUDIT REQUIREMENT:
After writing each variant, add "evidenceRefs": an array with one or more exact strings copied from the saved buyer moments, proof, or site language. Do not paraphrase these references.`;

export const validateBrainrotScriptOptions = (
  options: BrainrotScriptOptions,
  selection: BrainrotSelection,
  research: BrainrotResearch,
) => {
  const errors = validateBrainrotResearch(research);
  let parsed: BrainrotVariant[] = [];
  try {
    parsed = extractBrainrotVariantsFromResponse(
      JSON.stringify({ variants: options.variants }),
      research.brandName,
      "Host agent",
      BRAINROT_VARIANT_COUNT,
    );
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Brainrot scripts are invalid.");
  }

  const allowedEvidence = new Map(
    [
      ...research.buyerMoments,
      ...research.proof,
      ...research.siteLanguage,
    ].map((item) => [fingerprint(item.text), clean(item.text, 280)]),
  );

  options.variants.forEach((variant, index) => {
    const refs = Array.isArray(variant.evidenceRefs)
      ? variant.evidenceRefs.map((item) => clean(item, 280)).filter(Boolean)
      : [];
    if (!refs.length) errors.push(`Variant ${index + 1} needs at least one exact evidenceRefs item.`);
    refs.forEach((reference) => {
      if (!allowedEvidence.has(fingerprint(reference))) {
        errors.push(`Variant ${index + 1} cites evidence that is not in research.json: "${reference}".`);
      }
    });
    const script = variant.beats.map((beat) => beat.text).join(" ");
    if (unsupportedAbsolute.test(script)) {
      errors.push(`Variant ${index + 1} contains banned absolute-result language.`);
    }
    const citedText = refs.join(" ");
    const unsupportedNumbers = [...script.matchAll(measurableClaim)]
      .map((match) => match[0])
      .filter((number) => !citedText.includes(number));
    if (unsupportedNumbers.length) {
      errors.push(`Variant ${index + 1} contains a number that is not present in its cited evidence.`);
    }
  });

  if (
    !Number.isInteger(selection.selectedIndex) ||
    selection.selectedIndex < 0 ||
    selection.selectedIndex >= parsed.length
  ) {
    errors.push("selection.json selectedIndex must point to one of the three scripts.");
  }
  if (!clean(selection.reason, 240)) errors.push("selection.json reason is required.");
  return errors;
};

export const getSelectedBrainrotVariant = (
  options: BrainrotScriptOptions,
  selection: BrainrotSelection,
) => {
  const variant = options.variants[selection.selectedIndex];
  if (!variant) throw new Error("The selected Brainrot script is missing.");
  return {
    angle: variant.angle,
    beats: variant.beats,
    selfCheckPassed: variant.selfCheckPassed,
  } satisfies BrainrotVariant;
};

export const createBrainrotSceneFromRun = ({
  audio,
  research,
  runId,
  variant,
}: {
  audio?: BrainrotAudioArtifact;
  research: BrainrotResearch;
  runId: string;
  variant: BrainrotVariant;
}) => {
  const scene = createBrainrotAdScene({
    research: toStoredBrainrotResearch(research, runId),
    variant,
    candidateIndex: 0,
    generationBatchId: `agent-${runId}`,
    model: "host-agent",
    provider: "deterministic",
    now: 0,
  });
  if (!audio) return scene;
  return {
    ...scene,
    audio: {
      status: "generated",
      storageId: `agent-${runId}-brainrot-audio`,
      url: audio.publicUrl,
      mimeType: audio.mimeType,
      durationMs: audio.durationMs,
      durationSeconds: audio.durationMs / 1000,
      transcript: audio.transcript,
      captions: audio.captions,
      analysis: audio.analysis,
      provider: audio.provider === "fish-studio" ? "fish-studio" : "upload",
      model: audio.model,
      generatedAt: 0,
    },
    layout: {
      ...scene.layout,
      beats: audio.beats,
    },
  } satisfies BrainrotAdScene;
};
