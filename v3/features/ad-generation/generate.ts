import { GoogleGenAI } from "@google/genai";
import { isWebsiteChromeText } from "../research/firecrawl";
import type { StoredWebsiteResearchResult } from "../research/types";
import type { AdSceneCandidate, HeadlineType } from "../scene/types";
import { bannedAdWords, buildAdIdeasPrompt } from "./prompt";

type Fetcher = typeof fetch;
type GeminiGenerateContent = (input: { model: string; prompt: string }) => Promise<string>;

export const DEFAULT_AD_IDEA_COUNT = 50;
export const DEFAULT_GEMINI_AD_IDEA_MODEL = "gemini-3.1-flash-lite";
export const DEFAULT_OPENROUTER_AD_IDEA_MODEL = "moonshotai/kimi-k2.6:free";
export const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_TIMEOUT_MS = 30_000;

const headlineTypes: HeadlineType[] = [
  "painful_moment",
  "receipt_drop",
  "callout",
  "contrast",
  "transformation",
];

export type AdGenerationProvider = "gemini" | "openrouter" | "deterministic";

export type AdGenerationProviderStatus = {
  provider: "gemini" | "openrouter";
  status: "used" | "skipped" | "failed";
  reason: string;
};

export type GenerateAdCandidatesOptions = {
  geminiApiKey?: string;
  geminiGenerateContent?: GeminiGenerateContent;
  geminiModel?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  apiKey?: string;
  fetcher?: Fetcher;
  model?: string;
  count?: number;
  timeoutMs?: number;
};

export type GenerateAdCandidatesResult = {
  candidates: AdSceneCandidate[];
  model: string;
  provider: AdGenerationProvider;
  providerStatus: AdGenerationProviderStatus;
};

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const cleanTextOnBoundary = (value: unknown, maxLength = 260) => {
  const cleaned = cleanText(value, maxLength + 40);
  if (cleaned.length <= maxLength) return cleaned;
  const sliced = cleaned.slice(0, maxLength).trim();
  const boundary = sliced.replace(/[\s,;:–—-]+[^\s,;:–—-]*$/, "").trim();
  return boundary.length >= 8 ? boundary.replace(/[,.!?;:–—-]+$/, "").trim() : sliced;
};

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 52) || "ad-angle";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripBrandPrefix = (value: string, brand: string, maxLength = 72) => cleanText(
  value.replace(new RegExp(`^${escapeRegExp(brand)}\\s*[:|–—-]\\s*`, "i"), ""),
  maxLength,
);

const normalizeCount = (count?: number) => {
  if (!Number.isFinite(count)) return DEFAULT_AD_IDEA_COUNT;
  return Math.max(1, Math.min(DEFAULT_AD_IDEA_COUNT, Math.floor(count ?? DEFAULT_AD_IDEA_COUNT)));
};

const includesBannedWord = (value: string) => {
  const lower = value.toLowerCase();
  return bannedAdWords.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(lower);
  });
};

const isBadAdText = (value: string) => {
  const cleaned = cleanText(value, 220);
  if (!cleaned) return true;
  if (isWebsiteChromeText(cleaned)) return true;
  if (/#\d+\s*$/.test(cleaned)) return true;
  return false;
};

const usefulEvidence = (items: string[]) => items
  .map((item) => cleanText(item, 220))
  .filter((item) => item.length >= 8)
  .filter((item) => !isBadAdText(item))
  .filter((item, index, all) => all.findIndex((candidate) => (
    candidate.toLowerCase() === item.toLowerCase()
  )) === index);

const titleChunks = (value: string) => cleanText(value, 180)
  .split(/\s*[|:–—-]\s+/)
  .map((chunk) => cleanText(chunk, 72))
  .filter((chunk) => chunk.length >= 4)
  .filter((chunk) => !isBadAdText(chunk));

const deriveCategoryPhrase = (research: StoredWebsiteResearchResult) => {
  const brand = research.brand.name.toLowerCase();
  const candidates = [
    research.brandBrief.offer,
    ...research.brandBrief.siteLanguage,
    ...titleChunks(research.brand.title),
    ...research.evidence.headings,
    research.brand.description,
  ]
    .map((item) => cleanText(item, 72))
    .filter((item) => item && item.toLowerCase() !== brand)
    .filter((item) => !item.toLowerCase().startsWith(`${brand}:`))
    .filter((item) => !isBadAdText(item));

  return candidates[0] || research.brand.name;
};

const categoryNoun = (category: string) => {
  const cleaned = cleanText(category, 140);
  const firstPart = cleaned.split(/\s*[|:–—]\s+/)[0] || cleaned;
  const nounPhrase = firstPart.split(
    /\s+(?:known for|designed for|made for|built for|available for|for|with|that|while|so)\s+/i,
  )[0] || firstPart;
  return cleanTextOnBoundary(nounPhrase, 42) || "The Offer";
};

const fallbackHeadlineTemplates = (
  research: StoredWebsiteResearchResult,
  index: number,
  proof: string,
  pain: string,
) => {
  const brand = research.brand.name;
  const category = categoryNoun(deriveCategoryPhrase(research));
  const meaningfulProof = proof && !isBadAdText(proof) && !/^from\s+\$/i.test(proof)
    ? stripBrandPrefix(proof, brand)
    : "";
  const meaningfulPain = pain && !isBadAdText(pain) ? stripBrandPrefix(pain, brand) : "";
  const templates = [
    meaningfulProof,
    meaningfulPain,
    `${category} Without The Guesswork`,
    `${category} That Feels Fresh`,
    `${category} Worth Sending`,
    `A Better Reason To Pick ${brand}`,
    `${brand} Makes ${category} Obvious`,
    `${category} For The Moment That Matters`,
    `The ${category} People Remember`,
    `${category} That Shows Up Ready`,
  ];

  return templates
    .slice(index % templates.length)
    .concat(templates.slice(0, index % templates.length))
    .map((headline) => cleanTextOnBoundary(headline, 72))
    .filter((headline) => headline.length >= 8 && headline.length <= 72)
    .filter((headline) => !isBadAdText(headline) && !includesBannedWord(headline));
};

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
  return JSON.parse(jsonText) as Record<string, unknown>;
};

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

const firstUseful = (items: string[], minLength: number, maxLength: number) => (
  items.find((item) => {
    const cleaned = cleanText(item, maxLength + 20);
    return cleaned.length >= minLength && cleaned.length <= maxLength;
  }) || ""
);

const clampSentence = (value: string, fallback: string, maxLength: number) => {
  const cleaned = cleanText(value || fallback, maxLength);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}.`;
};

const ensureCta = (value: string, index: number) => {
  const cleaned = cleanText(value, 34);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 5 && !includesBannedWord(cleaned)) return cleaned;
  const fallback = [
    "See the proof",
    "View the offer",
    "Check the demo",
    "See it live",
    "Show me why",
  ];
  return fallback[index % fallback.length];
};

const normalizeHeadlineType = (value: unknown, index: number): HeadlineType => {
  if (typeof value === "string" && headlineTypes.includes(value as HeadlineType)) {
    return value as HeadlineType;
  }
  return headlineTypes[index % headlineTypes.length];
};

export const normalizeAdCandidatePayload = (
  value: unknown,
  fallback: AdSceneCandidate,
  index: number,
): AdSceneCandidate | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const headline = cleanText(record.headline, 72);
  const subheadline = cleanText(record.subheadline, 180);

  if (headline.length < 8 || headline.length > 72 || includesBannedWord(headline)) return null;
  if (subheadline.length < 24 || subheadline.length > 180 || includesBannedWord(subheadline)) return null;
  if (isBadAdText(headline) || isBadAdText(subheadline)) return null;

  return {
    angleId: slugify(cleanText(record.angleId, 80) || headline || fallback.angleId),
    headline,
    subheadline,
    ctaText: ensureCta(cleanText(record.ctaText, 34), index),
    headlineType: normalizeHeadlineType(record.headlineType, index),
    selectedPain: cleanText(record.selectedPain, 220) || fallback.selectedPain,
    selectedProof: cleanText(record.selectedProof, 220) || fallback.selectedProof,
  };
};

const candidateFromReceipt = (
  research: StoredWebsiteResearchResult,
  index: number,
  proof: string,
  pain: string,
): AdSceneCandidate => {
  const brand = research.brand.name;
  const headline = fallbackHeadlineTemplates(research, index, proof, pain)[0] || `${brand} Makes The Offer Obvious`;
  const subheadlineSource = firstUseful(
    usefulEvidence([
      proof,
      pain,
      research.brandBrief.offer,
      research.brandBrief.audience,
      research.brand.description,
      ...research.brandBrief.proof,
      ...research.evidence.paragraphs,
    ]),
    24,
    180,
  ) || `A clearer reason to choose ${brand}, built from the words on its own website.`;

  return {
    angleId: slugify(`${headline}-${index + 1}`),
    headline,
    subheadline: clampSentence(subheadlineSource, research.brand.description, 180),
    ctaText: ensureCta("", index),
    headlineType: headlineTypes[index % headlineTypes.length],
    selectedPain: pain || research.brand.description,
    selectedProof: proof || research.brand.description,
  };
};

export const buildDeterministicAdCandidates = (
  research: StoredWebsiteResearchResult,
  count = DEFAULT_AD_IDEA_COUNT,
): AdSceneCandidate[] => {
  const normalizedCount = normalizeCount(count);
  const proofs = [
    ...research.brandBrief.proof,
    ...research.brandBrief.siteLanguage,
    ...research.evidence.receipts.specificClaims,
    ...research.evidence.receipts.namedProof,
    ...research.evidence.receipts.exactSiteLanguage,
    ...research.evidence.headings,
    research.brand.description,
  ];
  const pains = [
    ...research.brandBrief.buyerMoments,
    research.brandBrief.audience,
    ...research.evidence.receipts.buyerMoments,
    ...research.evidence.headings,
    research.brand.description,
  ];
  const cleanProofs = usefulEvidence(proofs);
  const cleanPains = usefulEvidence(pains);

  const candidates: AdSceneCandidate[] = [];
  const seen = new Set<string>();

  for (let index = 0; candidates.length < normalizedCount && index < normalizedCount * 8; index += 1) {
    const proof = cleanProofs[index % Math.max(1, cleanProofs.length)] || research.brand.description;
    const pain = cleanPains[(index * 2) % Math.max(1, cleanPains.length)] || research.brand.description;
    const candidate = candidateFromReceipt(research, index, proof, pain);
    const key = candidate.headline.toLowerCase();
    if (seen.has(key) || isBadAdText(candidate.headline) || isBadAdText(candidate.subheadline)) continue;

    seen.add(key);
    candidates.push(candidate);
  }

  const category = categoryNoun(deriveCategoryPhrase(research));
  const fillerModifiers = [
    "Fresh",
    "Simple",
    "Giftable",
    "Memorable",
    "Ready-To-Send",
    "Crowd-Pleasing",
    "Fast",
    "Clear",
    "Better",
    "Easy-To-Choose",
  ];
  const fillerTemplates = [
    (modifier: string) => `${modifier} ${category}`,
    (modifier: string) => `${category} That Feels ${modifier}`,
    (modifier: string) => `${category} People Actually Choose`,
    (modifier: string) => `${category} With A ${modifier} Reason`,
    (modifier: string) => `${research.brand.name} For ${modifier} ${category}`,
  ];

  for (let index = 0; candidates.length < normalizedCount && index < normalizedCount * 4; index += 1) {
    const modifier = fillerModifiers[index % fillerModifiers.length];
    const template = fillerTemplates[Math.floor(index / fillerModifiers.length) % fillerTemplates.length]!;
    const headline = cleanTextOnBoundary(template(modifier), 72);
    const key = headline.toLowerCase();
    if (seen.has(key) || isBadAdText(headline)) continue;

    seen.add(key);
    candidates.push({
      angleId: slugify(`${headline}-${candidates.length + 1}`),
      headline,
      subheadline: clampSentence(
        usefulEvidence([
          research.brandBrief.offer,
          research.brandBrief.audience,
          research.brand.description,
          ...research.brandBrief.proof,
          ...research.evidence.paragraphs,
        ])[0],
        `A clearer reason to choose ${research.brand.name}, built from the words on its own website.`,
        180,
      ),
      ctaText: ensureCta("", candidates.length),
      headlineType: headlineTypes[candidates.length % headlineTypes.length],
      selectedPain: cleanPains[0] || research.brand.description,
      selectedProof: cleanProofs[0] || research.brand.description,
    });
  }

  if (candidates.length < normalizedCount) {
    const headline = `${research.brand.name} Makes The Choice Clear`;
    while (candidates.length < normalizedCount) {
      candidates.push({
        angleId: slugify(`${headline}-${candidates.length + 1}`),
        headline,
        subheadline: clampSentence(research.brand.description, `A clearer reason to choose ${research.brand.name}.`, 180),
        ctaText: ensureCta("", candidates.length),
        headlineType: headlineTypes[candidates.length % headlineTypes.length],
        selectedPain: research.brand.description,
        selectedProof: research.brand.description,
      });
    }
  }

  return candidates;
};

export const extractAdCandidatesFromResponse = (
  content: string,
  fallback: AdSceneCandidate[],
  count = DEFAULT_AD_IDEA_COUNT,
  providerLabel = "AI provider",
) => {
  const payload = parseJsonObject(content, providerLabel);
  const normalizedCount = normalizeCount(count);
  const seen = new Set<string>();
  const parsed = asArray(payload.candidates)
    .map((item, index) => normalizeAdCandidatePayload(item, fallback[index % fallback.length], index))
    .filter((item): item is AdSceneCandidate => Boolean(item))
    .filter((item) => {
      const key = item.headline.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, normalizedCount);

  if (!parsed.length) throw new Error(`${providerLabel} returned no usable ad ideas.`);
  return parsed;
};

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const isAbortError = (error: unknown) => (
  error instanceof Error && (error.name === "AbortError" || /aborted/i.test(error.message))
);

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

const callGemini = async ({
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
    return withTimeout(geminiGenerateContent({ model, prompt }), timeoutMs, "Gemini ad generation");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  }), timeoutMs, "Gemini ad generation");

  return response.text || "{\"candidates\":[]}";
};

const callOpenRouter = async ({
  apiKey,
  model,
  prompt,
  timeoutMs,
  fetcher,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  timeoutMs: number;
  fetcher?: Fetcher;
}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await (fetcher ?? fetch)(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.78,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`OpenRouter returned ${response.status}.`);

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return payload.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
};

const topUpCandidates = (
  candidates: AdSceneCandidate[],
  fallback: AdSceneCandidate[],
  count: number,
) => (candidates.length >= count
  ? candidates
  : [...candidates, ...fallback.slice(candidates.length, count)]);

export const generateAdCandidatesFromResearch = async (
  research: StoredWebsiteResearchResult,
  options: GenerateAdCandidatesOptions = {},
): Promise<GenerateAdCandidatesResult> => {
  const count = normalizeCount(options.count);
  const fallback = buildDeterministicAdCandidates(research, count);
  const prompt = buildAdIdeasPrompt(research, count);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const geminiModel = options.geminiModel || process.env.GEMINI_AD_MODEL || DEFAULT_GEMINI_AD_IDEA_MODEL;
  const openRouterModel = options.openRouterModel || options.model || process.env.OPENROUTER_AD_MODEL || DEFAULT_OPENROUTER_AD_IDEA_MODEL;
  const geminiApiKey = options.geminiApiKey ?? process.env.GEMINI_API_KEY;
  const openRouterApiKey = options.openRouterApiKey ?? options.apiKey ?? process.env.OPENROUTER_API_KEY;

  if (geminiApiKey && !isDisabled(process.env.GEMINI_ENABLED)) {
    try {
      const content = await callGemini({
        apiKey: geminiApiKey,
        model: geminiModel,
        prompt,
        timeoutMs,
        geminiGenerateContent: options.geminiGenerateContent,
      });
      const candidates = extractAdCandidatesFromResponse(content, fallback, count, "Gemini");

      return {
        candidates: topUpCandidates(candidates, fallback, count),
        model: geminiModel,
        provider: "gemini",
        providerStatus: {
          provider: "gemini",
          status: "used",
          reason: `Generated ${count} ad ideas with ${geminiModel}.`,
        },
      };
    } catch (error) {
      if (!openRouterApiKey || isDisabled(process.env.OPENROUTER_ENABLED)) {
        const reason = error instanceof Error
          ? `${error.message} Used deterministic website evidence ideas.`
          : "Gemini failed; used deterministic website evidence ideas.";

        return {
          candidates: fallback,
          model: geminiModel,
          provider: "deterministic",
          providerStatus: {
            provider: "gemini",
            status: "failed",
            reason,
          },
        };
      }
    }
  }

  if (!openRouterApiKey || isDisabled(process.env.OPENROUTER_ENABLED)) {
    return {
      candidates: fallback,
      model: geminiModel,
      provider: "deterministic",
      providerStatus: {
        provider: "gemini",
        status: "skipped",
        reason: "Gemini and OpenRouter were not configured; used deterministic website evidence ideas.",
      },
    };
  }

  try {
    const content = await callOpenRouter({
      apiKey: openRouterApiKey,
      model: openRouterModel,
      prompt,
      timeoutMs,
      fetcher: options.fetcher,
    });
    const candidates = extractAdCandidatesFromResponse(content, fallback, count, "OpenRouter");

    return {
      candidates: topUpCandidates(candidates, fallback, count),
      model: openRouterModel,
      provider: "openrouter",
      providerStatus: {
        provider: "openrouter",
        status: "used",
        reason: geminiApiKey && !isDisabled(process.env.GEMINI_ENABLED)
          ? `Gemini failed; generated ${count} ad ideas with ${openRouterModel}.`
          : `Generated ${count} ad ideas with ${openRouterModel}.`,
      },
    };
  } catch (error) {
    const reason = isAbortError(error)
      ? "OpenRouter took too long after Gemini fallback; used deterministic website evidence ideas."
      : error instanceof Error
        ? `${error.message} Used deterministic website evidence ideas.`
        : "AI providers failed; used deterministic website evidence ideas.";

    return {
      candidates: fallback,
      model: openRouterModel,
      provider: "deterministic",
      providerStatus: {
        provider: "openrouter",
        status: "failed",
        reason,
      },
    };
  }
};
