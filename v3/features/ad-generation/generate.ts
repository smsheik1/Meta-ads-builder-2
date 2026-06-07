import { GoogleGenAI } from "@google/genai";
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

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 52) || "ad-angle";

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
  const exactPhrase = research.evidence.receipts.exactSiteLanguage[index % Math.max(1, research.evidence.receipts.exactSiteLanguage.length)] || "";
  const heading = research.evidence.headings[index % Math.max(1, research.evidence.headings.length)] || "";
  const headlineSource = firstUseful(
    [proof, pain, exactPhrase, heading, research.brand.title, `${brand}: ${research.brand.description}`],
    8,
    72,
  );
  const headline = cleanText(headlineSource.replace(new RegExp(`^${brand}\\s*[:|–—-]\\s*`, "i"), ""), 72)
    || `${brand} Made Obvious`;
  const subheadlineSource = firstUseful(
    [proof, pain, research.brand.description, ...research.evidence.paragraphs],
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
    selectedProof: proof || exactPhrase || research.brand.description,
  };
};

export const buildDeterministicAdCandidates = (
  research: StoredWebsiteResearchResult,
  count = DEFAULT_AD_IDEA_COUNT,
): AdSceneCandidate[] => {
  const normalizedCount = normalizeCount(count);
  const proofs = [
    ...research.evidence.receipts.specificClaims,
    ...research.evidence.receipts.namedProof,
    ...research.evidence.receipts.exactSiteLanguage,
    research.brand.description,
  ].map((item) => cleanText(item, 220)).filter(Boolean);
  const pains = [
    ...research.evidence.receipts.buyerMoments,
    ...research.evidence.headings,
    research.brand.description,
  ].map((item) => cleanText(item, 220)).filter(Boolean);

  const candidates: AdSceneCandidate[] = [];
  const seen = new Set<string>();

  for (let index = 0; candidates.length < normalizedCount; index += 1) {
    const proof = proofs[index % proofs.length] || research.brand.description;
    const pain = pains[(index * 2) % pains.length] || research.brand.description;
    const candidate = candidateFromReceipt(research, index, proof, pain);
    const key = candidate.headline.toLowerCase();
    const uniqueCandidate = seen.has(key)
      ? {
        ...candidate,
        headline: cleanText(`${candidate.headline} #${candidates.length + 1}`, 72),
        angleId: slugify(`${candidate.angleId}-${candidates.length + 1}`),
      }
      : candidate;

    seen.add(uniqueCandidate.headline.toLowerCase());
    candidates.push(uniqueCandidate);
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
