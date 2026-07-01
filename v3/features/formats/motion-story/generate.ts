import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL } from "../../llm/nvidiaNimModels";
import type { ProductCatalogItem, StoredWebsiteResearchResult } from "../../research/types";
import type { MotionStoryBeat } from "../../scene/types";
import { normalizeProofText } from "../reviews/evidence";
import { normalizeReviewProductHandles } from "../reviews/productSelection";
import { getMotionStoryStrongProofItems, type MotionStoryStrongProof } from "./proof";
import { buildMotionStoryPrompt, MOTION_STORY_MANUAL_VARIANT_COUNT } from "./prompt";

export type MotionStoryVariant = {
  hookAngle: string;
  proofIndex: number;
  proofDisplayText: string;
  proofStrengthReason: string;
  beats: [
    MotionStoryBeat & { role: "hook"; motion: "kinetic-reveal"; startMs: 0; endMs: 3000 },
    MotionStoryBeat & { role: "product"; motion: "image-expand"; startMs: 3000; endMs: 8000 },
    MotionStoryBeat & { role: "proof"; motion: "proof-card"; startMs: 8000; endMs: 16000 },
    MotionStoryBeat & { role: "cta"; motion: "cta-slam"; startMs: 16000; endMs: 20000 },
  ];
  shareCopy: string;
};

export type GenerateMotionStoryVariantsResult = {
  variants: MotionStoryVariant[];
  product: ProductCatalogItem;
  proofItems: MotionStoryStrongProof[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: {
    provider: "nvidia-nim";
    status: "used";
    reason: string;
  };
};

type GenerateMotionStoryVariantsOptions = {
  count?: number;
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  reviewFetcher?: typeof fetch;
  selectedProductHandles?: string[];
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 60_000;
const MOTION_STORY_MAX_TOKENS = 4000;
const genericHookPhrases = [
  "discover",
  "experience",
  "premium quality",
  "satisfaction",
  "shop now",
  "delicious cookies today",
  "great product",
];

const beatContract = [
  { role: "hook", motion: "kinetic-reveal", startMs: 0, endMs: 3000 },
  { role: "product", motion: "image-expand", startMs: 3000, endMs: 8000 },
  { role: "proof", motion: "proof-card", startMs: 8000, endMs: 16000 },
  { role: "cta", motion: "cta-slam", startMs: 16000, endMs: 20000 },
] as const;

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const cleanText = (value: unknown, maxLength = 180) => String(value ?? "")
  .replace(/\s+/g, " ")
  .replace(/\s+([,.!?])/g, "$1")
  .trim()
  .slice(0, maxLength)
  .trim();

const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;

const parseJsonObject = (value: string, providerLabel = "AI provider") => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error(`${providerLabel} returned no JSON.`);
  return JSON.parse(jsonText) as Record<string, unknown>;
};

const isVerbatimTrim = (proofText: string, sourceText: string) => {
  const proof = normalizeProofText(proofText).toLowerCase();
  const source = normalizeProofText(sourceText).toLowerCase();
  return Boolean(proof) && source.includes(proof);
};

export function pickMotionStoryProduct(
  research: StoredWebsiteResearchResult,
  selectedProductHandles: string[] = [],
) {
  const products = research.productCatalog?.products || [];
  const selected = new Set(normalizeReviewProductHandles(selectedProductHandles));
  const product = products.find((item) => selected.has(item.handle) && item.imageUrl)
    || products.find((item) => item.badges.includes("best-seller") && item.imageUrl)
    || products.find((item) => item.imageUrl);
  if (!product) {
    const productCount = products.length;
    throw new Error(productCount
      ? `Motion Story found ${productCount} products, but none had usable product images. Refresh website research or choose a product page.`
      : "Motion Story needs an ecommerce product image. This site did not expose product images during research.");
  }
  return product;
}

function parseMotionStoryVariants(
  content: string,
  proofItems: MotionStoryStrongProof[],
  count: number,
  providerLabel: string,
): MotionStoryVariant[] {
  const payload = parseJsonObject(content, providerLabel);
  const rawVariants = Array.isArray(payload.variants) ? payload.variants : [];
  const variants: MotionStoryVariant[] = [];
  const seenHookAngles = new Set<string>();
  const seenProofIndexes = new Set<number>();

  for (const item of rawVariants) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const proofIndex = Number(record.proofIndex);
    const proofItem = proofItems.find((candidate) => candidate.proofIndex === proofIndex);
    const hookAngle = cleanText(record.hookAngle, 90);
    const proofDisplayText = cleanText(record.proofDisplayText, 120).replace(/^["“”]+|["“”]+$/g, "");
    const proofStrengthReason = cleanText(record.proofStrengthReason, 180);
    const shareCopy = cleanText(record.shareCopy, 160);
    const rawBeats = Array.isArray(record.beats) ? record.beats : [];

    if (!proofItem || !hookAngle || !proofDisplayText || !proofStrengthReason || !shareCopy) continue;
    if (wordCount(proofDisplayText) > 15 || !isVerbatimTrim(proofDisplayText, proofItem.text)) continue;
    if (genericHookPhrases.some((phrase) => hookAngle.toLowerCase().includes(phrase))) continue;
    if (rawBeats.length !== beatContract.length) continue;

    const beats = rawBeats.map((beat, index) => {
      if (!beat || typeof beat !== "object") return null;
      const source = beat as Record<string, unknown>;
      const contract = beatContract[index];
      const headline = cleanText(source.headline, contract.role === "hook" ? 76 : 72);
      const supportingText = cleanText(source.supportingText, 120);
      if (
        source.role !== contract.role ||
        source.motion !== contract.motion ||
        Number(source.startMs) !== contract.startMs ||
        Number(source.endMs) !== contract.endMs ||
        !headline
      ) return null;
      return {
        role: contract.role,
        motion: contract.motion,
        headline,
        ...(supportingText ? { supportingText } : {}),
        startMs: contract.startMs,
        endMs: contract.endMs,
      };
    });
    if (beats.some((beat) => !beat)) continue;
    if (genericHookPhrases.some((phrase) => beats[0]!.headline.toLowerCase().includes(phrase))) continue;
    if (count > 1 && (seenHookAngles.has(hookAngle.toLowerCase()) || seenProofIndexes.has(proofIndex))) continue;

    seenHookAngles.add(hookAngle.toLowerCase());
    seenProofIndexes.add(proofIndex);
    variants.push({
      hookAngle,
      proofIndex,
      proofDisplayText,
      proofStrengthReason,
      beats: beats as MotionStoryVariant["beats"],
      shareCopy,
    });
  }

  if (variants.length !== count) {
    throw new Error(`${providerLabel} returned incomplete Motion Story variants.`);
  }
  return variants;
}

export async function generateMotionStoryVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  options: GenerateMotionStoryVariantsOptions = {},
): Promise<GenerateMotionStoryVariantsResult> {
  const count = options.count ?? MOTION_STORY_MANUAL_VARIANT_COUNT;
  const selectedProductHandles = normalizeReviewProductHandles(options.selectedProductHandles || []);
  const product = pickMotionStoryProduct(research, selectedProductHandles);
  const proofItems = await getMotionStoryStrongProofItems(
    research,
    product.title,
    selectedProductHandles.length ? selectedProductHandles : [product.handle],
    options.reviewFetcher ?? fetch,
  );
  if (proofItems.length < count) {
    throw new Error(`Motion Story needs ${count} strong real reviews for ${count} distinct variants.`);
  }

  const nvidiaNimModel = options.nvidiaNimModel
    || process.env.NVIDIA_NIM_MOTION_STORY_MODEL
    || DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL;
  const nvidiaNimBaseUrl = options.nvidiaNimBaseUrl
    || process.env.NVIDIA_NIM_BASE_URL
    || DEFAULT_NVIDIA_NIM_BASE_URL;
  const nvidiaNimApiKey = options.nvidiaNimApiKey ?? process.env.NVIDIA_NIM_API_KEY;

  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM Motion Story generation is not configured.");
  if (isDisabled(process.env.NVIDIA_NIM_ENABLED)) throw new Error("NVIDIA NIM Motion Story generation is disabled.");

  const prompt = buildMotionStoryPrompt({ count, productTitle: product.title, proofItems, research });
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const content = await callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM Motion Story generation",
      maxTokens: MOTION_STORY_MAX_TOKENS,
      model: nvidiaNimModel,
      nvidiaNimChatCompletion: options.nvidiaNimChatCompletion,
      prompt,
      timeoutMs,
    });
    const variants = parseMotionStoryVariants(content, proofItems, count, "NVIDIA NIM");
    return {
      variants,
      product,
      proofItems,
      model: nvidiaNimModel,
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim",
        status: "used",
        reason: `Generated ${count} Motion Story variants with ${nvidiaNimModel} at max_tokens=${MOTION_STORY_MAX_TOKENS}.`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`NVIDIA NIM Motion Story generation failed: ${message}`);
  }
}
