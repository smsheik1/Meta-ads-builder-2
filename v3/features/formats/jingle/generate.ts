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
  DEFAULT_JINGLE_STYLE_ID,
  getJingleStyle,
  type JingleStyleId,
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
  jingleStyleId?: JingleStyleId;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const cleanText = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/\s+/g, " ")
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

const hasInventedNumber = (text: string) => /\b(percent|guarantee|guaranteed|award|discount)\b|#\s*1|\d+\s*%\b|\d+\s+percent|\d+\s+off\b/i.test(text);

const createJingleGuidedJson = (): Record<string, unknown> => ({
  type: "object",
  additionalProperties: false,
  properties: {
    variants: {
      type: "array",
      minItems: JINGLE_VARIANT_COUNT,
      maxItems: JINGLE_VARIANT_COUNT,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["angle", "brandPhonetic", "hook", "verseLines"],
        properties: {
          angle: { type: "string", minLength: 1, maxLength: 160 },
          brandPhonetic: { type: "string", minLength: 1, maxLength: 80 },
          hook: { type: "string", minLength: 1, maxLength: 120 },
          verseLines: {
            type: "array",
            minItems: 2,
            maxItems: 3,
            items: { type: "string", minLength: 1, maxLength: 120 },
          },
        },
      },
    },
  },
  required: ["variants"],
});

const createCompositionPlan = (
  hook: string,
  verseLines: string[],
  brandPhonetic: string,
  styleId: JingleStyleId,
): JingleCompositionChunk[] => {
  const style = getJingleStyle(styleId);
  const chunk = (text: string, durationMs: number): JingleCompositionChunk => ({
    text,
    duration_ms: durationMs,
    positive_styles: [...style.positiveStyles],
    negative_styles: [...style.negativeStyles],
    context_adherence: "high",
  });
  const hookText = `[Hook]\n${hook}\n${brandPhonetic}`;
  return [
    chunk(hookText, 6000),
    chunk(`[Verse]\n${verseLines.join("\n")}`, 8000),
    chunk(hookText, 6000),
  ];
};

export function extractJingleVariantsFromResponse(
  content: string,
  providerLabel = "Jingle provider",
  styleId: JingleStyleId = DEFAULT_JINGLE_STYLE_ID,
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
    const hook = cleanText(record.hook, 120);
    const verseLines = Array.isArray(record.verseLines)
      ? record.verseLines.map((line) => cleanText(line, 120)).filter(Boolean)
      : [];
    const chunks = createCompositionPlan(hook, verseLines, brandPhonetic, styleId);
    const musicLengthMs = JINGLE_MUSIC_LENGTH_MS;
    const selfCheckPassed = "Wiggly assembled the fixed 20-second composition plan.";
    const lyrics = chunks.flatMap((chunk) => lyricLines(chunk.text));
    const angleKey = angle.toLowerCase();
    const hookKey = hook.toLowerCase();

    if (!angle || !brandPhonetic || !hook) continue;
    if (seenAngles.has(angleKey) || seenHooks.has(hookKey)) continue;
    if (verseLines.length < 2 || verseLines.length > 3) continue;
    if (hasInventedNumber([hook, ...verseLines].join(" "))) continue;
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
  const jingleStyleId = options.jingleStyleId || DEFAULT_JINGLE_STYLE_ID;
  const prompt = buildJinglePrompt(research, jingleStyleId);
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
      guidedJson: createJingleGuidedJson(),
      maxTokens: 1000,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    const variants = extractJingleVariantsFromResponse(content, "NVIDIA NIM", jingleStyleId);

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
