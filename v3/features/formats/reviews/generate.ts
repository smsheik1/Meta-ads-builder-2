import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import type { ReviewsProofItem } from "../../scene/types";
import { buildReviewsPrompt, REVIEWS_VARIANT_COUNT } from "./prompt";
import { extractWebsiteReviewProofItems, fetchWebsiteReviewProofItems, normalizeProofText } from "./evidence";

export type ReviewsVariant = {
  proofIndex: number;
  proofText: string;
  headline: string;
  ctaText: string;
  selfCheckPassed: string;
};

export type GenerateReviewsVariantsResult = {
  variants: ReviewsVariant[];
  proofItems: ReviewsProofItem[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used";
    reason: string;
  };
};

type GenerateReviewsVariantsOptions = {
  count?: number;
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
  reviewFetcher?: typeof fetch;
  selectedProductHandles?: string[];
};

const DEFAULT_TIMEOUT_MS = 60_000;
const bannedPhrases = ["unlock", "elevate", "game-changer", "transform", "revolutionary", "supercharge", "level up"];

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const cleanText = (value: unknown, maxLength = 220) => String(value ?? "")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
  return JSON.parse(jsonText) as Record<string, unknown>;
};

const includesBannedPhrase = (value: string) => {
  const lower = value.toLowerCase();
  return bannedPhrases.some((phrase) => lower.includes(phrase));
};

const isVerbatimTrim = (proofText: string, sourceText: string) => {
  const proof = normalizeProofText(proofText).toLowerCase();
  const source = normalizeProofText(sourceText).toLowerCase();
  return Boolean(proof) && source.includes(proof);
};

export function assertEnoughProofItems(proofItems: ReviewsProofItem[]) {
  if (proofItems.length < 2) {
    throw new Error("Reviews proof ads need at least 2 actual review or testimonial lines from the website.");
  }
}

export function extractReviewsVariantsFromResponse(
  content: string,
  proofItems: ReviewsProofItem[],
  count = REVIEWS_VARIANT_COUNT,
  providerLabel = "Reviews provider",
): ReviewsVariant[] {
  assertEnoughProofItems(proofItems);
  const payload = parseJsonObject(content, providerLabel);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const variants: ReviewsVariant[] = [];
  const seenKeys = new Set<string>();

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const proofIndex = Number(record.proofIndex);
    const proofItem = Number.isInteger(proofIndex) ? proofItems[proofIndex] : undefined;
    const proofText = cleanText(record.proofText, 220);
    const headline = cleanText(record.headline, 72);
    const ctaText = cleanText(record.ctaText, 40);
    const selfCheckPassed = cleanText(record.selfCheckPassed, 180);
    const key = `${proofIndex}:${proofText.toLowerCase()}`;

    if (!proofItem || !proofText || !headline || !ctaText || !selfCheckPassed) continue;
    if (
      "rating" in record ||
      "sourceName" in record ||
      "sourceUrl" in record ||
      "reviewCount" in record ||
      "count" in record
    ) continue;
    if (seenKeys.has(key)) continue;
    if (!isVerbatimTrim(proofText, proofItem.text)) continue;
    if (includesBannedPhrase(`${headline} ${ctaText}`)) continue;

    seenKeys.add(key);
    variants.push({
      proofIndex,
      proofText,
      headline,
      ctaText,
      selfCheckPassed,
    });
  }

  if (variants.length !== count) {
    throw new Error(`${providerLabel} returned incomplete reviews proof variants.`);
  }
  return variants;
}

export async function generateReviewsVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateReviewsVariantsOptions = {},
): Promise<GenerateReviewsVariantsResult> {
  const count = options.count ?? REVIEWS_VARIANT_COUNT;
  let proofItems = extractWebsiteReviewProofItems(research);
  if (options.selectedProductHandles?.length || proofItems.length < 2) {
    const fetchedProofItems = await fetchWebsiteReviewProofItems(research, options.reviewFetcher ?? fetch, {
      preferredProductHandles: options.selectedProductHandles || [],
    });
    if (fetchedProofItems.length >= 2 || proofItems.length < 2) proofItems = fetchedProofItems;
  }
  assertEnoughProofItems(proofItems);
  const prompt = buildReviewsPrompt(research, proofItems, count);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_REVIEWS_MODEL
    || DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM reviews generation is not configured.");
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) throw new Error("NVIDIA NIM reviews generation is disabled.");

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM reviews generation",
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs,
    });
    let variants: ReviewsVariant[];
    try {
      variants = extractReviewsVariantsFromResponse(content, proofItems, count, "NVIDIA NIM");
    } catch {
      const retryContent = await callNvidiaNimChat({
        apiKey: nvidiaNimApiKey,
        baseUrl: nvidiaNimBaseUrl,
        label: "NVIDIA NIM reviews generation",
        model: nvidiaNimModel,
        nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
        prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Return exactly ${count} variants. proofText must be copied exactly from the selected proof item, as a substring. Do not include fake ratings, sources, counts, or rewritten proof. Return only the JSON object.`,
        timeoutMs,
      });
      variants = extractReviewsVariantsFromResponse(retryContent, proofItems, count, "NVIDIA NIM");
    }

    return {
      variants,
      proofItems,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${count} proof ads from ${proofItems.length} website proof items with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM reviews generation failed: ${message}`);
  }
}
