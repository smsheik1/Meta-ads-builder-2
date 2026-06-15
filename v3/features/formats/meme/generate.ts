import type { StoredWebsiteResearchResult } from "../../research/types";
import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_MEME_MODEL } from "../../llm/nvidiaNimModels";
import { buildMemePrompt } from "./prompt";
import { MEME_TEMPLATES, getMemeTemplate, type MemeTemplate } from "./templates";

export type MemeVariant = {
  templateId: string;
  slots: Record<string, string>;
};

export type GenerateMemeVariantsResult = {
  variants: MemeVariant[];
  model: string;
  provider: "nvidia-nim" | "deterministic";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used" | "skipped" | "failed";
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

const DEFAULT_TIMEOUT_MS = 30_000;

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

function deterministicSlotsForTemplate(
  template: MemeTemplate,
  research: StoredWebsiteResearchResult,
): Record<string, string> {
  const brand = research.brandBrief.brandName || research.brand.name;
  const pain = research.brandBrief.buyerMoments[0] || research.brandBrief.audience || "the messy old way";
  const offer = research.brandBrief.offer || research.brand.description || brand;
  const proof = research.brandBrief.proof[0] || research.brandBrief.siteLanguage[0] || offer;

  const byTemplate: Record<string, Record<string, string>> = {
    drake: {
      topText: limitWords(pain, 7),
      bottomText: limitWords(offer, 7),
    },
    woman_yelling_cat: {
      yellingText: limitWords(pain, 7),
      catResponseText: limitWords(offer, 7),
    },
    this_is_fine: {
      topText: limitWords(pain, 9),
      bottomText: `${brand} stays calm`,
    },
    expanding_brain: {
      level1Text: "Guessing what works",
      level2Text: limitWords(proof, 5),
      level3Text: limitWords(offer, 5),
      level4Text: `${brand} makes it obvious`,
    },
  };

  const defaults = byTemplate[template.id] || {};
  return Object.fromEntries(template.slots.map((slot) => [
    slot.id,
    fitSlotText(defaults[slot.id] || offer, slot.maxWords, slot.maxChars),
  ]));
}

export function buildDeterministicMemeVariants(research: StoredWebsiteResearchResult): MemeVariant[] {
  return MEME_TEMPLATES.map((template) => ({
    templateId: template.id,
    slots: deterministicSlotsForTemplate(template, research),
  }));
}

export function extractMemeVariantsFromResponse(
  content: string,
  options: ExtractMemeVariantsOptions = {},
): MemeVariant[] {
  const providerLabel = options.providerLabel || "Meme provider";
  const payload = parseJsonObject(content, providerLabel);
  const variants = Array.isArray(payload.variants) ? payload.variants : [];
  const byTemplate = new Map<string, MemeVariant>();

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
    if (valid) byTemplate.set(template.id, { templateId: template.id, slots });
  }

  const normalized = MEME_TEMPLATES.map((template) => byTemplate.get(template.id)).filter(Boolean) as MemeVariant[];
  if (normalized.length !== MEME_TEMPLATES.length) throw new Error(`${providerLabel} returned incomplete meme variants.`);
  return normalized;
}

export async function generateMemeVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateMemeVariantsOptions = {},
): Promise<GenerateMemeVariantsResult> {
  const fallback = buildDeterministicMemeVariants(research);
  const prompt = buildMemePrompt(research);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_MEME_MODEL
    || DEFAULT_NVIDIA_NIM_MEME_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (nvidiaNimApiKey && !isDisabled(process.env.NVIDIA_NIM_ENABLED)) {
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
          prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Every required slot must be present, under maxChars, and a complete thought. Return only the JSON object.`,
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
          reason: `Generated ${MEME_TEMPLATES.length} meme ideas with ${nvidiaNimModel}.`,
        },
      };
    } catch (error) {
      const reason = error instanceof Error
        ? `${error.message} Used deterministic meme ideas.`
        : "NVIDIA NIM failed; used deterministic meme ideas.";

      return {
        variants: fallback,
        model: nvidiaNimModel,
        provider: "deterministic",
        providerStatus: {
          provider: "nvidia-nim",
          status: "failed",
          reason,
        },
      };
    }
  }

  return {
    variants: fallback,
    model: nvidiaNimModel,
    provider: "deterministic",
    providerStatus: {
      provider: "nvidia-nim",
      status: "skipped",
      reason: "NVIDIA NIM was not configured; used deterministic meme ideas.",
    },
  };
}
