import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_VIDEO_MEME_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import { buildVideoMemePrompt } from "./prompt";
import { VIDEO_MEME_VARIANT_COUNT, getVideoMemeTemplate } from "./templates";

export type VideoMemeMode = "caught" | "flattering";

export type VideoMemeVariant = {
  angle: string;
  target: string;
  clipId: "bear-sniff";
  caption: string;
  mode: VideoMemeMode;
  selfCheckPassed: string;
};

export type GenerateVideoMemeVariantsResult = {
  variants: VideoMemeVariant[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used";
    reason: string;
  };
};

type GenerateVideoMemeVariantsOptions = {
  count?: number;
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
};

type ExtractVideoMemeVariantsOptions = {
  brandNames?: string[];
  count?: number;
  providerLabel?: string;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const maxVariants = 12;
const bannedWords = [
  "unlock",
  "elevate",
  "supercharge",
  "game-changer",
  "level up",
  "revolutionary",
  "transform",
];

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const normalizeCount = (count?: number) => {
  if (!Number.isFinite(count)) return VIDEO_MEME_VARIANT_COUNT;
  return Math.max(1, Math.min(maxVariants, Math.floor(count ?? VIDEO_MEME_VARIANT_COUNT)));
};

const cleanText = (value: unknown, maxLength = 220) => String(value ?? "")
  .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
  .replace(/https?:\/\/\S+/gi, " ")
  .replace(/[#\n\r]+/g, " ")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const cleanKey = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const includesBannedWord = (value: string) => {
  const lower = value.toLowerCase();
  return bannedWords.some((word) => lower.includes(word));
};

const hasDanglingEnding = (value: string) => /\b(?:and|the|to|for|of|on|with|that)$/i.test(value.trim());

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
  return JSON.parse(jsonText) as Record<string, unknown>;
};

const uniqueBrandNames = (brandNames: string[]) => Array.from(new Set(brandNames
  .map((name) => cleanText(name, 80))
  .filter((name) => name.length >= 3)
  .map((name) => name.toLowerCase())));

const namesBrand = (caption: string, brandNames: string[]) => {
  const lowerCaption = caption.toLowerCase();
  return uniqueBrandNames(brandNames).some((name) => lowerCaption.includes(name));
};

export function extractVideoMemeVariantsFromResponse(
  content: string,
  options: ExtractVideoMemeVariantsOptions = {},
): VideoMemeVariant[] {
  const providerLabel = options.providerLabel || "Video meme provider";
  const expectedCount = normalizeCount(options.count);
  const template = getVideoMemeTemplate("bear-sniff");
  if (!template) throw new Error("Bear sniff template is missing.");

  const payload = parseJsonObject(content, providerLabel);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const seenAngles = new Set<string>();
  const seenCaptions = new Set<string>();
  const seenTargets = new Set<string>();
  const variants: VideoMemeVariant[] = [];

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const angle = cleanText(record.angle, 140);
    const target = cleanText(record.target, 140);
    const caption = cleanText(record.caption, template.captionMaxChars + 20);
    const clipId = String(record.clipId || "");
    const mode = String(record.mode || "") as VideoMemeMode;
    const selfCheckPassed = cleanText(record.selfCheckPassed, 220);
    const angleKey = cleanKey(angle);
    const targetKey = cleanKey(target);
    const captionKey = cleanKey(caption);

    if (clipId !== "bear-sniff") continue;
    if (mode !== "caught" && mode !== "flattering") continue;
    if (!angle || !target || !caption || !selfCheckPassed) continue;
    if (!/^This bear sniffs\b/i.test(caption)) continue;
    if (caption.length > template.captionMaxChars) continue;
    if (hasDanglingEnding(caption)) continue;
    if (includesBannedWord(caption)) continue;
    if (namesBrand(caption, options.brandNames || [])) continue;
    if (seenAngles.has(angleKey) || seenTargets.has(targetKey) || seenCaptions.has(captionKey)) continue;

    seenAngles.add(angleKey);
    seenTargets.add(targetKey);
    seenCaptions.add(captionKey);
    variants.push({
      angle,
      target,
      clipId: "bear-sniff",
      caption,
      mode,
      selfCheckPassed,
    });
  }

  if (variants.length !== expectedCount) {
    throw new Error(`${providerLabel} returned incomplete video meme variants.`);
  }
  return variants;
}

export async function generateVideoMemeVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateVideoMemeVariantsOptions = {},
): Promise<GenerateVideoMemeVariantsResult> {
  const count = normalizeCount(options.count);
  const prompt = buildVideoMemePrompt(research, count);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_VIDEO_MEME_MODEL
    || DEFAULT_NVIDIA_NIM_VIDEO_MEME_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;
  const brandNames = [
    research.brand.name,
    research.brandBrief.brandName,
    research.host,
  ];

  if (!nvidiaNimApiKey) {
    throw new Error("NVIDIA NIM video meme generation is not configured.");
  }
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) {
    throw new Error("NVIDIA NIM video meme generation is disabled.");
  }

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM video meme generation",
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs,
    });
    let variants: VideoMemeVariant[];
    try {
      variants = extractVideoMemeVariantsFromResponse(content, {
        brandNames,
        count,
        providerLabel: "NVIDIA NIM",
      });
    } catch {
      const retryContent = await callNvidiaNimChat({
        apiKey: nvidiaNimApiKey,
        baseUrl: nvidiaNimBaseUrl,
        label: "NVIDIA NIM video meme generation",
        model: nvidiaNimModel,
        nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
        prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Return exactly ${count} variants. Every variant needs a unique angle, unique target, clipId "bear-sniff", caption starting with "This bear sniffs", mode caught or flattering, and selfCheckPassed. Never name the brand/product. Return only the JSON object.`,
        timeoutMs,
      });
      variants = extractVideoMemeVariantsFromResponse(retryContent, {
        brandNames,
        count,
        providerLabel: "NVIDIA NIM",
      });
    }

    return {
      variants,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${count} video meme captions with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM video meme generation failed: ${message}`);
  }
}
