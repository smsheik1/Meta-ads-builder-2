import { z } from "zod";
import type { StaticAdLayer, StaticPackageAdScene } from "../scene/types";
import { validateStaticPackageScene } from "../formats/static-package/validate";

const semanticId = z.string().regex(/^[a-z][a-z0-9_]*$/);
const evidenceId = z.string().regex(/^text_(?:[0-9]{2,}|cluster_[0-9]{2,})$/);
const evidenceIds = z.array(evidenceId).min(1).refine((values) => new Set(values).size === values.length);

export const makerAssetRoleSchema = z.enum([
  "brand_identity",
  "story_setting",
  "news_subject",
  "supporting_visual",
  "decorative",
]);

export type MakerAssetRole = z.infer<typeof makerAssetRoleSchema>;

const fieldSchema = z.object({
  id: semanticId,
  value: z.string(),
  evidence_ids: evidenceIds,
  binding: z.enum(["fixed", "brand", "campaign", "proof"]),
}).strict();

const listSchema = z.object({
  id: semanticId,
  binding: z.enum(["fixed", "brand", "campaign"]),
  items: z.array(z.object({
    id: semanticId,
    values: z.array(z.object({
      key: semanticId,
      value: z.string(),
      evidence_ids: evidenceIds,
    }).strict()).min(1),
    asset_ids: z.array(semanticId).refine((values) => new Set(values).size === values.length),
  }).strict()).min(2),
  active_item_id: z.string().nullable(),
}).strict();

const assetSchema = z.object({
  id: semanticId,
  label: z.string(),
  role: makerAssetRoleSchema.default("decorative"),
  evidence_ids: z.array(evidenceId).refine((values) => new Set(values).size === values.length),
  binding: z.enum(["fixed", "brand", "campaign", "locked"]),
  sam_prompt: z.string().min(1),
}).strict();

export const makerAnalysisSchema = z.object({
  formula: z.object({
    premise: z.string(),
    visual_mechanic: z.string(),
    adaptation_rule: z.string(),
  }).strict(),
  fields: z.array(fieldSchema),
  lists: z.array(listSchema),
  assets: z.array(assetSchema),
  reroll_groups: z.array(z.object({
    id: semanticId,
    members: z.array(semanticId).min(1).refine((values) => new Set(values).size === values.length),
    instruction: z.string(),
  }).strict()),
  maker_questions: z.array(z.string()).max(3),
}).strict().superRefine((analysis, context) => {
  const fieldIds = analysis.fields.map((field) => field.id);
  const listIds = analysis.lists.map((list) => list.id);
  const assetIds = analysis.assets.map((asset) => asset.id);
  const allIds = [...fieldIds, ...listIds, ...assetIds];
  if (new Set(allIds).size !== allIds.length) {
    context.addIssue({ code: "custom", message: "Field, List, and asset ids must be unique." });
  }

  const assetIdSet = new Set(assetIds);
  for (const list of analysis.lists) {
    const itemIds = new Set(list.items.map((item) => item.id));
    if (list.active_item_id !== null && !itemIds.has(list.active_item_id)) {
      context.addIssue({ code: "custom", path: ["lists", list.id, "active_item_id"], message: "Active item must belong to its List." });
    }
    for (const item of list.items) {
      for (const assetId of item.asset_ids) {
        if (!assetIdSet.has(assetId)) {
          context.addIssue({ code: "custom", path: ["lists", list.id, item.id, "asset_ids"], message: `Asset ${assetId} is not declared.` });
        }
      }
    }
  }

  const memberIds = new Set(allIds);
  for (const group of analysis.reroll_groups) {
    for (const member of group.members) {
      if (!memberIds.has(member)) {
        context.addIssue({ code: "custom", path: ["reroll_groups", group.id, "members"], message: `Reroll member ${member} is not declared.` });
      }
    }
  }
});

export type MakerAnalysis = z.infer<typeof makerAnalysisSchema>;

export type FormatDraft = {
  id: string;
  title: string;
  status: "draft" | "published";
  reference: {
    fileName: string;
    imageUrl: string;
  };
  scene: StaticPackageAdScene;
  analysis: MakerAnalysis;
  skill: string;
  revision: number;
  publishedVersionId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type FormatVersion = {
  id: string;
  draftId: string;
  version: number;
  title: string;
  referenceFileName: string;
  scene: StaticPackageAdScene;
  analysis: MakerAnalysis;
  skill: string;
  publishedAt: number;
};

export function validateFormatDraft(value: FormatDraft) {
  const errors: string[] = [];
  const sceneValidation = validateStaticPackageScene(value.scene);
  errors.push(...sceneValidation.errors);
  const analysisValidation = makerAnalysisSchema.safeParse(value.analysis);
  if (!analysisValidation.success) {
    errors.push(...analysisValidation.error.issues.map((issue) => issue.message));
  }
  if (!value.id.trim()) errors.push("Draft id is missing.");
  if (!value.title.trim()) errors.push("Format title is missing.");
  if (!value.reference.fileName.trim()) errors.push("Reference file name is missing.");
  if (!value.skill.trim()) errors.push("Format skill is missing.");
  return { valid: errors.length === 0, errors };
}

export function validateFormatDraftReady(value: FormatDraft) {
  const validation = validateFormatDraft(value);
  const errors = [...validation.errors];
  const analysisValidation = makerAnalysisSchema.safeParse(value.analysis);
  if (analysisValidation.success) {
    const mutableIds = new Set([
      ...analysisValidation.data.fields.filter((field) => field.binding !== "fixed").map((field) => field.id),
      ...analysisValidation.data.lists.filter((list) => list.binding !== "fixed").map((list) => list.id),
      ...analysisValidation.data.assets.filter((asset) => asset.binding !== "fixed" && asset.binding !== "locked").map((asset) => asset.id),
    ]);
    if (mutableIds.size === 0) errors.push("Choose at least one component that changes before testing or publishing.");
    for (const group of analysisValidation.data.reroll_groups) {
      if (!group.members.some((member) => mutableIds.has(member))) {
        errors.push(`“${group.instruction}” cannot reroll because every component is fixed or locked.`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertFormatDraft(value: unknown): FormatDraft {
  if (!value || typeof value !== "object") throw new Error("Format draft is missing.");
  const draft = value as FormatDraft;
  const validation = validateFormatDraft(draft);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return { ...draft, analysis: makerAnalysisSchema.parse(draft.analysis) };
}

export function assertFormatVersion(value: unknown): FormatVersion {
  if (!value || typeof value !== "object") throw new Error("Format version is missing.");
  const version = value as FormatVersion;
  const draftValidation = validateFormatDraftReady({
    ...version,
    id: version.draftId,
    status: "published",
    reference: { fileName: version.referenceFileName, imageUrl: "published" },
    revision: version.version,
    publishedVersionId: version.id,
    createdAt: version.publishedAt,
    updatedAt: version.publishedAt,
  });
  if (!version.id?.trim() || !Number.isInteger(version.version) || version.version < 1 || !draftValidation.valid) {
    throw new Error(draftValidation.errors.join(" ") || "Format version is invalid.");
  }
  return { ...version, analysis: makerAnalysisSchema.parse(version.analysis) };
}

export function replaceStaticLayer(
  scene: StaticPackageAdScene,
  layerId: string,
  update: (layer: StaticAdLayer) => StaticAdLayer,
): StaticPackageAdScene {
  let found = false;
  const replace = (layers: StaticAdLayer[]): StaticAdLayer[] => layers.map((layer) => {
    if (layer.id === layerId) {
      found = true;
      return update(layer);
    }
    return layer.type === "group" ? { ...layer, children: replace(layer.children) } : layer;
  });
  const layers = replace(scene.layout.layers);
  if (!found) throw new Error(`Static layer ${layerId} was not found.`);
  return { ...scene, layout: { ...scene.layout, layers } };
}

export function findStaticLayer(layers: StaticAdLayer[], layerId: string): StaticAdLayer | null {
  for (const layer of layers) {
    if (layer.id === layerId) return layer;
    if (layer.type === "group") {
      const nested = findStaticLayer(layer.children, layerId);
      if (nested) return nested;
    }
  }
  return null;
}

export function flattenStaticLayers(layers: StaticAdLayer[]): StaticAdLayer[] {
  return layers.flatMap((layer) => [layer, ...(layer.type === "group" ? flattenStaticLayers(layer.children) : [])]);
}

export function updateFormatDraft(
  draft: FormatDraft,
  update: Partial<Pick<FormatDraft, "title" | "scene" | "analysis" | "skill">>,
  now = Date.now(),
): FormatDraft {
  return {
    ...draft,
    ...update,
    status: "draft",
    publishedVersionId: null,
    revision: draft.revision + 1,
    updatedAt: now,
  };
}

export function createFormatVersion(draft: FormatDraft, version: number, now = Date.now()): FormatVersion {
  const validation = validateFormatDraftReady(draft);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return {
    id: `${draft.id}:v${version}`,
    draftId: draft.id,
    version,
    title: draft.title,
    referenceFileName: draft.reference.fileName,
    scene: structuredClone(draft.scene),
    analysis: structuredClone(draft.analysis),
    skill: draft.skill,
    publishedAt: now,
  };
}
