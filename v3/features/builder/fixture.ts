import { createStaticPackageFixture } from "../formats/static-package/fixture";
import type { FormatDraft, MakerAnalysis } from "./model";

export const makerAnalysisFixture: MakerAnalysis = {
  formula: {
    premise: "Show one active relationship inside a familiar collection.",
    visual_mechanic: "Gray supporting names surround two bold names joined by a symbol.",
    adaptation_rule: "Replace the brand, collection, active item, symbol, and CTA as one coherent idea.",
  },
  fields: [
    { id: "brand_name", value: "Codex", evidence_ids: ["text_10"], binding: "brand" },
    { id: "relationship_symbol", value: "🤝", evidence_ids: ["text_11"], binding: "campaign" },
    { id: "cta", value: "Work with Codex", evidence_ids: ["text_20"], binding: "campaign" },
  ],
  lists: [{
    id: "integration_tools",
    binding: "campaign",
    items: ["github", "sheets", "asana", "docs", "slack", "gmail", "slides"].map((id, index) => ({
      id,
      values: [{ key: "name", value: id[0]!.toUpperCase() + id.slice(1), evidence_ids: [`text_${String(index + 12).padStart(2, "0")}`] }],
      asset_ids: [],
    })),
    active_item_id: "slack",
  }],
  assets: [
    { id: "brand_mark", label: "Brand logo", role: "brand_identity", evidence_ids: [], binding: "brand", sam_prompt: "footer brand logo" },
  ],
  reroll_groups: [{
    id: "relationship_message",
    members: ["brand_name", "relationship_symbol", "cta", "integration_tools", "brand_mark"],
    instruction: "Regenerate the active relationship, collection, symbol, and CTA together so the ad keeps one meaning.",
  }],
  maker_questions: [],
};

export const defaultFormatSkill = `# Active relationship

## Premise
Make one useful relationship feel obvious by highlighting the brand and one active item inside a familiar collection.

## Reroll rule
Change the brand, collection, active item, relationship symbol, and CTA together. Keep the language simple and make every variation communicate one specific use case.`;

export function createMakerDraftFixture({
  id = "maker-draft-fixture",
  fileName = "codex-reference.jpeg",
  imageUrl = "",
  now = Date.now(),
}: {
  id?: string;
  fileName?: string;
  imageUrl?: string;
  now?: number;
} = {}): FormatDraft {
  return {
    id,
    title: "Active relationship",
    status: "draft",
    reference: { fileName, imageUrl },
    scene: createStaticPackageFixture(fileName),
    analysis: structuredClone(makerAnalysisFixture),
    skill: defaultFormatSkill,
    revision: 1,
    publishedVersionId: null,
    createdAt: now,
    updatedAt: now,
  };
}
