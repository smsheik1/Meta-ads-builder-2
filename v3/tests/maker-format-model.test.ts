import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMakerDraftFixture, makerAnalysisFixture } from "../features/builder/fixture";
import {
  createFormatVersion,
  makerAnalysisSchema,
  replaceStaticLayer,
  updateFormatDraft,
  validateFormatDraft,
  validateFormatDraftReady,
} from "../features/builder/model";

const draft = createMakerDraftFixture({ now: 100 });
assert.equal(validateFormatDraft(draft).valid, true);
assert.equal(makerAnalysisSchema.parse(makerAnalysisFixture).lists[0]?.active_item_id, "slack");

const unknownAsset = structuredClone(makerAnalysisFixture);
unknownAsset.lists[0]!.items[0]!.asset_ids = ["missing_asset"];
assert.equal(makerAnalysisSchema.safeParse(unknownAsset).success, false);

const splitActiveItem = structuredClone(makerAnalysisFixture);
splitActiveItem.lists[0]!.active_item_id = "not_in_the_list";
assert.equal(makerAnalysisSchema.safeParse(splitActiveItem).success, false);

const fakeRerollDraft = structuredClone(draft);
fakeRerollDraft.analysis.fields.forEach((field) => { field.binding = "fixed"; });
fakeRerollDraft.analysis.lists.forEach((list) => { list.binding = "fixed"; });
fakeRerollDraft.analysis.assets.forEach((asset) => { asset.binding = "fixed"; });
assert.equal(validateFormatDraft(fakeRerollDraft).valid, true, "A structurally valid draft must remain editable even when it is not ready to test.");
assert.match(validateFormatDraftReady({ ...fakeRerollDraft, analysis: { ...fakeRerollDraft.analysis, reroll_groups: [] } }).errors.join(" "), /Choose at least one component/);
assert.match(validateFormatDraftReady(fakeRerollDraft).errors.join(" "), /cannot reroll because every component is fixed or locked/);

const movedScene = replaceStaticLayer(draft.scene, "active-tool", (layer) => ({ ...layer, x: layer.x + 40 }));
const movedDraft = updateFormatDraft(draft, { scene: movedScene }, 200);
assert.equal(movedDraft.scene.layout.layers.find((layer) => layer.id === "active-tool")?.x, 680);
assert.equal(movedDraft.revision, 2);
assert.equal(movedDraft.status, "draft");

const version = createFormatVersion(movedDraft, 1, 300);
assert.equal(version.id, `${draft.id}:v1`);
assert.equal(version.scene.layout.layers.find((layer) => layer.id === "active-tool")?.x, 680);
movedDraft.scene.layout.layers[3]!.x = 900;
assert.equal(version.scene.layout.layers.find((layer) => layer.id === "active-tool")?.x, 680, "Published version must be an immutable snapshot of draft data.");

const makerBackend = readFileSync("convex/makerFormats.ts", "utf8");
assert.match(makerBackend, /WIGGLY_MAKER_ACCESS_TOKEN/);
assert.doesNotMatch(makerBackend, /db\.(patch|delete)\([^)]*formatVersions/);
assert.doesNotMatch(makerBackend, /retry|fallback/i);

console.log("maker format model tests passed");
