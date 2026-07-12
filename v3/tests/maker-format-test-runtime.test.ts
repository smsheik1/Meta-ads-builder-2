import assert from "node:assert/strict";
import { replaceStaticLayer } from "../features/builder/model";
import {
  createMakerFormatTestDraftFixture,
  createMakerFormatTestGenerationFixture,
  makerTestResearchFixture,
} from "../features/formats/static-package/testFixture";
import {
  assertMakerFormatTestProductUsable,
  createMakerFormatTestContract,
  createMakerFormatTestGuidedJson,
  createMakerFormatTestScenes,
  getDefaultMakerTestProductHandle,
  selectMakerTestProduct,
  validateMakerFormatTestGeneration,
} from "../features/formats/static-package/testRuntime";
import { flattenStaticLayers } from "../features/builder/model";
import { generateMakerFormatTestVariations } from "../features/formats/static-package/testGeneration.server";

const draft = createMakerFormatTestDraftFixture();
const contract = createMakerFormatTestContract(draft);
assert.deepEqual(contract.questions, ["What occasion should this ad focus on?"]);
assert.equal(contract.lists[0]?.mutable, true);
assert.equal(contract.assets[0]?.mutable, true);
assert.deepEqual(contract.rerollGroups[0]?.members, ["brand_name", "relationship_symbol", "cta", "integration_tools", "brand_mark"]);

assert.throws(() => selectMakerTestProduct(makerTestResearchFixture.productCatalog, ""), /Choose the product/);
const selectedProduct = selectMakerTestProduct(makerTestResearchFixture.productCatalog, "blueberry-pie");
assert.equal(selectedProduct?.title, "Grande Blueberry Pie");
assert.equal(getDefaultMakerTestProductHandle(makerTestResearchFixture.productCatalog), "");
assert.equal(getDefaultMakerTestProductHandle({ ...makerTestResearchFixture.productCatalog!, products: [makerTestResearchFixture.productCatalog!.products[0]!] }), "blueberry-pie");
assert.throws(() => assertMakerFormatTestProductUsable(contract, {
  ...selectedProduct!,
  imageUrl: null,
}), /Choose a product with a usable image/);

const generation = createMakerFormatTestGenerationFixture(contract);
const guidedJson = JSON.stringify(createMakerFormatTestGuidedJson(contract));
assert.match(guidedJson, /\"enum\":\[\"brand_name\"/);
assert.match(guidedJson, /\"maxItems\":7/);
assert.equal(validateMakerFormatTestGeneration(contract, generation).variations.length, 3);
const repeatedLabels = structuredClone(generation);
repeatedLabels.variations[1]!.angleLabel = repeatedLabels.variations[0]!.angleLabel;
assert.equal(validateMakerFormatTestGeneration(contract, repeatedLabels).variations.length, 3, "Distinct ad content must not fail because display labels repeat.");
const repeatedContent = structuredClone(generation);
repeatedContent.variations[1] = { ...structuredClone(repeatedContent.variations[0]!), angleLabel: "Different label", angleSummary: "Different summary for identical ad content." };
assert.throws(() => validateMakerFormatTestGeneration(contract, repeatedContent), /change the generated ad content/);
const missingField = structuredClone(generation);
missingField.variations[0]!.fields.pop();
assert.throws(() => validateMakerFormatTestGeneration(contract, missingField), /field output/);
const renamedListItem = structuredClone(generation);
renamedListItem.variations[0]!.lists[0]!.items[0]!.id = "invented_item";
assert.throws(() => validateMakerFormatTestGeneration(contract, renamedListItem), /changed its item structure/);

const lockedDraft = {
  ...draft,
  scene: replaceStaticLayer(draft.scene, "field-relationship_symbol", (layer) => ({ ...layer, locked: true, binding: "locked" })),
};
const lockedContract = createMakerFormatTestContract(lockedDraft);
const lockedGeneration = createMakerFormatTestGenerationFixture(lockedContract);
const lockedSource = flattenStaticLayers(lockedDraft.scene.layout.layers).find((layer) => layer.id === "field-relationship_symbol");
const scenes = createMakerFormatTestScenes({
  draft: lockedDraft,
  generation: lockedGeneration,
  product: selectedProduct,
  research: makerTestResearchFixture,
  now: 500,
});
assert.equal(scenes.length, 3);
assert.deepEqual(
  flattenStaticLayers(scenes[0]!.layout.layers).find((layer) => layer.id === "field-relationship_symbol"),
  lockedSource,
  "Locked layers must survive every test variation unchanged.",
);
assert.equal(scenes[0]?.brand.name, "David's Cookies");
assert.equal(scenes[0]?.creative.headline, "Holiday gifting");
assert.equal(scenes[1]?.creative.headline, "Crowd favorites");
assert.equal(scenes[2]?.creative.headline, "Easy thank-you");
const brandLayer = flattenStaticLayers(scenes[0]!.layout.layers).find((layer) => layer.semanticRole === "field:brand_name");
assert.equal(brandLayer?.type === "text" ? brandLayer.text : "", "David's Cookies");
const logoLayer = flattenStaticLayers(scenes[0]!.layout.layers).find((layer) => layer.semanticRole === "asset:brand_mark");
assert.equal(logoLayer?.type, "image");
assert.equal(logoLayer?.type === "image" ? logoLayer.src : "", makerTestResearchFixture.brand.logoUrl);
const activeListLayer = flattenStaticLayers(scenes[0]!.layout.layers).find((layer) => layer.semanticRole === "list:integration_tools:slack:name");
assert.equal(activeListLayer?.type === "text" ? activeListLayer.text : "", "Thank-yous");
const fittedListLayer = flattenStaticLayers(scenes[0]!.layout.layers).find((layer) => layer.type === "text" && layer.text === "Hanukkah");
const sourceListLayer = flattenStaticLayers(lockedDraft.scene.layout.layers).find((layer) => layer.semanticRole === fittedListLayer?.semanticRole);
assert.ok(
  fittedListLayer?.type === "text" && sourceListLayer?.type === "text" && fittedListLayer.fontSize < sourceListLayer.fontSize,
  "Long rerolled List values must shrink to stay inside the Maker-approved box.",
);
assert.equal(scenes[0]?.metadata.selectedProductHandles?.[0], "blueberry-pie");

let capturedPrompt = "";
const generated = await generateMakerFormatTestVariations({
  answers: [{ question: contract.questions[0]!, answer: "Holiday gifting" }],
  contract,
  nvidiaNimApiKey: "test-key",
  nvidiaNimChatCompletion: async (input) => {
    capturedPrompt = input.prompt;
    return JSON.stringify(generation);
  },
  product: selectedProduct,
  research: makerTestResearchFixture,
});
assert.equal(generated.variations.length, 3);
assert.match(capturedPrompt, /FORMAT SKILL/);
assert.match(capturedPrompt, /Grande Blueberry Pie/);
assert.match(capturedPrompt, /Do not merely swap company names/);
assert.match(capturedPrompt, /CREATIVE ANGLES/);
assert.match(capturedPrompt, /variations\[2\] must adapt angle 3/);
await assert.rejects(() => generateMakerFormatTestVariations({
  answers: [],
  contract,
  nvidiaNimApiKey: "test-key",
  nvidiaNimChatCompletion: async () => "not-json",
  product: selectedProduct,
  research: makerTestResearchFixture,
}), /did not return bare JSON/);

console.log("maker format test runtime tests passed");
