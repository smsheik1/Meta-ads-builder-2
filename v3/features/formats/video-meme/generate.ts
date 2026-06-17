import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_VIDEO_MEME_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import { buildVideoMemePrompt } from "./prompt";
import { VIDEO_MEME_VARIANT_COUNT, getVideoMemeTemplate, type VideoMemeTemplateId } from "./templates";

export type VideoMemeMode =
  | "caught"
  | "flattering"
  | "comic_dread"
  | "customer_pain"
  | "business_pain"
  | "goofy_exaggeration";

export type VideoMemeVariant = {
  angle: string;
  target: string;
  clipId: VideoMemeTemplateId;
  caption?: string;
  slots?: {
    caption?: string;
    setupText?: string;
    dreadText?: string;
  };
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
  templateId?: VideoMemeTemplateId;
  timeoutMs?: number;
};

type ExtractVideoMemeVariantsOptions = {
  brandNames?: string[];
  count?: number;
  providerLabel?: string;
  templateId?: VideoMemeTemplateId;
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

const normalizeCount = (count?: number, defaultCount = VIDEO_MEME_VARIANT_COUNT) => {
  if (!Number.isFinite(count)) return defaultCount;
  return Math.max(1, Math.min(maxVariants, Math.floor(count ?? defaultCount)));
};

const getProviderRequestCount = (count: number) => Math.min(maxVariants, count + 3);

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
const hasGenericDread = (value: string) => /\b(?:panic|disaster|nightmare|chaos|doomed|things go wrong)\b/i.test(value);
const namesUnderlyingPain = (value: string) => /\b(?:real pain|underlying pain|pain underneath|traces to|based on)\b/i.test(value);

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

const matchesTemplatePattern = (caption: string, prefixes: readonly string[]) => (
  prefixes.some((prefix) => caption.toLowerCase().startsWith(prefix.toLowerCase()))
);

export function extractVideoMemeVariantsFromResponse(
  content: string,
  options: ExtractVideoMemeVariantsOptions = {},
): VideoMemeVariant[] {
  const providerLabel = options.providerLabel || "Video meme provider";
  const template = getVideoMemeTemplate(options.templateId || "bear-sniff");
  if (!template) throw new Error("Video meme template is missing.");
  const expectedCount = normalizeCount(options.count, template.variantCount);

  const payload = parseJsonObject(content, providerLabel);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const seenAngles = new Set<string>();
  const seenCaptions = new Set<string>();
  const seenDreadTexts = new Set<string>();
  const seenTargets = new Set<string>();
  const variants: VideoMemeVariant[] = [];
  const acceptVariant = (
    variant: VideoMemeVariant,
    keys: { angle: string; target: string; caption: string; dreadText?: string },
  ) => {
    if (
      seenAngles.has(keys.angle) ||
      seenTargets.has(keys.target) ||
      seenCaptions.has(keys.caption) ||
      (keys.dreadText && seenDreadTexts.has(keys.dreadText))
    ) {
      return false;
    }

    seenAngles.add(keys.angle);
    seenTargets.add(keys.target);
    seenCaptions.add(keys.caption);
    if (keys.dreadText) seenDreadTexts.add(keys.dreadText);
    variants.push(variant);
    return true;
  };

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const angle = cleanText(record.angle, 140);
    const slots = record.slots && typeof record.slots === "object" ? record.slots as Record<string, unknown> : {};
    const setupText = cleanText(slots.setupText, template.captionMaxChars + 20);
    const dreadText = cleanText(slots.dreadText, template.captionMaxChars + 20);
    const caption = cleanText(record.caption || slots.caption, template.captionMaxChars + 20);
    const target = cleanText(record.target || dreadText || record.angle, 140);
    const clipId = String(record.clipId || record.templateId || "");
    const mode = String(record.mode || "") as VideoMemeMode;
    const selfCheckPassed = cleanText(record.selfCheckPassed, 220);
    const angleKey = cleanKey(angle);
    const targetKey = cleanKey(target);
    const captionKey = cleanKey(caption);
    const pairKey = cleanKey(`${setupText} -> ${dreadText}`);
    const dreadKey = cleanKey(dreadText);

    if (clipId !== template.id) continue;
    if (template.id === "pingu-noot-noot") {
      if (!angle || !setupText || !dreadText || !selfCheckPassed) continue;
      if (setupText.length > template.captionMaxChars || dreadText.length > template.captionMaxChars) continue;
      if (hasDanglingEnding(setupText) || hasDanglingEnding(dreadText)) continue;
      if (includesBannedWord(setupText) || includesBannedWord(dreadText) || hasGenericDread(dreadText)) continue;
      if (namesBrand(`${setupText} ${dreadText}`, options.brandNames || [])) continue;
      if (/^This bear sniffs\b/i.test(`${setupText} ${dreadText}`)) continue;
      acceptVariant({
        angle,
        target,
        clipId: template.id,
        slots: { setupText, dreadText },
        mode: "comic_dread",
        selfCheckPassed,
      }, { angle: angleKey, target: targetKey, caption: pairKey, dreadText: dreadKey });
      continue;
    }

    if (template.id === "darwin-journey") {
      if (!template.allowedModes.includes(mode)) continue;
      if (!angle || !target || !caption || !selfCheckPassed) continue;
      if (setupText || dreadText) continue;
      if (/^This bear sniffs\b/i.test(caption)) continue;
      if (caption.length > template.captionMaxChars) continue;
      if (hasDanglingEnding(caption)) continue;
      if (includesBannedWord(caption)) continue;
      if (namesBrand(caption, options.brandNames || [])) continue;
      if (mode === "goofy_exaggeration" && !namesUnderlyingPain(selfCheckPassed)) continue;
      acceptVariant({
        angle,
        target,
        clipId: template.id,
        caption,
        slots: { caption },
        mode,
        selfCheckPassed,
      }, { angle: angleKey, target: targetKey, caption: captionKey });
      continue;
    }

    if (!template.allowedModes.includes(mode)) continue;
    if (!angle || !target || !caption || !selfCheckPassed) continue;
    if (!matchesTemplatePattern(caption, template.patternPrefixes)) continue;
    if (caption.length > template.captionMaxChars) continue;
    if (hasDanglingEnding(caption)) continue;
    if (includesBannedWord(caption)) continue;
    if (namesBrand(caption, options.brandNames || [])) continue;
    acceptVariant({
      angle,
      target,
      clipId: template.id,
      caption,
      mode,
      selfCheckPassed,
    }, { angle: angleKey, target: targetKey, caption: captionKey });
  }

  if (variants.length < expectedCount) {
    throw new Error(`${providerLabel} returned incomplete video meme variants.`);
  }
  return variants.slice(0, expectedCount);
}

export async function generateVideoMemeVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateVideoMemeVariantsOptions = {},
): Promise<GenerateVideoMemeVariantsResult> {
  const templateId = options.templateId || "bear-sniff";
  const template = getVideoMemeTemplate(templateId);
  if (!template) throw new Error(`Unknown video meme template: ${templateId}`);
  const count = normalizeCount(options.count, template.variantCount);
  const providerRequestCount = getProviderRequestCount(count);
  const prompt = buildVideoMemePrompt(research, providerRequestCount, templateId);
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
        templateId,
      });
    } catch {
      const retryShape = template.id === "pingu-noot-noot"
        ? `templateId "${template.id}", slots.setupText, slots.dreadText`
        : template.id === "darwin-journey"
          ? `templateId "${template.id}", slots.caption`
          : `clipId "${template.id}", a caption matching this clip's required pattern`;
      const retryContent = await callNvidiaNimChat({
        apiKey: nvidiaNimApiKey,
        baseUrl: nvidiaNimBaseUrl,
        label: "NVIDIA NIM video meme generation",
        model: nvidiaNimModel,
        nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
        prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Return exactly ${providerRequestCount} variants so at least ${count} pass validation. Every variant needs a unique angle, unique target, ${retryShape}, mode ${template.allowedModes.join(" or ")}, and selfCheckPassed. Never name the brand/product. Return only the JSON object.`,
        timeoutMs,
      });
      variants = extractVideoMemeVariantsFromResponse(retryContent, {
        brandNames,
        count,
        providerLabel: "NVIDIA NIM",
        templateId,
      });
    }

    return {
      variants,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${count} ${template.name} captions with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM video meme generation failed: ${message}`);
  }
}
