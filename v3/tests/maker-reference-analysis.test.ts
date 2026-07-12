import assert from "node:assert/strict";
import { createMakerDraftFixture, makerAnalysisFixture } from "../features/builder/fixture";
import {
  assetsNeedingRefinement,
  buildMakerAnalysisPrompt,
  createMakerDraftFromAnalysis,
  editableTextEvidenceIds,
  makerAnalysisJsonSchema,
  validateMakerAnalysisEvidence,
  type PaddleOcrResult,
} from "../features/builder/referenceAnalysis";

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
assert.equal((makerAnalysisJsonSchema() as { additionalProperties?: boolean }).additionalProperties, false);
assert.deepEqual(assetsNeedingRefinement(makerAnalysisFixture).map((asset) => asset.id), ["brand_mark"]);
assert.ok(editableTextEvidenceIds(makerAnalysisFixture).includes("text_10"));

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
    refinedAssets: [{ assetId: "brand_mark", imageUrl: "data:image/png;base64,logo", x: 10, y: 900, width: 90, height: 90, confidence: 0.9 }],
    warnings: [],
  },
  now: 123,
});
assert.equal(draft.scene.layout.canvas.width, 1080);
assert.equal(draft.scene.layout.layers[0]?.semanticRole, "reference:background");
assert.equal(draft.scene.layout.layers.find((layer) => layer.semanticRole === "field:brand_name")?.type, "text");
assert.equal(draft.scene.layout.layers.find((layer) => layer.semanticRole === "asset:brand_mark")?.type, "image");
assert.notDeepEqual(draft.scene, createMakerDraftFixture().scene, "Live reconstruction must not reuse the Codex fixture scene.");

console.log("maker reference analysis tests passed");
