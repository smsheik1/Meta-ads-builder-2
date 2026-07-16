import { z } from "zod";
import type { FormatDraft } from "../../builder/model";
import { flattenStaticLayers, makerAssetRoleSchema, validateFormatDraftReady } from "../../builder/model";
import type { ProductCatalog, ProductCatalogItem, StoredWebsiteResearchResult } from "../../research/types";
import type { StaticAdLayer, StaticImageLayer, StaticPackageAdScene, StaticTextLayer } from "../../scene/types";
import { fitStaticTextLayer } from "./textFit";

const semanticId = z.string().regex(/^[a-z][a-z0-9_]*$/);
const bindingSchema = z.enum(["fixed", "brand", "campaign", "proof", "locked"]);

const contractValueSchema = z.object({ key: semanticId, value: z.string() }).strict();
const contractItemSchema = z.object({ id: semanticId, values: z.array(contractValueSchema).min(1) }).strict();

export const makerFormatTestContractSchema = z.object({
  draftId: z.string().min(1),
  revision: z.number().int().positive(),
  title: z.string().min(1),
  skill: z.string().min(1),
  formula: z.object({ premise: z.string(), visualMechanic: z.string(), adaptationRule: z.string() }).strict(),
  fields: z.array(z.object({ id: semanticId, value: z.string(), binding: bindingSchema, mutable: z.boolean() }).strict()),
  lists: z.array(z.object({
    id: semanticId,
    binding: z.enum(["fixed", "brand", "campaign"]),
    mutable: z.boolean(),
    activeItemId: semanticId.nullable(),
    items: z.array(contractItemSchema).min(2),
  }).strict()),
  assets: z.array(z.object({ id: semanticId, label: z.string(), role: makerAssetRoleSchema, binding: z.enum(["fixed", "brand", "campaign", "locked"]), mutable: z.boolean() }).strict()),
  rerollGroups: z.array(z.object({ id: semanticId, members: z.array(semanticId).min(1), instruction: z.string() }).strict()),
  questions: z.array(z.string().min(1)).max(3),
}).strict();

export type MakerFormatTestContract = z.infer<typeof makerFormatTestContractSchema>;

const plannedListSchema = z.object({
  id: semanticId,
  activeItemId: semanticId.nullable(),
  items: z.array(contractItemSchema).min(2),
}).strict();

const plannedAssetSchema = z.object({
  id: semanticId,
  kind: z.enum(["brand-logo", "product-image", "web-image", "emoji", "keep"]),
  emoji: z.string().max(8).optional(),
  query: z.string().min(3).max(180).optional(),
  imageUrl: z.string().url().optional(),
}).strict();

export const makerFormatTestVariationSchema = z.object({
  angleLabel: z.string().min(3).max(72),
  angleSummary: z.string().min(8).max(240),
  fields: z.array(z.object({ id: semanticId, value: z.string().min(1).max(320) }).strict()),
  lists: z.array(plannedListSchema),
  assets: z.array(plannedAssetSchema),
}).strict();

export const makerFormatTestGenerationSchema = z.object({
  variations: z.array(makerFormatTestVariationSchema).length(3),
}).strict();

export type MakerFormatTestVariation = z.infer<typeof makerFormatTestVariationSchema>;
export type MakerFormatTestGeneration = z.infer<typeof makerFormatTestGenerationSchema>;

type JsonSchema = Record<string, unknown>;

const schemaProperty = (schema: JsonSchema, name: string) => (
  (schema.properties as Record<string, JsonSchema>)[name]!
);

const schemaItems = (schema: JsonSchema) => schema.items as JsonSchema;

const constrainIdArray = (schema: JsonSchema, values: string[]) => {
  schema.minItems = values.length;
  schema.maxItems = values.length;
  if (values.length) schemaProperty(schemaItems(schema), "id").enum = values;
};

export function createMakerFormatTestGuidedJson(contractValue: MakerFormatTestContract) {
  const contract = makerFormatTestContractSchema.parse(contractValue);
  const schema = z.toJSONSchema(makerFormatTestGenerationSchema) as JsonSchema;
  const variation = schemaItems(schemaProperty(schema, "variations"));
  const mutableFields = contract.fields.filter((field) => field.mutable);
  const mutableLists = contract.lists.filter((list) => list.mutable);
  const mutableAssets = contract.assets.filter((asset) => asset.mutable);

  constrainIdArray(schemaProperty(variation, "fields"), ids(mutableFields));
  const lists = schemaProperty(variation, "lists");
  constrainIdArray(lists, ids(mutableLists));
  const list = schemaItems(lists);
  const itemIds = ids(mutableLists.flatMap((source) => source.items));
  const activeItemId = schemaProperty(list, "activeItemId");
  activeItemId.anyOf = [{ type: "string", enum: itemIds }, { type: "null" }];
  const items = schemaProperty(list, "items");
  const itemCounts = mutableLists.map((source) => source.items.length);
  if (itemCounts.length) {
    items.minItems = Math.min(...itemCounts);
    items.maxItems = Math.max(...itemCounts);
  }
  if (itemIds.length) schemaProperty(schemaItems(items), "id").enum = itemIds;
  const values = schemaProperty(schemaItems(items), "values");
  const sourceValues = mutableLists.flatMap((source) => source.items.flatMap((item) => item.values));
  const valueCounts = mutableLists.flatMap((source) => source.items.map((item) => item.values.length));
  if (valueCounts.length) {
    values.minItems = Math.min(...valueCounts);
    values.maxItems = Math.max(...valueCounts);
  }
  const valueKeys = [...new Set(sourceValues.map((value) => value.key))].sort();
  if (valueKeys.length) schemaProperty(schemaItems(values), "key").enum = valueKeys;
  const assetOutput = schemaProperty(variation, "assets");
  constrainIdArray(assetOutput, ids(mutableAssets));
  delete (schemaItems(assetOutput).properties as Record<string, JsonSchema>).imageUrl;
  return schema;
}

const mutableBindings = new Set(["brand", "campaign", "proof"]);
const layerIsMutable = (layer: StaticAdLayer) => !layer.locked && mutableBindings.has(layer.binding);

export function createMakerFormatTestContract(draft: FormatDraft): MakerFormatTestContract {
  const validation = validateFormatDraftReady(draft);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const layers = flattenStaticLayers(draft.scene.layout.layers);
  const roleLayers = (role: string, prefix = false) => layers.filter((layer) => (
    prefix ? layer.semanticRole.startsWith(role) : layer.semanticRole === role
  ));
  const mutableFromLayers = (role: string, fallbackBinding: string, prefix = false) => {
    const matching = roleLayers(role, prefix);
    return matching.length ? matching.some(layerIsMutable) : mutableBindings.has(fallbackBinding);
  };

  return makerFormatTestContractSchema.parse({
    draftId: draft.id,
    revision: draft.revision,
    title: draft.title,
    skill: draft.skill,
    formula: {
      premise: draft.analysis.formula.premise,
      visualMechanic: draft.analysis.formula.visual_mechanic,
      adaptationRule: draft.analysis.formula.adaptation_rule,
    },
    fields: draft.analysis.fields.map((field) => ({
      id: field.id,
      value: field.value,
      binding: field.binding,
      mutable: mutableFromLayers(`field:${field.id}`, field.binding),
    })),
    lists: draft.analysis.lists.map((list) => ({
      id: list.id,
      binding: list.binding,
      mutable: mutableFromLayers(`list:${list.id}:`, list.binding, true),
      activeItemId: list.active_item_id,
      items: list.items.map((item) => ({
        id: item.id,
        values: item.values.map((value) => ({ key: value.key, value: value.value })),
      })),
    })),
    assets: draft.analysis.assets.map((asset) => ({
      id: asset.id,
      label: asset.label,
      role: asset.role,
      binding: asset.binding,
      mutable: mutableFromLayers(`asset:${asset.id}`, asset.binding),
    })),
    rerollGroups: draft.analysis.reroll_groups.map((group) => ({
      id: group.id,
      members: group.members,
      instruction: group.instruction,
    })),
    questions: draft.analysis.maker_questions.slice(0, 3),
  });
}

const ids = (values: Array<{ id: string }>) => values.map((value) => value.id).sort();
const keys = (values: Array<{ key: string }>) => values.map((value) => value.key).sort();
const sameIds = (left: string[], right: string[]) => left.length === right.length && left.every((value, index) => value === right[index]);
const normalizedDirectionFingerprint = (variation: MakerFormatTestVariation) => JSON.stringify({
  fields: variation.fields.map((field) => ({ id: field.id, value: field.value.trim().toLowerCase() })),
  lists: variation.lists.map((list) => ({
    id: list.id,
    activeItemId: list.activeItemId,
    items: list.items.map((item) => ({
      id: item.id,
      values: item.values.map((value) => ({ key: value.key, value: value.value.trim().toLowerCase() })),
    })),
  })),
  assets: variation.assets.map((asset) => ({ id: asset.id, kind: asset.kind, emoji: asset.emoji?.trim() || "", query: asset.query?.trim().toLowerCase() || "" })),
});

export function validateMakerFormatTestGeneration(
  contractValue: MakerFormatTestContract,
  generationValue: unknown,
): MakerFormatTestGeneration {
  const contract = makerFormatTestContractSchema.parse(contractValue);
  const generation = makerFormatTestGenerationSchema.parse(generationValue);
  const expectedFieldIds = ids(contract.fields.filter((field) => field.mutable));
  const expectedListIds = ids(contract.lists.filter((list) => list.mutable));
  const expectedAssetIds = ids(contract.assets.filter((asset) => asset.mutable));
  const directionFingerprints = new Set<string>();

  for (const variation of generation.variations) {
    const directionFingerprint = normalizedDirectionFingerprint(variation);
    if (directionFingerprints.has(directionFingerprint)) throw new Error("Maker test variations must change the generated ad content for each creative angle.");
    directionFingerprints.add(directionFingerprint);
    if (!sameIds(ids(variation.fields), expectedFieldIds)) throw new Error("Maker test field output does not match the editable Format fields.");
    if (!sameIds(ids(variation.lists), expectedListIds)) throw new Error("Maker test List output does not match the editable Format Lists.");
    if (!sameIds(ids(variation.assets), expectedAssetIds)) throw new Error("Maker test asset output does not match the editable Format assets.");

    for (const plannedList of variation.lists) {
      const source = contract.lists.find((list) => list.id === plannedList.id)!;
      if (!sameIds(ids(plannedList.items), ids(source.items))) throw new Error(`Maker test List ${plannedList.id} changed its item structure.`);
      for (const plannedItem of plannedList.items) {
        const sourceItem = source.items.find((item) => item.id === plannedItem.id)!;
        if (!sameIds(keys(plannedItem.values), keys(sourceItem.values))) throw new Error(`Maker test List ${plannedList.id} changed its value structure.`);
      }
      if (plannedList.activeItemId && !plannedList.items.some((item) => item.id === plannedList.activeItemId)) {
        throw new Error(`Maker test List ${plannedList.id} selected an unknown active item.`);
      }
    }

    for (const plannedAsset of variation.assets) {
      const source = contract.assets.find((asset) => asset.id === plannedAsset.id)!;
      if (source.role === "brand_identity" && plannedAsset.kind !== "brand-logo") {
        throw new Error(`Brand asset ${plannedAsset.id} must use the researched brand logo.`);
      }
      if (["story_setting", "news_subject", "supporting_visual"].includes(source.role) && !["product-image", "web-image"].includes(plannedAsset.kind)) {
        throw new Error(`Story asset ${plannedAsset.id} must use a product or searched image for the target brand.`);
      }
      if (plannedAsset.kind === "emoji" && !plannedAsset.emoji?.trim()) {
        throw new Error(`Emoji asset ${plannedAsset.id} is missing its emoji.`);
      }
      if (plannedAsset.kind === "web-image" && !plannedAsset.query?.trim()) {
        throw new Error(`Web image asset ${plannedAsset.id} is missing its search query.`);
      }
    }
  }
  return generation;
}

export function getDefaultMakerTestProductHandle(catalog: ProductCatalog | null | undefined) {
  const products = catalog?.products || [];
  return products.length === 1 ? products[0]!.handle : "";
}

export function selectMakerTestProduct(catalog: ProductCatalog | null | undefined, handle: string) {
  const products = catalog?.products || [];
  if (!products.length) return null;
  if (products.length > 1 && !handle) throw new Error("Choose the product this Format should advertise.");
  const selected = products.find((product) => product.handle === (handle || products[0]!.handle));
  if (!selected) throw new Error("The selected product was not found in this website catalog.");
  return selected;
}

export function makerFormatTestNeedsProductImage(contractValue: MakerFormatTestContract) {
  const contract = makerFormatTestContractSchema.parse(contractValue);
  return contract.assets.some((asset) => asset.mutable && asset.role === "supporting_visual");
}

export function assertMakerFormatTestProductUsable(
  contractValue: MakerFormatTestContract,
  product: ProductCatalogItem | null,
) {
  if (makerFormatTestNeedsProductImage(contractValue) && !product?.imageUrl) {
    throw new Error("Choose a product with a usable image for this Format's editable visual.");
  }
  return product;
}

const hexToRgb = (value: string) => {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16)) as [number, number, number];
};

const relativeLuminance = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  const channels = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]!) + (0.7152 * channels[1]!) + (0.0722 * channels[2]!);
};

const contrastRatio = (left: string, right: string) => {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  if (leftLuminance === null || rightLuminance === null) return 0;
  return (Math.max(leftLuminance, rightLuminance) + 0.05) / (Math.min(leftLuminance, rightLuminance) + 0.05);
};

const pickBrandAccent = (research: StoredWebsiteResearchResult, background: string, fallback: string) => (
  research.brand.colors.find((color) => contrastRatio(color, background) >= 3) || fallback
);

const asImageLayer = (layer: StaticAdLayer, src: string, alt: string): StaticImageLayer => ({
  ...layer,
  type: "image",
  src,
  alt,
  objectFit: "contain",
  borderRadius: layer.type === "image" ? layer.borderRadius : 0,
});

const objectFitForAssetRole = (role: MakerFormatTestContract["assets"][number]["role"]) => (
  role === "story_setting" || role === "news_subject" ? "cover" as const : "contain" as const
);

const asEmojiLayer = (layer: StaticAdLayer, emoji: string): StaticTextLayer => ({
  ...layer,
  type: "text",
  text: emoji,
  color: "#111111",
  fontFamily: "Apple Color Emoji, Segoe UI Emoji, sans-serif",
  fontSize: Math.max(12, Math.min(layer.width, layer.height) * 0.78),
  fontWeight: 400,
  lineHeight: 1,
  textAlign: "center",
});

const resolveLayers = ({
  accent,
  contract,
  layers,
  product,
  research,
  variation,
}: {
  accent: string;
  contract: MakerFormatTestContract;
  layers: StaticAdLayer[];
  product: ProductCatalogItem | null;
  research: StoredWebsiteResearchResult;
  variation: MakerFormatTestVariation;
}): StaticAdLayer[] => {
  const fields = new Map(variation.fields.map((field) => [field.id, field.value]));
  const contractFields = new Map(contract.fields.map((field) => [field.id, field]));
  const lists = new Map(variation.lists.map((list) => [list.id, list]));
  const assets = new Map(variation.assets.map((asset) => [asset.id, asset]));
  const contractAssets = new Map(contract.assets.map((asset) => [asset.id, asset]));
  const logoUrl = research.brand.logoUrl || research.brand.faviconUrl || "";

  return layers.map((layer) => {
    if (layer.type === "group") return { ...layer, children: resolveLayers({ accent, contract, layers: layer.children, product, research, variation }) };
    if (!layerIsMutable(layer)) return structuredClone(layer);
    const [roleType, roleId, itemId, key] = layer.semanticRole.split(":");
    let nextLayer: StaticAdLayer = structuredClone(layer);

    if (roleType === "field" && roleId && nextLayer.type === "text") {
      const sourceField = contractFields.get(roleId);
      const value = sourceField?.binding === "brand" && /brand|publisher|account|handle|company/i.test(roleId)
        ? research.brand.name
        : fields.get(roleId);
      if (value) nextLayer = fitStaticTextLayer(nextLayer, value);
    }
    if (roleType === "list" && roleId && nextLayer.type === "text") {
      const plannedList = lists.get(roleId);
      if (plannedList && itemId === "active") {
        const active = plannedList.items.find((item) => item.id === plannedList.activeItemId) || plannedList.items[0];
        if (active?.values[0]?.value) nextLayer = fitStaticTextLayer(nextLayer, active.values[0].value);
      } else if (plannedList && itemId && key) {
        const value = plannedList.items.find((item) => item.id === itemId)?.values.find((itemValue) => itemValue.key === key)?.value;
        if (value) nextLayer = fitStaticTextLayer(nextLayer, value);
      }
    }
    if (roleType === "asset" && roleId) {
      const directive = assets.get(roleId);
      const sourceAsset = contractAssets.get(roleId);
      if (directive?.kind === "brand-logo") {
        if (!logoUrl) throw new Error(`The website did not provide a logo for ${research.brand.name}.`);
        nextLayer = asImageLayer(nextLayer, logoUrl, `${research.brand.name} logo`);
      }
      if (directive?.kind === "product-image") {
        if (!product?.imageUrl) throw new Error("The selected product has no usable image.");
        nextLayer = asImageLayer(nextLayer, product.imageUrl, product.imageAlt || product.title);
      }
      if (directive?.kind === "web-image") {
        if (!directive.imageUrl) throw new Error(`Image search did not resolve ${sourceAsset?.label || roleId}.`);
        nextLayer = asImageLayer(nextLayer, directive.imageUrl, sourceAsset?.label || variation.angleLabel);
      }
      if (directive?.kind === "emoji") nextLayer = asEmojiLayer(nextLayer, directive.emoji || "✨");
      if (nextLayer.type === "image" && sourceAsset) nextLayer = { ...nextLayer, objectFit: objectFitForAssetRole(sourceAsset.role) };
    }
    if (nextLayer.binding === "brand") {
      if (nextLayer.type === "text") nextLayer = { ...nextLayer, color: accent };
      if (nextLayer.type === "shape") nextLayer = { ...nextLayer, fill: accent };
    }
    return nextLayer;
  });
};

export function createMakerFormatTestScenes({
  draft,
  generation: generationValue,
  product,
  research,
  now = Date.now(),
}: {
  draft: FormatDraft;
  generation: MakerFormatTestGeneration;
  product: ProductCatalogItem | null;
  research: StoredWebsiteResearchResult;
  now?: number;
}): StaticPackageAdScene[] {
  const contract = createMakerFormatTestContract(draft);
  const generation = validateMakerFormatTestGeneration(contract, generationValue);
  const batchId = `maker-test-${now}`;
  const background = draft.scene.layout.canvas.backgroundColor;
  const accent = pickBrandAccent(research, background, draft.scene.style.accentColor);

  return generation.variations.map((variation, index) => ({
    ...structuredClone(draft.scene),
    brand: { ...structuredClone(research.brand), receipts: structuredClone(research.evidence.receipts) },
    creative: {
      angleId: `maker-test-${index + 1}`,
      headline: variation.angleLabel,
      subheadline: variation.angleSummary,
      ctaText: variation.fields.find((field) => /cta/i.test(field.id))?.value || research.brandBrief.ctaDirection,
      headlineType: "transformation",
      selectedPain: research.brandBrief.buyerMoments[index] || research.brandBrief.buyerMoments[0] || research.brandBrief.offer,
      selectedProof: research.brandBrief.proof[index] || research.brandBrief.proof[0] || product?.title || research.brandBrief.offer,
    },
    style: {
      ...draft.scene.style,
      accentColor: accent,
      fontFeel: research.brand.fonts.feel,
    },
    layout: {
      ...structuredClone(draft.scene.layout),
      layers: resolveLayers({ accent, contract, layers: draft.scene.layout.layers, product, research, variation }),
    },
    metadata: {
      candidateIndex: index,
      generationBatchId: batchId,
      researchRunId: research.researchRunId,
      brandSnapshotId: research.brandSnapshotId,
      model: "z-ai/glm-5.2",
      provider: "nvidia-nim",
      generatedAt: now,
      adAngles: research.adAngles,
      selectedProductHandles: product ? [product.handle] : [],
    },
  }));
}

export function createMakerFormatTestPrompt({
  answers,
  contract: contractValue,
  product,
  research,
}: {
  answers: Array<{ question: string; answer: string }>;
  contract: MakerFormatTestContract;
  product: ProductCatalogItem | null;
  research: StoredWebsiteResearchResult;
}) {
  const contract = makerFormatTestContractSchema.parse(contractValue);
  const creativeAngles = product ? [] : research.adAngles || [];
  const targetBrand = product ? {
    brand: { ...research.brand, title: research.brand.name, description: "" },
    brief: {
      ...research.brandBrief,
      offer: product.title,
      proof: [],
      siteLanguage: [],
      ctaDirection: `Shop ${product.productType || product.title}`,
    },
    product,
    answers,
  } : { brand: research.brand, brief: research.brandBrief, receipts: research.evidence.receipts, product, answers };
  return `You are Wiggly's static ad format adapter. Return bare JSON only.\n\nCreate exactly three genuinely different, runnable social-ad directions for the target brand. Preserve the Format's communication formula and exact editable structure. Do not merely swap company names. Use fifth-grade language. Generate every mutable field, every mutable List value, and every mutable asset directive together so reroll-group members remain coherent. Never add, remove, or rename fields, List items, value keys, or assets. Fixed and locked content is omitted and must remain unchanged.\n\nChoose the three strongest angles for the selected product and this Format. The selected product is the only product you may advertise or describe. If no product is selected, write a brand-level ad without inventing one. The WEBSITE ANGLES are evidence, not mandatory slots: improve, combine, or replace weak angles rather than forcing an irrelevant one. Each direction needs a different buyer moment or reason to care, not three phrasings of one idea. Never invent a leak, report, tester program, discount, endorsement, quote, statistic, rating, product detail, or news event that is not supported by TARGET BRAND evidence. The Format may look like news without claiming a fake leak or report: translate unsupported source framing into a truthful announcement, discovery, or useful fact. Preserve the source Format's idea, not unsupported source claims.\n\nBrand-bound Fields must identify the TARGET BRAND. A publisher_handle or account name must become the target brand name or natural social handle; never preserve the source advertiser. Make CTA copy specific to the selected product when a mutable CTA Field exists. Do not call a shipped or ready-to-bake product homemade unless TARGET BRAND evidence says it is homemade.\n\nAsset rules:\n- brand_identity always uses brand-logo\n- supporting_visual uses product-image when a selected product exists; otherwise use web-image\n- story_setting uses web-image with a precise, literal search query\n- news_subject uses product-image when the selected product is the subject of the story; otherwise use web-image\n- web-image queries should seek real usable photography, not describe an image generator prompt\n- use keep only for decorative assets; every formula-critical story asset must change with the direction\n\nWEBSITE ANGLES:\n${JSON.stringify(creativeAngles)}\n\nFORMAT SKILL:\n${contract.skill}\n\nFORMAT CONTRACT:\n${JSON.stringify(contract)}\n\nTARGET BRAND:\n${JSON.stringify(targetBrand)}\n\nReturn this exact shape:\n${JSON.stringify({ variations: [{ angleLabel: "Plain-language angle", angleSummary: "Why this ad direction works", fields: [{ id: "exact_mutable_field_id", value: "new value" }], lists: [{ id: "exact_mutable_list_id", activeItemId: "existing_item_id_or_null", items: [{ id: "existing_item_id", values: [{ key: "existing_key", value: "new value" }] }] }], assets: [{ id: "exact_mutable_asset_id", kind: "brand-logo | product-image | web-image | emoji | keep", emoji: "only when kind is emoji", query: "required only when kind is web-image" }] }] })}`;
}
