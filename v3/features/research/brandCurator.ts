import { GoogleGenAI } from "@google/genai";
import type { BrandBrief, WebsiteResearchResult } from "./types";

type CuratableResearch = Omit<WebsiteResearchResult, "brandBrief"> & {
  brandBrief?: BrandBrief;
};

type GeminiGenerateContent = (input: { model: string; prompt: string }) => Promise<string>;

export type BrandCuratorOptions = {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  geminiGenerateContent?: GeminiGenerateContent;
};

export const DEFAULT_GEMINI_BRAND_CURATOR_MODEL = "gemini-3.1-flash-lite";

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_MARKDOWN_CHARS = 14_000;
const noisePattern = /\b(skip to content|cart is empty|continue shopping|log in|login|check out|checkout|add to cart|quantity|subtotal|loading|have an account|gift message|discount code|free shipping not applied|regular price|sale price|sold out|newsletter|privacy policy|terms of service|powered by tolstoy)\b/i;
const standalonePricePattern = /^(?:from\s+)?\$[\d,.]+(?:\s*-\s*\$[\d,.]+)?$/i;

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/^#{1,6}\s*/, "")
  .replace(/^\s*[-*]\s*/, "")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const isNoiseText = (value: unknown) => {
  const cleaned = cleanText(value, 260);
  if (!cleaned) return true;
  if (standalonePricePattern.test(cleaned)) return true;
  if (/~~\s*\$0\.00\s*~~/i.test(cleaned)) return true;
  if (/^_?\\?\*+/.test(cleaned)) return true;
  if (/^(search|menu|account)$/i.test(cleaned)) return true;
  if (noisePattern.test(cleaned)) return true;
  return false;
};

const unique = (items: unknown[], maxItems: number, maxLength = 220) => items
  .map((item) => cleanText(item, maxLength))
  .filter((item) => item.length >= 4)
  .filter((item) => !isNoiseText(item))
  .filter((item, index, all) => all.findIndex((candidate) => (
    candidate.toLowerCase() === item.toLowerCase()
  )) === index)
  .slice(0, maxItems);

const uniqueLoose = (items: unknown[], maxItems: number, maxLength = 220) => items
  .map((item) => cleanText(item, maxLength))
  .filter((item) => item.length >= 4)
  .filter((item, index, all) => all.findIndex((candidate) => (
    candidate.toLowerCase() === item.toLowerCase()
  )) === index)
  .slice(0, maxItems);

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

const firstUseful = (items: unknown[], fallback: string, maxLength = 180) => (
  unique(items, 1, maxLength)[0] || cleanText(fallback, maxLength)
);

const stripBrandPrefix = (value: string, brandName: string) => {
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanText(value.replace(new RegExp(`^${escaped}\\s*[:|–—-]\\s*`, "i"), ""), 180);
};

const titleParts = (title: string) => cleanText(title, 220)
  .split(/\s*[|:–—-]\s+/)
  .map((part) => cleanText(part, 120))
  .filter((part) => part.length >= 4);

const normalizeConfidence = (value: unknown, fallback: BrandBrief["confidence"]) => (
  value === "high" || value === "medium" || value === "low" ? value : fallback
);

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const parseJsonObject = (value: string) => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error("Gemini brand curator returned no JSON.");
  return JSON.parse(jsonText) as Record<string, unknown>;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const buildFallbackBrandBrief = (research: CuratableResearch): BrandBrief => {
  const receipts = research.evidence.receipts;
  const brandName = cleanText(research.brand.name, 80) || "Brand";
  const titleOffer = titleParts(research.brand.title)
    .map((part) => stripBrandPrefix(part, brandName))
    .find((part) => part && part.toLowerCase() !== brandName.toLowerCase());
  const offer = firstUseful([
    titleOffer,
    research.brand.description,
    ...receipts.exactSiteLanguage,
    ...research.evidence.headings,
  ], `A clearer way to choose ${brandName}`, 150);
  const proof = unique([
    ...receipts.specificClaims,
    ...receipts.namedProof,
    ...research.evidence.paragraphs,
    research.brand.description,
  ], 8);
  const buyerMoments = unique([
    ...receipts.buyerMoments,
    ...research.evidence.paragraphs,
    research.brand.description,
  ], 8);
  const siteLanguage = unique([
    research.brand.title,
    ...receipts.exactSiteLanguage,
    research.brand.description,
  ], 8);

  return {
    brandName,
    offer,
    audience: firstUseful([
      ...buyerMoments,
      research.brand.description,
    ], `People considering ${brandName}`, 150),
    buyerMoments,
    proof,
    siteLanguage,
    ctaDirection: "See the offer",
    visualNotes: unique([
      research.brand.colors.length ? `Use brand colors: ${research.brand.colors.join(", ")}` : "",
      research.brand.logoUrl ? "Use the brand logo when it is available." : "",
      research.brand.screenshotUrl ? "Website screenshot is available for future product-style formats." : "",
    ], 6),
    droppedNoiseSummary: [],
    confidence: proof.length || buyerMoments.length ? "medium" : "low",
  };
};

export const normalizeBrandBriefPayload = (
  payload: unknown,
  fallback: BrandBrief,
): BrandBrief => {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const record = root.brandBrief && typeof root.brandBrief === "object"
    ? root.brandBrief as Record<string, unknown>
    : root;
  const proof = unique(asArray(record.proof), 8);
  const buyerMoments = unique(asArray(record.buyerMoments), 8);
  const siteLanguage = unique(asArray(record.siteLanguage), 8);

  return {
    brandName: firstUseful([record.brandName], fallback.brandName, 80),
    offer: firstUseful([record.offer], fallback.offer, 150),
    audience: firstUseful([record.audience], fallback.audience, 150),
    buyerMoments: buyerMoments.length ? buyerMoments : fallback.buyerMoments,
    proof: proof.length ? proof : fallback.proof,
    siteLanguage: siteLanguage.length ? siteLanguage : fallback.siteLanguage,
    ctaDirection: firstUseful([record.ctaDirection], fallback.ctaDirection, 48),
    visualNotes: unique(asArray(record.visualNotes), 6).length
      ? unique(asArray(record.visualNotes), 6)
      : fallback.visualNotes,
    droppedNoiseSummary: uniqueLoose(asArray(record.droppedNoiseSummary), 8),
    confidence: normalizeConfidence(record.confidence, fallback.confidence),
  };
};

export const buildBrandCuratorPrompt = (research: CuratableResearch) => {
  const input = {
    brand: research.brand,
    finalUrl: research.finalUrl,
    evidence: {
      headings: research.evidence.headings.slice(0, 24),
      paragraphs: research.evidence.paragraphs.slice(0, 42),
      receipts: research.evidence.receipts,
      rawMarkdown: research.evidence.rawMarkdown.slice(0, MAX_MARKDOWN_CHARS),
    },
    metadata: research.metadata,
    branding: research.branding,
  };

  return `
You are Wiggly's website research curator.

Your job is NOT to write ads. Your job is to read messy website text and return the clean business meaning that ad generation should trust.

Ignore website chrome: navigation, cart text, login text, checkout copy, cookie banners, shipping banners, standalone prices, regular/sale price labels, empty states, footer links, app embeds, and loading messages.

Keep real brand substance:
- what the brand sells
- who it is for
- buyer moments or pains
- proof, specific claims, outcomes, differentiators, reviews, results
- exact short phrases that sound like the brand
- visual notes from branding/screenshot/colors

Return only JSON in this exact shape:
{
  "brandName": "short brand name",
  "offer": "one plain-language sentence saying what this brand sells",
  "audience": "one plain-language sentence saying who it is for",
  "buyerMoments": ["up to 8 specific moments or pains"],
  "proof": ["up to 8 specific claims, reviews, differentiators, or proof points"],
  "siteLanguage": ["up to 8 verbatim short phrases worth reusing"],
  "ctaDirection": "2-5 word CTA direction",
  "visualNotes": ["up to 6 concrete visual notes"],
  "droppedNoiseSummary": ["up to 8 examples of junk you ignored"],
  "confidence": "low | medium | high"
}

Rules:
- Do not invent facts, prices, reviews, numbers, guarantees, or claims.
- If evidence is thin, keep confidence low and use cautious wording.
- Do not include cart, login, checkout, loading, navigation, or standalone price text in buyerMoments, proof, or siteLanguage.
- Site language must be copied from the website evidence.

Website evidence:
${JSON.stringify(input, null, 2)}
`;
};

const callGeminiCurator = async ({
  apiKey,
  model,
  prompt,
  timeoutMs,
  geminiGenerateContent,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  timeoutMs: number;
  geminiGenerateContent?: GeminiGenerateContent;
}) => {
  if (geminiGenerateContent) {
    return withTimeout(geminiGenerateContent({ model, prompt }), timeoutMs, "Gemini brand curator");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  }), timeoutMs, "Gemini brand curator");

  return response.text || "{}";
};

export const curateWebsiteResearchResult = async (
  research: CuratableResearch,
  options: BrandCuratorOptions = {},
): Promise<WebsiteResearchResult> => {
  const fallback = buildFallbackBrandBrief(research);
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const model = options.model || process.env.GEMINI_BRAND_CURATOR_MODEL || DEFAULT_GEMINI_BRAND_CURATOR_MODEL;

  if (!apiKey || isDisabled(process.env.GEMINI_ENABLED)) {
    return {
      ...research,
      brandBrief: fallback,
      providerStatus: [
        ...research.providerStatus,
        {
          provider: "gemini-curator",
          status: "skipped",
          reason: "Gemini brand curator was not configured; used validated Firecrawl evidence.",
        },
      ],
    };
  }

  try {
    const content = await callGeminiCurator({
      apiKey,
      model,
      prompt: buildBrandCuratorPrompt(research),
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      geminiGenerateContent: options.geminiGenerateContent,
    });
    const brandBrief = normalizeBrandBriefPayload(parseJsonObject(content), fallback);

    return {
      ...research,
      brandBrief,
      providerStatus: [
        ...research.providerStatus,
        {
          provider: "gemini-curator",
          status: "used",
          reason: `Gemini curated website evidence into a brand brief with ${brandBrief.confidence} confidence.`,
        },
      ],
    };
  } catch (error) {
    const reason = error instanceof Error
      ? `${error.message} Used validated Firecrawl evidence.`
      : "Gemini brand curator failed; used validated Firecrawl evidence.";

    return {
      ...research,
      brandBrief: fallback,
      providerStatus: [
        ...research.providerStatus,
        {
          provider: "gemini-curator",
          status: "failed",
          reason,
        },
      ],
    };
  }
};
