import { GoogleGenAI } from "@google/genai";
import type { StoredWebsiteResearchResult } from "../../research/types";
import { DEFAULT_GEMINI_AD_IDEA_MODEL } from "../../ad-generation/generate";
import { buildMemePrompt } from "./prompt";
import { MEME_TEMPLATES, getMemeTemplate, type MemeTemplate } from "./templates";

export type MemeVariant = {
  templateId: string;
  slots: Record<string, string>;
};

export type GenerateMemeVariantsResult = {
  variants: MemeVariant[];
  model: string;
  provider: "gemini" | "deterministic";
  providerStatus: {
    provider: "gemini";
    status: "used" | "skipped" | "failed";
    reason: string;
  };
};

type GeminiGenerateContent = (input: { model: string; prompt: string }) => Promise<string>;

type GenerateMemeVariantsOptions = {
  geminiApiKey?: string;
  geminiGenerateContent?: GeminiGenerateContent;
  geminiModel?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 30_000;

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const normalizeSlotText = (value: unknown) => String(value ?? "")
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/!\[[^\]]*]\[[^\]]*]/g, " ")
  .replace(/!\[[^\]]*]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;

const limitWords = (value: string, maxWords: number) => value.split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");

const limitCharsAtWordBoundary = (value: string, maxChars: number) => {
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, maxChars).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  return (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trim();
};

const fitSlotText = (value: unknown, maxWords: number, maxChars: number) => (
  limitCharsAtWordBoundary(limitWords(normalizeSlotText(value), maxWords), maxChars)
);

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
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
    return withTimeout(geminiGenerateContent({ model, prompt }), timeoutMs, "Gemini meme generation");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  }), timeoutMs, "Gemini meme generation");

  return response.text || "{\"variants\":[]}";
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

export function extractMemeVariantsFromResponse(content: string): MemeVariant[] {
  const payload = parseJsonObject(content, "Gemini");
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
      const text = normalizeSlotText(slotsPayload[slot.id]);
      if (!text || text.length > slot.maxChars || wordCount(text) > slot.maxWords) valid = false;
      if (template.id === "this_is_fine" && /this\s+is\s+fine/i.test(text)) valid = false;
      slots[slot.id] = text;
    }
    if (valid) byTemplate.set(template.id, { templateId: template.id, slots });
  }

  const normalized = MEME_TEMPLATES.map((template) => byTemplate.get(template.id)).filter(Boolean) as MemeVariant[];
  if (normalized.length !== MEME_TEMPLATES.length) throw new Error("Gemini returned incomplete meme variants.");
  return normalized;
}

export async function generateMemeVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateMemeVariantsOptions = {},
): Promise<GenerateMemeVariantsResult> {
  const fallback = buildDeterministicMemeVariants(research);
  const prompt = buildMemePrompt(research);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const geminiModel = options.geminiModel || process.env.GEMINI_AD_MODEL || DEFAULT_GEMINI_AD_IDEA_MODEL;
  const geminiApiKey = options.geminiApiKey ?? process.env.GEMINI_API_KEY;

  if (geminiApiKey && !isDisabled(process.env.GEMINI_ENABLED)) {
    try {
      const content = await callGemini({
        apiKey: geminiApiKey,
        model: geminiModel,
        prompt,
        timeoutMs,
        geminiGenerateContent: options.geminiGenerateContent,
      });
      let variants: MemeVariant[];
      try {
        variants = extractMemeVariantsFromResponse(content);
      } catch {
        const retryContent = await callGemini({
          apiKey: geminiApiKey,
          model: geminiModel,
          prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Every required slot must be present and under maxChars and maxWords. Return only the JSON object.`,
          timeoutMs,
          geminiGenerateContent: options.geminiGenerateContent,
        });
        variants = extractMemeVariantsFromResponse(retryContent);
      }

      return {
        variants,
        model: geminiModel,
        provider: "gemini",
        providerStatus: {
          provider: "gemini",
          status: "used",
          reason: `Generated ${MEME_TEMPLATES.length} meme ideas with ${geminiModel}.`,
        },
      };
    } catch (error) {
      const reason = error instanceof Error
        ? `${error.message} Used deterministic meme ideas.`
        : "Gemini failed; used deterministic meme ideas.";

      return {
        variants: fallback,
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

  return {
    variants: fallback,
    model: geminiModel,
    provider: "deterministic",
    providerStatus: {
      provider: "gemini",
      status: "skipped",
      reason: "Gemini was not configured; used deterministic meme ideas.",
    },
  };
}
