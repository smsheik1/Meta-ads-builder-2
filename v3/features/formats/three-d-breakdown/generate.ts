import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL } from "../../llm/nvidiaNimModels";
import type { StoredWebsiteResearchResult } from "../../research/types";
import type {
  ThreeDBreakdownClaimRisk,
  ThreeDBreakdownEvidenceUseType,
  ThreeDBreakdownPrimarySiteType,
  ThreeDBreakdownRevealPattern,
  ThreeDBreakdownRiskFlag,
  ThreeDBreakdownScriptBeat,
  ThreeDBreakdownShot,
  ThreeDBreakdownStoryboardBoard,
} from "../../scene/types";
import { extractThreeDBreakdownEvidence, type ThreeDBreakdownEvidenceItem } from "./evidence";
import {
  buildThreeDBreakdownRetryPrompt,
  buildThreeDBreakdownPrompt,
  THREE_D_BREAKDOWN_MAX_TOKENS,
  THREE_D_BREAKDOWN_VARIANT_COUNT,
  THREE_D_REVEAL_PATTERNS,
  THREE_D_SCRIPT_BEATS,
  THREE_D_SHOT_CONTRACT,
} from "./prompt";

export type ThreeDBreakdownSiteContract = {
  primarySiteType: ThreeDBreakdownPrimarySiteType;
  riskFlags: ThreeDBreakdownRiskFlag[];
  visualWorld: string;
  lighting: string;
  cameraStyle: string;
  recurringObjects: string[];
};

export type ThreeDBreakdownVariant = {
  variantAngle: string;
  customerProblem: string;
  mechanismSummary: string;
  visualMetaphor: string;
  evidenceIndex: number;
  evidenceUseType: ThreeDBreakdownEvidenceUseType;
  wowMomentType: ThreeDBreakdownRevealPattern;
  wowMoment: string;
  viewerLearns: string;
  claimRisk: ThreeDBreakdownClaimRisk;
  claimRiskReason: string;
  storyboardBoard: ThreeDBreakdownStoryboardBoard;
  scriptBeats: ThreeDBreakdownScriptBeat[];
  shots: ThreeDBreakdownShot[];
};

export type ThreeDBreakdownGeneration = {
  siteContract: ThreeDBreakdownSiteContract;
  variants: ThreeDBreakdownVariant[];
  evidenceItems: ThreeDBreakdownEvidenceItem[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: StoredWebsiteResearchResult["providerStatus"][number];
};

const DEFAULT_TIMEOUT_MS = 75_000;
const bannedTextPattern = /\b(zachdfilms|zackdfilms|zach d films|zack d films|creator style|teal\/dark fingerprint)\b/i;
const regulatedUnsafePattern = /\b(cures?|prevents?|diagnos(?:e|is)|treats?|revenue|legal outcome|safe(?:ty)?|guaranteed result|guaranteed to|risk[- ]free|clinically proven|doctor[- ]recommended)\b/i;
const primarySiteTypes: ThreeDBreakdownPrimarySiteType[] = ["ecommerce", "saas", "local-service", "restaurant-food", "nonprofit", "portfolio", "unclear"];
const riskFlags: ThreeDBreakdownRiskFlag[] = ["health", "medical", "legal", "financial", "beauty", "regulated"];
const evidenceUseTypes: ThreeDBreakdownEvidenceUseType[] = ["feature", "mechanism", "offer", "review", "material", "process", "guarantee", "shipping", "proof", "category", "claim"];
const claimRisks: ThreeDBreakdownClaimRisk[] = ["low", "medium", "high"];
const weakSiteCopy = "This page does not contain enough concrete evidence for a 3D Breakdown. Try a product, features, testimonials, case-study, or offer page - or use Visualizer for a lighter ad from this URL.";
const MIN_VISUAL_POTENTIAL_SCORE = 0.7;
const restrictedVerticalPattern = /\b(alcohol|beer|wine|vodka|whiskey|liquor|nicotine|tobacco|vape|cbd|thc|cannabis|marijuana|gambling|casino|betting|weapon|gun|rifle|ammo|adult product|porn|sex toy|political campaign|crypto|investment return|counterfeit|illegal service|extremist)\b/i;

const cleanText = (value: unknown, maxLength = 900) => String(value ?? "")
  .replace(/[—–]/g, "-")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const parseJsonObject = (value: string) => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!jsonText) throw new Error("NVIDIA NIM 3D Breakdown director returned no JSON.");
  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`NVIDIA NIM 3D Breakdown director returned malformed JSON: ${message}`);
  }
};

const assertNoBannedText = (value: string) => {
  if (bannedTextPattern.test(value)) {
    throw new Error("3D Breakdown director used banned creator/style cloning language.");
  }
};

const parseStringArray = (value: unknown, label: string, max = 6) => {
  if (!Array.isArray(value)) throw new Error(`3D Breakdown ${label} must be an array.`);
  const parsed = value.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, max);
  if (!parsed.length) throw new Error(`3D Breakdown ${label} is missing.`);
  return parsed;
};

const parseEnum = <T extends string>(value: unknown, valid: readonly T[], label: string): T => {
  if (typeof value !== "string" || !valid.includes(value as T)) {
    throw new Error(`3D Breakdown ${label} is invalid.`);
  }
  return value as T;
};

const assertClaimRisk = ({
  beats,
  evidence,
  siteContract,
  variant,
}: {
  beats: ThreeDBreakdownScriptBeat[];
  evidence: ThreeDBreakdownEvidenceItem;
  siteContract: ThreeDBreakdownSiteContract;
  variant: Pick<ThreeDBreakdownVariant, "claimRisk" | "claimRiskReason" | "evidenceUseType">;
}) => {
  const combined = `${beats.map((beat) => beat.narration).join(" ")} ${variant.claimRiskReason}`;
  if (siteContract.riskFlags.length && regulatedUnsafePattern.test(combined)) {
    throw new Error("3D Breakdown regulated-risk script contains unsafe claim language.");
  }
  if (variant.evidenceUseType !== evidence.evidenceUseType) {
    throw new Error("3D Breakdown variant evidenceUseType must match selected evidence.");
  }
};

const parseScriptBeats = (value: unknown): ThreeDBreakdownScriptBeat[] => {
  if (!Array.isArray(value) || value.length !== THREE_D_SCRIPT_BEATS.length) {
    throw new Error("3D Breakdown needs exactly 5 narration beats.");
  }
  return value.map((beat, index) => {
    const raw = beat as Record<string, unknown>;
    const contract = THREE_D_SCRIPT_BEATS[index]!;
    const narration = cleanText(raw.narration, 180);
    if (raw.role !== contract.role || raw.startMs !== contract.startMs || raw.endMs !== contract.endMs) {
      throw new Error(`3D Breakdown beat ${index + 1} timing or role is invalid.`);
    }
    if (!narration) throw new Error(`3D Breakdown beat ${index + 1} narration is missing.`);
    assertNoBannedText(narration);
    return {
      role: contract.role,
      narration,
      startMs: contract.startMs,
      endMs: contract.endMs,
    };
  }) as ThreeDBreakdownScriptBeat[];
};

const parseSiteContract = (parsed: Record<string, unknown>): ThreeDBreakdownSiteContract => {
  const parsedRiskFlags = Array.isArray(parsed.riskFlags)
    ? parsed.riskFlags.map((flag) => parseEnum(flag, riskFlags, "risk flag"))
    : (() => { throw new Error("3D Breakdown riskFlags must be an array."); })();
  const siteContract = {
    primarySiteType: parseEnum(parsed.primarySiteType, primarySiteTypes, "primarySiteType"),
    riskFlags: parsedRiskFlags,
    visualWorld: cleanText(parsed.visualWorld, 160),
    lighting: cleanText(parsed.lighting, 140),
    cameraStyle: cleanText(parsed.cameraStyle, 140),
    recurringObjects: parseStringArray(parsed.recurringObjects, "recurringObjects", 4),
  };
  if (!siteContract.visualWorld || !siteContract.lighting || !siteContract.cameraStyle) {
    throw new Error("3D Breakdown top-level visual continuity fields are missing.");
  }
  return siteContract;
};

const parseShots = (value: unknown): ThreeDBreakdownShot[] => {
  if (!Array.isArray(value) || value.length !== THREE_D_SHOT_CONTRACT.length) {
    throw new Error("3D Breakdown needs exactly 3 visual shots.");
  }
  return value.map((shot, index) => {
    const raw = shot as Record<string, unknown>;
    const contract = THREE_D_SHOT_CONTRACT[index]!;
    if (raw.shotIndex !== contract.shotIndex || raw.role !== contract.role) {
      throw new Error(`3D Breakdown shot ${index + 1} contract is invalid.`);
    }
    const captionText = cleanText(raw.captionText, 90);
    const sceneDescription = cleanText(raw.sceneDescription, 260);
    const explainerDevice = cleanText(raw.explainerDevice, 120);
    const physicalAction = cleanText(raw.physicalAction, 140);
    const imagePrompt = cleanText(raw.imagePrompt, 1400);
    const animationPrompt = cleanText(raw.animationPrompt, 900);
    for (const text of [captionText, sceneDescription, explainerDevice, physicalAction, imagePrompt, animationPrompt]) {
      if (!text) throw new Error(`3D Breakdown shot ${index + 1} is incomplete.`);
      assertNoBannedText(text);
    }
    return {
      shotIndex: contract.shotIndex,
      role: contract.role,
      captionText,
      sceneDescription,
      explainerDevice,
      physicalAction,
      imagePrompt,
      animationPrompt,
      image: { status: "idle" },
      video: { status: "idle" },
    };
  }) as ThreeDBreakdownShot[];
};

const parseStoryboardBoard = (value: unknown): ThreeDBreakdownStoryboardBoard => {
  const raw = typeof value === "string"
    ? { frameCount: 6, imagePrompt: value }
    : value as Record<string, unknown>;
  if (!raw || typeof raw !== "object") {
    throw new Error("3D Breakdown storyboard board is missing.");
  }
  if (raw.frameCount !== 6) {
    throw new Error("3D Breakdown storyboard board must have 6 frames.");
  }
  const imagePrompt = cleanText(raw.imagePrompt, 1800);
  if (!imagePrompt) throw new Error("3D Breakdown storyboard board image prompt is missing.");
  assertNoBannedText(imagePrompt);
  const lockedPrompt = [
    "Create one vertical 9:16 storyboard artist planning board for a 20-second 3D Breakdown.",
    "EXACTLY SIX framed panels arranged 2 columns by 3 rows with clean gutters.",
    "Use one coherent procedural 3D explainer world on a clean blue/cyan blueprint-grid stage, close camera, one dominant subject/action per panel.",
    "If image references are provided, use the style reference frame only for visual grammar and use product/brand references only for shape, color, packaging cues, and material cues.",
    `Story sequence to visualize: ${imagePrompt}`,
    "Panel order: panel 1 problem state, panel 2 context escalation, panel 3 mechanism setup, panel 4 peak impossible-to-film wow reveal, panel 5 evidence/payoff, panel 6 final transformed state.",
    "No captions, no caption bars, no black lower bars, no progress bars, no readable text, no UI labels, no speech bubbles, no receipts, no posters, no typography-led design.",
  ].join(" ");
  return {
    frameCount: 6,
    imagePrompt: lockedPrompt,
    image: { status: "idle" },
  };
};

const parseVariants = (
  parsed: Record<string, unknown>,
  evidenceItems: ThreeDBreakdownEvidenceItem[],
  requestedCount: number,
  siteContract: ThreeDBreakdownSiteContract,
) => {
  const variants = (Array.isArray(parsed.variants) ? parsed.variants : []).map((variant, index) => {
    const rawVariant = variant as Record<string, unknown>;
    const evidenceIndex = Number(rawVariant.evidenceIndex);
    const evidence = evidenceItems.find((item) => item.evidenceIndex === evidenceIndex);
    if (!evidence) throw new Error(`3D Breakdown variant ${index + 1} references invalid evidence.`);
    const parsedVariantBase = {
      variantAngle: cleanText(rawVariant.variantAngle ?? rawVariant.angle, 120),
      customerProblem: cleanText(rawVariant.customerProblem, 160),
      mechanismSummary: cleanText(rawVariant.mechanismSummary, 180),
      visualMetaphor: cleanText(rawVariant.visualMetaphor, 160),
      evidenceIndex,
      evidenceUseType: parseEnum(rawVariant.evidenceUseType, evidenceUseTypes, "evidenceUseType"),
      wowMomentType: parseEnum(rawVariant.wowMomentType, THREE_D_REVEAL_PATTERNS, "wowMomentType"),
      wowMoment: cleanText(rawVariant.wowMoment, 220),
      viewerLearns: cleanText(rawVariant.viewerLearns, 220),
      claimRisk: parseEnum(rawVariant.claimRisk, claimRisks, "claimRisk"),
      claimRiskReason: cleanText(rawVariant.claimRiskReason, 220),
    };
    for (const [key, value] of Object.entries(parsedVariantBase)) {
      if (typeof value === "string" && !value) throw new Error(`3D Breakdown variant ${index + 1} ${key} is missing.`);
      if (typeof value === "string") assertNoBannedText(value);
    }
    const scriptBeats = parseScriptBeats(rawVariant.scriptBeats);
    assertClaimRisk({
      beats: scriptBeats,
      evidence,
      siteContract,
      variant: parsedVariantBase,
    });
    return {
      ...parsedVariantBase,
      storyboardBoard: parseStoryboardBoard(rawVariant.storyboardBoard ?? rawVariant.storyboardImagePrompt),
      scriptBeats,
      shots: parseShots(rawVariant.shots),
    };
  });
  if (variants.length < requestedCount) {
    throw new Error(`3D Breakdown director returned ${variants.length} variants; expected at least ${requestedCount}.`);
  }
  const selectedVariants = variants.slice(0, requestedCount);
  if (selectedVariants.length > 1) {
    for (let index = 0; index < selectedVariants.length - 1; index += 1) {
      const a = selectedVariants[index]!;
      const b = selectedVariants[index + 1]!;
      const differences = [
        a.customerProblem !== b.customerProblem,
        a.mechanismSummary !== b.mechanismSummary,
        a.evidenceIndex !== b.evidenceIndex,
        a.visualMetaphor !== b.visualMetaphor,
        a.wowMomentType !== b.wowMomentType,
        a.scriptBeats[0]?.narration !== b.scriptBeats[0]?.narration,
        a.scriptBeats[4]?.narration !== b.scriptBeats[4]?.narration,
      ].filter(Boolean).length;
      if (differences < 2) throw new Error("3D Breakdown variants must be meaningfully distinct.");
    }
  }
  return selectedVariants;
};

const structuredErrorFrom = (error: unknown) => ({
  code: "THREE_D_BREAKDOWN_CONTRACT_FAILED",
  path: "threeDBreakdown",
  message: error instanceof Error ? error.message : String(error),
});

const parseDirectorOutput = (
  raw: string,
  evidenceItems: ThreeDBreakdownEvidenceItem[],
  requestedCount: number,
) => {
  const parsed = parseJsonObject(raw);
  const siteContract = parseSiteContract(parsed);
  const variants = parseVariants(parsed, evidenceItems, requestedCount, siteContract);
  return { siteContract, variants };
};

const assertAllowedVertical = (research: StoredWebsiteResearchResult) => {
  const productText = (research.productCatalog?.products || [])
    .slice(0, 12)
    .map((product) => `${product.title} ${product.productType || ""}`)
    .join(" ");
  const combined = [
    research.brand.name,
    research.brand.description,
    research.brandBrief.offer,
    research.brandBrief.audience,
    ...research.brandBrief.proof,
    ...research.brandBrief.siteLanguage,
    ...research.evidence.receipts.specificClaims,
    productText,
  ].join(" ");
  if (restrictedVerticalPattern.test(combined)) {
    throw new Error(`${weakSiteCopy} restricted_vertical`);
  }
};

export async function generateThreeDBreakdownVariantsFromResearch(
  research: StoredWebsiteResearchResult,
  {
    count = THREE_D_BREAKDOWN_VARIANT_COUNT,
    nvidiaNimApiKey = process.env.NVIDIA_NIM_API_KEY || "",
    nvidiaNimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL,
    nvidiaNimChatCompletion,
    nvidiaNimModel = process.env.NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL || DEFAULT_NVIDIA_NIM_WERE_SORRY_MODEL,
  }: {
    count?: number;
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
  } = {},
): Promise<ThreeDBreakdownGeneration> {
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM is not configured for 3D Breakdown generation.");
  const startedAt = Date.now();
  console.log("[wiggly:3d-breakdown] start", {
    count,
    host: research.host,
    model: nvidiaNimModel,
  });
  assertAllowedVertical(research);
  const evidenceItems = extractThreeDBreakdownEvidence(research);
  console.log("[wiggly:3d-breakdown] evidence:ready", {
    elapsedMs: Date.now() - startedAt,
    evidenceCount: evidenceItems.length,
    host: research.host,
    topEvidence: evidenceItems[0] ? {
      evidenceUseType: evidenceItems[0].evidenceUseType,
      possibleRevealPatterns: evidenceItems[0].possibleRevealPatterns,
      visualPotentialScore: evidenceItems[0].visualPotentialScore,
    } : null,
  });
  if (!evidenceItems.length) {
    throw new Error(`${weakSiteCopy} missing_strong_evidence`);
  }
  const hasOffer = Boolean(cleanText(research.brandBrief.offer, 120)) || Boolean(research.productCatalog?.products?.length);
  const hasProblem = Boolean(cleanText(research.brandBrief.audience, 120))
    || research.brandBrief.buyerMoments.length > 0
    || Boolean(research.adAngles?.some((angle) => cleanText(angle.pain, 120)));
  const hasConcreteEvidence = evidenceItems.some((item) => item.evidenceUseType !== "category" && item.visualPotentialScore >= 0.5);
  const directorEvidenceItems = evidenceItems.filter((item) => (
    item.evidenceUseType !== "category" && item.visualPotentialScore >= MIN_VISUAL_POTENTIAL_SCORE
  ));
  if (!hasOffer) throw new Error(`${weakSiteCopy} missing_offer`);
  if (!hasProblem) throw new Error(`${weakSiteCopy} missing_problem`);
  if (!hasConcreteEvidence) throw new Error(`${weakSiteCopy} missing_strong_evidence`);
  if (!directorEvidenceItems.length) throw new Error(`${weakSiteCopy} weak_visual_evidence`);
  const requestedCount = Math.max(1, Math.min(2, Math.round(count || THREE_D_BREAKDOWN_VARIANT_COUNT)));
  console.log("[wiggly:3d-breakdown] director:prompt:ready", {
    directorEvidenceCount: directorEvidenceItems.length,
    elapsedMs: Date.now() - startedAt,
    requestedCount,
  });
  const prompt = buildThreeDBreakdownPrompt({ count: requestedCount, evidence: directorEvidenceItems, research });
  const callDirector = (directorPrompt: string) => callNvidiaNimChat({
    apiKey: nvidiaNimApiKey,
    baseUrl: nvidiaNimBaseUrl,
    label: "NVIDIA NIM 3D Breakdown director",
    maxTokens: THREE_D_BREAKDOWN_MAX_TOKENS,
    model: nvidiaNimModel,
    nvidiaNimChatCompletion,
    prompt: directorPrompt,
    temperature: 0.65,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  console.log("[wiggly:3d-breakdown] director:call:start", {
    attempt: "initial",
    elapsedMs: Date.now() - startedAt,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  const raw = await callDirector(prompt);
  console.log("[wiggly:3d-breakdown] director:call:ready", {
    attempt: "initial",
    elapsedMs: Date.now() - startedAt,
    responseChars: raw.length,
  });
  let parsedGeneration: ReturnType<typeof parseDirectorOutput>;
  try {
    parsedGeneration = parseDirectorOutput(raw, directorEvidenceItems, requestedCount);
  } catch (error) {
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
    parsedGeneration = parseDirectorOutput(retryRaw, directorEvidenceItems, requestedCount);
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
