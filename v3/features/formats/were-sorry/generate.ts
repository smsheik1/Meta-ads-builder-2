import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import { DEFAULT_WERE_SORRY_VARIANT_COUNT, buildWereSorryPrompt } from "./prompt";

export type WereSorryVariant = {
  angle: string;
  apology: string;
  makeGood: string;
  ctaText: string;
  selectedPain: string;
  selectedProof: string;
};

export type GenerateWereSorryVariantsResult = {
  variants: WereSorryVariant[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used";
    reason: string;
  };
};

type GenerateWereSorryVariantsOptions = {
  count?: number;
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const maxVariants = 12;
const bannedWords = [
  "unlock",
  "elevate",
  "supercharge",
  "game-changer",
  "level up",
  "revolutionary",
];

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const normalizeCount = (count?: number) => {
  if (!Number.isFinite(count)) return DEFAULT_WERE_SORRY_VARIANT_COUNT;
  return Math.max(1, Math.min(maxVariants, Math.floor(count ?? DEFAULT_WERE_SORRY_VARIANT_COUNT)));
};

const cleanText = (value: unknown, maxLength = 220) => String(value ?? "")
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/https?:\/\/\S+/gi, " ")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const includesBannedWord = (value: string) => {
  const lower = value.toLowerCase();
  return bannedWords.some((word) => lower.includes(word));
};

const startsWithApology = (value: string) => /^(sorry|we'?re sorry)\b/i.test(value.trim());

const ensureCta = (value: unknown, fallback: string, index: number) => {
  const cleaned = cleanText(value, 34);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.length <= 5 && /^[a-z]+/i.test(cleaned) && !includesBannedWord(cleaned)) return cleaned;
  const fallbackCleaned = cleanText(fallback, 34);
  const fallbackWords = fallbackCleaned.split(/\s+/).filter(Boolean);
  if (fallbackWords.length >= 2 && fallbackWords.length <= 5) return fallbackCleaned;
  return ["See the offer", "Try it now", "Book a demo", "Shop the drop"][index % 4]!;
};

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
  return JSON.parse(jsonText) as Record<string, unknown>;
};

export function extractWereSorryVariantsFromResponse(
  content: string,
  count = DEFAULT_WERE_SORRY_VARIANT_COUNT,
  providerLabel = "Were sorry provider",
): WereSorryVariant[] {
  const payload = parseJsonObject(content, providerLabel);
  const expectedCount = normalizeCount(count);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const seenAngles = new Set<string>();
  const seenApologies = new Set<string>();
  const variants: WereSorryVariant[] = [];

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const apology = cleanText(record.apology, 78);
    const makeGood = cleanText(record.makeGood, 120);
    const angle = cleanText(record.angle, 140);
    const selectedPain = cleanText(record.selectedPain || angle, 160);
    const selectedProof = cleanText(record.selectedProof, 160);
    const angleKey = angle.toLowerCase();
    const apologyKey = apology.toLowerCase();

    if (!angle || !apology || !makeGood) continue;
    if (!startsWithApology(apology)) continue;
    if (includesBannedWord(`${apology} ${makeGood}`)) continue;
    if (seenAngles.has(angleKey) || seenApologies.has(apologyKey)) continue;

    seenAngles.add(angleKey);
    seenApologies.add(apologyKey);
    variants.push({
      angle,
      apology,
      makeGood,
      ctaText: ensureCta(record.ctaText, "", variants.length),
      selectedPain,
      selectedProof,
    });
  }

  if (variants.length !== expectedCount) {
    throw new Error(`${providerLabel} returned incomplete we're sorry variants.`);
  }
  return variants;
}

export async function generateWereSorryVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateWereSorryVariantsOptions = {},
): Promise<GenerateWereSorryVariantsResult> {
  const count = normalizeCount(options.count);
  const prompt = buildWereSorryPrompt(research, count);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_WERE_SORRY_MODEL
    || DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (!nvidiaNimApiKey) {
    throw new Error("NVIDIA NIM we're sorry generation is not configured.");
  }
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) {
    throw new Error("NVIDIA NIM we're sorry generation is disabled.");
  }

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM we're sorry generation",
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs,
    });
    let variants: WereSorryVariant[];
    try {
      variants = extractWereSorryVariantsFromResponse(content, count, "NVIDIA NIM");
    } catch {
      const retryContent = await callNvidiaNimChat({
        apiKey: nvidiaNimApiKey,
        baseUrl: nvidiaNimBaseUrl,
        label: "NVIDIA NIM we're sorry generation",
        model: nvidiaNimModel,
        nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
        prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Return exactly ${count} variants, each with a unique angle, apology, makeGood, ctaText, selectedPain, and selectedProof. Return only the JSON object.`,
        timeoutMs,
      });
      variants = extractWereSorryVariantsFromResponse(retryContent, count, "NVIDIA NIM");
    }

    return {
      variants,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${count} we're sorry ideas with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM we're sorry generation failed: ${message}`);
  }
}
