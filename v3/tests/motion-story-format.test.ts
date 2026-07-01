import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MOTION_STORY_CUTOUT_IDENTIFIER, removeProductBackground } from "../features/formats/motion-story/cutout";
import {
  generateMotionStoryVariantsFromResearch,
  pickMotionStoryProduct,
} from "../features/formats/motion-story/generate";
import { getMotionStoryMusicBedId } from "../features/formats/motion-story/music";
import { buildMotionStoryPrompt } from "../features/formats/motion-story/prompt";
import { scoreMotionStoryProof } from "../features/formats/motion-story/proof";
import { validateMotionStoryScene } from "../features/formats/motion-story/validate";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { createMotionStoryAdScene } from "../features/scene/createMotionStoryScene";
import type { ReviewsProofItem } from "../features/scene/types";
import { makeResearch } from "./helpers/research";

const strongProofItems: ReviewsProofItem[] = [
  {
    type: "review",
    text: "I sent this cookie tin to my mom for her birthday and she loved every fresh bite.",
    rating: 5,
    sourceName: "Sarah K.",
    provider: "website",
  },
  {
    type: "review",
    text: "The cookies arrived fresh, packed beautifully, and the whole office asked where I ordered them.",
    rating: 5,
    sourceName: "Lee F.",
    provider: "website",
  },
  {
    type: "review",
    text: "Best gift box for clients; everyone said the brownies tasted homemade and looked perfect.",
    rating: 5,
    sourceName: "Mia R.",
    provider: "website",
  },
  {
    type: "review",
    text: "We will order this cookie tin again because my family devoured it during the party.",
    rating: 5,
    sourceName: "Tara M.",
    provider: "website",
  },
];

const research = makeResearch({
  brand: {
    name: "David's Cookies",
    url: "https://davidscookies.com/",
    host: "davidscookies.com",
    title: "David's Cookies",
    description: "Fresh baked cookies and desserts delivered as gifts.",
    faviconUrl: null,
    logoUrl: "https://cdn.example/davids-logo.png",
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#D6001C", "#121212", "#FFFFFF"],
    fonts: { feel: "sans" },
    vibeTags: ["giftable"],
  },
  brandBrief: {
    brandName: "David's Cookies",
    offer: "Fresh baked cookies, brownies, and dessert tins shipped as gifts.",
    audience: "People sending memorable dessert gifts.",
    buyerMoments: ["Sending a birthday gift that should feel thoughtful."],
    proof: ["Customers say the cookies arrive fresh and taste homemade."],
    siteLanguage: ["fresh baked", "cookie tins", "gift baskets"],
    ctaDirection: "Shop fresh baked gifts",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  evidence: {
    headings: ["Customer reviews"],
    paragraphs: strongProofItems.map((item) => `"${item.text}"`),
    receipts: {
      specificClaims: ["Fresh baked cookies shipped nationwide."],
      buyerMoments: ["Sending a dessert gift for birthdays."],
      exactSiteLanguage: ["fresh baked", "gift baskets"],
      namedProof: [],
    },
    rawMarkdown: "# Customer reviews",
  },
  productCatalog: {
    provider: "shopify-products-json",
    sourceUrl: "https://davidscookies.com/products.json?limit=250",
    groups: { bestSellers: ["birthday-cookie-tin"] },
    summary: { productCount: 1, bestSellerCount: 1 },
    products: [{
      title: "Birthday Cookie Tin",
      handle: "birthday-cookie-tin",
      url: "https://davidscookies.com/products/birthday-cookie-tin",
      imageUrl: "https://cdn.example/birthday-cookie-tin.jpg",
      imageAlt: "Birthday Cookie Tin",
      productType: "Cookies",
      vendor: "David's Cookies",
      priceMin: 49,
      priceMax: 49,
      currency: "USD",
      available: true,
      badges: ["best-seller"],
    }],
  },
});

assert.equal(pickMotionStoryProduct(research).handle, "birthday-cookie-tin");
assert.equal(
  pickMotionStoryProduct(research, ["birthday-cookie-tin"]).handle,
  "birthday-cookie-tin",
);
assert.throws(
  () => pickMotionStoryProduct(makeResearch({ productCatalog: null })),
  /product image/,
);

const strongProof = scoreMotionStoryProof(strongProofItems[0]!, 0, "Birthday Cookie Tin");
assert.ok(strongProof);
assert.ok(strongProof.traits.length >= 2);
assert.equal(
  scoreMotionStoryProof({ type: "review", text: "Great product", provider: "website" }, 0, "Birthday Cookie Tin"),
  null,
);

const prompt = buildMotionStoryPrompt({
  count: 4,
  productTitle: "Birthday Cookie Tin",
  proofItems: strongProofItems.map((item, index) => scoreMotionStoryProof(item, index, "Birthday Cookie Tin")!),
  research,
});
assert.ok(prompt.includes("Strong: \"The gift that actually gets remembered.\""));
assert.ok(prompt.includes("Weak: \"Discover delicious cookies today.\""));
assert.ok(prompt.includes("Dead: \"Experience premium quality and satisfaction.\""));
assert.ok(prompt.includes("motion \"kinetic-reveal\""));

const variantsPayload = {
  variants: [
    {
      hookAngle: "remembered birthday gift",
      proofIndex: 0,
      proofDisplayText: "my mom for her birthday and she loved every fresh bite",
      proofStrengthReason: "Specific gift moment plus emotional reaction.",
      beats: [
        { role: "hook", motion: "kinetic-reveal", headline: "The gift that actually gets remembered", supportingText: "", startMs: 0, endMs: 3000 },
        { role: "product", motion: "image-expand", headline: "Birthday Cookie Tin", supportingText: "Fresh-baked and shipped to the door.", startMs: 3000, endMs: 8000 },
        { role: "proof", motion: "proof-card", headline: "A real birthday save", supportingText: "my mom for her birthday and she loved every fresh bite", startMs: 8000, endMs: 16000 },
        { role: "cta", motion: "cta-slam", headline: "Send the box they talk about", supportingText: "", startMs: 16000, endMs: 20000 },
      ],
      shareCopy: "A better birthday gift, backed by real cookie tin reviews.",
    },
    {
      hookAngle: "office treat that gets asked about",
      proofIndex: 1,
      proofDisplayText: "the whole office asked where I ordered them",
      proofStrengthReason: "Freshness plus recommendation signal.",
      beats: [
        { role: "hook", motion: "kinetic-reveal", headline: "Cookies people ask about after one bite", supportingText: "", startMs: 0, endMs: 3000 },
        { role: "product", motion: "image-expand", headline: "Birthday Cookie Tin", supportingText: "Packed for sharing.", startMs: 3000, endMs: 8000 },
        { role: "proof", motion: "proof-card", headline: "Office proof, not ad copy", supportingText: "the whole office asked where I ordered them", startMs: 8000, endMs: 16000 },
        { role: "cta", motion: "cta-slam", headline: "Bring the tin everyone remembers", supportingText: "", startMs: 16000, endMs: 20000 },
      ],
      shareCopy: "The cookie tin your office remembers.",
    },
    {
      hookAngle: "client gift that looks thoughtful",
      proofIndex: 2,
      proofDisplayText: "everyone said the brownies tasted homemade",
      proofStrengthReason: "Client gift context plus quality detail.",
      beats: [
        { role: "hook", motion: "kinetic-reveal", headline: "Client gifts that do not feel last minute", supportingText: "", startMs: 0, endMs: 3000 },
        { role: "product", motion: "image-expand", headline: "Birthday Cookie Tin", supportingText: "A polished dessert gift.", startMs: 3000, endMs: 8000 },
        { role: "proof", motion: "proof-card", headline: "Homemade taste, shipped clean", supportingText: "everyone said the brownies tasted homemade", startMs: 8000, endMs: 16000 },
        { role: "cta", motion: "cta-slam", headline: "Send a gift that lands", supportingText: "", startMs: 16000, endMs: 20000 },
      ],
      shareCopy: "A client gift with real dessert proof.",
    },
    {
      hookAngle: "party dessert that disappears",
      proofIndex: 3,
      proofDisplayText: "my family devoured it during the party",
      proofStrengthReason: "Party use case plus vivid language.",
      beats: [
        { role: "hook", motion: "kinetic-reveal", headline: "The dessert table goes quiet first", supportingText: "", startMs: 0, endMs: 3000 },
        { role: "product", motion: "image-expand", headline: "Birthday Cookie Tin", supportingText: "Built for the table.", startMs: 3000, endMs: 8000 },
        { role: "proof", motion: "proof-card", headline: "Gone before the party ends", supportingText: "my family devoured it during the party", startMs: 8000, endMs: 16000 },
        { role: "cta", motion: "cta-slam", headline: "Order the tin before the invite", supportingText: "", startMs: 16000, endMs: 20000 },
      ],
      shareCopy: "The party dessert that disappears first.",
    },
  ],
};

let observedMaxTokens: number | undefined;
const generated = await generateMotionStoryVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-motion-story-model",
  nvidiaNimChatCompletion: async ({ maxTokens }) => {
    observedMaxTokens = maxTokens;
    return JSON.stringify(variantsPayload);
  },
});
assert.equal(observedMaxTokens, 4000);
assert.equal(generated.variants.length, 4);
assert.equal(generated.proofItems.length, 4);
assert.equal(getMotionStoryMusicBedId(0, 4), "polished-upbeat");
assert.equal(getMotionStoryMusicBedId(1, 4), "warm-premium");
assert.equal(getMotionStoryMusicBedId(2, 4), "playful-retail");
assert.equal(getMotionStoryMusicBedId(3, 4), "bold-retail");
assert.equal(getMotionStoryMusicBedId(0, 1), "polished-upbeat");

await assert.rejects(
  () => generateMotionStoryVariantsFromResearch(research, {
    count: 4,
    nvidiaNimApiKey: "test-key",
    nvidiaNimChatCompletion: async () => JSON.stringify({
      variants: variantsPayload.variants.map((variant) => ({ ...variant, hookAngle: "same hook" })),
    }),
  }),
  /incomplete Motion Story variants/,
);

await assert.rejects(
  () => removeProductBackground({ replicateApiToken: "", imageUrl: "https://cdn.example/product.jpg" }),
  /Replicate background removal is not configured/,
);
let sawReplicatePrediction = false;
let sawCutoutDownload = false;
const cutout = await removeProductBackground({
  replicateApiToken: "replicate-test-key",
  imageUrl: "https://cdn.example/product.jpg",
  fetcher: async (input, init) => {
    const url = String(input);
    if (url.includes("api.replicate.com")) {
      sawReplicatePrediction = true;
      assert.equal(url, "https://api.replicate.com/v1/predictions");
      assert.equal(init?.method, "POST");
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer replicate-test-key");
      const body = JSON.parse(String(init?.body || "{}"));
      assert.equal(body.version, MOTION_STORY_CUTOUT_IDENTIFIER);
      assert.equal(body.input.image, "https://cdn.example/product.jpg");
      assert.equal(body.input.background_type, "rgba");
      assert.equal(body.input.format, "png");
      return Response.json({ status: "succeeded", output: "https://replicate.example/cutout.png" });
    }
    sawCutoutDownload = true;
    assert.equal(url, "https://replicate.example/cutout.png");
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: { "content-type": "image/png" },
    });
  },
});
assert.equal(sawReplicatePrediction, true);
assert.equal(sawCutoutDownload, true);
assert.equal(cutout.mimeType, "image/png");
assert.equal(cutout.bytes.byteLength, 3);

const scenes = generated.variants.map((variant, index) => createMotionStoryAdScene({
  candidateIndex: index,
  count: generated.variants.length,
  cutoutUrl: "https://cdn.example/cutout.png",
  generationBatchId: "motion-story-batch",
  model: generated.model,
  product: generated.product,
  proofItems: generated.proofItems,
  provider: generated.provider,
  research,
  selectedProductHandles: ["birthday-cookie-tin"],
  variant,
  now: 123,
}));

assert.deepEqual(
  scenes.map((scene) => scene.layout.musicBed.id),
  ["polished-upbeat", "warm-premium", "playful-retail", "bold-retail"],
);
for (const scene of scenes) {
  assert.equal(scene.format, "motion-story");
  assert.equal(validateMotionStoryScene(scene).valid, true);
  assert.equal(scene.layout.durationMs, 20_000);
  assert.equal(scene.layout.beats[0].motion, "kinetic-reveal");
  assert.ok(scene.layout.product.cutoutUrl);
  assert.ok(scene.layout.shareCopy);
}

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: scenes[0]!,
  mode: "preview",
  timeSeconds: 0.5,
}));
assert.ok(html.includes('data-format="motion-story"'));
assert.ok(html.includes('data-motion-story-screen="true"'));
assert.ok(html.includes('data-motion-story-beat="hook"'));
assert.ok(html.includes('data-motion-story-proof-card="true"'));
assert.ok(html.includes("The gift that actually gets remembered"));
assert.ok(html.includes("https://cdn.example/cutout.png"));
assert.ok(html.includes("object-fit:contain"));

const adScenesSource = readFileSync("convex/adScenes.ts", "utf8");
const cutoutSource = readFileSync("features/formats/motion-story/cutout.ts", "utf8");
assert.equal(adScenesSource.includes("REMOVE_BG_API_KEY"), false);
assert.equal(cutoutSource.includes("api.remove.bg"), false);
const motionStoryBranch = adScenesSource.slice(adScenesSource.indexOf('if (format === "motion-story")'));
assert.ok(
  motionStoryBranch.indexOf("removeProductBackground({") <
    motionStoryBranch.indexOf("generateMotionStoryVariantsFromResearch(motionStoryResearch"),
  "Motion Story must create the product cutout before spending a NIM Story Director call.",
);

console.log("motion-story-format tests passed");
