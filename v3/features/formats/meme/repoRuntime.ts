import type { StoredWebsiteResearchResult } from "../../research/types";
import type { MemeAdScene } from "../../scene/types";
import { createMemeAdScene } from "../../scene/createMemeScene";
import {
  extractMemeVariantsFromResponse,
  type MemeVariant,
} from "./generate";
import {
  MEME_TEMPLATES,
  MEME_VARIATIONS_PER_TEMPLATE,
} from "./templates";
import { validateMemeScene } from "./validate";

export type MemeResearch = {
  websiteUrl: string;
  brandName: string;
  description: string;
  offer: string;
  audience: string;
  ctaDirection: string;
  colors: string[];
  fontFeel: "serif" | "sans" | "display" | "mono" | "unknown";
  buyerMoments: string[];
  proof: string[];
  siteLanguage: string[];
};

export type MemeVariantPack = {
  templates: Array<{
    templateId: string;
    variants: Array<{
      angle: string;
      slots: Record<string, string>;
    }>;
  }>;
};

const clean = (value: unknown, maxLength = 400) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

const validUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const promptLikeText = /\b(?:ignore (?:all|any|previous|prior)|system prompt|developer message|assistant instructions?|role change|return only|output format)\b/i;

export const memeResearchTemplate = (websiteUrl: string): MemeResearch => ({
  websiteUrl,
  brandName: "",
  description: "",
  offer: "",
  audience: "",
  ctaDirection: "",
  colors: [],
  fontFeel: "unknown",
  buyerMoments: [],
  proof: [],
  siteLanguage: [],
});

export const validateMemeResearch = (research: MemeResearch) => {
  const errors: string[] = [];
  if (!validUrl(research.websiteUrl)) errors.push("websiteUrl must be a valid URL.");
  if (!clean(research.brandName, 100)) errors.push("brandName is required.");
  if (!clean(research.description, 240)) errors.push("description is required.");
  if (!clean(research.offer, 240)) errors.push("offer is required.");
  if (!clean(research.audience, 180)) errors.push("audience is required.");
  if (!clean(research.ctaDirection, 80)) errors.push("ctaDirection is required.");
  if (!research.colors.length || research.colors.some((color) => !/^#[0-9a-f]{6}$/i.test(color))) {
    errors.push("colors must contain at least one six-digit hex color.");
  }
  if (research.buyerMoments.length < 2) errors.push("Research needs at least two distinct buyer moments.");
  if (!research.proof.length) errors.push("Research needs at least one supported proof or offer detail.");

  for (const [field, values] of Object.entries({
    buyerMoments: research.buyerMoments,
    proof: research.proof,
    siteLanguage: research.siteLanguage,
  })) {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const normalized = clean(value, 280);
      if (!normalized) errors.push(`${field}[${index}] is empty.`);
      if (promptLikeText.test(normalized)) errors.push(`${field}[${index}] looks like page instructions.`);
      const key = normalized.toLowerCase();
      if (seen.has(key)) errors.push(`${field}[${index}] duplicates another item.`);
      seen.add(key);
    });
  }

  return errors;
};

export const toStoredMemeResearch = (
  research: MemeResearch,
  runId: string,
): StoredWebsiteResearchResult => {
  const website = new URL(research.websiteUrl);
  return {
    websiteUrl: research.websiteUrl,
    finalUrl: research.websiteUrl,
    host: website.host,
    brand: {
      name: clean(research.brandName, 100),
      url: research.websiteUrl,
      host: website.host,
      title: clean(research.brandName, 100),
      description: clean(research.description, 240),
      faviconUrl: null,
      logoUrl: null,
      ogImageUrl: null,
      screenshotUrl: null,
      colors: research.colors,
      fonts: { feel: research.fontFeel },
      vibeTags: [],
    },
    brandBrief: {
      brandName: clean(research.brandName, 100),
      offer: clean(research.offer, 240),
      audience: clean(research.audience, 180),
      buyerMoments: research.buyerMoments.map((item) => clean(item, 280)),
      proof: research.proof.map((item) => clean(item, 280)),
      siteLanguage: research.siteLanguage.map((item) => clean(item, 160)),
      ctaDirection: clean(research.ctaDirection, 80),
      visualNotes: [],
      droppedNoiseSummary: [],
      confidence: "high",
    },
    adAngles: [],
    evidence: {
      headings: [],
      paragraphs: research.proof,
      receipts: {
        specificClaims: research.proof,
        buyerMoments: research.buyerMoments,
        exactSiteLanguage: research.siteLanguage,
        namedProof: [],
      },
      rawMarkdown: "",
    },
    metadata: {},
    branding: {},
    providerStatus: [],
    sessionId: `agent-${runId}`,
    researchRunId: runId,
    brandSnapshotId: `brand-${runId}`,
  };
};

export const parseMemeVariantPack = (
  pack: MemeVariantPack,
  research: MemeResearch,
) => {
  const researchErrors = validateMemeResearch(research);
  if (researchErrors.length) throw new Error(researchErrors.join("\n"));

  const errors: string[] = [];
  const expectedIds = MEME_TEMPLATES.map((template) => template.id);
  const actualIds = pack.templates.map((template) => template.templateId);
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    errors.push(`templates must use this exact order: ${expectedIds.join(", ")}.`);
  }
  pack.templates.forEach((template, templateIndex) => {
    if (template.variants.length !== MEME_VARIATIONS_PER_TEMPLATE) {
      errors.push(`templates[${templateIndex}] must contain exactly ${MEME_VARIATIONS_PER_TEMPLATE} variants.`);
    }
    const angles = template.variants.map((variant) => clean(variant.angle, 120).toLowerCase());
    if (angles.some((angle) => !angle)) errors.push(`templates[${templateIndex}] has a missing angle.`);
    if (new Set(angles).size !== angles.length) {
      errors.push(`templates[${templateIndex}] must use distinct angles.`);
    }
  });
  if (errors.length) throw new Error(errors.join("\n"));

  return extractMemeVariantsFromResponse(JSON.stringify(pack), {
    providerLabel: "Host agent",
    repairSlotText: false,
  });
};

export const createMemeScenesFromRun = ({
  research,
  runId,
  variants,
}: {
  research: MemeResearch;
  runId: string;
  variants: MemeVariant[];
}): MemeAdScene[] => {
  const stored = toStoredMemeResearch(research, runId);
  const scenes = variants.map((variant, index) => createMemeAdScene({
    research: stored,
    variant,
    candidateIndex: index,
    generationBatchId: runId,
    model: "host-agent",
    provider: "deterministic",
    now: 0,
  }));
  const errors = scenes.flatMap((scene, index) => (
    validateMemeScene(scene).errors.map((error) => `scene ${index + 1}: ${error}`)
  ));
  if (errors.length) throw new Error(errors.join("\n"));
  return scenes;
};
