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
  apologyHeader: string;
  legalOpener: string;
  confessions: string[];
  signoff: string;
  selfCheckPassed: string;
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

const hasDanglingEnding = (value: string) => /\b(?:and|the|to|for|of|on|with)$/i.test(value.trim());

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
  if (payload.suitable === false) {
    throw new Error(`${providerLabel} marked we're sorry format unsuitable: ${cleanText(payload.reason, 180) || "no reason"}`);
  }
  const expectedCount = normalizeCount(count);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const seenAngles = new Set<string>();
  const seenHeaders = new Set<string>();
  const variants: WereSorryVariant[] = [];

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const apologyHeader = cleanText(record.apologyHeader, 40);
    const legalOpener = cleanText(record.legalOpener, 120);
    const confessions = Array.isArray(record.confessions)
      ? record.confessions.map((confession) => cleanText(confession, 110)).filter(Boolean).slice(0, 3)
      : [];
    const signoff = cleanText(record.signoff, 60);
    const selfCheckPassed = cleanText(record.selfCheckPassed, 220);
    const angle = cleanText(record.angle, 140);
    const angleKey = angle.toLowerCase();
    const headerKey = `${apologyHeader} ${legalOpener}`.toLowerCase();

    if (!angle || !apologyHeader || !legalOpener || !signoff || confessions.length < 2) continue;
    if (confessions.some(hasDanglingEnding)) continue;
    if (includesBannedWord(`${apologyHeader} ${legalOpener} ${confessions.join(" ")}`)) continue;
    if (seenAngles.has(angleKey) || seenHeaders.has(headerKey)) continue;

    seenAngles.add(angleKey);
    seenHeaders.add(headerKey);
    variants.push({
      angle,
      apologyHeader,
      legalOpener,
      confessions,
      signoff,
      selfCheckPassed,
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
        prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Return exactly ${count} variants, each with a unique angle, apologyHeader, legalOpener, 2-3 confessions, signoff, and selfCheckPassed. Return only the JSON object.`,
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
