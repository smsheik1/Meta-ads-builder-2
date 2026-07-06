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
  ThreeDBreakdownVisualStyle,
} from "../../scene/types";
import { extractThreeDBreakdownEvidence, type ThreeDBreakdownEvidenceItem } from "./evidence";
import {
  buildThreeDBreakdownRetryPrompt,
  buildThreeDBreakdownPrompt,
  buildThreeDBreakdownStoryDirectionsPrompt,
  buildThreeDBreakdownStoryDirectionsRetryPrompt,
  buildThreeDBreakdownStyleBScriptPrompt,
  buildThreeDBreakdownStyleBScriptRetryPrompt,
  THREE_D_BREAKDOWN_MAX_TOKENS,
  THREE_D_BREAKDOWN_VARIANT_COUNT,
  THREE_D_MAX_SCRIPT_WORDS,
  THREE_D_FORBIDDEN_NARRATION_TERMS,
  THREE_D_MIN_SCRIPT_WORDS,
  THREE_D_REVEAL_PATTERNS,
  THREE_D_SCRIPT_BEATS,
  THREE_D_SHOT_CONTRACT,
  THREE_D_VISUAL_STYLES,
  type ThreeDBreakdownLockedStyleBScript,
} from "./prompt";
import { THREE_D_STORYBOARD_FRAME_CONTRACTS } from "./storyboardContracts";
import type {
  ThreeDBreakdownStoryDirection,
  ThreeDBreakdownStoryDirectionSlate,
} from "./storyDirections";

export type ThreeDBreakdownSiteContract = {
  primarySiteType: ThreeDBreakdownPrimarySiteType;
  riskFlags: ThreeDBreakdownRiskFlag[];
  visualWorld: string;
  lighting: string;
  cameraStyle: string;
  recurringObjects: string[];
};

export type ThreeDBreakdownVariant = {
  visualStyle: ThreeDBreakdownVisualStyle;
  variantAngle: string;
  customerProblem: string;
  mechanismSummary: string;
  visualMetaphor: string;
  referenceScript?: string;
  ctaLine: string;
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

export type ThreeDBreakdownStoryDirectionGeneration = ThreeDBreakdownStoryDirectionSlate & {
  evidenceItems: ThreeDBreakdownEvidenceItem[];
  model: string;
  provider: "nvidia-nim";
  providerStatus: StoredWebsiteResearchResult["providerStatus"][number];
};

const DEFAULT_TIMEOUT_MS = 75_000;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bannedTextPattern = /\b(zachdfilms|zackdfilms|zach d films|zack d films|creator style|teal\/dark fingerprint)\b/i;
const forbiddenNarrationPattern = new RegExp(
  `\\b(${THREE_D_FORBIDDEN_NARRATION_TERMS.map(escapeRegex).join("|")})\\b`,
  "i",
);
const brokenNarrationPattern = /\bali\s+ve\b|\bprotect(?:s|ed|ing)? alive\b/i;
const transcriptOpeningPattern = /^(when|if|once|imagine|before|after|inside|without|most|many|some|a|an|the|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|every|each|she|he|someone|something|\d)\b/i;
const abstractPunchlinePattern = /^(presence|clarity|confidence|value|connection|impact|control|growth|trust|success)\b/i;
const regulatedUnsafePattern = /\b(cures?|diagnos(?:e|is)|treats?|clinically proven|doctor[- ]recommended|risk[- ]free|legal outcome|guaranteed result|guaranteed to)\b|\b(?:prevents?|eliminates?)\s+(?:disease|pain|cavities|infection|injury|illness|complications|lawsuits?|legal risk|financial loss)\b|\b(?:doubles?|triples?|guarantees?|increases?)\s+(?:revenue|profit|sales|return|roi)\b/i;
const primarySiteTypes: ThreeDBreakdownPrimarySiteType[] = ["ecommerce", "saas", "local-service", "restaurant-food", "nonprofit", "portfolio", "unclear"];
const riskFlags: ThreeDBreakdownRiskFlag[] = ["health", "medical", "legal", "financial", "beauty", "regulated"];
const claimRisks: ThreeDBreakdownClaimRisk[] = ["low", "medium", "high"];
const visualStyles: ThreeDBreakdownVisualStyle[] = [...THREE_D_VISUAL_STYLES];
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
    const forbiddenMatch = beat.narration.match(forbiddenNarrationPattern)?.[0];
    if (forbiddenMatch) {
      throw new Error(`3D Breakdown script contains forbidden ad-style narration: ${forbiddenMatch}.`);
    }
    if (brokenNarrationPattern.test(beat.narration)) {
      throw new Error("3D Breakdown script contains broken or awkward narration wording.");
    }
  });
  const opener = beats[0]?.narration || "";
  if (!transcriptOpeningPattern.test(opener)) {
    throw new Error("3D Breakdown script must open with a concrete incident.");
  }
  const punchline = beats[beats.length - 1]?.narration || "";
  if (countWords(punchline) > 7) {
    throw new Error("3D Breakdown punchline must be 7 words or fewer.");
  }
  if (abstractPunchlinePattern.test(punchline)) {
    throw new Error("3D Breakdown punchline must not start with an abstract noun.");
  }
};

const referenceScriptConnectorPattern = /\b(arriv(?:e|es|ed|ing)|open(?:s|ed|ing)?|use(?:s|d|ing)?|assum(?:e|es|ed|ing)|thinks?|thought|pictured|decided|but|that's why|that is why|so|then|compare|not just|not only|dips?|cracks?|wakes?|stirs?|digests?|feeds?|dissolves?|descends?|travels?|reaches?|reveals?|rebuild(?:s|t|ing)|turns?|locks?|stacks?)\b/gi;
const presenterNarrationPattern = /\b(i am|i'm|i'll|let me|watch me|today i|my favorite|we're going to|i want to show|i recommend)\b/i;
const templateLeakPattern = /\bwhen a buyer receives it\b|\bthe product reveals hidden proof\b|\bone version fills space\b|\bthe other changes the moment\b/i;
const falseClassificationPattern = /\b(assum(?:e|es|ed|ing)|thought|pictured|decided|not for|only for|just for|wrong(?:ly)?|looked like|felt like)\b/i;
const revealRebuildPattern = /\b(cracks?|cracked|peels?|peeled|falls? away|fell away|reveals?|revealed|rebuild(?:s|t|ing)|snaps?|snapped|turns?|turned|stacks?|stacked|locks?|locked|opens?|opened)\b/i;
const useTestPattern = /\b(wears?|wore|pull(?:s|ed)?|opens?|opened|tastes?|tasted|bites?|bit|appl(?:y|ies|ied)|carr(?:y|ies|ied)|uses?|used|moves?|moved|shares?|shared|trains?|trained|handles?|handled|stays? up|comfortable|arriv(?:e|es|ed))\b/i;
const audienceExpansionPattern = /\b(not just|not only|not for one|first to notice|athlete|pilot|golfer|surgeon|birthday|thank-you|office|client|everyday|parents?|teams?|customers?|operators?|owners?|managers?|patients?|guests?|friends?|families)\b/i;
const finalReframePattern = /\b(reimagined|the difference|so compare|compare them|the other|not just|not only|first to notice|was the proof|was the product|actually enjoy|handled|remembered)\b/i;
const REFERENCE_SCRIPT_ACCEPT_MIN_WORDS = 100;
const REFERENCE_SCRIPT_ACCEPT_MAX_WORDS = 180;
const REFERENCE_SCRIPT_ACCEPT_MIN_SENTENCES = 10;
const REFERENCE_SCRIPT_ACCEPT_MAX_SENTENCES = 24;
const productScienceEvidenceTypes = new Set<ThreeDBreakdownEvidenceUseType>(["feature", "mechanism", "material", "process"]);
const shippingLikeEvidenceTypes = new Set<ThreeDBreakdownEvidenceUseType>(["shipping", "offer", "guarantee"]);
const arrivalContextEvidenceTypes = new Set<ThreeDBreakdownEvidenceUseType>(["review", "proof", "shipping", "offer", "guarantee"]);
const logisticsContextTerms = new Set(["sorting", "truck", "warehouse", "transit"]);
const unsupportedMechanismTerms = [
  ["compression", /\bcompress(?:ion|es|ed|ing)?\b/i],
  ["impact", /\b(?:shipping|delivery|box|tin|package|container|carton|gift box)\s+impact\b|\bimpact\s+(?:damage|resistance|protection|test|shock)\b/i],
  ["interlocking", /\binterlocking\b/i],
  ["rigid", /\brigid\b/i],
  ["humidity", /\bhumidity\b/i],
  ["moisture", /\bmoisture\b/i],
  ["permeable", /\bpermeable\b/i],
  ["vibration", /\bvibration\b/i],
  ["geometry", /\bgeometry\b/i],
  ["engineering", /\b(?:package|packaging|freshness|delivery|shipping|tin|box)\s+engineer(?:ed|ing)?\b|\bengineer(?:ed|ing)?\s+(?:package|packaging|freshness|delivery|shipping|tin|box)\b/i],
  ["protect", /\bprotect(?:s|ed|ing|ion)?\b/i],
  ["paper cup", /\bpaper cups?\b/i],
  ["wall", /\b(?:box|tin|package|container|carton|gift box)\s+walls?\b|\bwalls?\s+of\s+(?:the\s+)?(?:box|tin|package|container|carton|gift box)\b/i],
  ["seam", /\bseams?\b/i],
  ["sorting", /\bsorting\b/i],
  ["truck", /\btrucks?\b/i],
  ["warehouse", /\bwarehouse\b/i],
  ["same-day", /\bsame[- ]day\b/i],
  ["oven aroma", /\boven aroma\b/i],
  ["transit", /\btransit\b/i],
  ["structure", /\bstructure\b/i],
  ["dented", /\bdented\b/i],
  ["crumple", /\bcrumple\b/i],
  ["intact", /\bintact\b/i],
  ["trackable", /\btrackable\b/i],
  ["hand-cut", /\bhand[- ]cut\b/i],
  ["die press", /\bdie press\b/i],
  ["butter dough", /\bbutter dough\b/i],
  ["pecan oil", /\bpecan oil\b/i],
  ["oxidized", /\boxidi[sz](?:e|ed|ing|ation)?\b/i],
  ["rancid", /\brancid\b/i],
  ["sandy", /\bsandy\b/i],
  ["powdery", /\bpowdery\b/i],
  ["factory-stamped", /\bfactory[- ]stamped\b/i],
  ["mass market", /\bmass market\b/i],
  ["months", /\bmonths?\b/i],
  ["human-cell comparison", /\bhuman cells?\b|\boutnumber(?:s|ed|ing)?\b/i],
] as const;

const assertReferenceScriptGrounding = (
  script: string,
  evidence: ThreeDBreakdownEvidenceItem,
  supportingEvidenceItems: ThreeDBreakdownEvidenceItem[] = [evidence],
) => {
  if (productScienceEvidenceTypes.has(evidence.evidenceUseType)) return;
  const evidenceText = supportingEvidenceItems.map((item) => item.text).join(" ").toLowerCase();
  const hasDigestiveDeliverySupport = /\b(surviv(?:e|es|al)|protect(?:s|ed|ing)?|shield(?:s|ed|ing)?|delivery system|capsule-in-capsule|outer capsule|inner capsule|probiotic core|viacap|colon)\b/i.test(evidenceText);
  for (const [term, pattern] of unsupportedMechanismTerms) {
    if (arrivalContextEvidenceTypes.has(evidence.evidenceUseType) && logisticsContextTerms.has(term)) continue;
    if (term === "oven aroma" && /\b(fresh|fresh[- ]baked|tasted|homemade)\b/i.test(evidenceText)) continue;
    if ((term === "intact" || term === "protect") && hasDigestiveDeliverySupport) continue;
    if (pattern.test(script) && !evidenceText.includes(term)) {
      throw new Error(`3D Breakdown Style B referenceScript invented product mechanism details not supported by evidence: ${term}.`);
    }
  }
};

const parseReferenceScript = (
  value: unknown,
  visualStyle: ThreeDBreakdownVisualStyle,
  evidence: ThreeDBreakdownEvidenceItem,
  supportingEvidenceItems: ThreeDBreakdownEvidenceItem[] = [evidence],
) => {
  const script = cleanText(value, 2400);
  if (visualStyle !== "presenter-teardown-vsl") return script || undefined;
  if (!script) throw new Error("3D Breakdown Style B referenceScript is missing.");
  if (presenterNarrationPattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript must use an unseen narrator, not presenter lines.");
  }
  if (templateLeakPattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript copied generic prompt-template wording.");
  }
  assertNoBannedText(script);
  assertReferenceScriptGrounding(script, evidence, supportingEvidenceItems);
  const words = countWords(script);
  if (words < REFERENCE_SCRIPT_ACCEPT_MIN_WORDS || words > REFERENCE_SCRIPT_ACCEPT_MAX_WORDS) {
    throw new Error(`3D Breakdown Style B referenceScript must be ${REFERENCE_SCRIPT_ACCEPT_MIN_WORDS}-${REFERENCE_SCRIPT_ACCEPT_MAX_WORDS} words.`);
  }
  const sentences = sentenceCount(script);
  if (sentences < REFERENCE_SCRIPT_ACCEPT_MIN_SENTENCES || sentences > REFERENCE_SCRIPT_ACCEPT_MAX_SENTENCES) {
    throw new Error(`3D Breakdown Style B referenceScript must have ${REFERENCE_SCRIPT_ACCEPT_MIN_SENTENCES}-${REFERENCE_SCRIPT_ACCEPT_MAX_SENTENCES} short documentary sentences.`);
  }
  const connectorCount = script.match(referenceScriptConnectorPattern)?.length || 0;
  if (connectorCount < 7) {
    throw new Error("3D Breakdown Style B referenceScript must use reference-style causal motion.");
  }
  if (!falseClassificationPattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript must include a false product classification or assumption.");
  }
  if (!revealRebuildPattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript must include a literal reveal or rebuild moment.");
  }
  if (!useTestPattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript must include a product use test.");
  }
  if (!audienceExpansionPattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript must include audience expansion.");
  }
  if (!finalReframePattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript must end with a product reframe.");
  }
  return script;
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

const parseRevealPatternArray = (value: unknown, label: string) => {
  if (!Array.isArray(value)) throw new Error(`3D Breakdown ${label} must be an array.`);
  const patterns = value
    .map((item) => parseEnum(item, THREE_D_REVEAL_PATTERNS, label))
    .filter(Boolean);
  return Array.from(new Set(patterns));
};

const parseStoryDirectionSlateOutput = (
  raw: string,
  evidenceItems: ThreeDBreakdownEvidenceItem[],
): ThreeDBreakdownStoryDirectionSlate => {
  const parsed = parseJsonObject(raw);
  const rawDirections = Array.isArray(parsed.directions) ? parsed.directions : [];
  if (rawDirections.length !== 5) {
    throw new Error("3D Breakdown story slate must return exactly 5 directions.");
  }
  const directions = rawDirections.map((direction, index) => {
    const rawDirection = direction as Record<string, unknown>;
    const directionId = cleanText(rawDirection.directionId, 24) || `idea-${index + 1}`;
    if (directionId !== `idea-${index + 1}`) {
      throw new Error(`3D Breakdown story direction ${index + 1} must use directionId idea-${index + 1}.`);
    }
    const evidenceIndex = Number(rawDirection.evidenceIndex);
    const evidence = evidenceItems.find((item) => item.evidenceIndex === evidenceIndex);
    if (!evidence || evidence.evidenceUseType === "category") {
      throw new Error(`3D Breakdown story direction ${index + 1} references invalid evidence.`);
    }
    const possibleRevealPatterns = parseRevealPatternArray(rawDirection.possibleRevealPatterns, `story direction ${index + 1} possibleRevealPatterns`);
    const parsedDirection: ThreeDBreakdownStoryDirection = {
      directionId,
      hookLine: cleanText(rawDirection.hookLine, 160),
      subheadline: cleanText(rawDirection.subheadline, 120),
      shortSummary: cleanText(rawDirection.shortSummary, 600),
      category: cleanText(rawDirection.category, 80),
      whyCompelling: cleanText(rawDirection.whyCompelling, 300),
      adAngle: cleanText(rawDirection.adAngle, 180),
      visualEngine: cleanText(rawDirection.visualEngine, 260),
      evidenceIndex,
      evidenceUseType: evidence.evidenceUseType,
      possibleRevealPatterns: possibleRevealPatterns.length ? possibleRevealPatterns : evidence.possibleRevealPatterns,
    };
    for (const [key, value] of Object.entries(parsedDirection)) {
      if (typeof value === "string" && !value) {
        throw new Error(`3D Breakdown story direction ${index + 1} ${key} is missing.`);
      }
      if (typeof value === "string") assertNoBannedText(value);
    }
    return parsedDirection;
  });
  const recommendedDirectionId = cleanText(parsed.recommendedDirectionId, 24) || directions[0]!.directionId;
  if (!directions.some((direction) => direction.directionId === recommendedDirectionId)) {
    throw new Error("3D Breakdown story slate recommendedDirectionId is invalid.");
  }
  return {
    directions,
    recommendedDirectionId,
  };
};

const parseStyleBScriptPlanOutput = (
  raw: string,
  evidenceItems: ThreeDBreakdownEvidenceItem[],
  selectedStoryDirection?: ThreeDBreakdownStoryDirection | null,
): ThreeDBreakdownLockedStyleBScript => {
  const parsed = parseJsonObject(raw);
  if (parsed.visualStyle !== "presenter-teardown-vsl") {
    throw new Error("3D Breakdown Style B script plan must use presenter-teardown-vsl.");
  }
  const evidenceIndex = Number(parsed.evidenceIndex);
  if (selectedStoryDirection && evidenceIndex !== selectedStoryDirection.evidenceIndex) {
    throw new Error("3D Breakdown Style B script plan must preserve the selected story direction evidence.");
  }
  const evidence = evidenceItems.find((item) => item.evidenceIndex === evidenceIndex);
  if (!evidence) {
    const allowedEvidenceIds = evidenceItems.map((item) => item.evidenceIndex).join(", ");
    throw new Error(`3D Breakdown Style B script plan references invalid evidence; use one of: ${allowedEvidenceIds}.`);
  }
  const plan = {
    visualStyle: "presenter-teardown-vsl" as const,
    variantAngle: cleanText(parsed.variantAngle, 120),
    customerProblem: cleanText(parsed.customerProblem, 160),
    mechanismSummary: cleanText(parsed.mechanismSummary, 180),
    visualMetaphor: cleanText(parsed.visualMetaphor, 160),
    referenceScript: parseReferenceScript(parsed.referenceScript, "presenter-teardown-vsl", evidence, evidenceItems) || "",
    ctaLine: cleanText(parsed.ctaLine, 180),
    evidenceIndex,
    evidenceUseType: evidence.evidenceUseType,
    wowMomentType: parseEnum(parsed.wowMomentType, THREE_D_REVEAL_PATTERNS, "wowMomentType"),
    wowMoment: cleanText(parsed.wowMoment, 220),
    viewerLearns: cleanText(parsed.viewerLearns, 220),
    claimRisk: parseEnum(parsed.claimRisk, claimRisks, "claimRisk"),
    claimRiskReason: cleanText(parsed.claimRiskReason, 220),
  };
  for (const [key, value] of Object.entries(plan)) {
    if (typeof value === "string" && !value) {
      throw new Error(`3D Breakdown Style B script plan ${key} is missing.`);
    }
    if (typeof value === "string") assertNoBannedText(value);
  }
  return plan;
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
    if (raw.role !== contract.role) {
      throw new Error(`3D Breakdown beat ${index + 1} role is invalid.`);
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
    const requireShotField = (field: "captionText" | "sceneDescription" | "explainerDevice" | "physicalAction" | "imagePrompt" | "animationPrompt", maxLength: number) => {
      const parsed = cleanText(raw[field], maxLength);
      if (!parsed) throw new Error(`3D Breakdown shot ${index + 1} ${field} is missing.`);
      return parsed;
    };
    const captionText = requireShotField("captionText", 90);
    const sceneDescription = requireShotField("sceneDescription", 260);
    const explainerDevice = requireShotField("explainerDevice", 120);
    const physicalAction = requireShotField("physicalAction", 140);
    const imagePrompt = requireShotField("imagePrompt", 1400);
    const animationPrompt = requireShotField("animationPrompt", 900);
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

const getStoryboardStyleRules = (visualStyle: ThreeDBreakdownVisualStyle) => (
  visualStyle === "presenter-teardown-vsl"
    ? [
      "Visual style: presenter-teardown-vsl.",
      "The six frames must feel like a real ecommerce product teardown with an unseen narrator and a silent recurring demonstrator, not a toy-character science world.",
      "Use a human-like demo subject, torso, hands, product-use surface, or over-shoulder demonstrator as the visual continuity spine in at least four frames, including frame 1 and frame 6.",
      "When the demo subject's face is visible, use a casual creator-ad 3D person with visible eyes, cap/goggles on head, everyday shirt, and product-demo posture; no sunglasses, faceless mannequin, lab technician, doctor, scientist, or PPE worker.",
      "The person is demonstration/retention footage only; narrator and captions present the argument, while the person never speaks, sells, points to text, introduces the product, or becomes the narrator.",
      "Frame 1: demo subject or hands show the product in a real use setting while the false assumption appears visually.",
      "Frame 2: the hidden customer/product problem appears during actual product use, handling, body-route, opening, eating, applying, wearing, or setup.",
      "Frame 3: hands or demo subject silently demonstrate the product detail that sets up the mechanism.",
      "Frame 4: peak impossible-to-film 3D overlay, cutaway, x-ray, component split, invisible-problem reveal, or mechanism insert.",
      "Frame 5: return from the 3D insert into a practical proof/payoff product moment with blank tokens or physical cues.",
      "Frame 6: clean human/product final with demo subject, torso, hands, or product-in-use payoff, plus blank overlay-safe tokens.",
      "Use oversized tactile demo props like clear tubes, jars, glasses, capsules, particles, piles, blocks, pipes, scoops, scales, trays, or product-use surfaces so the demo feels physically staged, not like a generic science diagram.",
      "For supplement/digestive products, follow the reference grammar: demonstrator with capsule/cup, transparent torso or body-route, macro obstacle, machine/pipe mechanism, demonstrator/product payoff, final bottle/product close.",
      "Use real-world ecommerce spaces where useful, but keep the reference spine: bright blue grid floor/wall, casual demo person, product handling, oversized prop comparison, and macro mechanism inserts.",
      "Do not use toy-character anatomy, cartoon wall characters, faceless biology montages, all-blue tabletop repetition, sterile cleanroom emptiness, huge empty counters, lab-coat scientists, doctor-like presenters, or sunglasses.",
    ]
    : [
      "Visual style: toy-character-vsl.",
      "Use a bright blue/cyan clinical grid stage with crisp 3D objects, flat readable lab lighting, and hard subject separation.",
      "Use a recurring stylized human demo character/body proxy as the continuity spine in at least four frames, including the first and final frame.",
      "Frame 1 and frame 6 must show the character's full body or torso prominently beside the product; at least one middle frame should show the same body proxy, tiny scale figure, hand, pointer, or probe.",
      "Do not create a faceless biology montage. Internal body, gut, cell-wall, or process visuals should feel like environments the same demo character enters, scales against, points into, or returns from.",
      "Frame 6 should resemble a clean product payoff: product large, demo character body/torso nearby, and 2-4 blank proof/benefit/component cards or tokens arranged around it for renderer overlays.",
    ]
);

const parseStoryboardFrames = (value: unknown): NonNullable<ThreeDBreakdownStoryboardBoard["frames"]> => {
  if (!Array.isArray(value) || value.length !== THREE_D_STORYBOARD_FRAME_CONTRACTS.length) {
    throw new Error("3D Breakdown storyboard board must include exactly 6 detailed frames.");
  }
  return THREE_D_STORYBOARD_FRAME_CONTRACTS.map((contract, index) => {
    const frame = value.find((item) => {
      const raw = item as Record<string, unknown>;
      return raw.frameIndex === contract.frameIndex || raw.role === contract.role;
    }) || value[index];
    const raw = frame as Record<string, unknown>;
    if (
      raw.frameIndex !== contract.frameIndex ||
      raw.role !== contract.role
    ) {
      throw new Error(`3D Breakdown storyboard frame ${index + 1} contract is invalid.`);
    }
    const visual = cleanText(raw.visual, 260);
    const camera = cleanText(raw.camera, 160);
    const motion = cleanText(raw.motion, 180);
    const overlayText = cleanText(raw.overlayText, 80);
    const editingNote = cleanText(raw.editingNote, 180);
    if (!visual) throw new Error(`3D Breakdown storyboard frame ${index + 1} visual is missing.`);
    if (!camera) throw new Error(`3D Breakdown storyboard frame ${index + 1} camera is missing.`);
    if (!motion) throw new Error(`3D Breakdown storyboard frame ${index + 1} motion is missing.`);
    if (!overlayText) throw new Error(`3D Breakdown storyboard frame ${index + 1} overlay text is missing.`);
    if (!editingNote) throw new Error(`3D Breakdown storyboard frame ${index + 1} editing note is missing.`);
    for (const text of [visual, camera, motion, overlayText, editingNote]) assertNoBannedText(text);
    for (const [field, text] of Object.entries({ visual, camera, motion, editingNote })) {
      assertNoQuotedImageText(text, `storyboard frame ${index + 1} ${field}`);
    }
    return {
      ...contract,
      visual,
      camera,
      motion,
      overlayText,
      editingNote,
      image: { status: "idle" as const },
    };
  });
};

const parseStoryboardBoard = (value: unknown, visualStyle: ThreeDBreakdownVisualStyle): ThreeDBreakdownStoryboardBoard => {
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
  const frames = parseStoryboardFrames(raw.frames);
  const framePlanText = frames.map((frame) => [
    `visual ${frame.visual}`,
    `camera ${frame.camera}`,
    `motion ${frame.motion}`,
  ].join("; ")).join(" / next silent still: ");
  const lockedPrompt = [
    "Create ONE vertical 9:16 image containing six raw, unlabeled film stills for visual QA before video generation.",
    "Arrange the six stills in a clean 2-column by 3-row contact sheet with thin white gutters only.",
    "Each still must fill its cell edge-to-edge; no blank white rows, title bands, empty margins, or presentation whitespace.",
    "This is not final footage and not a single hero frame. It is a full-board visual plan that lets a human judge the whole 20-second story before spending video credits.",
    "Use one coherent procedural 3D explainer world on a clean blue/cyan blueprint-grid stage, close camera, one dominant subject/action per panel.",
    "If image references are provided, use the style reference frame only for visual grammar and use product/brand references only for shape, color, packaging cues, and material cues.",
    `Story sequence to visualize: ${imagePrompt}`,
    `Internal reading-order still plan to preserve, never visible as text: ${framePlanText}`,
    "Sequence, visually: ordinary-use setup; hidden obstacle; mechanism setup; peak impossible-to-film reveal; evidence/payoff; final transformed product state.",
    "For ecommerce mechanism teardowns, show common use first, then hidden physical obstacle, then first component/mechanism, then peak cutaway or delivery reveal, then a unified evidence/payoff frame where the selected product stays central and any ordinary-version contrast appears only as a small unmarked remnant/token/background residue, then final product payoff.",
    "The fifth visual beat must not be a split-screen, side-by-side divider, comparison chart, two-column layout, before/after wall, vertical seam, or separated left/right comparison because later production anchors must stay coherent.",
    "The fifth visual beat must keep the selected product stable and central as the main subject. Do not crack, shatter, melt, break, leak, or fail the central product in that beat; any failed ordinary version must be a small separate side remnant, debris token, or background residue.",
    "For ecommerce, make the plan feel like a fast product-science teardown short: repeated product/package anchoring, quick visual resets, macro mechanism close-ups, component or particle movement, and a final product payoff composition.",
    "Use at least four distinct visual modules across the six frames: product/scale intro, hidden obstacle, mechanism machine or cutaway, ingredient/component movement, unified ordinary-to-selected-product payoff, final product payoff.",
    "Do not let the same close-up product angle dominate more than two frames. Keep the visual story changing every frame.",
    ...getStoryboardStyleRules(visualStyle),
    "Every panel must contain a visible subject, object, and physical action. The first panel cannot be an empty stage; it must show friction physically blocking, piling up, splitting, leaking, breaking, tangling, or creating tension.",
    "The written still plan and any overlayText values are internal instructions only. Do not draw any of those words.",
    "No panel labels, no panel numbers, no captions, no caption bars, no black lower bars, no progress bars, no readable text, no UI labels, no speech bubbles, no receipts, no posters, no typography-led design.",
    "No words, letters, numbers, percentages, ratings, price tags, labels, handwriting, UI copy, text-like glyphs, icons, arrows, checkmarks, X marks, or alphanumeric marks anywhere inside panels. Do not write FRAME 1, FRAME 2, scene labels, headings, or any other annotations.",
    "If proof or numeric evidence appears in the story, visualize it as blank physical tokens, unmarked blocks, unlabeled counters, plain geometric tokens, or motion only.",
  ].join(" ");
  return {
    frameCount: 6,
    imagePrompt: lockedPrompt,
    image: { status: "idle" },
    frames,
  };
};

const parseVariants = (
  parsed: Record<string, unknown>,
  evidenceItems: ThreeDBreakdownEvidenceItem[],
  requestedCount: number,
  siteContract: ThreeDBreakdownSiteContract,
  lockedStyleBScript?: ThreeDBreakdownLockedStyleBScript | null,
) => {
  const variants = (Array.isArray(parsed.variants) ? parsed.variants : []).map((variant, index) => {
    const rawVariant = variant as Record<string, unknown>;
    const visualStyle = parseEnum(rawVariant.visualStyle, visualStyles, "visualStyle");
    const lockedScript = visualStyle === "presenter-teardown-vsl" ? lockedStyleBScript : null;
    const evidenceIndex = lockedScript?.evidenceIndex ?? Number(rawVariant.evidenceIndex);
    const evidence = evidenceItems.find((item) => item.evidenceIndex === evidenceIndex);
    if (!evidence) {
      const allowedEvidenceIds = evidenceItems.map((item) => item.evidenceIndex).join(", ");
      throw new Error(`3D Breakdown variant ${index + 1} references invalid evidence; use one of: ${allowedEvidenceIds}.`);
    }
    const parsedVariantBase = {
      visualStyle,
      variantAngle: cleanText(lockedScript?.variantAngle ?? rawVariant.variantAngle ?? rawVariant.angle, 120),
      customerProblem: cleanText(lockedScript?.customerProblem ?? rawVariant.customerProblem, 160),
      mechanismSummary: cleanText(lockedScript?.mechanismSummary ?? rawVariant.mechanismSummary, 180),
      visualMetaphor: cleanText(lockedScript?.visualMetaphor ?? rawVariant.visualMetaphor, 160),
      ctaLine: cleanText(lockedScript?.ctaLine ?? rawVariant.ctaLine, 180),
      evidenceIndex,
      evidenceUseType: evidence.evidenceUseType,
      wowMomentType: lockedScript
        ? parseEnum(lockedScript.wowMomentType, THREE_D_REVEAL_PATTERNS, "wowMomentType")
        : parseEnum(rawVariant.wowMomentType, THREE_D_REVEAL_PATTERNS, "wowMomentType"),
      wowMoment: cleanText(lockedScript?.wowMoment ?? rawVariant.wowMoment, 220),
      viewerLearns: cleanText(lockedScript?.viewerLearns ?? rawVariant.viewerLearns, 220),
      claimRisk: lockedScript
        ? parseEnum(lockedScript.claimRisk, claimRisks, "claimRisk")
        : parseEnum(rawVariant.claimRisk, claimRisks, "claimRisk"),
      claimRiskReason: cleanText(lockedScript?.claimRiskReason ?? rawVariant.claimRiskReason, 220),
    };
    const referenceScript = parseReferenceScript(lockedScript?.referenceScript ?? rawVariant.referenceScript, parsedVariantBase.visualStyle, evidence, evidenceItems);
    for (const [key, value] of Object.entries(parsedVariantBase)) {
      if (typeof value === "string" && !value) throw new Error(`3D Breakdown variant ${index + 1} ${key} is missing.`);
      if (typeof value === "string") assertNoBannedText(value);
    }
    const scriptBeats = parseScriptBeats(rawVariant.scriptBeats);
    if (parsedVariantBase.visualStyle === "presenter-teardown-vsl") {
      assertReferenceScriptGrounding([
        referenceScript,
        parsedVariantBase.customerProblem,
        parsedVariantBase.mechanismSummary,
        parsedVariantBase.visualMetaphor,
        parsedVariantBase.wowMoment,
        parsedVariantBase.viewerLearns,
        ...scriptBeats.map((beat) => beat.narration),
      ].filter(Boolean).join(" "), evidence, evidenceItems);
    }
    assertClaimRisk({
      beats: scriptBeats,
      evidence,
      siteContract,
      variant: parsedVariantBase,
    });
    return {
      ...parsedVariantBase,
      referenceScript,
      storyboardBoard: parseStoryboardBoard(rawVariant.storyboardBoard ?? rawVariant.storyboardImagePrompt, parsedVariantBase.visualStyle),
      scriptBeats,
      shots: parseShots(rawVariant.shots),
    };
  });
  if (variants.length < requestedCount) {
    throw new Error(`3D Breakdown director returned ${variants.length} variants; expected at least ${requestedCount}.`);
  }
  const selectedVariants = variants.slice(0, requestedCount);
  if (requestedCount > 1) {
    if (selectedVariants[0]?.visualStyle !== "toy-character-vsl" || selectedVariants[1]?.visualStyle !== "presenter-teardown-vsl") {
      throw new Error("3D Breakdown manual generation must return toy-character-vsl first and presenter-teardown-vsl second.");
    }
  }
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
  lockedStyleBScript?: ThreeDBreakdownLockedStyleBScript | null,
) => {
  const parsed = parseJsonObject(raw);
  const siteContract = parseSiteContract(parsed);
  const variants = parseVariants(parsed, evidenceItems, requestedCount, siteContract, lockedStyleBScript);
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

const prepareThreeDBreakdownEvidence = (research: StoredWebsiteResearchResult, startedAt: number) => {
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
    item.evidenceUseType !== "category" && (
      item.visualPotentialScore >= MIN_VISUAL_POTENTIAL_SCORE ||
      (shippingLikeEvidenceTypes.has(item.evidenceUseType) && item.visualPotentialScore >= 0.55)
    )
  ));
  if (!hasOffer) throw new Error(`${weakSiteCopy} missing_offer`);
  if (!hasProblem) throw new Error(`${weakSiteCopy} missing_problem`);
  if (!hasConcreteEvidence) throw new Error(`${weakSiteCopy} missing_strong_evidence`);
  if (!directorEvidenceItems.length) throw new Error(`${weakSiteCopy} weak_visual_evidence`);
  return {
    directorEvidenceItems,
    evidenceItems,
  };
};

const ensureSentence = (value: string, fallback: string, maxLength = 150) => {
  const cleaned = cleanText(value, maxLength)
    .replace(/\.\.\./g, ",")
    .replace(/[!?]+$/g, "")
    .replace(/\.$/, "")
    .trim();
  const sentence = cleaned || fallback;
  return `${sentence.replace(/\.$/, "")}.`;
};

const trimAtWord = (value: string, maxLength: number) => {
  const cleaned = cleanText(value, maxLength + 40);
  if (cleaned.length <= maxLength) return cleaned;
  const trimmed = cleaned.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
  return trimmed || cleaned.slice(0, maxLength).trim();
};

const shortPhrase = (value: string, fallback: string, maxLength = 34) => {
  const cleaned = trimAtWord(value, maxLength)
    .replace(/[.!?]+$/g, "")
    .trim();
  return cleaned || fallback;
};

const evidenceNarration = (evidence: ThreeDBreakdownEvidenceItem) => {
  const text = evidence.text;
  if (/\bviacap\b/i.test(text) && /\bstomach acid\b/i.test(text)) {
    return "ViaCap shields probiotics through stomach acid.";
  }
  if (/\b24\b/i.test(text) && /\bstrains?\b/i.test(text)) {
    return "DS-01 carries 24 studied strains.";
  }
  if (/\brefill\b/i.test(text) && /\bglass|jar|bottle\b/i.test(text)) {
    return "The refill changes, while the jar stays.";
  }
  if (evidence.evidenceUseType === "shipping") {
    return ensureSentence(`The page promises ${shortPhrase(text, "delivery proof", 70)}`, "The delivery promise grounds the payoff", 95);
  }
  if (evidence.evidenceUseType === "review" || evidence.evidenceUseType === "proof") {
    return ensureSentence(`The proof is ${shortPhrase(text, "a real customer detail", 70)}`, "Real proof grounds the payoff", 95);
  }
  return ensureSentence(shortPhrase(text, "The selected evidence grounds the reveal", 82), "The selected evidence grounds the reveal", 110);
};

const contextNarration = (direction: ThreeDBreakdownStoryDirection, evidence: ThreeDBreakdownEvidenceItem) => {
  const combined = `${direction.subheadline} ${direction.shortSummary} ${evidence.text}`;
  if (/\bstomach acid\b/i.test(combined)) return "Stomach acid turns the route into the hidden problem.";
  if (/\bmicrobes?\b|\bbacteria\b/i.test(combined)) return "An invisible world reacts before you feel anything.";
  return ensureSentence(direction.subheadline, "The hidden obstacle starts before the payoff can happen", 110);
};

const mechanismNarration = (
  research: StoredWebsiteResearchResult,
  direction: ThreeDBreakdownStoryDirection,
  evidence: ThreeDBreakdownEvidenceItem,
) => {
  const brandName = cleanText(research.brand.name, 60) || "the product";
  const combined = `${direction.visualEngine} ${direction.shortSummary} ${evidence.text}`;
  if (/\bviacap\b/i.test(combined)) return `${brandName}'s ViaCap turns that route into a protected capsule journey.`;
  if (/\bcapsule\b/i.test(combined)) return `${brandName} turns the capsule into a delivery system.`;
  return ensureSentence(`${brandName} turns that route into a visible mechanism`, "The product turns the obstacle into a visible mechanism", 115);
};

const createSelectedDirectionSiteContract = (
  research: StoredWebsiteResearchResult,
  direction: ThreeDBreakdownStoryDirection,
  evidence: ThreeDBreakdownEvidenceItem,
): ThreeDBreakdownSiteContract => {
  const lowerText = [
    research.brandBrief.offer,
    research.brandBrief.audience,
    direction.hookLine,
    direction.shortSummary,
    evidence.text,
  ].join(" ").toLowerCase();
  const primarySiteType: ThreeDBreakdownPrimarySiteType = research.productCatalog?.products?.length
    ? "ecommerce"
    : /\bsoftware|platform|app|dashboard|workflow|support|automation|ai\b/.test(lowerText)
    ? "saas"
    : /\brestaurant|menu|food|drink|cafe\b/.test(lowerText)
    ? "restaurant-food"
    : /\bdonate|nonprofit|foundation|charity\b/.test(lowerText)
    ? "nonprofit"
    : "unclear";
  const nextRiskFlags: ThreeDBreakdownRiskFlag[] = [
    /\b(health|gut|probiotic|supplement|wellness|immune|digestion|bloating|gas)\b/.test(lowerText) ? "health" : "",
    /\b(clinic|doctor|medical|patient|diagnos|treat|cure)\b/.test(lowerText) ? "medical" : "",
    /\b(legal|law|attorney|lawsuit)\b/.test(lowerText) ? "legal" : "",
    /\b(finance|financial|investment|loan|credit|revenue|roi)\b/.test(lowerText) ? "financial" : "",
    /\b(skin|beauty|cosmetic|hair)\b/.test(lowerText) ? "beauty" : "",
  ].filter(Boolean) as ThreeDBreakdownRiskFlag[];
	  const recurringObjects = [
	    research.brand.name,
	    direction.evidenceUseType === "mechanism" ? "hidden pathway" : "proof tokens",
	    evidence.evidenceUseType === "material" ? "component particles" : "product anchor",
	    "demo hands",
	  ].slice(0, 4);
  return {
    primarySiteType,
    riskFlags: Array.from(new Set(nextRiskFlags)),
    visualWorld: `${research.brand.name} bright blue clinical grid lab with one recurring silent 3D demonstrator/scale figure, product handling, props, particles, pipes, and one impossible 3D insert`,
    lighting: "bright creator-ad clinical blue lab lighting with crisp product readability",
    cameraStyle: "fast silent-demonstrator product teardown camera with macro mechanism inserts and quick state changes",
    recurringObjects,
  };
};

const createSelectedDirectionStoryboard = ({
  direction,
  evidence,
  siteContract,
}: {
  direction: ThreeDBreakdownStoryDirection;
  evidence: ThreeDBreakdownEvidenceItem;
  siteContract: ThreeDBreakdownSiteContract;
}): ThreeDBreakdownStoryboardBoard => {
  const recurringObject = siteContract.recurringObjects[1] || "product mechanism";
	  const frames: NonNullable<ThreeDBreakdownStoryboardBoard["frames"]> = [
	    {
	      ...THREE_D_STORYBOARD_FRAME_CONTRACTS[0]!,
      visual: `A silent recurring 3D demonstrator handles the product in the blue grid lab while the wrong assumption from ${shortPhrase(direction.hookLine, "the hook")} appears as physical tension.`,
      camera: "Medium demonstrator-demo shot into fast macro push.",
      motion: "Demonstrator gestures, product holds center, background pressure builds.",
	      overlayText: shortPhrase(direction.hookLine, "Not what you think", 42),
	      editingNote: "Start instantly with practical product use.",
	    },
	    {
	      ...THREE_D_STORYBOARD_FRAME_CONTRACTS[1]!,
      visual: `${recurringObject} becomes a visible obstacle around the product path inside a clear pipe or lab prop.`,
      camera: "Extreme macro zoom from demonstrator setup into the hidden obstacle.",
      motion: "The path narrows and particles push against the product while the silent demonstrator points.",
	      overlayText: "Hidden obstacle",
	      editingNote: "Make the invisible problem obvious.",
	    },
	    {
	      ...THREE_D_STORYBOARD_FRAME_CONTRACTS[2]!,
      visual: `The silent demonstrator shows the product detail as selected evidence forms into an unlabeled mechanism around it.`,
      camera: "Tracking close-up through floating components in the blue grid lab.",
      motion: "Components align around the product in sequence.",
	      overlayText: "Mechanism wakes up",
	      editingNote: "Set up the reveal without labels.",
	    },
    {
      ...THREE_D_STORYBOARD_FRAME_CONTRACTS[3]!,
      visual: `${direction.visualEngine || direction.adAngle} becomes an impossible 3D reveal tied to ${shortPhrase(evidence.text, "the evidence", 70)}.`,
      camera: "X-ray macro reveal with a controlled orbit.",
      motion: "Layers separate, protect, assemble, or route through the obstacle.",
      overlayText: "The reveal",
      editingNote: "This is the visual peak.",
    },
	    {
	      ...THREE_D_STORYBOARD_FRAME_CONTRACTS[4]!,
      visual: `The product returns to the demonstrator demo surface while proof tokens lock into place.`,
      camera: "Pull back from 3D insert to blue-grid product handling.",
      motion: "Tokens settle around the product without readable text.",
	      overlayText: "Proof lands",
	      editingNote: "Connect evidence to payoff.",
	    },
	    {
	      ...THREE_D_STORYBOARD_FRAME_CONTRACTS[5]!,
      visual: "Clean final demonstrator-and-product payoff frame in the blue clinical grid lab with room for renderer CTA overlay.",
      camera: "Locked product-and-demonstrator hero shot.",
      motion: "Subtle hold with one final product movement.",
	      overlayText: "Final payoff",
	      editingNote: "Hold clean for CTA.",
	    },
	  ];
  const framePlanText = frames.map((frame) => (
    `visual ${frame.visual}; camera ${frame.camera}; motion ${frame.motion}`
  )).join(" / next silent still: ");
	  return {
	    frameCount: 6,
	    imagePrompt: [
      "Create one vertical 9:16 image containing six raw, unlabeled film stills for a 20-second ecommerce product-science teardown.",
      "Arrange the six stills in a clean 2-column by 3-row contact sheet with thin white gutters only.",
      "Each still must fill its cell edge-to-edge; no blank white rows, title bands, empty margins, or presentation whitespace.",
      "Use a recurring silent 3D demonstrator/scale figure in a bright blue clinical grid lab, plus product handling and one impossible 3D insert.",
      `Shared world: ${siteContract.visualWorld}. Lighting: ${siteContract.lighting}. Camera: ${siteContract.cameraStyle}.`,
      `Recurring objects: ${siteContract.recurringObjects.join(", ")}.`,
      "No readable text, labels, captions, logos, receipts, numbers, arrows, icons, panel headings, beat numbers, or UI inside the generated frames.",
      "The written still descriptions are internal instructions only; do not draw any of those words.",
      framePlanText,
    ].join(" "),
    image: { status: "idle" },
    frames,
  };
};

const createSelectedDirectionVariant = ({
  direction,
  evidence,
  research,
  siteContract,
}: {
  direction: ThreeDBreakdownStoryDirection;
  evidence: ThreeDBreakdownEvidenceItem;
  research: StoredWebsiteResearchResult;
  siteContract: ThreeDBreakdownSiteContract;
}): ThreeDBreakdownVariant => {
  const brandName = cleanText(research.brand.name, 60) || "the product";
  const scriptBeats = [
    {
      role: "consequence" as const,
      narration: ensureSentence(direction.hookLine, `${brandName} has to survive the part nobody sees`, 115),
      startMs: THREE_D_SCRIPT_BEATS[0]!.startMs,
      endMs: THREE_D_SCRIPT_BEATS[0]!.endMs,
    },
    {
      role: "context" as const,
      narration: contextNarration(direction, evidence),
      startMs: THREE_D_SCRIPT_BEATS[1]!.startMs,
      endMs: THREE_D_SCRIPT_BEATS[1]!.endMs,
    },
    {
      role: "mechanism" as const,
      narration: mechanismNarration(research, direction, evidence),
      startMs: THREE_D_SCRIPT_BEATS[2]!.startMs,
      endMs: THREE_D_SCRIPT_BEATS[2]!.endMs,
    },
    {
      role: "revelation" as const,
      narration: evidenceNarration(evidence),
      startMs: THREE_D_SCRIPT_BEATS[3]!.startMs,
      endMs: THREE_D_SCRIPT_BEATS[3]!.endMs,
    },
    {
      role: "punchline" as const,
      narration: "The journey is the product.",
      startMs: THREE_D_SCRIPT_BEATS[4]!.startMs,
      endMs: THREE_D_SCRIPT_BEATS[4]!.endMs,
    },
  ];
  const storyboardBoard = createSelectedDirectionStoryboard({ direction, evidence, siteContract });
	  const sharedPrompt = [
	    "vertical 9:16 ecommerce product-science teardown",
	    siteContract.visualWorld,
	    siteContract.lighting,
	    `recurring objects ${siteContract.recurringObjects.join(", ")}`,
		    "bright blue clinical grid lab with one recurring silent 3D demonstrator/scale figure and one clean 3D explanatory insert",
	    "no readable text no labels no logos no captions",
	  ].join(", ");
  const shots = [
    {
	      shotIndex: 1 as const,
	      role: "consequence" as const,
	      captionText: shortPhrase(direction.hookLine, "Hidden obstacle", 26),
      sceneDescription: "The silent demonstrator uses the product as the hidden obstacle becomes physically visible.",
      explainerDevice: "invisible-problem",
      physicalAction: "The product path tightens and pressure builds around it.",
      imagePrompt: `${sharedPrompt}, silent demonstrator and product on blue grid lab stage, hidden obstacle physically forming around product path`,
      animationPrompt: "Push from demonstrator demo into the hidden obstacle forming around the product.",
	      image: { status: "idle" as const },
	      video: { status: "idle" as const },
	    },
    {
      shotIndex: 2 as const,
      role: "mechanism" as const,
      captionText: "The reveal",
      sceneDescription: "A cutaway shows the product mechanism crossing the obstacle.",
      explainerDevice: direction.possibleRevealPatterns[0] || "xray-cutaway",
      physicalAction: "Layers separate and route the core through the obstacle.",
      imagePrompt: `${sharedPrompt}, impossible xray cutaway, product layers separate, mechanism routes through obstacle, proof tokens stay blank`,
      animationPrompt: "Separate layers, route the core through the obstacle, then rebuild cleanly.",
      image: { status: "idle" as const },
      video: { status: "idle" as const },
    },
    {
	      shotIndex: 3 as const,
	      role: "revelation" as const,
	      captionText: "Proof lands",
      sceneDescription: "The product returns to the demonstrator demo surface as blank proof tokens lock into payoff.",
      explainerDevice: "proof-blocks",
      physicalAction: "Blank tokens lock beside the product while the final frame settles.",
      imagePrompt: `${sharedPrompt}, final blue grid product-and-demonstrator stage, blank proof tokens lock beside product, clean CTA-safe ending`,
	      animationPrompt: "Pull back to product, proof tokens lock, hold final frame cleanly.",
	      image: { status: "idle" as const },
	      video: { status: "idle" as const },
    },
  ];
  return {
    visualStyle: "presenter-teardown-vsl",
    variantAngle: shortPhrase(direction.adAngle, direction.category, 120),
    customerProblem: shortPhrase(direction.hookLine, "hidden product obstacle", 150),
    mechanismSummary: shortPhrase(direction.visualEngine || direction.subheadline, "product mechanism reveal", 170),
    visualMetaphor: shortPhrase(direction.visualEngine, "hidden route becomes visible", 150),
    referenceScript: scriptBeats.map((beat) => beat.narration).join(" "),
    ctaLine: `${brandName}: see the mechanism.`,
    evidenceIndex: evidence.evidenceIndex,
    evidenceUseType: evidence.evidenceUseType,
    wowMomentType: direction.possibleRevealPatterns[0] || "xray-cutaway",
    wowMoment: shortPhrase(direction.visualEngine, "The hidden mechanism becomes visible as the product crosses the obstacle.", 210),
    viewerLearns: shortPhrase(direction.whyCompelling, "The product works because the hidden mechanism changes the journey.", 210),
    claimRisk: siteContract.riskFlags.length ? "medium" : "low",
    claimRiskReason: "Uses selected scraped evidence without adding stronger measurable claims.",
    storyboardBoard,
    scriptBeats,
    shots,
  };
};

export async function generateThreeDBreakdownStoryDirectionsFromResearch(
  research: StoredWebsiteResearchResult,
  {
    nvidiaNimApiKey = process.env.NVIDIA_NIM_API_KEY || "",
    nvidiaNimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL,
    nvidiaNimChatCompletion,
    nvidiaNimModel = process.env.NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL || DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL,
  }: {
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
  } = {},
): Promise<ThreeDBreakdownStoryDirectionGeneration> {
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM is not configured for 3D Breakdown story directions.");
  const startedAt = Date.now();
  console.log("[wiggly:3d-breakdown] story-slate:start", {
    host: research.host,
    model: nvidiaNimModel,
  });
  const { directorEvidenceItems, evidenceItems } = prepareThreeDBreakdownEvidence(research, startedAt);
  const prompt = buildThreeDBreakdownStoryDirectionsPrompt({
    evidence: directorEvidenceItems,
    research,
  });
  const callDirector = (directorPrompt: string) => callNvidiaNimChat({
    apiKey: nvidiaNimApiKey,
    baseUrl: nvidiaNimBaseUrl,
    label: "NVIDIA NIM 3D Breakdown story slate",
    maxTokens: 2200,
    model: nvidiaNimModel,
    nvidiaNimChatCompletion,
    prompt: directorPrompt,
    temperature: 0.62,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  console.log("[wiggly:3d-breakdown] story-slate:call:start", {
    attempt: "initial",
    elapsedMs: Date.now() - startedAt,
  });
  const raw = await callDirector(prompt);
  let slate: ThreeDBreakdownStoryDirectionSlate;
  try {
    slate = parseStoryDirectionSlateOutput(raw, directorEvidenceItems);
  } catch (error) {
    console.warn("[wiggly:3d-breakdown] story-slate:parse:retry", {
      elapsedMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    });
    const retryPrompt = buildThreeDBreakdownStoryDirectionsRetryPrompt({
      originalPrompt: prompt,
      validationErrors: [structuredErrorFrom(error)],
    });
    const retryRaw = await callDirector(retryPrompt);
    slate = parseStoryDirectionSlateOutput(retryRaw, directorEvidenceItems);
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
    selectedStoryDirection,
  }: {
    count?: number;
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
    selectedStoryDirection?: ThreeDBreakdownStoryDirection | null;
  } = {},
): Promise<ThreeDBreakdownGeneration> {
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM is not configured for 3D Breakdown generation.");
  const startedAt = Date.now();
  console.log("[wiggly:3d-breakdown] start", {
    count,
    host: research.host,
    model: nvidiaNimModel,
  });
  const { directorEvidenceItems, evidenceItems } = prepareThreeDBreakdownEvidence(research, startedAt);
  const requestedCount = selectedStoryDirection
    ? 1
    : Math.max(1, Math.min(2, Math.round(count || THREE_D_BREAKDOWN_VARIANT_COUNT)));
  console.log("[wiggly:3d-breakdown] director:prompt:ready", {
    directorEvidenceCount: directorEvidenceItems.length,
    elapsedMs: Date.now() - startedAt,
    requestedCount,
  });
  if (selectedStoryDirection) {
    const evidence = directorEvidenceItems.find((item) => item.evidenceIndex === selectedStoryDirection.evidenceIndex)
      || directorEvidenceItems[0];
    if (!evidence) throw new Error(`${weakSiteCopy} missing_strong_evidence`);
    const siteContract = createSelectedDirectionSiteContract(research, selectedStoryDirection, evidence);
    const variant = createSelectedDirectionVariant({
      direction: selectedStoryDirection,
      evidence,
      research,
      siteContract,
    });
    console.log("[wiggly:3d-breakdown] selected-direction:ready", {
      elapsedMs: Date.now() - startedAt,
      evidenceIndex: evidence.evidenceIndex,
      visualStyle: variant.visualStyle,
    });
    return {
      siteContract,
      variants: [variant],
      evidenceItems,
      model: "selected-story-direction-v1",
      provider: "nvidia-nim",
      providerStatus: {
        provider: "nvidia-nim-curator",
        status: "used",
        reason: "Converted the selected 3D Breakdown story direction into one script scene without paid media generation.",
      },
    };
  }
  const callDirector = (directorPrompt: string) => callNvidiaNimChat({
    apiKey: nvidiaNimApiKey,
    baseUrl: nvidiaNimBaseUrl,
    label: "NVIDIA NIM 3D Breakdown director",
    maxTokens: THREE_D_BREAKDOWN_MAX_TOKENS,
    model: nvidiaNimModel,
    nvidiaNimChatCompletion,
    prompt: directorPrompt,
    temperature: 0.45,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  let lockedStyleBScript: ThreeDBreakdownLockedStyleBScript | null = null;
  if (requestedCount > 1 || selectedStoryDirection) {
    const scriptPrompt = buildThreeDBreakdownStyleBScriptPrompt({ evidence: directorEvidenceItems, research, selectedStoryDirection });
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
      lockedStyleBScript = parseStyleBScriptPlanOutput(scriptRaw, directorEvidenceItems, selectedStoryDirection);
    } catch (error) {
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
      lockedStyleBScript = parseStyleBScriptPlanOutput(retryRaw, directorEvidenceItems, selectedStoryDirection);
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
    parsedGeneration = parseDirectorOutput(raw, directorEvidenceItems, requestedCount, lockedStyleBScript);
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
    parsedGeneration = parseDirectorOutput(retryRaw, directorEvidenceItems, requestedCount, lockedStyleBScript);
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
