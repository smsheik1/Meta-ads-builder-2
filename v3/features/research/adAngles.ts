import { GoogleGenAI } from "@google/genai";
import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_AD_IDEA_MODEL } from "../llm/nvidiaNimModels";
import { withTimeout } from "../llm/timeout";
import type { BrandAdAngle, ResearchProviderStatus, WebsiteResearchResult } from "./types";

type GeminiGenerateContent = (input: { model: string; prompt: string }) => Promise<string>;

export type AdAnglesOptions = {
  geminiApiKey?: string;
  geminiGenerateContent?: GeminiGenerateContent;
  geminiModel?: string;
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
};

export type ResolveAdAnglesResult = {
  adAngles: BrandAdAngle[];
  providerStatus: ResearchProviderStatus;
};

export const DEFAULT_GEMINI_AD_ANGLES_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_TIMEOUT_MS = 20_000;

const cleanText = (value: unknown, maxLength = 260) => String(value ?? "")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const listForPrompt = (items: string[], maxItems = 10) => (
  items.map((item) => cleanText(item, 220)).filter(Boolean).slice(0, maxItems)
);

const parseJsonArray = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("[")
    ? trimmed
    : trimmed.match(/\[[\s\S]*\]/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no ad angle JSON.`);
  return JSON.parse(jsonText) as unknown;
};

export const normalizeAdAnglesPayload = (payload: unknown): BrandAdAngle[] => {
  const seen = new Set<string>();
  return (Array.isArray(payload) ? payload : [])
    .map((item) => {
      const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        buyer: cleanText(record.buyer, 120),
        moment: cleanText(record.moment, 160),
        pain: cleanText(record.pain, 180),
        proof: cleanText(record.proof, 180),
        sitePhrase: cleanText(record.sitePhrase, 180) || null,
      };
    })
    .filter((angle) => angle.buyer && angle.moment && angle.pain && angle.proof)
    .filter((angle) => {
      const key = `${angle.moment.toLowerCase()}|${angle.proof.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
};

export const buildAdAnglesPrompt = (research: WebsiteResearchResult) => {
  const brandName = cleanText(research.brandBrief.brandName || research.brand.name, 80);
  const brandTitle = cleanText(research.brand.title, 140);
  const brandDescription = cleanText(research.brand.description, 260);
  const sitePhrases = listForPrompt(research.brandBrief.siteLanguage, 8);
  const rawContent = [
    ...research.evidence.headings,
    ...research.evidence.paragraphs,
    ...research.brandBrief.buyerMoments,
    ...research.brandBrief.proof,
  ].map((item) => cleanText(item, 220)).filter(Boolean).slice(0, 36);

  return `You are extracting AD ANGLES for ${brandName} from website evidence.

An ad angle is ONE complete, linked idea a buyer would instantly recognize.
Your job is to find the 5-8 STRONGEST distinct angles in the evidence, not to invent them.

INPUTS:
- Brand: ${brandName} - ${brandTitle}
- Description: ${brandDescription}
- Site phrases (exact, verbatim): ${JSON.stringify(sitePhrases)}
- Raw headings/paragraphs: ${JSON.stringify(rawContent)}

WHAT EACH ANGLE MUST CONTAIN:
{
  "buyer": "the specific person, not a category (e.g. 'solo dental practice owner', not 'dentists')",
  "moment": "a specific lived moment this buyer has actually experienced (e.g. 'phones flooding at Monday open')",
  "pain": "the stake - what it costs them, in plain words, NO invented numbers",
  "proof": "the ONE concrete thing this brand does that resolves it - must trace to the evidence",
  "sitePhrase": "an exact phrase from the site that backs this, or null if none exists"
}

HARD RULES:
- Every angle MUST be traceable to the evidence. If you can't point to a phrase or fact, drop the angle.
- NO invented numbers, stats, claims, or proof. If the site doesn't say it, it doesn't exist.
- Each angle must be DISTINCT: a different buyer moment AND a different proof. No rewordings.
- "moment" must be a specific scene, not a feeling. Bad: "wants reliability." Good: "the patient called, nobody picked up."
- Prefer FEWER strong, concrete angles over padding to 8 with weak ones.
- If proof is thin across the whole site, return only the angles you can actually support and set "proof" honestly.

SELF-CHECK before returning each angle:
- Could this angle ONLY belong to this brand's buyer? If swapping in a competitor still works, the angle is too generic - cut it.
- Is the moment something the buyer has physically lived through? If it's abstract, cut it.

OUTPUT:
Return ONLY a JSON array of 5-8 angle objects in the shape above. No commentary.`;
};

const callGeminiAngles = async ({
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
    return withTimeout(geminiGenerateContent({ model, prompt }), timeoutMs, "Gemini ad angles");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  }), timeoutMs, "Gemini ad angles");

  return response.text || "[]";
};

export const extractAdAnglesFromResearch = async (
  research: WebsiteResearchResult,
  options: AdAnglesOptions = {},
): Promise<ResolveAdAnglesResult> => {
  const prompt = buildAdAnglesPrompt(research);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;
  const nvidiaNimModel = options.nvidiaNimModel || process.env.NVIDIA_NIM_AD_ANGLES_MODEL || DEFAULT_NVIDIA_NIM_AD_IDEA_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl || process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL;
  const geminiApiKey = options.geminiApiKey ?? process.env.GEMINI_API_KEY;
  const geminiModel = options.geminiModel || process.env.GEMINI_AD_ANGLES_MODEL || DEFAULT_GEMINI_AD_ANGLES_MODEL;
  let nvidiaFailure = "";

  if (nvidiaNimApiKey && !isDisabled(process.env.NVIDIA_NIM_ENABLED)) {
    try {
      const content = await callNvidiaNimChat({
        apiKey: nvidiaNimApiKey,
        baseUrl: nvidiaNimBaseUrl,
        label: "NVIDIA NIM ad angles",
        model: nvidiaNimModel,
        nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
        prompt,
        temperature: 0.25,
        timeoutMs,
      });
      const adAngles = normalizeAdAnglesPayload(parseJsonArray(content, "NVIDIA NIM"));
      return {
        adAngles,
        providerStatus: {
          provider: "ad-angles",
          status: adAngles.length ? "used" : "skipped",
          reason: adAngles.length
            ? `Extracted ${adAngles.length} ad angles with ${nvidiaNimModel}.`
            : "NVIDIA NIM returned no usable ad angles.",
        },
      };
    } catch (error) {
      nvidiaFailure = error instanceof Error ? error.message : "NVIDIA NIM ad angles failed.";
    }
  }

  if (geminiApiKey && !isDisabled(process.env.GEMINI_ENABLED)) {
    try {
      const content = await callGeminiAngles({
        apiKey: geminiApiKey,
        model: geminiModel,
        prompt,
        timeoutMs,
        geminiGenerateContent: options.geminiGenerateContent,
      });
      const adAngles = normalizeAdAnglesPayload(parseJsonArray(content, "Gemini"));
      return {
        adAngles,
        providerStatus: {
          provider: "ad-angles",
          status: adAngles.length ? "used" : "skipped",
          reason: adAngles.length
            ? `Extracted ${adAngles.length} ad angles with ${geminiModel}.`
            : "Gemini returned no usable ad angles.",
        },
      };
    } catch (error) {
      const geminiFailure = error instanceof Error ? error.message : "Gemini ad angles failed.";
      return {
        adAngles: [],
        providerStatus: {
          provider: "ad-angles",
          status: "failed",
          reason: nvidiaFailure ? `${nvidiaFailure} ${geminiFailure}` : geminiFailure,
        },
      };
    }
  }

  return {
    adAngles: [],
    providerStatus: {
      provider: "ad-angles",
      status: nvidiaFailure ? "failed" : "skipped",
      reason: nvidiaFailure || "Ad angle extraction was not configured.",
    },
  };
};
