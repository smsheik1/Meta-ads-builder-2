import { callNvidiaNimChat, DEFAULT_NVIDIA_NIM_BASE_URL, type NvidiaNimChatCompletion } from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import type { ThreeDBreakdownEvidenceItem } from "./evidence";
import {
  buildThreeDBreakdownRetryPrompt, buildThreeDBreakdownPrompt,
  buildThreeDBreakdownStoryDirectionsPrompt, buildThreeDBreakdownStoryDirectionsRetryPrompt,
  buildThreeDBreakdownStyleBScriptPrompt, buildThreeDBreakdownStyleBScriptRetryPrompt,
  THREE_D_BREAKDOWN_MAX_TOKENS, THREE_D_BREAKDOWN_VARIANT_COUNT, type ThreeDBreakdownLockedStyleBScript,
} from "./prompt";
import type { ThreeDBreakdownStoryDirection, ThreeDBreakdownStoryDirectionSlate } from "./storyDirections";
import { resolveThreeDBreakdownStorySubject, type ThreeDBreakdownStorySubject } from "./storySubject";
import {
  countWords, parseStoryDirectionSlateOutput, parseStyleBScriptPlanOutput,
  parseDirectorOutput, prepareThreeDBreakdownEvidence,
  type ThreeDBreakdownSiteContract, type ThreeDBreakdownVariant,
} from "./planning";
export type { ThreeDBreakdownSiteContract, ThreeDBreakdownVariant } from "./planning";

export type ThreeDBreakdownGeneration = {
  siteContract: ThreeDBreakdownSiteContract;
  variants: ThreeDBreakdownVariant[];
  evidenceItems: ThreeDBreakdownEvidenceItem[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: StoredWebsiteResearchResult["providerStatus"][number];
};

export type ThreeDBreakdownStoryDirectionGeneration = ThreeDBreakdownStoryDirectionSlate & {
  evidenceItems: ThreeDBreakdownEvidenceItem[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: StoredWebsiteResearchResult["providerStatus"][number];
};

const DEFAULT_TIMEOUT_MS = 75_000;
const structuredErrorFrom = (error: unknown) => ({
  code: "THREE_D_BREAKDOWN_CONTRACT_FAILED",
  path: "threeDBreakdown",
  message: error instanceof Error ? error.message : String(error),
});

const isNvidiaNimTimeout = (error: unknown) => (
  /NVIDIA NIM 3D Breakdown director timed out/i.test(error instanceof Error ? error.message : String(error))
);

export async function generateThreeDBreakdownStoryDirectionsFromResearch(
  research: StoredWebsiteResearchResult,
  {
    nvidiaNimApiKey = process.env.NVIDIA_NIM_API_KEY || "",
    nvidiaNimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL,
    nvidiaNimChatCompletion,
    nvidiaNimModel = process.env.NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL || DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL,
    allowRetries = true,
    onProviderCall,
    storySubject,
  }: {
    allowRetries?: boolean;
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
    onProviderCall?: () => void | Promise<void>;
    storySubject?: ThreeDBreakdownStorySubject | null;
  } = {},
): Promise<ThreeDBreakdownStoryDirectionGeneration> {
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM is not configured for 3D Breakdown story directions.");
  const startedAt = Date.now();
  console.log("[wiggly:3d-breakdown] story-slate:start", {
    host: research.host,
    model: nvidiaNimModel,
  });
  const resolvedStorySubject = storySubject
    ? resolveThreeDBreakdownStorySubject(research, storySubject)
    : undefined;
  const { directorEvidenceItems, evidenceItems } = prepareThreeDBreakdownEvidence(
    research,
    startedAt,
    resolvedStorySubject,
  );
  const prompt = buildThreeDBreakdownStoryDirectionsPrompt({
    evidence: directorEvidenceItems,
    research,
    storySubject: resolvedStorySubject,
  });
  const callDirector = async (directorPrompt: string) => {
    await onProviderCall?.();
    return callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM 3D Breakdown story slate",
      maxTokens: 1600,
      model: nvidiaNimModel,
      nvidiaNimChatCompletion,
      prompt: directorPrompt,
      stream: true,
      structuredOutput: false,
      temperature: 0.62,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  };
  console.log("[wiggly:3d-breakdown] story-slate:call:start", {
    attempt: "initial",
    elapsedMs: Date.now() - startedAt,
  });
  const raw = await callDirector(prompt);
  let slate: ThreeDBreakdownStoryDirectionSlate;
  try {
    slate = parseStoryDirectionSlateOutput(raw, directorEvidenceItems, resolvedStorySubject);
  } catch (error) {
    if (!allowRetries) throw error;
    console.warn("[wiggly:3d-breakdown] story-slate:parse:retry", {
      elapsedMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    });
    const retryPrompt = buildThreeDBreakdownStoryDirectionsRetryPrompt({
      originalPrompt: prompt,
      validationErrors: [structuredErrorFrom(error)],
    });
    const retryRaw = await callDirector(retryPrompt);
    slate = parseStoryDirectionSlateOutput(retryRaw, directorEvidenceItems, resolvedStorySubject);
  }
  console.log("[wiggly:3d-breakdown] story-slate:ready", {
    elapsedMs: Date.now() - startedAt,
    storyDirectionCount: slate.directions.length,
  });
  return {
    ...slate,
    evidenceItems,
    model: nvidiaNimModel,
    provider: "nvidia-nim",
    providerStatus: {
      provider: "nvidia-nim-curator",
      status: "used",
      reason: `Generated ${slate.directions.length} 3D Breakdown story directions.`,
    },
  };
}

export async function generateThreeDBreakdownVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  {
    count = THREE_D_BREAKDOWN_VARIANT_COUNT,
    nvidiaNimApiKey = process.env.NVIDIA_NIM_API_KEY || "",
    nvidiaNimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL,
    nvidiaNimChatCompletion,
    nvidiaNimModel = process.env.NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL || DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL,
    allowRetries = true,
    onProviderCall,
    selectedStoryDirection,
    storySubject,
  }: {
    allowRetries?: boolean;
    count?: number;
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
    onProviderCall?: () => void | Promise<void>;
    selectedStoryDirection?: ThreeDBreakdownStoryDirection | null;
    storySubject?: ThreeDBreakdownStorySubject | null;
  } = {},
): Promise<ThreeDBreakdownGeneration> {
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM is not configured for 3D Breakdown generation.");
  const startedAt = Date.now();
  console.log("[wiggly:3d-breakdown] start", {
    count,
    host: research.host,
    model: nvidiaNimModel,
  });
  const resolvedStorySubject = storySubject
    ? resolveThreeDBreakdownStorySubject(research, storySubject)
    : undefined;
  const { directorEvidenceItems, evidenceItems } = prepareThreeDBreakdownEvidence(
    research,
    startedAt,
    resolvedStorySubject,
  );
  const requestedCount = selectedStoryDirection
    ? 1
    : Math.max(1, Math.min(2, Math.round(count || THREE_D_BREAKDOWN_VARIANT_COUNT)));
  console.log("[wiggly:3d-breakdown] director:prompt:ready", {
    directorEvidenceCount: directorEvidenceItems.length,
    elapsedMs: Date.now() - startedAt,
    requestedCount,
  });
  const callDirector = async (directorPrompt: string) => {
    await onProviderCall?.();
    return callNvidiaNimChat({
      apiKey: nvidiaNimApiKey,
      baseUrl: nvidiaNimBaseUrl,
      label: "NVIDIA NIM 3D Breakdown director",
      maxTokens: THREE_D_BREAKDOWN_MAX_TOKENS,
      model: nvidiaNimModel,
      nvidiaNimChatCompletion,
      prompt: directorPrompt,
      stream: true,
      structuredOutput: false,
      temperature: 0.45,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  };
  let lockedStyleBScript: ThreeDBreakdownLockedStyleBScript | null = null;
  if (requestedCount > 1 || selectedStoryDirection) {
    const scriptPrompt = buildThreeDBreakdownStyleBScriptPrompt({
      evidence: directorEvidenceItems,
      research,
      selectedStoryDirection,
      storySubject: resolvedStorySubject,
    });
    console.log("[wiggly:3d-breakdown] style-b-script:call:start", {
      attempt: "initial",
      elapsedMs: Date.now() - startedAt,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    const scriptRaw = await callDirector(scriptPrompt);
    console.log("[wiggly:3d-breakdown] style-b-script:call:ready", {
      attempt: "initial",
      elapsedMs: Date.now() - startedAt,
      responseChars: scriptRaw.length,
    });
    try {
      lockedStyleBScript = parseStyleBScriptPlanOutput(scriptRaw, directorEvidenceItems, research, selectedStoryDirection, resolvedStorySubject);
    } catch (error) {
      if (!allowRetries) throw error;
      console.warn("[wiggly:3d-breakdown] style-b-script:parse:retry", {
        elapsedMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      });
      const retryPrompt = buildThreeDBreakdownStyleBScriptRetryPrompt({
        originalPrompt: scriptPrompt,
        validationErrors: [structuredErrorFrom(error)],
      });
      console.log("[wiggly:3d-breakdown] style-b-script:call:start", {
        attempt: "retry",
        elapsedMs: Date.now() - startedAt,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      });
      const retryRaw = await callDirector(retryPrompt);
      console.log("[wiggly:3d-breakdown] style-b-script:call:ready", {
        attempt: "retry",
        elapsedMs: Date.now() - startedAt,
        responseChars: retryRaw.length,
      });
      lockedStyleBScript = parseStyleBScriptPlanOutput(retryRaw, directorEvidenceItems, research, selectedStoryDirection, resolvedStorySubject);
    }
    console.log("[wiggly:3d-breakdown] style-b-script:ready", {
      elapsedMs: Date.now() - startedAt,
      evidenceIndex: lockedStyleBScript.evidenceIndex,
      words: countWords(lockedStyleBScript.referenceScript),
    });
  }
  const prompt = buildThreeDBreakdownPrompt({
    count: requestedCount,
    evidence: directorEvidenceItems,
    lockedStyleBScript,
    research,
    selectedStoryDirection,
    storySubject: resolvedStorySubject,
  });
  console.log("[wiggly:3d-breakdown] director:call:start", {
    attempt: "initial",
    elapsedMs: Date.now() - startedAt,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  let raw: string;
  try {
    raw = await callDirector(prompt);
  } catch (error) {
    if (!allowRetries || !isNvidiaNimTimeout(error)) throw error;
    console.warn("[wiggly:3d-breakdown] director:transport:retry", {
      elapsedMs: Date.now() - startedAt,
      reason: error instanceof Error ? error.message : String(error),
    });
    raw = await callDirector(prompt);
  }
  console.log("[wiggly:3d-breakdown] director:call:ready", {
    attempt: "initial",
    elapsedMs: Date.now() - startedAt,
    responseChars: raw.length,
  });
  let parsedGeneration: ReturnType<typeof parseDirectorOutput>;
  try {
    parsedGeneration = parseDirectorOutput(raw, directorEvidenceItems, requestedCount, lockedStyleBScript, resolvedStorySubject);
  } catch (error) {
    if (!allowRetries) throw error;
    console.warn("[wiggly:3d-breakdown] director:parse:retry", {
      elapsedMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    });
    const retryPrompt = buildThreeDBreakdownRetryPrompt({
      originalPrompt: prompt,
      validationErrors: [structuredErrorFrom(error)],
    });
    console.log("[wiggly:3d-breakdown] director:call:start", {
      attempt: "retry",
      elapsedMs: Date.now() - startedAt,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    const retryRaw = await callDirector(retryPrompt);
    console.log("[wiggly:3d-breakdown] director:call:ready", {
      attempt: "retry",
      elapsedMs: Date.now() - startedAt,
      responseChars: retryRaw.length,
    });
    parsedGeneration = parseDirectorOutput(retryRaw, directorEvidenceItems, requestedCount, lockedStyleBScript, resolvedStorySubject);
  }
  console.log("[wiggly:3d-breakdown] ready", {
    elapsedMs: Date.now() - startedAt,
    variantCount: parsedGeneration.variants.length,
  });
  return {
    siteContract: parsedGeneration.siteContract,
    variants: parsedGeneration.variants,
    evidenceItems,
    model: nvidiaNimModel,
    provider: "nvidia-nim",
    providerStatus: {
      provider: "nvidia-nim-curator",
      status: "used",
      reason: `Generated ${parsedGeneration.variants.length} 3D Breakdown script variants with grounded evidence.`,
    },
  };
}
