import assert from "node:assert/strict";
import { replaceStaticLayer, updateFormatDraft } from "../features/builder/model";
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
import { resolveMakerFormatTestImages, searchSerperImages } from "../features/formats/static-package/imageSearch.server";

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
assert.doesNotThrow(() => assertMakerFormatTestProductUsable(contract, {
  ...selectedProduct!,
  imageUrl: null,
}), "A brand logo slot must not incorrectly require product photography.");

const draftWithProductVisual = updateFormatDraft(draft, {
  analysis: {
    ...structuredClone(draft.analysis),
    assets: [...structuredClone(draft.analysis.assets), {
      id: "supporting_product",
      label: "Supporting product",
      role: "supporting_visual",
      evidence_ids: [],
      binding: "campaign",
      sam_prompt: "supporting product",
    }],
  },
  scene: {
    ...draft.scene,
    layout: {
      ...draft.scene.layout,
      layers: [...draft.scene.layout.layers, {
        ...flattenStaticLayers(draft.scene.layout.layers).find((layer) => layer.semanticRole === "asset:brand_mark")!,
        id: "asset-supporting-product",
        semanticRole: "asset:supporting_product",
        binding: "campaign",
      }],
    },
  },
});
const productVisualContract = createMakerFormatTestContract(draftWithProductVisual);
assert.throws(() => assertMakerFormatTestProductUsable(productVisualContract, {
  ...selectedProduct!,
  imageUrl: null,
}), /Choose a product with a usable image/);
assert.throws(() => assertMakerFormatTestProductUsable(productVisualContract, null), /Choose a product with a usable image/);

const storySubjectDraft = updateFormatDraft(draftWithProductVisual, {
  analysis: {
    ...structuredClone(draftWithProductVisual.analysis),
    assets: [...structuredClone(draftWithProductVisual.analysis.assets), {
      id: "news_subject",
      label: "Person or object in the news",
      role: "news_subject",
      evidence_ids: [],
      binding: "campaign",
      sam_prompt: "news subject",
    }],
  },
  scene: {
    ...draftWithProductVisual.scene,
    layout: {
      ...draftWithProductVisual.scene.layout,
      layers: [...draftWithProductVisual.scene.layout.layers, {
        ...flattenStaticLayers(draft.scene.layout.layers).find((layer) => layer.semanticRole === "asset:brand_mark")!,
        id: "asset-news-subject",
        semanticRole: "asset:news_subject",
        binding: "campaign",
      }],
    },
  },
});
const storySubjectContract = createMakerFormatTestContract(storySubjectDraft);
const storyPlan = createMakerFormatTestGenerationFixture(storySubjectContract);
const brandBoundStorySubjectContract = structuredClone(storySubjectContract);
brandBoundStorySubjectContract.assets.find((asset) => asset.id === "news_subject")!.binding = "brand";
assert.doesNotThrow(
  () => validateMakerFormatTestGeneration(brandBoundStorySubjectContract, storyPlan),
  "A brand-bound news subject is not the brand logo.",
);
storyPlan.variations.forEach((variation) => variation.assets.filter((asset) => asset.kind === "web-image").forEach((asset) => { delete asset.imageUrl; }));
const searchedQueries: string[] = [];
const resolvedStoryPlan = await resolveMakerFormatTestImages(storyPlan, async (query) => {
  searchedQueries.push(query);
  return `https://images.example.test/result-${searchedQueries.length}.jpg`;
});
assert.equal(searchedQueries.length, 3);
const storyScenes = createMakerFormatTestScenes({
  draft: storySubjectDraft,
  generation: resolvedStoryPlan,
  product: selectedProduct,
  research: makerTestResearchFixture,
});
const storySubjectLayer = flattenStaticLayers(storyScenes[0]!.layout.layers).find((layer) => layer.semanticRole === "asset:news_subject");
assert.equal(storySubjectLayer?.type === "image" ? storySubjectLayer.src : "", "https://images.example.test/result-1.jpg");
assert.equal(storySubjectLayer?.type === "image" ? storySubjectLayer.objectFit : "", "cover");

const searchResults = await searchSerperImages({
  apiKey: "test-key",
  preferredHost: "davids-cookies.test",
  query: "David's Cookies storefront",
  fetcher: async () => new Response(JSON.stringify({ images: [
    { imageUrl: "https://example.test/tiny.jpg", imageWidth: 100, imageHeight: 100, link: "https://example.test" },
    { imageUrl: "https://example.test/animation.gif", imageWidth: 800, imageHeight: 800, link: "https://example.test" },
    { imageUrl: "https://cdn.test/general.jpg", imageWidth: 900, imageHeight: 700, link: "https://news.test/story" },
    { imageUrl: "https://davids-cookies.test/store.jpg", imageWidth: 900, imageHeight: 700, link: "https://davids-cookies.test/about" },
  ] }), { status: 200, headers: { "content-type": "application/json" } }),
});
assert.deepEqual(searchResults, [
  "https://davids-cookies.test/store.jpg",
  "https://cdn.test/general.jpg",
]);

const generation = createMakerFormatTestGenerationFixture(contract);
const guidedJson = JSON.stringify(createMakerFormatTestGuidedJson(contract));
assert.match(guidedJson, /\"enum\":\[\"brand_name\"/);
assert.match(guidedJson, /\"maxItems\":7/);
assert.doesNotMatch(guidedJson, /imageUrl/);
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
const sourceLeakGeneration = structuredClone(lockedGeneration);
sourceLeakGeneration.variations[0]!.fields.find((field) => field.id === "brand_name")!.value = "kingkong.com.au";
const sourceLeakScene = createMakerFormatTestScenes({ draft: lockedDraft, generation: sourceLeakGeneration, product: selectedProduct, research: makerTestResearchFixture })[0]!;
const sourceLeakBrandLayer = flattenStaticLayers(sourceLeakScene.layout.layers).find((layer) => layer.semanticRole === "field:brand_name");
assert.equal(sourceLeakBrandLayer?.type === "text" ? sourceLeakBrandLayer.text : "", "David's Cookies", "Source advertiser identity must never survive a cross-brand test.");
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
assert.match(capturedPrompt, /WEBSITE ANGLES/);
assert.match(capturedPrompt, /evidence, not mandatory slots/);
assert.match(capturedPrompt, /The selected product is the only product you may advertise or describe/);
assert.match(capturedPrompt, /Preserve the source Format's idea, not unsupported source claims/);
await assert.rejects(() => generateMakerFormatTestVariations({
  answers: [],
  contract,
  nvidiaNimApiKey: "test-key",
  nvidiaNimChatCompletion: async () => "not-json",
  product: selectedProduct,
  research: makerTestResearchFixture,
}), /did not return bare JSON/);

console.log("maker format test runtime tests passed");
