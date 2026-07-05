import {
  callNvidiaNimChat,
  DEFAULT_NVIDIA_NIM_BASE_URL,
  type NvidiaNimChatCompletion,
} from "../../llm/nvidiaNim";
import { DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL } from "../../llm/nvidiaNimModels";
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
  THREE_D_MAX_SCRIPT_WORDS,
  THREE_D_MIN_SCRIPT_WORDS,
  THREE_D_REVEAL_PATTERNS,
  THREE_D_SCRIPT_BEATS,
  THREE_D_SHOT_CONTRACT,
} from "./prompt";
import { createThreeDStoryboardFrames } from "./storyboardContracts";

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
const forbiddenNarrationPattern = /\b(introducing|discover|experience|meet|designed to|helps you|lets you|so you can|perfect for|boost|streamline|optimize|unlock|seamless|powerful|all-in-one|premium|high-quality|game changer|smarter way|solution|take control|level up|get started|shop now|try today|learn more|for a reason|the evidence shows|the website says|the site says)\b/i;
const brokenNarrationPattern = /\bali\s+ve\b|\bprotect(?:s|ed|ing)? alive\b/i;
const transcriptOpeningPattern = /^(when|if|once|imagine|before|after|inside|without|most|many|some|a|an|the|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|every|each|she|he|someone|something|\d)\b/i;
const transcriptConnectorPattern = /\b(when|if|once|as|but|so|because|then|finally|while|before|after|meaning|until|by)\b/gi;
const abstractPunchlinePattern = /^(presence|clarity|confidence|value|connection|impact|control|growth|trust|success)\b/i;
const regulatedUnsafePattern = /\b(cures?|diagnos(?:e|is)|treats?|clinically proven|doctor[- ]recommended|risk[- ]free|legal outcome|guaranteed result|guaranteed to)\b|\b(?:prevents?|eliminates?)\s+(?:disease|pain|cavities|infection|injury|illness|complications|lawsuits?|legal risk|financial loss)\b|\b(?:doubles?|triples?|guarantees?|increases?)\s+(?:revenue|profit|sales|return|roi)\b/i;
const primarySiteTypes: ThreeDBreakdownPrimarySiteType[] = ["ecommerce", "saas", "local-service", "restaurant-food", "nonprofit", "portfolio", "unclear"];
const riskFlags: ThreeDBreakdownRiskFlag[] = ["health", "medical", "legal", "financial", "beauty", "regulated"];
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

const assertNoQuotedImageText = (value: string, label: string) => {
  if (/(^|[\s([{])["'][A-Za-z0-9][^"']{1,48}["']/.test(value)) {
    throw new Error(`3D Breakdown ${label} must not include quoted readable text.`);
  }
};

const countWords = (value: string) => (
  value.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?/g)?.length || 0
);

const sentenceCount = (value: string) => {
  const withoutDecimals = value.replace(/\d[.,]\d/g, "0");
  const sentences = withoutDecimals
    .split(/[.!?]+(?=\s|$)/)
    .map((part) => part.trim())
    .filter(Boolean);
  return Math.max(1, sentences.length);
};

const assertTranscriptScriptShape = (beats: ThreeDBreakdownScriptBeat[]) => {
  const combined = beats.map((beat) => beat.narration).join(" ");
  const totalWords = countWords(combined);
  if (totalWords < THREE_D_MIN_SCRIPT_WORDS || totalWords > THREE_D_MAX_SCRIPT_WORDS) {
    throw new Error(`3D Breakdown script must be ${THREE_D_MIN_SCRIPT_WORDS}-${THREE_D_MAX_SCRIPT_WORDS} words.`);
  }
  beats.forEach((beat, index) => {
    if (sentenceCount(beat.narration) !== 1) {
      throw new Error(`3D Breakdown beat ${index + 1} must be one sentence.`);
    }
    if (forbiddenNarrationPattern.test(beat.narration)) {
      throw new Error("3D Breakdown script contains forbidden ad-style narration.");
    }
    if (brokenNarrationPattern.test(beat.narration)) {
      throw new Error("3D Breakdown script contains broken or awkward narration wording.");
    }
  });
  const opener = beats[0]?.narration || "";
  if (!transcriptOpeningPattern.test(opener)) {
    throw new Error("3D Breakdown script must open with a concrete incident.");
  }
  const connectorCount = combined.match(transcriptConnectorPattern)?.length || 0;
  if (connectorCount < 2) {
    throw new Error("3D Breakdown script must use transcript-style causal connectors.");
  }
  const punchline = beats[beats.length - 1]?.narration || "";
  if (countWords(punchline) > 7) {
    throw new Error("3D Breakdown punchline must be 7 words or fewer.");
  }
  if (abstractPunchlinePattern.test(punchline)) {
    throw new Error("3D Breakdown punchline must not start with an abstract noun.");
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

const parseRiskFlags = (value: unknown) => {
  if (!Array.isArray(value)) throw new Error("3D Breakdown riskFlags must be an array.");
  const uniqueFlags = Array.from(new Set(value));
  uniqueFlags.forEach((flag) => {
    if (!riskFlags.includes(flag as ThreeDBreakdownRiskFlag)) {
      throw new Error("3D Breakdown riskFlags contains an invalid flag.");
    }
  });
  return riskFlags.filter((flag) => uniqueFlags.includes(flag));
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
};

const parseScriptBeats = (value: unknown): ThreeDBreakdownScriptBeat[] => {
  if (!Array.isArray(value) || value.length !== THREE_D_SCRIPT_BEATS.length) {
    throw new Error("3D Breakdown needs exactly 5 narration beats.");
  }
  const beats = value.map((beat, index) => {
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
  assertTranscriptScriptShape(beats);
  return beats;
};

const parseSiteContract = (parsed: Record<string, unknown>): ThreeDBreakdownSiteContract => {
  const parsedRiskFlags = parseRiskFlags(parsed.riskFlags);
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

const defaultShotField = (
  index: number,
  field: "captionText" | "sceneDescription" | "explainerDevice" | "physicalAction" | "imagePrompt" | "animationPrompt",
) => {
  const role = THREE_D_SHOT_CONTRACT[index]!.role;
  if (role === "consequence") {
    return {
      captionText: "Something breaks.",
      sceneDescription: "The shared 3D world shows the customer friction physically blocking the main recurring object.",
      explainerDevice: "Miniature problem cutaway",
      physicalAction: "The main recurring object blocks, piles up, or tangles to create visible friction.",
      imagePrompt: "Cinematic 3D explainer scene showing customer friction physically blocking the recurring object on a blue blueprint-grid stage, no text, no realistic faces.",
      animationPrompt: "The blocked object strains once while the camera pushes in.",
    }[field];
  }
  if (role === "mechanism") {
    return {
      captionText: "The mechanism appears.",
      sceneDescription: "The shared 3D world reveals the hidden mechanism through an impossible-to-film cutaway.",
      explainerDevice: "Impossible-to-film mechanism reveal",
      physicalAction: "The mechanism opens, splits, assembles, or locks together to reveal how the offer works.",
      imagePrompt: "Cinematic 3D mechanism reveal with floating layers, cutaway parts, and unmarked proof objects on a blue blueprint-grid stage, no text, no realistic faces.",
      animationPrompt: "The mechanism opens and locks together in one clean motion.",
    }[field];
  }
  return {
    captionText: "Proof lands.",
    sceneDescription: "The shared 3D world connects the selected evidence to the final transformed state.",
    explainerDevice: "Proof payoff cutaway",
    physicalAction: "Unmarked proof objects settle into place as the final transformation becomes visible.",
    imagePrompt: "Cinematic 3D proof payoff scene with unmarked proof blocks settling into the transformed world on a blue blueprint-grid stage, no text, no realistic faces.",
    animationPrompt: "Unmarked proof objects settle as the final state holds.",
  }[field];
};

const parseShots = (value: unknown): ThreeDBreakdownShot[] => {
  if (!Array.isArray(value) || value.length < THREE_D_SHOT_CONTRACT.length) {
    throw new Error("3D Breakdown needs exactly 3 visual shots.");
  }
  return THREE_D_SHOT_CONTRACT.map((contract, index) => {
    const shot = value.find((item) => {
      const raw = item as Record<string, unknown>;
      return raw.shotIndex === contract.shotIndex || raw.role === contract.role;
    }) || value[index];
    const raw = shot as Record<string, unknown>;
    if (
      (raw.shotIndex !== undefined && raw.shotIndex !== contract.shotIndex) ||
      (raw.role !== undefined && raw.role !== contract.role)
    ) {
      throw new Error(`3D Breakdown shot ${index + 1} contract is invalid.`);
    }
    const captionText = cleanText(raw.captionText, 90) || defaultShotField(index, "captionText");
    const sceneDescription = cleanText(raw.sceneDescription, 260) || defaultShotField(index, "sceneDescription");
    const explainerDevice = cleanText(raw.explainerDevice, 120) || defaultShotField(index, "explainerDevice");
    const physicalAction = cleanText(raw.physicalAction, 140) || defaultShotField(index, "physicalAction");
    const imagePrompt = cleanText(raw.imagePrompt, 1400) || defaultShotField(index, "imagePrompt");
    const animationPrompt = cleanText(raw.animationPrompt, 900) || defaultShotField(index, "animationPrompt");
    for (const text of [captionText, sceneDescription, explainerDevice, physicalAction, imagePrompt, animationPrompt]) {
      assertNoBannedText(text);
    }
    assertNoQuotedImageText(imagePrompt, `shot ${index + 1} image prompt`);
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
  assertNoQuotedImageText(imagePrompt, "storyboard board image prompt");
  const lockedPrompt = [
    "Create a six-frame production visual plan for a 20-second 3D Breakdown.",
    "The backend will expand this plan into SIX separate vertical 9:16 production keyframes for Seedance references.",
    "Do not generate one board, collage, contact sheet, comic strip, split screen, panel grid, or multi-frame image.",
    "Use one coherent procedural 3D explainer world on a clean blue/cyan blueprint-grid stage, close camera, one dominant subject/action per frame.",
    "If image references are provided, use the style reference frame only for visual grammar and use product/brand references only for shape, color, packaging cues, and material cues.",
    `Story sequence to visualize: ${imagePrompt}`,
    "Frame order: frame 1 problem state, frame 2 context escalation, frame 3 mechanism setup, frame 4 peak impossible-to-film wow reveal, frame 5 evidence/payoff, frame 6 final transformed state.",
    "For ecommerce mechanism teardowns, reinterpret the frame order as: frame 1 false assumption/common use, frame 2 hidden physical obstacle, frame 3 first component/mechanism, frame 4 peak cutaway or delivery reveal, frame 5 unified evidence/payoff frame where the engineered product stays central and any ordinary-version contrast appears only as a small unmarked remnant/token/background residue, frame 6 final product payoff.",
    "Frame 5 must not be a split-screen, side-by-side divider, comparison chart, two-column layout, before/after wall, vertical seam, or separated left/right comparison because frame 5 becomes a Seedance production reference image.",
    "Frame 5 must show the engineered product intact, protected, or controlled as the main subject. Do not crack, shatter, melt, break, leak, or fail the central product in frame 5; any failed ordinary version must be a small separate side remnant, debris token, or background residue.",
    "For ecommerce, make the plan feel like a fast product-science teardown short: repeated product/package anchoring, quick visual resets, macro mechanism close-ups, component or particle movement, and a final product payoff composition.",
    "Use at least four distinct visual modules across the six frames: product/scale intro, hidden obstacle, mechanism machine or cutaway, ingredient/component movement, unified ordinary-to-engineered payoff, final product payoff.",
    "Do not let the same close-up product angle dominate more than two frames. Keep the visual story changing every frame.",
    "For ecommerce plans, use a recurring stylized human demo character/body proxy as the continuity spine in at least four frames, including the first and final frame. Frame 1 and frame 6 must show the character's full body or torso prominently beside the product; at least one middle frame should show the same body proxy, tiny scale figure, hand, pointer, or probe. Mechanism close-ups may use the same hand, pointer, probe, or scale proxy, but do not satisfy the character requirement with anonymous fingers only.",
    "Do not create a faceless biology montage. Internal body, gut, cell-wall, or process visuals should feel like environments the same demo character enters, scales against, points into, or returns from.",
    "Frame 6 should resemble a clean product payoff: product large, demo character body/torso nearby, and 2-4 blank proof/benefit/component cards or tokens arranged around it for renderer overlays.",
    "Every frame must contain a visible subject, object, and physical action. Frame 1 cannot be an empty stage; it must show friction physically blocking, piling up, splitting, leaking, breaking, compressing, tangling, or creating tension.",
    "No frame labels, no frame numbers, no captions, no caption bars, no black lower bars, no progress bars, no readable text, no UI labels, no speech bubbles, no receipts, no posters, no typography-led design.",
    "No words, letters, numbers, percentages, ratings, price tags, labels, handwriting, UI copy, text-like glyphs, icons, arrows, checkmarks, X marks, or alphanumeric marks anywhere inside frames. Do not write FRAME 1, FRAME 2, scene labels, headings, or any other annotations.",
    "If proof or numeric evidence appears in the story, visualize it as blank physical tokens, unmarked blocks, unlabeled counters, plain geometric tokens, or motion only.",
  ].join(" ");
  return {
    frameCount: 6,
    imagePrompt: lockedPrompt,
    image: { status: "idle" },
    frames: createThreeDStoryboardFrames(),
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
      evidenceUseType: evidence.evidenceUseType,
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
    nvidiaNimModel = process.env.NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL || DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL,
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
