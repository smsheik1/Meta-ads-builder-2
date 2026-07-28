import type { StoredWebsiteResearchResult } from "../../research/types";
import type { WereSorryAdScene } from "../../scene/types";
import { createWereSorryAdScene } from "../../scene/createWereSorryScene";
import {
  extractWereSorryVariantsFromResponse,
  type WereSorryVariant,
} from "./generate";
import { DEFAULT_WERE_SORRY_VARIANT_COUNT } from "./prompt";
import { validateWereSorryScene } from "./validate";

export type WereSorryResearch = {
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
  buyerMoments: string[];
  proof: string[];
  siteLanguage: string[];
  suitable: boolean;
  suitabilityReason: string;
};

export type WereSorryVariantPack = {
  suitable?: boolean;
  reason?: string;
  variants: Array<WereSorryVariant & {
    evidenceRefs?: string[];
  }>;
};

const clean = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const promptLikeText = /\b(?:(?:ignore|disregard|forget|override|bypass|follow|obey|reveal|expose|print|show|repeat|send|replace)\b.{0,100}\b(?:(?:previous|prior|earlier|above|system|developer|assistant|hidden|internal|all|every|requested)\s+)?(?:instructions?|directions?|prompts?|messages?|rules?|policies?|secrets?|json|output|environment variables?)|(?:use|treat)\b.{0,60}\b(?:website|page|text|content|evidence)\b.{0,40}\bas instructions?|(?:you are now|act as|pretend to be|switch (?:to|into))\b.{0,60}\b(?:system|developer|assistant|administrator|admin|agent|role|mode)|system prompt|developer message|assistant instructions?|role change|return only|output format|environment variables?)\b/i;
const unsafeConfession = /\b(?:patient care|medical outcome|health outcome|treatment|diagnos(?:e|is)|cure|prevent disease|insurance payout|legal outcome|lawsuit|data breach|physical safety|life[- ]saving|guaranteed?|risk[- ]?free|crisis|vulnerable people)\b/i;
const genericBrag = /\b(?:our (?:service|product) is (?:so )?good|customers? love us|we are the best|best in class)\b/i;
const promotionalJunk = /\b(?:click here|sign up now|book now|limited time|shop now|buy now|unlock|elevate|game-changer|transform|revolutionary|supercharge|level up)\b|https?:\/\/|www\.|#\w|\p{Extended_Pictographic}/iu;
const unsupportedAbsoluteClaim = /\b(?:always|every|guaranteed?|instantly|never)\b|\b\d+(?:\.\d+)?\b/i;
const fingerprint = (value: string) => clean(value, 600)
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

export const wereSorryResearchTemplate = (websiteUrl: string): WereSorryResearch => ({
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
  suitable: true,
  suitabilityReason: "",
});

export const validateWereSorryResearch = (research: WereSorryResearch) => {
  const errors: string[] = [];
  if (!URL.canParse(research.websiteUrl)) errors.push("websiteUrl must be a valid URL.");
  if (!clean(research.brandName, 100)) errors.push("brandName is required.");
  if (!clean(research.description, 240)) errors.push("description is required.");
  if (!clean(research.offer, 240)) errors.push("offer is required.");
  if (!clean(research.audience, 180)) errors.push("audience is required.");
  if (!clean(research.ctaDirection, 80)) errors.push("ctaDirection is required.");
  if (!research.colors.length || research.colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) {
    errors.push("colors must contain at least one six-digit hex color.");
  }
  if (research.buyerMoments.length < 2) errors.push("Research needs at least two distinct buyer moments.");
  if (research.proof.length < 2) errors.push("Research needs at least two supported proof or offer details.");
  if (!research.suitable) {
    errors.push(`We're Sorry is unsuitable for this website: ${clean(research.suitabilityReason, 180) || "no reason supplied"}.`);
  }

  for (const [field, value] of Object.entries({
    brandName: research.brandName,
    description: research.description,
    offer: research.offer,
    audience: research.audience,
    ctaDirection: research.ctaDirection,
    suitabilityReason: research.suitabilityReason,
  })) {
    if (promptLikeText.test(clean(value, 400))) errors.push(`${field} looks like page instructions.`);
  }

  for (const [field, values] of Object.entries({
    buyerMoments: research.buyerMoments,
    proof: research.proof,
    siteLanguage: research.siteLanguage,
  })) {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const normalized = clean(value, 280);
      if (!normalized) errors.push(`${field}[${index}] is empty.`);
      if (promptLikeText.test(normalized)) errors.push(`${field}[${index}] looks like page instructions.`);
      const key = fingerprint(normalized);
      if (seen.has(key)) errors.push(`${field}[${index}] duplicates another item.`);
      seen.add(key);
    });
  }

  return errors;
};

export const toStoredWereSorryResearch = (
  research: WereSorryResearch,
  runId: string,
): StoredWebsiteResearchResult => {
  const website = new URL(research.websiteUrl);
  return {
    websiteUrl: research.websiteUrl,
    finalUrl: research.websiteUrl,
    host: website.host,
    brand: {
      name: clean(research.brandName, 100),
      url: research.websiteUrl,
      host: website.host,
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
      buyerMoments: research.buyerMoments.map((item) => clean(item, 280)),
      proof: research.proof.map((item) => clean(item, 280)),
      siteLanguage: research.siteLanguage.map((item) => clean(item, 180)),
      ctaDirection: clean(research.ctaDirection, 80),
      visualNotes: [],
      droppedNoiseSummary: [],
      confidence: "high",
    },
    adAngles: [],
    evidence: {
      headings: [],
      paragraphs: research.proof,
      receipts: {
        specificClaims: research.proof,
        buyerMoments: research.buyerMoments,
        exactSiteLanguage: research.siteLanguage,
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

export const parseWereSorryVariantPack = (
  pack: WereSorryVariantPack,
  research: WereSorryResearch,
) => {
  const researchErrors = validateWereSorryResearch(research);
  if (researchErrors.length) throw new Error(researchErrors.join("\n"));
  if (pack.suitable === false) {
    throw new Error(`Host agent marked We're Sorry unsuitable: ${clean(pack.reason, 180) || "no reason supplied"}.`);
  }
  const variants = extractWereSorryVariantsFromResponse(
    JSON.stringify({ suitable: true, variants: pack.variants }),
    DEFAULT_WERE_SORRY_VARIANT_COUNT,
    "Host agent",
  );
  const errors: string[] = [];
  const confessions = new Set<string>();
  const allowedEvidence = new Map(
    [
      research.offer,
      ...research.buyerMoments,
      ...research.proof,
      ...research.siteLanguage,
    ].map((value) => [fingerprint(value), clean(value, 280)]),
  );
  variants.forEach((variant, index) => {
    const sourceVariant = pack.variants[index];
    const evidenceRefs = Array.isArray(sourceVariant?.evidenceRefs)
      ? sourceVariant.evidenceRefs.map((value) => clean(value, 280)).filter(Boolean)
      : [];
    if (!evidenceRefs.length) {
      errors.push(`variants[${index}].evidenceRefs must cite at least one exact research item.`);
    }
    evidenceRefs.forEach((reference, referenceIndex) => {
      if (!allowedEvidence.has(fingerprint(reference))) {
        errors.push(`variants[${index}].evidenceRefs[${referenceIndex}] is not exact research evidence.`);
      }
    });
    const fullCopy = [
      variant.apologyHeader,
      variant.legalOpener,
      ...variant.confessions,
      variant.signoff,
    ].join(" ");
    if (unsafeConfession.test(fullCopy)) {
      errors.push(`variants[${index}] enters trust-sensitive territory.`);
    }
    if (promotionalJunk.test(fullCopy)) {
      errors.push(`variants[${index}] contains promotional or prompt-like copy.`);
    }
    variant.confessions.forEach((confession, confessionIndex) => {
      const key = fingerprint(confession);
      if (genericBrag.test(confession)) {
        errors.push(`variants[${index}].confessions[${confessionIndex}] is a generic brag.`);
      }
      if (
        unsupportedAbsoluteClaim.test(confession) &&
        !evidenceRefs.some((reference) => (
          unsupportedAbsoluteClaim.test(reference) &&
          fingerprint(confession).includes(fingerprint(reference))
        ))
      ) {
        errors.push(`variants[${index}].confessions[${confessionIndex}] adds an unsupported absolute or measurable claim.`);
      }
      if (confessions.has(key)) {
        errors.push(`variants[${index}].confessions[${confessionIndex}] duplicates another confession.`);
      }
      confessions.add(key);
    });
  });
  if (errors.length) throw new Error(errors.join("\n"));
  return variants;
};

export const createWereSorryScenesFromRun = ({
  research,
  runId,
  variants,
}: {
  research: WereSorryResearch;
  runId: string;
  variants: WereSorryVariant[];
}): WereSorryAdScene[] => {
  const stored = toStoredWereSorryResearch(research, runId);
  const scenes = variants.map((variant, index) => createWereSorryAdScene({
    research: stored,
    variant,
    candidateIndex: index,
    generationBatchId: runId,
    model: "host-agent",
    provider: "deterministic",
    now: 0,
  }));
  const errors = scenes.flatMap((scene, index) => (
    validateWereSorryScene(scene).errors.map((error) => `scene ${index + 1}: ${error}`)
  ));
  if (errors.length) throw new Error(errors.join("\n"));
  return scenes;
};
