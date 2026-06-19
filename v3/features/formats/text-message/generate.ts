import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import {
  DEFAULT_TEXT_MESSAGE_VARIANT_COUNT,
  TEXT_MESSAGE_MAX_CHARS_PER_MESSAGE,
  TEXT_MESSAGE_MAX_MESSAGES,
  TEXT_MESSAGE_MAX_TOTAL_CHARS,
  TEXT_MESSAGE_MIN_MESSAGES,
  buildTextMessagePrompt,
} from "./prompt";

export type TextMessageSide = "left" | "right";

export type TextMessageVariant = {
  angle: string;
  contactName: string;
  timestampLabel: string;
  messages: Array<{
    side: TextMessageSide;
    text: string;
  }>;
  selfCheckPassed: string;
};

export type GenerateTextMessageVariantsResult = {
  variants: TextMessageVariant[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used";
    reason: string;
  };
};

type GenerateTextMessageVariantsOptions = {
  count?: number;
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const bannedPhrases = ["unlock", "elevate", "game-changer", "transform your business"];

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const normalizeCount = (count?: number) => (
  Number.isFinite(count)
    ? Math.max(1, Math.min(12, Math.floor(count ?? DEFAULT_TEXT_MESSAGE_VARIANT_COUNT)))
    : DEFAULT_TEXT_MESSAGE_VARIANT_COUNT
);

const cleanText = (value: unknown, maxLength = 220) => String(value ?? "")
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

export function extractTextMessageVariantsFromResponse(
  content: string,
  brandName: string,
  count = DEFAULT_TEXT_MESSAGE_VARIANT_COUNT,
  providerLabel = "Text message provider",
): TextMessageVariant[] {
  const payload = parseJsonObject(content, providerLabel);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const expectedCount = normalizeCount(count);
  const seenAngles = new Set<string>();
  const variants: TextMessageVariant[] = [];

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const angle = cleanText(record.angle, 140);
    const contactName = cleanText(record.contactName, 32) || "Friend";
    const timestampLabel = cleanText(record.timestampLabel, 32) || "Today 9:41 AM";
    const selfCheckPassed = cleanText(record.selfCheckPassed, 180);
    const rawMessages = Array.isArray(record.messages) ? record.messages : [];
    const messages = rawMessages.map((message) => {
      const messageRecord = message && typeof message === "object" ? message as Record<string, unknown> : {};
      const side = messageRecord.side === "left" || messageRecord.side === "right" ? messageRecord.side : null;
      return side ? {
        side,
        text: cleanText(messageRecord.text, TEXT_MESSAGE_MAX_CHARS_PER_MESSAGE + 1),
      } : null;
    }).filter((message): message is TextMessageVariant["messages"][number] => Boolean(message?.text));
    const fullText = messages.map((message) => message.text).join(" ");
    const angleKey = angle.toLowerCase();
    const messageKeys = messages.map((message) => message.text.toLowerCase());

    if (!angle || seenAngles.has(angleKey)) continue;
    if (messages.length < TEXT_MESSAGE_MIN_MESSAGES || messages.length > TEXT_MESSAGE_MAX_MESSAGES) continue;
    if (!messages.some((message) => message.side === "left") || !messages.some((message) => message.side === "right")) continue;
    if (messages.some((message) => message.text.length > TEXT_MESSAGE_MAX_CHARS_PER_MESSAGE)) continue;
    if (messages.reduce((sum, message) => sum + message.text.length, 0) > TEXT_MESSAGE_MAX_TOTAL_CHARS) continue;
    if (new Set(messageKeys).size !== messageKeys.length) continue;
    if (countBrandMentions(fullText, brandName) > 1) continue;
    if (includesBannedPhrase(fullText)) continue;

    seenAngles.add(angleKey);
    variants.push({
      angle,
      contactName,
      timestampLabel,
      messages,
      selfCheckPassed,
    });
  }

  if (variants.length !== expectedCount) {
    throw new Error(`${providerLabel} returned incomplete text message variants.`);
  }
  return variants;
}

export async function generateTextMessageVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateTextMessageVariantsOptions = {},
): Promise<GenerateTextMessageVariantsResult> {
  const count = normalizeCount(options.count);
  const prompt = buildTextMessagePrompt(research, count);
  const brandName = research.brandBrief.brandName || research.brand.name;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_TEXT_MESSAGE_MODEL
    || DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM text message generation is not configured.");
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) throw new Error("NVIDIA NIM text message generation is disabled.");

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM text message generation",
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs,
    });
    let variants: TextMessageVariant[];
    try {
      variants = extractTextMessageVariantsFromResponse(content, brandName, count, "NVIDIA NIM");
    } catch {
      const retryContent = await callNvidiaNimChat({
        apiKey: nvidiaNimApiKey,
        baseUrl: nvidiaNimBaseUrl,
        label: "NVIDIA NIM text message generation",
        model: nvidiaNimModel,
        nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
        prompt: `${prompt}\n\nYour previous output was invalid. Retry once. Return exactly ${count} variants, each with a unique angle and ${TEXT_MESSAGE_MIN_MESSAGES}-${TEXT_MESSAGE_MAX_MESSAGES} messages that fit the character budgets. Return only the JSON object.`,
        timeoutMs,
      });
      variants = extractTextMessageVariantsFromResponse(retryContent, brandName, count, "NVIDIA NIM");
    }

    return {
      variants,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${count} iMessage ad ideas with ${nvidiaNimModel}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM text message generation failed: ${message}`);
  }
}
