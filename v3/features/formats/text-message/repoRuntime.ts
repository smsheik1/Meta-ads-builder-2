import type { StoredWebsiteResearchResult } from "../../research/types";
import type { TextMessageAdScene } from "../../scene/types";
import { createTextMessageAdScene } from "../../scene/createTextMessageScene";
import {
  extractTextMessageVariantsFromResponse,
  type TextMessageVariant,
} from "./generate";
import { DEFAULT_TEXT_MESSAGE_VARIANT_COUNT } from "./prompt";
import { validateTextMessageScene } from "./validate";

export type TextMessageResearch = {
  websiteUrl: string;
  brandName: string;
  description: string;
  offer: string;
  audience: string;
  ctaDirection: string;
  colors: string[];
  fontFeel: "serif" | "sans" | "display" | "mono" | "unknown";
  buyerMoments: string[];
  proof: string[];
  siteLanguage: string[];
};

export type TextMessageVariantPack = {
  variants: TextMessageVariant[];
};

const clean = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const validUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const promptLikeText = /\b(?:(?:ignore|disregard|forget|override|bypass|follow|obey|reveal|expose|print|show|repeat|send)\b.{0,80}\b(?:(?:previous|prior|earlier|above|system|developer|assistant|hidden|internal|all|every)\s+)?(?:instructions?|directions?|prompts?|messages?|rules?|policies?|secrets?)|(?:you are now|act as|pretend to be|switch (?:to|into))\b.{0,60}\b(?:system|developer|assistant|administrator|admin|agent|role|mode)|system prompt|developer message|assistant instructions?|role change|return only|output format)\b/i;
const prohibitedConversationText = /\b(?:click here|sign up now|book now|get started|learn more|limited time|shop now|buy now|unlock|elevate|game-changer|transform|revolutionary|supercharge|level up|guaranteed?|risk[- ]?free|results? in|works? in|overnight|instant(?:ly)?|miracle|never fails?)\b|https?:\/\/|www\.|#\w|\$\s*\d|\d+(?:\.\d+)?%/i;
const emoji = /\p{Extended_Pictographic}/u;
const fingerprint = (value: string) => value
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

export const textMessageResearchTemplate = (websiteUrl: string): TextMessageResearch => ({
  websiteUrl,
  brandName: "",
  description: "",
  offer: "",
  audience: "",
  ctaDirection: "",
  colors: [],
  fontFeel: "unknown",
  buyerMoments: [],
  proof: [],
  siteLanguage: [],
});

export const validateTextMessageResearch = (research: TextMessageResearch) => {
  const errors: string[] = [];
  if (!validUrl(research.websiteUrl)) errors.push("websiteUrl must be a valid URL.");
  if (!clean(research.brandName, 100)) errors.push("brandName is required.");
  if (!clean(research.description, 240)) errors.push("description is required.");
  if (!clean(research.offer, 240)) errors.push("offer is required.");
  if (!clean(research.audience, 180)) errors.push("audience is required.");
  if (!clean(research.ctaDirection, 80)) errors.push("ctaDirection is required.");
  if (!research.colors.length || research.colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) {
    errors.push("colors must contain at least one six-digit hex color.");
  }
  if (research.buyerMoments.length < 2) errors.push("Research needs at least two distinct buyer moments.");
  if (!research.proof.length) errors.push("Research needs at least one supported proof or offer detail.");

  for (const [field, value] of Object.entries({
    brandName: research.brandName,
    description: research.description,
    offer: research.offer,
    audience: research.audience,
    ctaDirection: research.ctaDirection,
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
      const key = normalized.toLowerCase();
      if (seen.has(key)) errors.push(`${field}[${index}] duplicates another item.`);
      seen.add(key);
    });
  }

  return errors;
};

export const toStoredTextMessageResearch = (
  research: TextMessageResearch,
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
      faviconUrl: null,
      logoUrl: null,
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
      siteLanguage: research.siteLanguage.map((item) => clean(item, 160)),
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

export const parseTextMessageVariantPack = (
  pack: TextMessageVariantPack,
  research: TextMessageResearch,
) => {
  const researchErrors = validateTextMessageResearch(research);
  if (researchErrors.length) throw new Error(researchErrors.join("\n"));
  const contentErrors: string[] = [];
  const openings = new Set<string>();
  const conversations = new Set<string>();
  pack.variants.forEach((variant, index) => {
    const messageText = variant.messages.map((message) => clean(message.text, 200));
    const opening = fingerprint(messageText[0] ?? "");
    const conversation = messageText.map(fingerprint).join("|");
    if (!opening) contentErrors.push(`variants[${index}] needs an opening message.`);
    if (openings.has(opening)) contentErrors.push(`variants[${index}] duplicates another opening.`);
    if (conversations.has(conversation)) contentErrors.push(`variants[${index}] duplicates another conversation.`);
    if (messageText.some((text) => prohibitedConversationText.test(text) || emoji.test(text))) {
      contentErrors.push(`variants[${index}] contains prohibited ad copy, links, numbers, hashtags, or emoji.`);
    }
    openings.add(opening);
    conversations.add(conversation);
  });
  if (contentErrors.length) throw new Error(contentErrors.join("\n"));
  return extractTextMessageVariantsFromResponse(
    JSON.stringify(pack),
    clean(research.brandName, 100),
    DEFAULT_TEXT_MESSAGE_VARIANT_COUNT,
    "Host agent",
  );
};

export const createTextMessageScenesFromRun = ({
  research,
  runId,
  variants,
}: {
  research: TextMessageResearch;
  runId: string;
  variants: TextMessageVariant[];
}): TextMessageAdScene[] => {
  const stored = toStoredTextMessageResearch(research, runId);
  const scenes = variants.map((variant, index) => createTextMessageAdScene({
    research: stored,
    variant,
    candidateIndex: index,
    generationBatchId: runId,
    model: "host-agent",
    provider: "deterministic",
    now: 0,
  }));
  const errors = scenes.flatMap((scene, index) => (
    validateTextMessageScene(scene).errors.map((error) => `scene ${index + 1}: ${error}`)
  ));
  if (errors.length) throw new Error(errors.join("\n"));
  return scenes;
};
