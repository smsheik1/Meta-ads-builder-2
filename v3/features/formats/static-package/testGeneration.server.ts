import {
  DEFAULT_NVIDIA_NIM_BASE_URL,
  DEFAULT_NVIDIA_NIM_MODEL,
  callNvidiaNimChat,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import type { ProductCatalogItem, StoredWebsiteResearchResult } from "../../research/types";
import {
  createMakerFormatTestPrompt,
  validateMakerFormatTestGeneration,
  type MakerFormatTestContract,
} from "./testRuntime";

export async function generateMakerFormatTestVariations({
  answers,
  contract,
  nvidiaNimApiKey = process.env.NVIDIA_NIM_API_KEY || "",
  nvidiaNimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL,
  nvidiaNimChatCompletion,
  nvidiaNimModel = process.env.NVIDIA_NIM_AD_MODEL || DEFAULT_NVIDIA_NIM_MODEL,
  product,
  research,
}: {
  answers: Array<{ question: string; answer: string }>;
  contract: MakerFormatTestContract;
  nvidiaNimApiKey?: string;
  nvidiaNimBaseUrl?: string;
  nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
  nvidiaNimModel?: string;
  product: ProductCatalogItem | null;
  research: StoredWebsiteResearchResult;
}) {
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM Maker test generation is not configured.");
  const raw = await callNvidiaNimChat({
    apiKey: nvidiaNimApiKey,
    baseUrl: nvidiaNimBaseUrl,
    label: "NVIDIA NIM Maker Format test",
    maxTokens: 5_000,
    model: nvidiaNimModel,
    nvidiaNimChatCompletion,
    prompt: createMakerFormatTestPrompt({ answers, contract, product, research }),
    structuredOutput: true,
    temperature: 0.72,
    timeoutMs: 120_000,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("NVIDIA NIM Maker Format test did not return bare JSON. Nothing was repaired or retried.");
  }
  return validateMakerFormatTestGeneration(contract, parsed);
}
