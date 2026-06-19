import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import {
  BRAINROT_MAX_BEAT_CHARS,
  BRAINROT_MAX_BEATS,
  BRAINROT_MIN_BEATS,
  BRAINROT_VARIANT_COUNT,
  buildBrainrotPrompt,
} from "./prompt";

export type BrainrotSpeaker = "left" | "right";
export type BrainrotBeat = {
  speaker: BrainrotSpeaker;
  text: string;
  startMs?: number;
  durationMs?: number;
};
export type BrainrotVariant = {
  angle: string;
  beats: BrainrotBeat[];
  selfCheckPassed: string;
};

type GenerateBrainrotVariantsOptions = {
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const bannedPhrases = ["unlock", "elevate", "game-changer", "transform", "revolutionary", "supercharge", "level up"];

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const cleanText = (value: unknown, maxLength = 220) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/https?:\/\/\S+/gi, " ")
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

const countBrandMentions = (value: string, brandName: string) => {
  const escaped = brandName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return 0;
  return value.match(new RegExp(escaped, "gi"))?.length || 0;
};

const includesBannedPhrase = (value: string) => {
  const lower = value.toLowerCase();
  return bannedPhrases.some((phrase) => lower.includes(phrase));
};

export function extractBrainrotVariantsFromResponse(
  content: string,
  brandName: string,
  providerLabel = "Brainrot provider",
): BrainrotVariant[] {
  const payload = parseJsonObject(content, providerLabel);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const seenAngles = new Set<string>();
  const variants: BrainrotVariant[] = [];

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const angle = cleanText(record.angle, 140);
    const selfCheckPassed = cleanText(record.selfCheckPassed, 180);
    const rawBeats = Array.isArray(record.beats) ? record.beats : [];
    const beats = rawBeats.map((beat) => {
      const beatRecord = beat && typeof beat === "object" ? beat as Record<string, unknown> : {};
      const speaker = beatRecord.speaker === "left" || beatRecord.speaker === "right" ? beatRecord.speaker : null;
      const text = cleanText(beatRecord.text, BRAINROT_MAX_BEAT_CHARS + 1);
      return speaker && text ? { speaker, text } : null;
    }).filter((beat): beat is BrainrotBeat => Boolean(beat));
    const fullText = beats.map((beat) => beat.text).join(" ");
    const angleKey = angle.toLowerCase();

    if (!angle || seenAngles.has(angleKey)) continue;
    if (!selfCheckPassed) continue;
    if (beats.length < BRAINROT_MIN_BEATS || beats.length > BRAINROT_MAX_BEATS) continue;
    if (!beats.some((beat) => beat.speaker === "left") || !beats.some((beat) => beat.speaker === "right")) continue;
    if (beats.some((beat) => beat.text.length > BRAINROT_MAX_BEAT_CHARS)) continue;
    if (countBrandMentions(fullText, brandName) > 2) continue;
    if (includesBannedPhrase(fullText)) continue;

    seenAngles.add(angleKey);
    variants.push({ angle, beats, selfCheckPassed });
  }

  if (variants.length !== BRAINROT_VARIANT_COUNT) {
    throw new Error(`${providerLabel} returned incomplete brainrot variants.`);
  }
  return variants;
}

export async function generateBrainrotVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateBrainrotVariantsOptions = {},
) {
  const brandName = research.brandBrief.brandName || research.brand.name;
  const prompt = buildBrainrotPrompt(research, BRAINROT_VARIANT_COUNT);
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_BRAINROT_MODEL
    || DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM brainrot generation is not configured.");
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) throw new Error("NVIDIA NIM brainrot generation is disabled.");

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM brainrot generation",
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    const variants = extractBrainrotVariantsFromResponse(content, brandName, "NVIDIA NIM");

    return {
      variants,
      model: nvidiaNimModel,
      provider: "nvidia-nim" as const,
      providerStatus: {
        provider: "nvidia-nim" as const,
        status: "used" as const,
        reason: `Generated ${BRAINROT_VARIANT_COUNT} brainrot scripts with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM brainrot generation failed: ${message}`);
  }
}
