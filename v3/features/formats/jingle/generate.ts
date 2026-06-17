import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_JINGLE_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import type { JingleCompositionChunk } from "../../scene/types";
import {
  buildJinglePrompt,
  JINGLE_MUSIC_LENGTH_MS,
  JINGLE_VARIANT_COUNT,
} from "./prompt";

export type JingleVariant = {
  angle: string;
  brandPhonetic: string;
  musicLengthMs: number;
  compositionPlan: {
    chunks: JingleCompositionChunk[];
  };
  lyrics: string[];
  selfCheckPassed: string;
};

export type GenerateJingleVariantsResult = {
  variants: JingleVariant[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used";
    reason: string;
  };
};

type GenerateJingleVariantsOptions = {
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const basePositiveStyles = ["modern hip hop", "90 BPM", "confident vocal delivery", "punchy 808 bass", "crisp hi-hats", "clean trap drums", "polished studio production"];

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const cleanText = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const cleanLyricText = (value: unknown, maxLength = 600) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/\r/g, "")
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

const lyricLines = (text: string) => text
  .split("\n")
  .map((line) => cleanText(line, 120))
  .filter((line) => line && !/^\[[^\]]+]$/.test(line));

const hasInventedNumber = (text: string) => /\d|percent|guarantee|guaranteed|#1|award|discount|off\b/i.test(text);

const normalizeChunk = (chunk: Record<string, unknown>): JingleCompositionChunk | null => {
  const text = cleanLyricText(chunk.text);
  const durationMs = Number(chunk.duration_ms ?? chunk.durationMs);
  const rawPositiveStyles = chunk.positive_styles ?? chunk.positiveStyles;
  const rawNegativeStyles = chunk.negative_styles ?? chunk.negativeStyles;
  const positiveStyles = Array.isArray(rawPositiveStyles)
    ? rawPositiveStyles.map((item: unknown) => cleanText(item, 80)).filter(Boolean).slice(0, 8)
    : [];
  const negativeStyles = Array.isArray(rawNegativeStyles)
    ? rawNegativeStyles.map((item: unknown) => cleanText(item, 80)).filter(Boolean).slice(0, 8)
    : [];
  const contextAdherence = cleanText(chunk.context_adherence ?? chunk.contextAdherence, 20);

  if (!text || !Number.isFinite(durationMs)) return null;
  if (durationMs < 3000 || durationMs > 120000) return null;
  if (contextAdherence !== "high") return null;
  if (hasInventedNumber(lyricLines(text).join(" "))) return null;
  const normalizedPositiveStyles = Array.from(new Set([...basePositiveStyles, ...positiveStyles]));

  return {
    text,
    duration_ms: Math.round(durationMs),
    positive_styles: normalizedPositiveStyles.slice(0, 8),
    negative_styles: negativeStyles.length ? negativeStyles : ["sad", "slow", "lo-fi", "distorted", "off-key"],
    context_adherence: "high",
  };
};

export function extractJingleVariantsFromResponse(
  content: string,
  providerLabel = "Jingle provider",
): JingleVariant[] {
  const payload = parseJsonObject(content, providerLabel);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const seenAngles = new Set<string>();
  const seenHooks = new Set<string>();
  const variants: JingleVariant[] = [];

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const angle = cleanText(record.angle, 160);
    const brandPhonetic = cleanText(record.brandPhonetic, 80);
    const musicLengthMs = Math.round(Number(record.musicLengthMs ?? record.music_length_ms));
    const compositionPlan = record.compositionPlan || record.composition_plan;
    const chunks = compositionPlan && typeof compositionPlan === "object" && Array.isArray((compositionPlan as Record<string, unknown>).chunks)
      ? ((compositionPlan as Record<string, unknown>).chunks as unknown[])
        .map((chunk) => chunk && typeof chunk === "object" ? normalizeChunk(chunk as Record<string, unknown>) : null)
        .filter((chunk): chunk is JingleCompositionChunk => Boolean(chunk))
      : [];
    const selfCheckPassed = cleanText(record.selfCheckPassed, 260);
    const hookLines = chunks[0] ? lyricLines(chunks[0].text) : [];
    const finalHookLines = chunks[2] ? lyricLines(chunks[2].text) : [];
    const lyrics = chunks.flatMap((chunk) => lyricLines(chunk.text));
    const durationSum = chunks.reduce((sum, chunk) => sum + chunk.duration_ms, 0);
    const angleKey = angle.toLowerCase();
    const hookKey = hookLines.join(" ").toLowerCase();

    if (!angle || !brandPhonetic || !selfCheckPassed) continue;
    if (seenAngles.has(angleKey) || seenHooks.has(hookKey)) continue;
    if (chunks.length !== 3) continue;
    if (!chunks[0].text.startsWith("[Hook]") || !chunks[1].text.startsWith("[Verse]") || !chunks[2].text.startsWith("[Hook]")) continue;
    if (musicLengthMs !== JINGLE_MUSIC_LENGTH_MS) continue;
    if (durationSum !== musicLengthMs) continue;
    if (!hookLines.join(" ").toLowerCase().includes(brandPhonetic.toLowerCase())) continue;
    if (!finalHookLines.join(" ").toLowerCase().includes(brandPhonetic.toLowerCase())) continue;
    if (finalHookLines.at(-1)?.toLowerCase() !== brandPhonetic.toLowerCase()) continue;
    if (!lyrics.length) continue;

    seenAngles.add(angleKey);
    seenHooks.add(hookKey);
    variants.push({
      angle,
      brandPhonetic,
      musicLengthMs,
      compositionPlan: { chunks },
      lyrics,
      selfCheckPassed,
    });
  }

  if (variants.length < JINGLE_VARIANT_COUNT) {
    throw new Error(`${providerLabel} returned incomplete jingle variants.`);
  }
  return variants.slice(0, JINGLE_VARIANT_COUNT);
}

export async function generateJingleVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateJingleVariantsOptions = {},
): Promise<GenerateJingleVariantsResult> {
  const prompt = buildJinglePrompt(research);
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_JINGLE_MODEL
    || DEFAULT_NVIDIA_NIM_JINGLE_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM jingle generation is not configured.");
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) throw new Error("NVIDIA NIM jingle generation is disabled.");

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM jingle generation",
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    const variants = extractJingleVariantsFromResponse(content, "NVIDIA NIM");

    return {
      variants,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${JINGLE_VARIANT_COUNT} jingle plan with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM jingle generation failed: ${message}`);
  }
}
