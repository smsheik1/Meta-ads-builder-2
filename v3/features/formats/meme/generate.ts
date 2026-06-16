import type { StoredWebsiteResearchResult } from "../../research/types";
import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_MEME_MODEL } from "../../llm/nvidiaNimModels";
import { buildMemePrompt } from "./prompt";
import { MEME_TEMPLATES, MEME_VARIATIONS_PER_TEMPLATE, getMemeTemplate } from "./templates";

export type MemeVariant = {
  templateId: string;
  slots: Record<string, string>;
};

export type GenerateMemeVariantsResult = {
  variants: MemeVariant[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used";
    reason: string;
  };
};

type GenerateMemeVariantsOptions = {
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const normalizeSlotText = (value: unknown) => String(value ?? "")
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/!\[[^\]]*]\[[^\]]*]/g, " ")
  .replace(/!\[[^\]]*]/g, " ")
  .replace(/https?:\/\/\S+/gi, " ")
  .replace(/\s+/g, " ")
  .trim();

const DANGLING_ENDING_WORDS = new Set([
  "a",
  "an",
  "and",
  "every",
  "for",
  "from",
  "get",
  "gets",
  "in",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "your",
]);

const endsWithDanglingWord = (value: string) => {
  const lastWord = value.trim().toLowerCase().match(/[a-z0-9]+$/)?.[0] || "";
  return DANGLING_ENDING_WORDS.has(lastWord);
};

const trimDanglingEnding = (value: string) => {
  const words = value.split(/\s+/).filter(Boolean);
  while (words.length > 1 && endsWithDanglingWord(words.join(" "))) words.pop();
  return words.join(" ");
};

const limitWords = (value: string, maxWords: number) => value.split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");

const limitCharsAtWordBoundary = (value: string, maxChars: number) => {
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, maxChars).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trim();
};

const fitSlotText = (value: unknown, maxWords: number, maxChars: number) => (
  trimDanglingEnding(limitCharsAtWordBoundary(limitWords(normalizeSlotText(value), maxWords), maxChars))
);

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
  return JSON.parse(jsonText) as Record<string, unknown>;
};

type ExtractMemeVariantsOptions = {
  providerLabel?: string;
  repairSlotText?: boolean;
};

export function extractMemeVariantsFromResponse(
  content: string,
  options: ExtractMemeVariantsOptions = {},
): MemeVariant[] {
  const providerLabel = options.providerLabel || "Meme provider";
  const payload = parseJsonObject(content, providerLabel);
  const variants = Array.isArray(payload.templates)
    ? payload.templates.flatMap((templateGroup) => {
      if (!templateGroup || typeof templateGroup !== "object") return [];
      const group = templateGroup as Record<string, unknown>;
      const templateId = String(group.templateId || "");
      const groupVariants = Array.isArray(group.variants) ? group.variants : [];
      return groupVariants.map((variant) => (
        variant && typeof variant === "object"
          ? { ...variant as Record<string, unknown>, templateId }
          : variant
      ));
    })
    : Array.isArray(payload.variants)
      ? payload.variants
      : [];
  const byTemplate = new Map<string, MemeVariant[]>();

  for (const item of variants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const templateId = String(record.templateId || "");
    const template = getMemeTemplate(templateId);
    const slotsPayload = record.slots && typeof record.slots === "object"
      ? record.slots as Record<string, unknown>
      : null;
    if (!template || !slotsPayload) continue;

    const slots: Record<string, string> = {};
    let valid = true;
    for (const slot of template.slots) {
      const rawText = normalizeSlotText(slotsPayload[slot.id]);
      const text = options.repairSlotText && (rawText.length > slot.maxChars || endsWithDanglingWord(rawText))
        ? fitSlotText(rawText, slot.maxWords, slot.maxChars)
        : rawText;
      if (!text || text.length > slot.maxChars) valid = false;
      if (endsWithDanglingWord(text)) valid = false;
      if (template.id === "this_is_fine" && /this\s+is\s+fine/i.test(text)) valid = false;
      slots[slot.id] = text;
    }
    if (valid) {
      const templateVariants = byTemplate.get(template.id) || [];
      if (templateVariants.length < MEME_VARIATIONS_PER_TEMPLATE) {
        templateVariants.push({ templateId: template.id, slots });
        byTemplate.set(template.id, templateVariants);
      }
    }
  }

  const normalized = MEME_TEMPLATES.flatMap((template) => byTemplate.get(template.id) || []);
  if (normalized.length !== MEME_TEMPLATES.length * MEME_VARIATIONS_PER_TEMPLATE) {
    throw new Error(`${providerLabel} returned incomplete meme variants.`);
  }
  return normalized;
}

export async function generateMemeVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateMemeVariantsOptions = {},
): Promise<GenerateMemeVariantsResult> {
  const prompt = buildMemePrompt(research);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_MEME_MODEL
    || DEFAULT_NVIDIA_NIM_MEME_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (!nvidiaNimApiKey) {
    throw new Error("NVIDIA NIM meme generation is not configured.");
  }
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) {
    throw new Error("NVIDIA NIM meme generation is disabled.");
  }

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM meme generation",
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs,
    });
    let variants: MemeVariant[];
    try {
      variants = extractMemeVariantsFromResponse(content, {
        providerLabel: "NVIDIA NIM",
        repairSlotText: true,
      });
    } catch {
      const retryContent = await callNvidiaNimChat({
        apiKey: nvidiaNimApiKey,
        baseUrl: nvidiaNimBaseUrl,
        label: "NVIDIA NIM meme generation",
        model: nvidiaNimModel,
        nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
        prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Return exactly ${MEME_VARIATIONS_PER_TEMPLATE} variants per template, every required slot must be present, under maxChars, and a complete thought. Return only the JSON object.`,
        timeoutMs,
      });
      variants = extractMemeVariantsFromResponse(retryContent, {
        providerLabel: "NVIDIA NIM",
        repairSlotText: true,
      });
    }

    return {
      variants,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${MEME_TEMPLATES.length * MEME_VARIATIONS_PER_TEMPLATE} meme ideas with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM meme generation failed: ${message}`);
  }
}
