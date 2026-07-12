import { z } from "zod";
import makerAnalysisMvpJsonSchema from "../../../docs/research-intake/schemas/maker-analysis-mvp.schema.json";
import type {
  StaticAdLayer,
  StaticImageLayer,
  StaticLayerBinding,
  StaticPackageAdScene,
  StaticTextLayer,
} from "../scene/types";
import { fitStaticTextLayer } from "../formats/static-package/textFit";
import {
  makerAnalysisSchema,
  type FormatDraft,
  type MakerAnalysis,
} from "./model";

const pointSchema = z.tuple([z.number(), z.number()]);

export const ocrEvidenceSchema = z.object({
  id: z.string().regex(/^text_[0-9]{2,}$/),
  text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  polygon: z.array(pointSchema).length(4),
  textColor: z.string().regex(/^#[0-9a-f]{6}$/i),
}).strict();

export const paddleOcrResultSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  texts: z.array(ocrEvidenceSchema),
}).strict();

export type PaddleOcrResult = z.infer<typeof paddleOcrResultSchema>;

export type RefinedAsset = {
  assetId: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ReferenceAnalysisArtifacts = {
  referenceImageUrl: string;
  backgroundImageUrl: string;
  ocr: PaddleOcrResult;
  refinedAssets: RefinedAsset[];
};

const claimedEvidenceIds = (analysis: MakerAnalysis) => [
  ...analysis.fields.flatMap((field) => field.evidence_ids),
  ...analysis.lists.flatMap((list) => list.items.flatMap((item) => item.values.flatMap((value) => value.evidence_ids))),
  ...analysis.assets.flatMap((asset) => asset.evidence_ids),
];

export function validateMakerAnalysisEvidence(value: unknown, ocr: PaddleOcrResult): MakerAnalysis {
  const analysis = makerAnalysisSchema.parse(value);
  const knownEvidence = new Set(ocr.texts.map((item) => item.id));
  const claimed = claimedEvidenceIds(analysis);
  const unknown = [...new Set(claimed.filter((id) => !knownEvidence.has(id)))];
  if (unknown.length > 0) throw new Error(`Analysis referenced unknown OCR evidence: ${unknown.join(", ")}.`);
  if (new Set(claimed).size !== claimed.length) throw new Error("OCR evidence cannot belong to more than one semantic component.");

  for (const list of analysis.lists) {
    const expectedKeys = list.items[0]?.values.map((value) => value.key).sort().join("|") || "";
    for (const item of list.items) {
      const keys = item.values.map((value) => value.key).sort().join("|");
      if (keys !== expectedKeys) throw new Error(`List ${list.id} items must use the same value keys.`);
    }
  }
  for (const asset of analysis.assets) {
    const words = asset.sam_prompt.trim().split(/\s+/).filter(Boolean).length;
    if (words < 1 || words > 6) throw new Error(`Asset ${asset.id} needs a 1–6 word SAM prompt.`);
  }
  return analysis;
}

export function normalizeMakerAnalysisRerollBindings(value: MakerAnalysis): MakerAnalysis {
  const analysis = structuredClone(value);
  const rerollMembers = new Set(analysis.reroll_groups.flatMap((group) => group.members));

  for (const field of analysis.fields) {
    if (rerollMembers.has(field.id) && field.binding === "fixed") field.binding = "campaign";
  }
  for (const list of analysis.lists) {
    if (rerollMembers.has(list.id) && list.binding === "fixed") list.binding = "campaign";
  }
  for (const asset of analysis.assets) {
    if (rerollMembers.has(asset.id) && asset.binding === "fixed") asset.binding = "campaign";
  }

  return analysis;
}

export function makerAnalysisJsonSchema() {
  return makerAnalysisMvpJsonSchema;
}

export function buildMakerAnalysisPrompt(ocr: PaddleOcrResult) {
  const evidence = ocr.texts.map(({ id, text }) => ({ id, text }));
  return `Analyze this image as one reusable static-ad Format.

OCR evidence:
${JSON.stringify(evidence)}

Return the communication formula, singleton editable Fields, repeated Lists, visual assets, coherent Reroll Groups, and at most three blocking Maker questions.

Rules:
- use each creative OCR evidence ID at most once; never invent an ID
- native status bars, account headers, platform CTA stickers, captions, reactions, and footers stay unassigned
- logos and wordmarks are brand-bound assets, not Fields
- active_item_id is null unless one List item is visually emphasized
- ask only for missing information that is not visible and blocks a useful draft
- every formula-critical Field, List, and asset belongs to a Reroll Group
- members of a Reroll Group must use a mutable binding allowed for that component (brand or campaign, plus proof for Fields); fixed and locked components stay outside Reroll Groups
- wrapped text is one Field, not a List
- repeated rows or benefits are one List item each and share the same value keys
- keep each List item's text and asset IDs together
- every asset_id must match an id declared in assets; otherwise leave asset_ids empty
- if a highlighted value belongs to a repeated set, keep it in the List and set active_item_id; do not split it into a Field
- complex nested interfaces or illustrations default to one locked asset
- binding is fixed, brand, campaign, proof, or locked as allowed by the schema
- Reroll Group members use existing Field, List, or asset IDs
- sam_prompt is 1 to 6 literal words
- do not return coordinates, explanations, or extra keys`;
}

const evidenceBounds = (ids: string[], ocr: PaddleOcrResult) => {
  const evidence = ocr.texts.filter((item) => ids.includes(item.id));
  if (evidence.length === 0) throw new Error(`No OCR geometry exists for ${ids.join(", ")}.`);
  if (evidence.length === 1) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = evidence[0]!.polygon;
    const distance = (left: [number, number], right: [number, number]) => Math.hypot(right[0] - left[0], right[1] - left[1]);
    const width = (distance([x0, y0], [x1, y1]) + distance([x3, y3], [x2, y2])) / 2;
    const height = (distance([x0, y0], [x3, y3]) + distance([x1, y1], [x2, y2])) / 2;
    const centerX = (x0 + x1 + x2 + x3) / 4;
    const centerY = (y0 + y1 + y2 + y3) / 4;
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width: Math.max(1, width),
      height: Math.max(1, height),
      rotation: Math.atan2(y1 - y0, x1 - x0) * (180 / Math.PI),
      color: evidence[0]!.textColor,
    };
  }
  const xs = evidence.flatMap((item) => item.polygon.map(([x]) => x));
  const ys = evidence.flatMap((item) => item.polygon.map(([, y]) => y));
  const x = Math.max(0, Math.min(...xs));
  const y = Math.max(0, Math.min(...ys));
  const right = Math.min(ocr.width, Math.max(...xs));
  const bottom = Math.min(ocr.height, Math.max(...ys));
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
    rotation: 0,
    color: evidence[0]!.textColor,
  };
};

const textLayer = ({
  binding,
  evidenceIds,
  id,
  name,
  ocr,
  semanticRole,
  text,
  zIndex,
}: {
  binding: StaticLayerBinding;
  evidenceIds: string[];
  id: string;
  name: string;
  ocr: PaddleOcrResult;
  semanticRole: string;
  text: string;
  zIndex: number;
}): StaticTextLayer => {
  const bounds = evidenceBounds(evidenceIds, ocr);
  return fitStaticTextLayer({
    id,
    type: "text",
    name,
    text,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: Math.max(bounds.height, bounds.height * 1.18),
    rotation: bounds.rotation,
    visible: true,
    locked: binding === "locked",
    opacity: 1,
    zIndex,
    binding,
    semanticRole,
    color: bounds.color,
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: Math.max(8, bounds.height * 0.82),
    fontWeight: 600,
    lineHeight: 1.08,
    textAlign: "left",
  }, text);
};

const createSkill = (analysis: MakerAnalysis) => `# ${analysis.formula.premise}

## Visual formula
${analysis.formula.visual_mechanic}

## Adaptation rule
${analysis.formula.adaptation_rule}

## Coherent rerolls
${analysis.reroll_groups.map((group) => `- ${group.instruction}`).join("\n") || "- Keep the communication formula intact."}`;

const titleFromPremise = (premise: string) => {
  const title = premise.trim().replace(/[.!?]+$/, "");
  return title.length <= 64 ? title : `${title.slice(0, 61).trimEnd()}…`;
};

export function createMakerDraftFromAnalysis({
  analysis: rawAnalysis,
  artifacts,
  fileName,
  id,
  now = Date.now(),
}: {
  analysis: unknown;
  artifacts: ReferenceAnalysisArtifacts;
  fileName: string;
  id: string;
  now?: number;
}): FormatDraft {
  const ocr = paddleOcrResultSchema.parse(artifacts.ocr);
  const analysis = normalizeMakerAnalysisRerollBindings(validateMakerAnalysisEvidence(rawAnalysis, ocr));
  const layers: StaticAdLayer[] = [];

  const background: StaticImageLayer = {
    id: "reference-background",
    type: "image",
    name: "Locked reference background",
    src: artifacts.backgroundImageUrl,
    alt: "Reference background with editable regions removed",
    objectFit: "fill",
    borderRadius: 0,
    x: 0,
    y: 0,
    width: ocr.width,
    height: ocr.height,
    rotation: 0,
    visible: true,
    locked: true,
    opacity: 1,
    zIndex: 0,
    binding: "locked",
    semanticRole: "reference:background",
  };
  layers.push(background);

  let zIndex = 10;
  for (const field of analysis.fields) {
    layers.push(textLayer({
      binding: field.binding,
      evidenceIds: field.evidence_ids,
      id: `field-${field.id}`,
      name: field.id.replaceAll("_", " "),
      ocr,
      semanticRole: `field:${field.id}`,
      text: field.value,
      zIndex: zIndex++,
    }));
  }
  for (const list of analysis.lists) {
    for (const item of list.items) {
      for (const value of item.values) {
        layers.push(textLayer({
          binding: list.binding,
          evidenceIds: value.evidence_ids,
          id: `list-${list.id}-${item.id}-${value.key}`,
          name: `${list.id.replaceAll("_", " ")} · ${item.id.replaceAll("_", " ")}`,
          ocr,
          semanticRole: `list:${list.id}:${item.id}:${value.key}`,
          text: value.value,
          zIndex: zIndex++,
        }));
      }
    }
  }
  const assetById = new Map(analysis.assets.map((asset) => [asset.id, asset]));
  for (const artifact of artifacts.refinedAssets) {
    const asset = assetById.get(artifact.assetId);
    if (!asset) throw new Error(`Refined asset ${artifact.assetId} is not declared by the analysis.`);
    layers.push({
      id: `asset-${asset.id}`,
      type: "image",
      name: asset.label,
      src: artifact.imageUrl,
      alt: asset.label,
      objectFit: "contain",
      borderRadius: 0,
      x: artifact.x,
      y: artifact.y,
      width: artifact.width,
      height: artifact.height,
      rotation: 0,
      visible: true,
      locked: asset.binding === "locked",
      opacity: 1,
      zIndex: zIndex++,
      binding: asset.binding,
      semanticRole: `asset:${asset.id}`,
    });
  }

  const scene: StaticPackageAdScene = {
    version: 1,
    format: "static-package",
    brand: {
      name: "Reference brand",
      url: "https://wiggly.app/builder",
      host: "wiggly.app",
      title: titleFromPremise(analysis.formula.premise),
      description: analysis.formula.adaptation_rule,
      faviconUrl: null,
      logoUrl: null,
      ogImageUrl: null,
      screenshotUrl: artifacts.referenceImageUrl,
      colors: ["#111111", "#FFFFFF"],
      fonts: { feel: "sans" },
      vibeTags: ["reference", "maker"],
      receipts: { specificClaims: [], buyerMoments: [], exactSiteLanguage: [], namedProof: [] },
    },
    creative: {
      angleId: "maker-reference",
      headline: analysis.formula.premise,
      subheadline: analysis.formula.visual_mechanic,
      ctaText: analysis.formula.adaptation_rule,
      headlineType: "transformation",
      selectedPain: "The reference is not reusable yet.",
      selectedProof: "The Maker approved the reconstructed formula.",
    },
    style: { backgroundColor: "#FFFFFF", textColor: "#111111", accentColor: "#7C3AED", fontFeel: "sans" },
    audio: { status: "none", transcript: "", captions: [] },
    layout: {
      preset: "static-package",
      canvas: { width: ocr.width, height: ocr.height, backgroundColor: "#FFFFFF" },
      layers,
    },
    metadata: {
      candidateIndex: 0,
      generationBatchId: id,
      researchRunId: id,
      brandSnapshotId: id,
      model: "google/gemma-4-31b-it",
      provider: "nvidia-nim",
      generatedAt: now,
    },
  };

  return {
    id,
    title: titleFromPremise(analysis.formula.premise),
    status: "draft",
    reference: { fileName, imageUrl: artifacts.referenceImageUrl },
    scene,
    analysis,
    skill: createSkill(analysis),
    revision: 1,
    publishedVersionId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function editableTextEvidenceIds(analysis: MakerAnalysis) {
  return [
    ...analysis.fields.flatMap((field) => field.evidence_ids),
    ...analysis.lists.flatMap((list) => list.items.flatMap((item) => item.values.flatMap((value) => value.evidence_ids))),
  ];
}

export function assetsNeedingRefinement(analysis: MakerAnalysis) {
  return analysis.assets.filter((asset) => asset.binding !== "locked");
}
