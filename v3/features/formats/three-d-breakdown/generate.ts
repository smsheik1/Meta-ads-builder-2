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
import {
  assertThreeDBreakdownCta,
  getThreeDBreakdownCtaError,
  selectThreeDBreakdownCta,
} from "./cta";
import {
  resolveThreeDBreakdownStorySubject,
  type ThreeDBreakdownResolvedStorySubject,
  type ThreeDBreakdownStorySubject,
} from "./storySubject";

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
const transcriptOpeningPattern = /^(?:(?:when|if|once|imagine|before|after|inside|without|why|how|what|you|your|most|many|some|a|an|the|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|every|each|she|he|someone|something|\d)\b|[a-z]+ing\b)/i;
const regulatedUnsafePattern = /\b(cures?|diagnos(?:e|is)|treats?|clinically proven|doctor[- ]recommended|risk[- ]free|legal outcome|guaranteed result|guaranteed to)\b|\b(?:prevents?|eliminates?)\s+(?:disease|pain|cavities|infection|injury|illness|complications|lawsuits?|legal risk|financial loss)\b|\b(?:doubles?|triples?|guarantees?|increases?)\s+(?:revenue|profit|sales|return|roi)\b/i;
const storySlateFearPattern = /\b(?:toxic|toxins?|poison(?:s|ed|ing)?|starv(?:e|es|ed|ing|ation)|destroy(?:s|ed|ing)?|deadly|dangerous|killing|ruining|dirty\s+secret|waste\s+of\s+time|eat(?:s|ing)?\s+[^.!?]{0,30}\s+alive|morning\s+ambush|stripped\s+of\s+(?:its|their|the)\s+(?:health|nutrition|nutrients?))\b/i;
const storySlateMechanismClaims = [
  ["absorption", /\b(?:absorb(?:s|ed|ing)?|absorption)\b/i],
  ["digestion", /\b(?:digest(?:s|ed|ing|ion|ive)?|stomach acid|gastric acid)\b/i],
  ["contamination", /\b(?:contaminant|contamination|pesticides?|heavy metals?|microbial)\b/i],
] as const;
const primarySiteTypes: ThreeDBreakdownPrimarySiteType[] = ["ecommerce", "saas", "local-service", "restaurant-food", "nonprofit", "portfolio", "unclear"];
const riskFlags: ThreeDBreakdownRiskFlag[] = ["health", "medical", "legal", "financial", "beauty", "regulated"];
const claimRisks: ThreeDBreakdownClaimRisk[] = ["low", "medium", "high"];
const visualStyles: ThreeDBreakdownVisualStyle[] = [...THREE_D_VISUAL_STYLES];
const weakSiteCopy = "This page does not contain enough concrete evidence for a 3D Breakdown. Try a product, features, testimonials, case-study, or offer page - or use Visualizer for a lighter ad from this URL.";
const MIN_VISUAL_POTENTIAL_SCORE = 0.7;

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

const assertTranscriptScriptShape = (
  beats: ThreeDBreakdownScriptBeat[],
  subjectKind?: ThreeDBreakdownStorySubject["kind"],
) => {
  const combined = beats.map((beat) => beat.narration).join(" ");
  const totalWords = countWords(combined);
  if (totalWords < THREE_D_MIN_SCRIPT_WORDS || totalWords > THREE_D_MAX_SCRIPT_WORDS) {
    throw new Error(`3D Breakdown script has ${totalWords} words; it must have ${THREE_D_MIN_SCRIPT_WORDS}-${THREE_D_MAX_SCRIPT_WORDS}.`);
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
  assertThreeDBreakdownCta(punchline, subjectKind);
};

const presenterNarrationPattern = /\b(i am|i'm|i'll|let me|watch me|today i|my favorite|we're going to|i want to show|i recommend)\b/i;
const productionDirectionPattern = /\b(demonstrator|camera|frame|scene|animation|x[- ]?ray|cutaway|review tokens?|proof tokens?|caption|storyboard)\b/i;
const templateLeakPattern = /\bwhen a buyer receives it\b|\bthe product reveals hidden proof\b|\bone version fills space\b|\bthe other changes the moment\b/i;
const falseClassificationPattern = /\b(assum(?:e|es|ed|ing)|thought|pictured|decided|not for|only for|just for|wrong(?:ly)?|looked like|felt like)\b/i;
const REFERENCE_SCRIPT_ACCEPT_MIN_WORDS = THREE_D_MIN_SCRIPT_WORDS;
const REFERENCE_SCRIPT_ACCEPT_MAX_WORDS = 180;
const shippingLikeEvidenceTypes = new Set<ThreeDBreakdownEvidenceUseType>(["shipping", "offer", "guarantee"]);
const arrivalContextEvidenceTypes = new Set<ThreeDBreakdownEvidenceUseType>(["review", "proof", "shipping", "offer", "guarantee"]);
const logisticsContextTerms = new Set(["sorting", "truck", "warehouse", "transit"]);
const unsupportedMechanismTerms = [
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
  ["dented", /\bdented\b/i],
  ["crumple", /\bcrumple\b/i],
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
  ["human-cell comparison", /\bhuman cells?\b|\boutnumber(?:s|ed|ing)?\b/i],
  ["stomach acid", /\bstomach acid\b|\bgastric acid\b/i],
  ["hostile digestive environment", /\b(?:hostile|harsh)\s+(?:digestive|gastric|stomach)\s+(?:tract|environment|conditions?)\b/i],
  ["blocked digestive path", /\b(?:digestion|digestive tract|stomach acid)\s+blocks?\b/i],
  ["arrives where needed", /\b(?:arriv(?:e|es)|reach(?:es)?)\s+(?:the\s+gut\s+)?where\s+(?:it|they|strains?)\s+(?:is|are)\s+needed\b/i],
  ["destroy", /\bdestroy(?:s|ed|ing)?\b/i],
  ["absorb", /\babsorb(?:s|ed|ing)?\b/i],
  ["carbon", /\bcarbon\b/i],
  ["arthritis", /\barthritis\b/i],
  ["vacuum", /\bvacuum\b/i],
  ["filter layer order", /\b(?:first|second|next|final)\s+(?:filter\s+)?(?:layer|barrier|mesh|sheet)\b/i],
  ["invented water state", /\b(?:dirty|clean)\s+water\b/i],
  ["invented water direction", /\b(?:pulls?|forces?)\s+(?:the\s+)?(?:dirty\s+)?water\s+(?:downward|through)\b/i],
] as const;

const assertReferenceScriptGrounding = (
  script: string,
  evidence: ThreeDBreakdownEvidenceItem,
  supportingEvidenceItems: ThreeDBreakdownEvidenceItem[] = [evidence],
) => {
  const evidenceText = supportingEvidenceItems.map((item) => item.text).join(" ").toLowerCase();
  const factualScript = script
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !falseClassificationPattern.test(sentence))
    .join(" ");
  for (const [term, pattern] of unsupportedMechanismTerms) {
    if (arrivalContextEvidenceTypes.has(evidence.evidenceUseType) && logisticsContextTerms.has(term)) continue;
    if (term === "oven aroma" && /\b(fresh|fresh[- ]baked|tasted|homemade)\b/i.test(evidenceText)) continue;
    if (pattern.test(factualScript) && !pattern.test(evidenceText)) {
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
  if (productionDirectionPattern.test(script)) {
    throw new Error("3D Breakdown Style B referenceScript must contain spoken copy, not production directions.");
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

const normalizeForSubjectMatch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .toLowerCase()
  .trim();

const brandMarker = (brandName: string) => normalizeForSubjectMatch(brandName)
  .split(" ")
  .find((token) => token.length >= 3 && !["the", "and", "company", "inc", "llc"].includes(token)) || "";

const parseStoryDirectionSlateOutput = (
  raw: string,
  evidenceItems: ThreeDBreakdownEvidenceItem[],
  storySubject?: ThreeDBreakdownResolvedStorySubject,
): ThreeDBreakdownStoryDirectionSlate => {
  const parsed = parseJsonObject(raw);
  const rawDirections = Array.isArray(parsed.directions) ? parsed.directions : [];
  if (rawDirections.length !== 5) {
    throw new Error("3D Breakdown story slate must return exactly 5 directions.");
  }
  const directions = rawDirections.map((direction, index) => {
    const rawDirection = direction as Record<string, unknown>;
    const directionId = `idea-${index + 1}`;
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
    if (storySlateFearPattern.test([
      parsedDirection.hookLine,
      parsedDirection.subheadline,
      parsedDirection.shortSummary,
      parsedDirection.adAngle,
    ].join(" "))) {
      throw new Error(`3D Breakdown story direction ${index + 1} uses unsupported harm or fear framing.`);
    }
    const directionText = [
      parsedDirection.hookLine,
      parsedDirection.subheadline,
      parsedDirection.shortSummary,
      parsedDirection.adAngle,
      parsedDirection.visualEngine,
    ].join(" ");
    const selectedProductTitle = storySubject?.kind === "product" ? storySubject.product?.title || "" : "";
    if (
      selectedProductTitle
      && !normalizeForSubjectMatch(directionText).includes(normalizeForSubjectMatch(selectedProductTitle))
    ) {
      throw new Error(`3D Breakdown story direction ${index + 1} must name the selected product ${selectedProductTitle}.`);
    }
    const selectedBrandMarker = storySubject?.kind === "brand" ? brandMarker(storySubject.brandName || "") : "";
    if (
      selectedBrandMarker
      && !normalizeForSubjectMatch(`${parsedDirection.hookLine} ${parsedDirection.subheadline}`).includes(selectedBrandMarker)
    ) {
      throw new Error(`3D Breakdown story direction ${index + 1} must name the selected brand in its hook or subheadline.`);
    }
    for (const [claim, pattern] of storySlateMechanismClaims) {
      if (pattern.test(directionText) && !pattern.test(evidence.text)) {
        throw new Error(`3D Breakdown story direction ${index + 1} invented a ${claim} mechanism not found in selected evidence.`);
      }
    }
    return parsedDirection;
  });
  const recommendedIndex = Number(parsed.recommendedIndex);
  const recommendedDirectionId = Number.isInteger(recommendedIndex) && recommendedIndex >= 1 && recommendedIndex <= directions.length
    ? directions[recommendedIndex - 1]!.directionId
    : cleanText(parsed.recommendedDirectionId, 24) || directions[0]!.directionId;
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
  research: StoredWebsiteResearchResult,
  selectedStoryDirection?: ThreeDBreakdownStoryDirection | null,
  storySubject?: ThreeDBreakdownResolvedStorySubject,
): ThreeDBreakdownLockedStyleBScript => {
  const parsed = parseJsonObject(raw);
  const evidenceIndex = Number(parsed.evidenceIndex);
  if (selectedStoryDirection && evidenceIndex !== selectedStoryDirection.evidenceIndex) {
    throw new Error("3D Breakdown Style B script plan must preserve the selected story direction evidence.");
  }
  const evidence = evidenceItems.find((item) => item.evidenceIndex === evidenceIndex);
  if (!evidence) {
    const allowedEvidenceIds = evidenceItems.map((item) => item.evidenceIndex).join(", ");
    throw new Error(`3D Breakdown Style B script plan references invalid evidence; use one of: ${allowedEvidenceIds}.`);
  }
  const ctaLine = selectThreeDBreakdownCta({
    brandName: research.brandBrief.brandName || research.brand.name,
    generatedCta: cleanText(parsed.ctaLine, 180),
    productTitle: storySubject?.product?.title,
    siteCta: research.brandBrief.ctaDirection,
    subjectKind: storySubject?.kind,
  });
  const scriptBeats = parseScriptBeats(parsed.narrationBeats ?? parsed.scriptBeats, ctaLine, storySubject?.kind);
  const referenceScript = parseReferenceScript(
    parsed.referenceScript || scriptBeats.map((beat) => beat.narration).join(" "),
    "presenter-teardown-vsl",
    evidence,
    evidenceItems,
  ) || "";
  const plan = {
    visualStyle: "presenter-teardown-vsl" as const,
    variantAngle: cleanText(parsed.variantAngle, 120),
    customerProblem: cleanText(parsed.customerProblem, 160),
    mechanismSummary: cleanText(parsed.mechanismSummary, 180),
    visualMetaphor: cleanText(parsed.visualMetaphor, 160),
    referenceScript,
    scriptBeats,
    ctaLine,
    evidenceIndex,
    evidenceUseType: evidence.evidenceUseType,
    wowMomentType: parseEnum(parsed.wowMomentType, THREE_D_REVEAL_PATTERNS, "wowMomentType"),
    wowMoment: cleanText(parsed.wowMoment, 220),
    viewerLearns: cleanText(parsed.viewerLearns, 220),
    claimRisk: parseEnum(parsed.claimRisk, claimRisks, "claimRisk"),
    claimRiskReason: cleanText(parsed.claimRiskReason, 220),
  };
  assertReferenceScriptGrounding([
    plan.referenceScript,
    ...plan.scriptBeats.map((beat) => beat.narration),
  ].join(" "), evidence, evidenceItems);
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

const parseScriptBeats = (
  value: unknown,
  fallbackCtaLine = "",
  subjectKind?: ThreeDBreakdownStorySubject["kind"],
): ThreeDBreakdownScriptBeat[] => {
  if (!Array.isArray(value) || (value.length !== 4 && value.length !== THREE_D_SCRIPT_BEATS.length)) {
    throw new Error("3D Breakdown needs exactly 4 narration beats plus the CTA.");
  }
  const narrationValues = value.map((beat) => (
    typeof beat === "string" ? beat : (beat as Record<string, unknown>).narration
  ));
  if (narrationValues.length === 4) narrationValues.push(fallbackCtaLine);
  const beats = narrationValues.map((rawValue, index) => {
    const contract = THREE_D_SCRIPT_BEATS[index]!;
    const rawNarration = cleanText(rawValue, 180);
    const shouldUseFallbackCta = contract.role === "punchline"
      && countWords(fallbackCtaLine) <= 7
      && Boolean(getThreeDBreakdownCtaError(rawNarration, subjectKind));
    const narration = shouldUseFallbackCta ? fallbackCtaLine : rawNarration;
    if (!narration) throw new Error(`3D Breakdown beat ${index + 1} narration is missing.`);
    assertNoBannedText(narration);
    return {
      role: contract.role,
      narration,
      startMs: contract.startMs,
      endMs: contract.endMs,
    };
  }) as ThreeDBreakdownScriptBeat[];
  assertTranscriptScriptShape(beats, subjectKind);
  return beats;
};

const parseSiteContract = (parsed: Record<string, unknown>): ThreeDBreakdownSiteContract => {
  const parsedRiskFlags = parseRiskFlags(parsed.riskFlags);
  const siteContract = {
    primarySiteType: parseEnum(parsed.primarySiteType, primarySiteTypes, "primarySiteType"),
    riskFlags: parsedRiskFlags,
    visualWorld: cleanText(parsed.visualWorld, 260),
    lighting: cleanText(parsed.lighting, 140),
    cameraStyle: cleanText(parsed.cameraStyle, 140),
    recurringObjects: parseStringArray(parsed.recurringObjects, "recurringObjects", 4),
  };
  if (!siteContract.visualWorld || !siteContract.lighting || !siteContract.cameraStyle) {
    throw new Error("3D Breakdown top-level visual continuity fields are missing.");
  }
  return siteContract;
};

const FALLBACK_SHOT_FRAME_INDEXES = [[0, 1], [2, 3], [4, 5]] as const;

const buildFallbackShots = (
  storyboardBoard: ThreeDBreakdownStoryboardBoard,
): ThreeDBreakdownShot[] => THREE_D_SHOT_CONTRACT.map((contract, index) => {
  const frames = FALLBACK_SHOT_FRAME_INDEXES[index]
    .map((frameIndex) => storyboardBoard.frames?.[frameIndex])
    .filter((frame): frame is NonNullable<typeof frame> => Boolean(frame));
  const joinFrameFields = (
    field: "overlayText" | "visual" | "label" | "motion" | "camera",
    separator: string,
    maxLength: number,
  ) => cleanText(frames.map((frame) => frame[field]).filter(Boolean).join(separator), maxLength);
  return {
    shotIndex: contract.shotIndex,
    role: contract.role,
    captionText: joinFrameFields("overlayText", " / ", 90),
    sceneDescription: joinFrameFields("visual", " Then ", 260),
    explainerDevice: joinFrameFields("label", " to ", 120),
    physicalAction: joinFrameFields("motion", " Then ", 140),
    imagePrompt: frames.map((frame) => `${frame.visual}; ${frame.camera}`).join(" Next: "),
    animationPrompt: joinFrameFields("motion", " Then ", 900),
    image: { status: "idle" },
    video: { status: "idle" },
  };
}) as ThreeDBreakdownShot[];

const getStoryboardStyleRules = (visualStyle: ThreeDBreakdownVisualStyle) => (
  visualStyle === "presenter-teardown-vsl"
    ? [
      "Visual style: presenter-teardown-vsl.",
      "Build one coherent ecommerce teardown with an unseen narrator.",
      "Use the approved subject, product, or hand-proxy as the continuity spine. Object-only frames stay object-only; never invent a person.",
      "When the demo subject's face is visible, use unmistakable feature-animation CGI: simplified facial proportions, modeled hair, matte CG skin, visible eyes, plain everyday shirt, and product-demo posture. Keep lips closed and still. No photorealistic person, live action, photographed human, influencer footage, lip-sync, speech animation, singing, presenter delivery, branded apparel, mannequin, anatomy model, test dummy, gloves, medical mask, lab technician, doctor, scientist, or PPE worker.",
      "If a person or hand-proxy is approved, keep its identity and clothing consistent and physically involved in the demo; it never speaks, sells, points to text, or becomes the narrator.",
      "Each frame should follow this prompt skeleton: locked style, recurring subject/product, scene action, camera/framing, lighting, color/mood, and consistency.",
      "Each frame must read like a production still from the same shot sequence: subject, prop, camera, and lighting stay coherent while the physical action changes.",
      "Maxfusion visual rule: each script line becomes a visible product/body/mechanism action before it becomes an image prompt. Show the state change physically; never settle for topic illustration.",
      "Each frame must translate one narration sentence into a visible before/after state: object moves, layer peels, path blocks, capsule travels, particles scatter, mechanism opens, or payoff resolves.",
      "Frame 1: establish the approved subject and product in a real use setting while the false assumption appears visually.",
      "Frame 2: the hidden customer/product problem appears during actual product use, handling, body-route, opening, eating, applying, wearing, or setup.",
      "Frame 3: the approved subject, product, components, or hands set up the mechanism.",
      "Frame 4: peak impossible-to-film 3D overlay, cutaway, x-ray, component split, invisible-problem reveal, or mechanism insert.",
      "Frame 5: return from the 3D insert into a practical proof or payoff connected to the approved recurring subject.",
      "Frame 6: resolve exactly to the approved final subject and product state. A clean product-only final is valid when the story calls for it.",
      "Use oversized tactile demo props like clear tubes, jars, glasses, capsules, particles, piles, pipes, scoops, scales, trays, or product-use surfaces so the demo feels physically staged, not like a generic science diagram.",
      "Each frame should be a different physical teaching module when possible: product use, product path or selected body-route, obstacle wall or pile-up, mechanism machine or pipe, moving particles/components, and final product payoff.",
      "For supplement stories, match the visual engine to the locked premise. Routine, testing, portability, taste, and ingredient-compression stories stay in the external product/demo world. Only delivery, digestion, or absorption stories use a transparent torso or body-route.",
      "For approved body-route frames, show the correct digestive route rather than lungs, keep it attached to the silent demonstrator and product path, and use clean blue-route footage with a tidy barrier and visible particles. Avoid gore, wet intestine tunnels, detached organs, or anatomy montage.",
      "Use the relevant lifestyle setting for frames 1-2, move into the recognizable bright blue/cyan blueprint-grid explanation stage for frames 3-4, then return to the lifestyle setting for frames 5-6. Keep the same feature-animation CGI finish, recurring subject, product, tactile props, and camera language through both transitions.",
      "Do not use miniature toy-character anatomy, cartoon wall characters, smooth bald mannequins, blank anatomy models, test dummies, faceless biology montages, all-blue tabletop repetition, sterile cleanroom emptiness, huge empty counters, lab-coat scientists, doctor-like presenters, medical masks, medical goggles, PPE, sunglasses, photorealistic people, live-action people, or talking humans.",
    ]
    : [
      "Visual style: toy-character-vsl.",
      "Use a bright blue/cyan technical grid stage with crisp 3D objects, flat readable studio lighting, and hard subject separation.",
      "Use a recurring stylized human demo character/body proxy as the continuity spine in at least four frames, including the first and final frame.",
      "Frame 1 and frame 6 must show the character's full body or torso prominently beside the product; at least one middle frame should show the same body proxy, tiny scale figure, hand, pointer, or probe.",
      "Do not create a faceless biology montage. Internal body, gut, cell-wall, or process visuals should feel like environments the same demo character enters, scales against, points into, or returns from.",
      "Frame 6 should resemble a clean product payoff: product large, demo character body/torso nearby, and 2-4 real components or use-case props arranged around it with open space for renderer overlays.",
    ]
);

const abstractProofPropPattern = /\b(?:abstract\s+)?(?:proof|progress|comparison|evidence)\s+(?:blocks?|tokens?|counters?|cubes?)\b/i;
const textBearingPropPattern = /\b(?:article\s+page|newspaper|document|receipt|poster|sign(?:age|board)?|web\s?page)\b/i;

const parseStoryboardFrames = (value: unknown): NonNullable<ThreeDBreakdownStoryboardBoard["frames"]> => {
  if (!Array.isArray(value) || value.length !== THREE_D_STORYBOARD_FRAME_CONTRACTS.length) {
    throw new Error("3D Breakdown storyboard board must include exactly 6 detailed frames.");
  }
  return THREE_D_STORYBOARD_FRAME_CONTRACTS.map((contract, index) => {
    const frame = value[index];
    const raw = frame as Record<string, unknown>;
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
    if (abstractProofPropPattern.test([visual, camera, motion, editingNote].join(" "))) {
      throw new Error(`3D Breakdown storyboard frame ${index + 1} uses abstract proof props instead of a physical product payoff.`);
    }
    if (textBearingPropPattern.test([visual, camera, motion, editingNote].join(" "))) {
      throw new Error(`3D Breakdown storyboard frame ${index + 1} depends on a text-bearing prop that image models cannot render cleanly.`);
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
    "Absolute text ban: the image must contain zero words and zero letters. Do not draw headings, titles, labels, frame numbers, UI, arrows, icons, shirt text, product text, fake writing, glyphs, or alphanumeric marks.",
    "This is not final footage and not a single hero frame. It is a full-board visual plan that lets a human judge the whole 20-second story before spending video credits.",
    "Use one coherent feature-animation CGI style across a fixed world sequence: frames 1-2 in the relevant lifestyle setting, frames 3-4 on the bright blue/cyan blueprint-grid explanation stage, and frames 5-6 back in the lifestyle setting for the payoff. Keep one dominant subject/action per panel.",
    "If image references are provided, use the style reference frame only for visual grammar and use product/brand references only for shape, color, packaging cues, and material cues.",
    `Story sequence to visualize: ${imagePrompt}`,
    `Internal reading-order still plan to preserve, never visible as text: ${framePlanText}`,
    "Sequence, visually: ordinary-use setup; hidden obstacle; mechanism setup; peak impossible-to-film reveal; evidence/payoff; final transformed product state.",
    "For ecommerce mechanism teardowns, show common use first, then hidden physical obstacle, then first component/mechanism, then peak cutaway or delivery reveal, then a unified evidence/payoff frame where the selected product stays central and any ordinary-version contrast appears only as a small unmarked remnant/token/background residue, then final product payoff.",
    "For capsule/supplement mechanisms, the main selected capsule/product must not crack, shatter, leak, explode, or fail; show impact against an outer layer, obstacle, or ordinary side remnant instead.",
    "The fifth visual beat must not be a split-screen, side-by-side divider, comparison chart, two-column layout, before/after wall, vertical seam, or separated left/right comparison because later production anchors must stay coherent.",
    "The fifth visual beat must keep the selected product stable and central as the main subject. Do not crack, shatter, melt, break, leak, or fail the central product in that beat; any failed ordinary version must be a small separate side remnant, debris token, or background residue.",
    "For ecommerce, make the plan feel like a fast product-science teardown short: repeated product/package anchoring, quick visual resets, macro mechanism close-ups, component or particle movement, and a final product payoff composition.",
    "For reference-style ecommerce teardown, prefer high-energy physical teaching frames over clean beauty renders: dense obstacle worlds, particle floods, moving routes, machinery, fans, valves, tubes, and tactile props.",
    "Do not make the board polite. It should look like six active frames pulled from a fast product-science ad, not six static product-render samples.",
    "Use at least four distinct visual modules across the six frames: product/scale intro, hidden obstacle, mechanism machine or cutaway, ingredient/component movement, unified ordinary-to-selected-product payoff, final product payoff.",
    "For reference-style ecommerce teardown, the best frames teach with objects: a person uses or carries the product, the hidden path/obstacle appears, particles/components move, a machine/cutaway changes state, and the final product resolves the lesson.",
    "Every frame follows the founder prompt discipline: style declaration, recurring subject/product, concrete action, camera/framing, lighting, color/mood, and consistency. If any piece is missing, the frame is too vague.",
    "Every frame must show one visible state change so the storyboard feels like footage: object moves, layer peels, path blocks, capsule travels, particles scatter, mechanism opens, or payoff resolves.",
    "The six panels must feel like a storyboard artist planned one continuous ad: same demonstrator, product, materials, and CGI language through the approved lifestyle-to-blue-to-lifestyle world arc, with new visual information every panel and no disconnected beauty shots.",
    "Do not let the same close-up product angle dominate more than two frames. Keep the visual story changing every frame.",
    ...getStoryboardStyleRules(visualStyle),
    "Every panel must contain a visible subject, object, and physical action. The first panel cannot be an empty stage; it must show friction physically blocking, piling up, splitting, leaking, breaking, tangling, or creating tension.",
    "The written still plan and any overlayText values are internal instructions only. Do not draw any of those words.",
    "No panel labels, no panel numbers, no captions, no caption bars, no black lower bars, no progress bars, no readable text, no UI labels, no speech bubbles, no receipts, no posters, no typography-led design.",
    "No words, letters, numbers, percentages, ratings, price tags, labels, handwriting, UI copy, text-like glyphs, icons, arrows, checkmarks, X marks, or alphanumeric marks anywhere inside panels. Do not write FRAME 1, FRAME 2, scene labels, headings, or any other annotations.",
    "If proof or numeric evidence appears in the story, keep it in overlayText metadata and show the selected product physically causing the documented customer or product outcome. Never visualize evidence as abstract blocks, counters, cubes, tokens, charts, or scoreboards.",
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
  storySubject?: ThreeDBreakdownResolvedStorySubject,
) => {
  const variants = (Array.isArray(parsed.variants) ? parsed.variants : []).map((variant, index) => {
    const rawVariant = variant as Record<string, unknown>;
    const inferredLockedStyle = lockedStyleBScript && (requestedCount === 1 || index === 1)
      ? lockedStyleBScript.visualStyle
      : undefined;
    const visualStyle = inferredLockedStyle || parseEnum(rawVariant.visualStyle, visualStyles, "visualStyle");
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
    assertThreeDBreakdownCta(parsedVariantBase.ctaLine, storySubject?.kind);
    const scriptBeats = lockedScript?.scriptBeats
      ?? parseScriptBeats(rawVariant.narrationBeats ?? rawVariant.scriptBeats, parsedVariantBase.ctaLine, storySubject?.kind);
    const referenceScript = parseReferenceScript(
      lockedScript?.referenceScript
        ?? (cleanText(rawVariant.referenceScript, 2400) || scriptBeats.map((beat) => beat.narration).join(" ")),
      parsedVariantBase.visualStyle,
      evidence,
      evidenceItems,
    );
    for (const [key, value] of Object.entries(parsedVariantBase)) {
      if (typeof value === "string" && !value) throw new Error(`3D Breakdown variant ${index + 1} ${key} is missing.`);
      if (typeof value === "string") assertNoBannedText(value);
    }
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
    const storyboardBoard = parseStoryboardBoard(
      rawVariant.storyboardBoard ?? rawVariant.storyboardImagePrompt,
      parsedVariantBase.visualStyle,
    );
    return {
      ...parsedVariantBase,
      referenceScript,
      storyboardBoard,
      scriptBeats,
      shots: buildFallbackShots(storyboardBoard),
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

const isNvidiaNimTimeout = (error: unknown) => (
  /NVIDIA NIM 3D Breakdown director timed out/i.test(error instanceof Error ? error.message : String(error))
);

const parseDirectorOutput = (
  raw: string,
  evidenceItems: ThreeDBreakdownEvidenceItem[],
  requestedCount: number,
  lockedStyleBScript?: ThreeDBreakdownLockedStyleBScript | null,
  storySubject?: ThreeDBreakdownResolvedStorySubject,
) => {
  const parsed = parseJsonObject(raw);
  const siteContract = parseSiteContract(parsed);
  const variants = parseVariants(parsed, evidenceItems, requestedCount, siteContract, lockedStyleBScript, storySubject);
  return { siteContract, variants };
};

const prepareThreeDBreakdownEvidence = (research: StoredWebsiteResearchResult, startedAt: number) => {
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

export async function generateThreeDBreakdownStoryDirectionsFromResearch(
  research: StoredWebsiteResearchResult,
  {
    nvidiaNimApiKey = process.env.NVIDIA_NIM_API_KEY || "",
    nvidiaNimBaseUrl = process.env.NVIDIA_NIM_BASE_URL || DEFAULT_NVIDIA_NIM_BASE_URL,
    nvidiaNimChatCompletion,
    nvidiaNimModel = process.env.NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL || DEFAULT_NVIDIA_NIM_THREE_D_BREAKDOWN_MODEL,
    storySubject,
  }: {
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
    storySubject?: ThreeDBreakdownStorySubject | null;
  } = {},
): Promise<ThreeDBreakdownStoryDirectionGeneration> {
  if (!nvidiaNimApiKey) throw new Error("NVIDIA NIM is not configured for 3D Breakdown story directions.");
  const startedAt = Date.now();
  console.log("[wiggly:3d-breakdown] story-slate:start", {
    host: research.host,
    model: nvidiaNimModel,
  });
  const { directorEvidenceItems, evidenceItems } = prepareThreeDBreakdownEvidence(research, startedAt);
  const resolvedStorySubject = storySubject
    ? resolveThreeDBreakdownStorySubject(research, storySubject)
    : undefined;
  const prompt = buildThreeDBreakdownStoryDirectionsPrompt({
    evidence: directorEvidenceItems,
    research,
    storySubject: resolvedStorySubject,
  });
  const callDirector = (directorPrompt: string) => callNvidiaNimChat({
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
  console.log("[wiggly:3d-breakdown] story-slate:call:start", {
    attempt: "initial",
    elapsedMs: Date.now() - startedAt,
  });
  const raw = await callDirector(prompt);
  let slate: ThreeDBreakdownStoryDirectionSlate;
  try {
    slate = parseStoryDirectionSlateOutput(raw, directorEvidenceItems, resolvedStorySubject);
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
    selectedStoryDirection,
    storySubject,
  }: {
    count?: number;
    nvidiaNimApiKey?: string;
    nvidiaNimBaseUrl?: string;
    nvidiaNimChatCompletion?: NvidiaNimChatCompletion;
    nvidiaNimModel?: string;
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
  const { directorEvidenceItems, evidenceItems } = prepareThreeDBreakdownEvidence(research, startedAt);
  const resolvedStorySubject = storySubject
    ? resolveThreeDBreakdownStorySubject(research, storySubject)
    : undefined;
  const requestedCount = selectedStoryDirection
    ? 1
    : Math.max(1, Math.min(2, Math.round(count || THREE_D_BREAKDOWN_VARIANT_COUNT)));
  console.log("[wiggly:3d-breakdown] director:prompt:ready", {
    directorEvidenceCount: directorEvidenceItems.length,
    elapsedMs: Date.now() - startedAt,
    requestedCount,
  });
  const callDirector = (directorPrompt: string) => callNvidiaNimChat({
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
    if (!isNvidiaNimTimeout(error)) throw error;
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
