import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMakerDraftFixture, makerAnalysisFixture } from "../features/builder/fixture";
import {
  assetsNeedingRefinement,
  buildMakerAnalysisPrompt,
  createMakerDraftFromAnalysis,
  editableTextEvidenceIds,
  fixedFrameAssets,
  makerAnalysisJsonSchema,
  normalizeMakerAnalysisRerollBindings,
  validateMakerAnalysisEvidence,
  type PaddleOcrResult,
} from "../features/builder/referenceAnalysis";
import { createSavedReferenceDraftFixture, savedCodexOcr, savedCodexReferenceAnalysis } from "../features/builder/savedReferenceFixture";
import { createHybridNewsDraftFixture } from "../features/builder/hybridNewsFixture";
import { createMediaSlotDraftFixture } from "../features/builder/mediaSlotFixtures";

const ocr: PaddleOcrResult = {
  width: 1080,
  height: 1080,
  texts: Array.from({ length: 20 }, (_, index) => ({
    id: `text_${String(index + 1).padStart(2, "0")}`,
    text: `Evidence ${index + 1}`,
    confidence: 0.99,
    polygon: [[20, index * 30], [300, index * 30], [300, index * 30 + 28], [20, index * 30 + 28]],
    textColor: "#111111",
  })),
};

assert.equal(validateMakerAnalysisEvidence(makerAnalysisFixture, ocr).lists[0]?.active_item_id, "slack");
assert.match(buildMakerAnalysisPrompt(ocr), /never invent an ID/);
assert.match(buildMakerAnalysisPrompt(ocr), /advertiser identity inside platform chrome is reusable content/);
assert.match(buildMakerAnalysisPrompt(ocr), /creative banner labels, kicker labels, proof lines, and CTA copy are Fields/);
assert.match(buildMakerAnalysisPrompt(ocr), /CTA Fields use campaign binding/);
assert.match(buildMakerAnalysisPrompt(ocr), /story_setting, news_subject, supporting_visual/);
assert.match(buildMakerAnalysisPrompt(ocr), /name: string/);
assert.equal((makerAnalysisJsonSchema() as { additionalProperties?: boolean }).additionalProperties, false);
assert.deepEqual(makerAnalysisJsonSchema(), JSON.parse(readFileSync("../docs/research-intake/schemas/maker-analysis-mvp.schema.json", "utf8")));
assert.deepEqual(assetsNeedingRefinement(makerAnalysisFixture).map((asset) => asset.id), ["brand_mark"]);
assert.ok(editableTextEvidenceIds(makerAnalysisFixture).includes("text_10"));

const framedAnalysis = structuredClone(makerAnalysisFixture);
framedAnalysis.assets[0]!.frame = { shape: "circle", x: 10, y: 900, width: 90, height: 90 };
assert.deepEqual(fixedFrameAssets(framedAnalysis).map((asset) => asset.id), ["brand_mark"]);
assert.deepEqual(assetsNeedingRefinement(framedAnalysis), [], "A clear media frame must skip SAM 3 refinement.");
const outsideFrame = structuredClone(framedAnalysis);
outsideFrame.assets[0]!.frame = { shape: "rectangle", x: 1_000, y: 1_000, width: 90, height: 90 };
assert.throws(() => validateMakerAnalysisEvidence(outsideFrame, ocr), /frame must stay inside/);

const legacyAnalysis = structuredClone(makerAnalysisFixture) as unknown as { assets: Array<Record<string, unknown>> };
delete legacyAnalysis.assets[0]!.role;
assert.equal(validateMakerAnalysisEvidence(legacyAnalysis, ocr).assets[0]?.role, "decorative", "Saved drafts from before semantic asset roles must still open.");

const contradictoryBindings = structuredClone(makerAnalysisFixture);
contradictoryBindings.fields.forEach((field) => { field.binding = "fixed"; });
contradictoryBindings.lists.forEach((list) => { list.binding = "fixed"; });
contradictoryBindings.assets.forEach((asset) => { asset.binding = "fixed"; });
const normalizedBindings = normalizeMakerAnalysisRerollBindings(contradictoryBindings);
assert.ok(normalizedBindings.fields.every((field) => field.binding === "campaign"));
assert.ok(normalizedBindings.lists.every((list) => list.binding === "campaign"));
assert.ok(normalizedBindings.assets.every((asset) => asset.binding === "campaign"));

const unknownEvidence = structuredClone(makerAnalysisFixture);
unknownEvidence.fields[0]!.evidence_ids = ["text_99"];
assert.throws(() => validateMakerAnalysisEvidence(unknownEvidence, ocr), /unknown OCR evidence/);

const duplicateOwner = structuredClone(makerAnalysisFixture);
duplicateOwner.fields[1]!.evidence_ids = duplicateOwner.fields[0]!.evidence_ids;
assert.throws(() => validateMakerAnalysisEvidence(duplicateOwner, ocr), /more than one semantic component/);

const inconsistentList = structuredClone(makerAnalysisFixture);
inconsistentList.lists[0]!.items[1]!.values[0]!.key = "different";
assert.throws(() => validateMakerAnalysisEvidence(inconsistentList, ocr), /same value keys/);

const draft = createMakerDraftFromAnalysis({
  id: "live-analysis-draft",
  fileName: "reference.jpg",
  analysis: makerAnalysisFixture,
  artifacts: {
    referenceImageUrl: "data:image/jpeg;base64,reference",
    backgroundImageUrl: "data:image/jpeg;base64,background",
    ocr,
    refinedAssets: [{ assetId: "brand_mark", imageUrl: "data:image/png;base64,logo", x: 10, y: 900, width: 90, height: 90 }],
  },
  now: 123,
});
assert.equal(draft.scene.layout.canvas.width, 1080);
assert.equal(draft.title, "Active relationship");
const quotedFormatAnalysis = structuredClone(makerAnalysisFixture);
delete quotedFormatAnalysis.formula.name;
quotedFormatAnalysis.formula.premise = "A 'Breaking News' style alert about one timely announcement.";
assert.equal(createMakerDraftFromAnalysis({
  id: "quoted-format-title",
  fileName: "reference.jpg",
  analysis: quotedFormatAnalysis,
  artifacts: {
    referenceImageUrl: "data:image/jpeg;base64,reference",
    backgroundImageUrl: "data:image/jpeg;base64,background",
    ocr,
    refinedAssets: [{ assetId: "brand_mark", imageUrl: "data:image/png;base64,logo", x: 10, y: 900, width: 90, height: 90 }],
  },
}).title, "Breaking News");
assert.equal(createHybridNewsDraftFixture({ id: "hybrid-news", fileName: "reference.png", imageUrl: "/reference.png" }).title, "Breaking News");
const redundantSuffixAnalysis = structuredClone(makerAnalysisFixture);
redundantSuffixAnalysis.formula.name = "Breaking News Leak";
assert.equal(createMakerDraftFromAnalysis({
  id: "concise-format-title",
  fileName: "reference.jpg",
  analysis: redundantSuffixAnalysis,
  artifacts: {
    referenceImageUrl: "data:image/jpeg;base64,reference",
    backgroundImageUrl: "data:image/jpeg;base64,background",
    ocr,
    refinedAssets: [{ assetId: "brand_mark", imageUrl: "data:image/png;base64,logo", x: 10, y: 900, width: 90, height: 90 }],
  },
}).title, "Breaking News", "Format titles should drop a redundant tactic suffix instead of exposing model jargon.");
assert.equal(draft.scene.layout.layers[0]?.semanticRole, "reference:background");
assert.equal(draft.scene.layout.layers.find((layer) => layer.semanticRole === "field:brand_name")?.type, "text");
assert.equal(draft.scene.layout.layers.find((layer) => layer.semanticRole === "asset:brand_mark")?.type, "image");
assert.notDeepEqual(draft.scene, createMakerDraftFixture().scene, "Live reconstruction must not reuse the Codex fixture scene.");

const normalizedDraft = createMakerDraftFromAnalysis({
  id: "normalized-reroll-draft",
  fileName: "reference.jpg",
  analysis: contradictoryBindings,
  artifacts: {
    referenceImageUrl: "data:image/jpeg;base64,reference",
    backgroundImageUrl: "data:image/jpeg;base64,background",
    ocr,
    refinedAssets: [{ assetId: "brand_mark", imageUrl: "data:image/png;base64,logo", x: 10, y: 900, width: 90, height: 90 }],
  },
});
assert.equal(normalizedDraft.analysis.lists[0]?.binding, "campaign");
assert.equal(normalizedDraft.scene.layout.layers.find((layer) => layer.semanticRole.startsWith("list:integration_tools:"))?.binding, "campaign");

const multilineAnalysis = structuredClone(makerAnalysisFixture);
multilineAnalysis.fields[0] = {
  ...multilineAnalysis.fields[0]!,
  value: "Lifestyle inflation",
  evidence_ids: ["text_01", "text_02"],
};
const multilineOcr = structuredClone(ocr);
multilineOcr.texts[0] = { ...multilineOcr.texts[0]!, text: "LIFESTYLE", polygon: [[0, 0], [140, 0], [140, 21], [0, 21]] };
multilineOcr.texts[1] = { ...multilineOcr.texts[1]!, text: "INFLATION", polygon: [[0, 26], [140, 26], [140, 47], [0, 47]] };
const multilineDraft = createMakerDraftFromAnalysis({
  id: "multiline-text-draft",
  fileName: "tall-reference.jpg",
  analysis: multilineAnalysis,
  artifacts: {
    referenceImageUrl: "data:image/jpeg;base64,reference",
    backgroundImageUrl: "data:image/jpeg;base64,background",
    ocr: multilineOcr,
    refinedAssets: [{ assetId: "brand_mark", imageUrl: "data:image/png;base64,logo", x: 10, y: 900, width: 90, height: 90 }],
  },
});
const multilineLayer = multilineDraft.scene.layout.layers.find((layer) => layer.semanticRole === "field:brand_name");
assert.ok(multilineLayer?.type === "text" && multilineLayer.fontSize <= 20, "Grouped OCR lines must fit inside their combined box instead of clipping.");

const saved = createSavedReferenceDraftFixture({ id: "saved-live", fileName: "codex.jpg", imageUrl: "data:image/jpeg;base64,reference", now: 123 });
const savedAnalysis = validateMakerAnalysisEvidence(savedCodexReferenceAnalysis, savedCodexOcr);
assert.equal(savedAnalysis.fields.length, 2);
assert.equal(savedAnalysis.lists[0]?.items.find((item) => item.id === savedAnalysis.lists[0]?.active_item_id)?.values[0]?.value, "Slack");
assert.equal(saved.scene.metadata.model, "google/gemma-4-31b-it");
assert.equal(saved.scene.metadata.provider, "openrouter");
assert.equal(saved.scene.layout.layers.filter((layer) => layer.type === "text").length, 9);
assert.ok(Math.abs(saved.scene.layout.layers.find((layer) => layer.semanticRole === "list:list_integrations:item_2:app_name")?.rotation || 0) > 5, "Rotated OCR evidence must preserve its angle without inflating the layer box.");

const hybridNews = createHybridNewsDraftFixture({ id: "hybrid-news", fileName: "breaking-news.png", imageUrl: "data:image/png;base64,reference", now: 123 });
const hybridBackground = hybridNews.scene.layout.layers.find((layer) => layer.semanticRole === "reference:background");
const hybridSetting = hybridNews.scene.layout.layers.find((layer) => layer.semanticRole === "asset:story_setting");
const hybridSubject = hybridNews.scene.layout.layers.find((layer) => layer.semanticRole === "asset:news_subject");
assert.equal(hybridBackground?.locked, true);
assert.ok(hybridBackground?.type === "image");
assert.equal(
  hybridBackground.src,
  "/maker-fixtures/hybrid-news/reference.png",
  "The zero-GPU fixture must use the flattened reference instead of a RevealLayer background.",
);
assert.ok(hybridSubject?.type === "image");
assert.ok(hybridSetting?.type === "image" && hybridSetting.fixedFrame, "A rectangular story image should be a fixed replacement frame.");
assert.equal(hybridSubject.fixedFrame, true);
assert.equal(hybridSubject.borderRadius, 104.5, "A circular frame must preserve its original shape.");
assert.equal(
  hybridSubject.src,
  "/maker-fixtures/hybrid-news/source-subject-slot.png",
  "A fixed-shape media slot should come from a deterministic source crop, not a decomposed layer.",
);
assert.deepEqual(
  hybridNews.scene.layout.layers.filter((layer) => layer.type === "image" && layer.semanticRole.startsWith("asset:")).map((layer) => layer.semanticRole),
  ["asset:publisher_logo", "asset:story_setting", "asset:news_subject"],
  "The hybrid fixture must keep publisher, setting, and subject independently replaceable.",
);
assert.equal(hybridNews.scene.layout.layers.find((layer) => layer.semanticRole === "field:headline")?.type, "text");
assert.equal(hybridNews.scene.layout.layers.find((layer) => layer.id === "headline-plate")?.locked, true);

const rectangleFixture = createMediaSlotDraftFixture({ fixtureId: "rectangle", id: "rectangle", fileName: "rectangle.jpg", now: 123 });
const rectangleLayer = rectangleFixture.scene.layout.layers.find((layer) => layer.semanticRole === "asset:poster");
assert.ok(rectangleLayer?.type === "image" && rectangleLayer.fixedFrame && rectangleLayer.objectFit === "cover");
const multipleFixture = createMediaSlotDraftFixture({ fixtureId: "multiple", id: "multiple", fileName: "multiple.png", now: 123 });
assert.equal(
  multipleFixture.scene.layout.layers.filter((layer) => layer.type === "image" && layer.fixedFrame).length,
  4,
  "One reference may expose several independent replacement frames.",
);

const composeScript = readFileSync("scripts/maker-reference-ocr.py", "utf8");
assert.match(composeScript, /background_source\[text_mask > 0\] = np\.median\(nearby_background, axis=0\)/, "Editable text cleanup must restore nearby panel color instead of smearing large letters.");
assert.match(composeScript, /abs\(source_ratio - background_ratio\) > 0\.01/, "RevealLayer output may be smaller, but only a matching aspect ratio may be resized.");
assert.match(composeScript, /cv2\.resize\(background_source, \(width, height\), interpolation=cv2\.INTER_LANCZOS4\)/, "Matching RevealLayer backgrounds must return to the normalized reference size before composition.");

console.log("maker reference analysis tests passed");
