import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  extractReviewBackgroundImages,
  extractReviewProofItemsFromHtml,
  extractWebsiteReviewProofItems,
  fetchWebsiteReviewProofItems,
  isActualReviewProof,
} from "../features/formats/reviews/evidence";
import {
  assertEnoughProofItems,
  extractReviewsVariantsFromResponse,
  generateReviewsVariantsFromResearch,
} from "../features/formats/reviews/generate";
import { validateReviewsScene } from "../features/formats/reviews/validate";
import { REVIEWS_VARIANT_COUNT, buildReviewsPrompt } from "../features/formats/reviews/prompt";
import {
  createReviewsAdScene,
  createReviewsAdScenes,
} from "../features/scene/createReviewsScene";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { makeResearch } from "./helpers/research";

const research = makeResearch({
  brand: {
    name: "David's Cookies",
    url: "https://davidscookies.com/",
    host: "davidscookies.com",
    title: "David's Cookies",
    description: "Gourmet cookies and desserts delivered as gifts.",
    faviconUrl: null,
    logoUrl: "https://cdn.example/davids-logo.png",
    ogImageUrl: "https://cdn.example/davids-og.jpg",
    screenshotUrl: null,
    colors: ["#EF1B1B", "#050B18"],
    fonts: { feel: "sans" },
    vibeTags: ["giftable"],
  },
  brandBrief: {
    brandName: "David's Cookies",
    offer: "Fresh baked cookies, cheesecakes, brownies, and specialty desserts delivered for gifts.",
    audience: "People looking for giftable gourmet desserts.",
    buyerMoments: ["Needing a thoughtful dessert gift to arrive on time."],
    proof: ["Rated 4.8 stars by dessert gift customers.", "Over 10,000 reviews from happy customers."],
    siteLanguage: ["fresh baked", "gift baskets", "dessert delivery"],
    ctaDirection: "Shop gifts",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  evidence: {
    headings: ["Customer reviews", "Fresh baked gifts"],
    paragraphs: [
      "\"The cookies arrived fresh and everyone asked where they came from.\"",
      "\"My mom loved the brownies and said they tasted homemade.\"",
      "\"The gift tin showed up right on time and looked beautiful.\"",
      "Over 10,000 reviews from happy customers.",
      "Rated 4.8 stars by dessert gift customers.",
      "Privacy Policy",
    ],
    receipts: {
      specificClaims: ["Fresh baked cookies delivered nationwide."],
      buyerMoments: ["Sending a birthday gift across the country."],
      exactSiteLanguage: ["fresh baked"],
      namedProof: ["\"The cookies arrived fresh and everyone asked where they came from.\""],
    },
    rawMarkdown: `
# Customer reviews
![red cookie tin](https://cdn.example/red-tin.jpg)
![logo](https://cdn.example/logo.png)
"The cheesecake was packed perfectly and tasted amazing."
`,
  },
  productCatalog: {
    provider: "shopify-products-json",
    sourceUrl: "https://davidscookies.com/products.json?limit=250",
    groups: { bestSellers: ["butter-pecan-meltaway-tin"] },
    summary: { productCount: 1, bestSellerCount: 1 },
    products: [{
      title: "Butter Pecan Meltaway Tin",
      handle: "butter-pecan-meltaway-tin",
      url: "https://davidscookies.com/products/butter-pecan-meltaway-tin",
      imageUrl: "https://cdn.example/red-tin.jpg",
      imageAlt: "Butter Pecan Meltaway Tin",
      productType: "Cookies",
      vendor: "David's Cookies",
      priceMin: 59.95,
      priceMax: 59.95,
      currency: "USD",
      available: true,
      badges: ["best-seller"],
    }],
  },
});

const reviewProofItems = extractWebsiteReviewProofItems(research);
assert.equal(reviewProofItems.length, 4);
assert.ok(reviewProofItems.every((item) => item.type === "review"));
assert.ok(!reviewProofItems.some((item) => /rated|reviews|stars/i.test(item.text)));
assert.ok(!reviewProofItems.some((item) => /privacy policy/i.test(item.text)));
assert.ok(!isActualReviewProof({ type: "review", text: "2,200+ reviews gave Butter Pecan Meltaways 4.7 stars", provider: "website" }));
assert.ok(!isActualReviewProof({ type: "review", text: "\"More of the Lightweight Cotton Bralette you love—for less\"", provider: "website" }));
assert.ok(!isActualReviewProof({ type: "review", text: "\"The most comfortable underwear you'll ever own.\"", provider: "website" }));
assert.ok(!isActualReviewProof({ type: "review", text: "\"Buttery soft Studio Stretch styles.\"", provider: "website" }));
assert.ok(isActualReviewProof({ type: "review", text: "\"They literally melt in your mouth. Best cookies ever.\"", provider: "website" }));

const backgroundImages = extractReviewBackgroundImages(research);
assert.ok(backgroundImages.includes("https://cdn.example/red-tin.jpg"));
assert.ok(!backgroundImages.includes("https://cdn.example/logo.png"));
assert.ok(backgroundImages.includes("https://cdn.example/davids-og.jpg"));

const prompt = buildReviewsPrompt(research, reviewProofItems);
assert.ok(prompt.includes("proofIndex"));
assert.ok(prompt.includes("\"variants\""));

assert.throws(
  () => assertEnoughProofItems([{ type: "review", text: "\"The cookies arrived fresh.\"", provider: "website" }]),
  /at least 2 actual review or testimonial lines/,
);

const weakResearch = makeResearch({
  brandBrief: {
    ...research.brandBrief,
    proof: ["Rated 4.8 stars by dessert gift customers.", "Over 10,000 reviews from happy customers."],
  },
  evidence: {
    ...research.evidence,
    paragraphs: ["Butter Pecan Meltaways: 4.7 out of 5 stars", "Fresh Baked Assorted Cookies Tin"],
    receipts: {
      ...research.evidence.receipts,
      namedProof: [],
      specificClaims: ["Fresh baked cookies delivered nationwide."],
    },
    rawMarkdown: "# Reviews\n2,200+ reviews gave Butter Pecan Meltaways 4.7 stars",
  },
});
assert.equal(extractWebsiteReviewProofItems(weakResearch).length, 0);
await assert.rejects(
  () => generateReviewsVariantsFromResearch(weakResearch, {
    nvidiaNimApiKey: "test-key",
    nvidiaNimModel: "test-kimi-model",
    reviewFetcher: async () => new Response("<html>No review bodies here</html>"),
  }),
  /at least 2 actual review or testimonial lines/,
);

const yotpoHtml = `
<script>
var preloadedReviews = JSON.parse("{\\"reviews\\":[{\\"score\\":5,\\"content\\":\\"Every cookie was awesome!!\\",\\"user\\":{\\"displayName\\":\\"Julia B.\\"}},{\\"score\\":5,\\"content\\":\\"My step-dad was surprised and said the cookies were excellent!\\",\\"user\\":{\\"displayName\\":\\"Tara M.\\"}},{\\"score\\":5,\\"content\\":\\"I would order these cookies again for every birthday gift.\\",\\"user\\":{\\"displayName\\":\\"Donna K.\\"}}]}");
</script>
<div id="yotpo-reviews-section-data">
  <article class="yotpo-review" data-reviewer="Charmane D." data-rating="5">
    <p class="yotpo-review-body">&quot;Cookies came fresh and quickly! Absolutely wonderful taste, texture and quality.&quot;</p>
  </article>
</div>`;
const yotpoItems = extractReviewProofItemsFromHtml(yotpoHtml);
assert.equal(yotpoItems.length, 4);
assert.ok(yotpoItems.some((item) => item.text.includes("Every cookie was awesome")));
assert.ok(yotpoItems.some((item) => item.sourceName === "Julia B."));

const jsonLdHtml = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      "name": "Cookie tin",
      "aggregateRating": { "ratingValue": "4.8", "reviewCount": "2200" },
      "review": [
        {
          "@type": "Review",
          "reviewBody": "I sent this as a gift and the cookies arrived fresh.",
          "author": { "name": "Mia R." },
          "reviewRating": { "ratingValue": "5" }
        }
      ]
    },
    {
      "@type": "Review",
      "description": "We ordered these for the office and everyone loved them.",
      "author": "Office Manager",
      "reviewRating": { "ratingValue": 5 }
    }
  ]
}
</script>`;
const jsonLdItems = extractReviewProofItemsFromHtml(jsonLdHtml);
assert.equal(jsonLdItems.length, 2);
assert.ok(jsonLdItems.some((item) => item.sourceName === "Mia R."));
assert.ok(!jsonLdItems.some((item) => /2200|4\.8/.test(item.text)));

const widgetHtml = `
<div class="jdgm-rev" data-score="5"><div class="jdgm-rev__body">I bought this for my team and they asked for more.</div><span class="jdgm-rev__author">Sam</span></div>
<div class="oke-w-review" data-rating="5"><div class="oke-w-review-content-body">Our clients loved the packaging and the cookies tasted fresh.</div><span class="oke-w-reviewer-name">Casey</span></div>
<div class="loox-review" data-rating="5"><div class="loox-review-content">I ordered last minute and it still arrived looking perfect.</div><span class="loox-review-author">Jordan</span></div>
<div class="stamped-review" data-rating="4"><div class="stamped-review-content-body">We sent these as thank-you gifts and people loved them.</div><span class="stamped-review-header-author">Taylor</span></div>`;
const widgetItems = extractReviewProofItemsFromHtml(widgetHtml);
assert.equal(widgetItems.length, 4);
assert.ok(widgetItems.every((item) => item.type === "review"));

const sitemapResearch = makeResearch({
  websiteUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  evidence: {
    ...weakResearch.evidence,
    rawMarkdown: "",
  },
});
const fetchCalls: string[] = [];
const sitemapResult = await fetchWebsiteReviewProofItems(sitemapResearch, async (input, init) => {
  const url = String(input);
  fetchCalls.push(url);
  if (url === "https://example.com/") {
    return new Response("<a href='/products/tin'>Tin</a>");
  }
  if (url === "https://example.com/products/tin") {
    return new Response("<html>No reviews here</html>");
  }
  if (url === "https://example.com/sitemap.xml") {
    assert.ok(init?.signal, "sitemap fetch should receive an abort signal");
    return new Response(`
      <urlset>
        <url><loc>https://example.com/pages/testimonials</loc></url>
        <url><loc>https://evil.com/pages/testimonials</loc></url>
        <url><loc>https://example.com/products/tin</loc></url>
      </urlset>
    `);
  }
  if (url === "https://example.com/pages/testimonials") {
    return new Response(jsonLdHtml);
  }
  return new Response("");
});
assert.equal(sitemapResult.length, 2);
assert.equal(fetchCalls.filter((url) => url === "https://example.com/products/tin").length, 1);
assert.ok(!fetchCalls.includes("https://evil.com/pages/testimonials"));

const productCatalogResearch = makeResearch({
  websiteUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  productCatalog: {
    provider: "shopify-products-json",
    sourceUrl: "https://example.com/products.json?limit=250",
    groups: { bestSellers: ["selected-tin"] },
    summary: { productCount: 2, bestSellerCount: 1 },
    products: [
      {
        title: "Selected Tin",
        handle: "selected-tin",
        url: "https://example.com/products/selected-tin",
        imageUrl: null,
        imageAlt: null,
        productType: null,
        vendor: null,
        priceMin: null,
        priceMax: null,
        currency: null,
        available: true,
        badges: ["best-seller"],
      },
      {
        title: "Other Tin",
        handle: "other-tin",
        url: "https://example.com/products/other-tin",
        imageUrl: null,
        imageAlt: null,
        productType: null,
        vendor: null,
        priceMin: null,
        priceMax: null,
        currency: null,
        available: true,
        badges: [],
      },
    ],
  },
  evidence: {
    ...weakResearch.evidence,
    rawMarkdown: "",
  },
});
const productFetchCalls: string[] = [];
const selectedProductProof = await fetchWebsiteReviewProofItems(productCatalogResearch, async (input) => {
  const url = String(input);
  productFetchCalls.push(url);
  if (url === "https://example.com/products/selected-tin") return new Response(jsonLdHtml);
  return new Response("<html>No reviews here</html>");
}, { preferredProductHandles: ["selected-tin"] });
assert.equal(selectedProductProof.length, 2);
assert.equal(productFetchCalls[1], "https://example.com/products/selected-tin");
assert.ok(!productFetchCalls.includes("https://example.com/products/other-tin"));

const productLinkHtml = '<a href="/products/fresh-baked-assorted-cookies-tin">Cookie tin</a>';
const enrichmentResult = await generateReviewsVariantsFromResearch(weakResearch, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  reviewFetcher: async (input) => new Response(String(input).includes("/products/") ? yotpoHtml : productLinkHtml),
  nvidiaNimChatCompletion: async ({ prompt: callPrompt }) => {
    assert.ok(callPrompt.includes("Every cookie was awesome"));
    return JSON.stringify({
      variants: Array.from({ length: REVIEWS_VARIANT_COUNT }, (_, index) => ({
        proofIndex: index,
        proofText: yotpoItems[index]!.text,
        headline: `Real cookie love ${index + 1}`,
        ctaText: "Shop gifts",
        selfCheckPassed: "proofText is copied exactly from the selected proof item.",
      })),
    });
  },
});
assert.equal(enrichmentResult.proofItems.length, 4);
assert.ok(enrichmentResult.proofItems.every((item) => item.type === "review"));

const variants = Array.from({ length: REVIEWS_VARIANT_COUNT }, (_, index) => ({
  proofIndex: index,
  proofText: reviewProofItems[index]!.text.slice(0, 90),
  headline: index === 0 ? "Proof people can taste" : `Proof that travels ${index}`,
  ctaText: "Shop gifts",
  selfCheckPassed: "proofText is copied exactly from the selected proof item.",
}));

const parsed = extractReviewsVariantsFromResponse(JSON.stringify({ variants }), reviewProofItems);
assert.deepEqual(parsed, variants);

const namedReviewProofItems = reviewProofItems.map((item, index) => (
  index === 0
    ? { ...item, sourceName: "Julia B.", sourceUrl: "https://davidscookies.com/products/butter-pecan-meltaway-tin" }
    : item
));
const invalidCases = [
  {
    name: "rewritten proof",
    payload: { variants: [{ ...variants[0], proofText: "Customers say these cookies are the best ever." }] },
  },
  {
    name: "bad proof index",
    payload: { variants: [{ ...variants[0], proofIndex: 999 }] },
  },
  {
    name: "hype headline",
    payload: { variants: [{ ...variants[0], headline: "Unlock dessert magic" }] },
  },
  {
    name: "fake rating field",
    payload: { variants: [{ ...variants[0], rating: 5 }] },
  },
  {
    name: "fake source field",
    payload: { variants: [{ ...variants[0], sourceName: "Happy customer" }] },
  },
];

for (const invalid of invalidCases) {
  assert.throws(
    () => extractReviewsVariantsFromResponse(JSON.stringify(invalid.payload), reviewProofItems, 1),
    /incomplete reviews proof variants/,
    invalid.name,
  );
}

const retryResult = await generateReviewsVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ prompt: callPrompt }) => {
    if (callPrompt.includes("previous output was invalid")) return JSON.stringify({ variants });
    return JSON.stringify({ variants: [] });
  },
});
assert.equal(retryResult.variants.length, REVIEWS_VARIANT_COUNT);
assert.equal(retryResult.proofItems.length, reviewProofItems.length);

await assert.rejects(
  () => generateReviewsVariantsFromResearch(research, {
    nvidiaNimApiKey: "",
    nvidiaNimModel: "test-kimi-model",
  }),
  /NVIDIA NIM reviews generation is not configured/,
);

const scene = createReviewsAdScene({
  proofItems: namedReviewProofItems,
  research,
  variant: parsed[0]!,
  candidateIndex: 0,
  generationBatchId: "reviews-batch",
  model: "test-model",
  provider: "nvidia-nim",
  selectedProductHandles: ["butter-pecan-meltaway-tin"],
  now: 123,
});

assert.equal(scene.format, "reviews");
assert.equal(scene.layout.preset, "reviews-proof-card");
assert.equal(scene.layout.template, "proof-card");
assert.equal(scene.layout.proofIndex, parsed[0]!.proofIndex);
assert.equal(scene.layout.proofTotal, namedReviewProofItems.length);
assert.equal(scene.layout.proofText, parsed[0]!.proofText);
assert.equal(scene.layout.productAnchor?.title, "Butter Pecan Meltaway Tin");
assert.equal(scene.layout.productAnchor?.isBestSeller, true);
assert.ok(scene.layout.backgroundImages.includes("https://cdn.example/red-tin.jpg"));

const html = renderToStaticMarkup(createElement(AdRenderSurface, { scene }));
assert.ok(html.includes('data-format="reviews"'));
assert.ok(html.includes('data-reviews-card="true"'));
assert.ok(html.includes('data-reviews-proof-text="true"'));
assert.ok(html.includes('data-reviews-image-rail="true"'));
assert.ok(html.includes(parsed[0]!.proofText.replaceAll("\"", "")));
assert.ok(html.includes("Butter Pecan Meltaway Tin"));
assert.ok(html.includes("Best seller review"));
assert.ok(html.includes("Julia B."));
assert.ok(html.includes("1 of 4 reviews"));
assert.ok(html.includes('data-reviews-product-context="true"'));
assert.ok(html.includes('data-reviews-context="true"'));
assert.ok(html.includes('data-reviews-attribution="true"'));
assert.ok(!html.includes("Customer proof"));
assert.ok(!html.includes("Verbatim from website"));
assert.ok(!html.includes("Sponsored proof"));
assert.ok(!html.includes('data-reviews-cta="true"'));

const manualReviewScenes = createReviewsAdScenes({
  proofItems: namedReviewProofItems,
  research,
  variants: parsed,
  requestedSceneCount: 8,
  generationBatchId: "reviews-batch",
  model: "test-model",
  provider: "nvidia-nim",
  selectedProductHandles: ["butter-pecan-meltaway-tin"],
  now: 123,
});
assert.equal(manualReviewScenes.length, 8);
assert.deepEqual(manualReviewScenes.slice(0, 4).map((item) => item.layout.template), ["proof-card", "proof-card", "proof-card", "proof-card"]);
assert.deepEqual(manualReviewScenes.slice(4).map((item) => item.layout.template), ["minimal-quote", "minimal-quote", "minimal-quote", "minimal-quote"]);
assert.equal(manualReviewScenes[0]!.layout.proofText, manualReviewScenes[4]!.layout.proofText);

const packReviewScenes = createReviewsAdScenes({
  proofItems: namedReviewProofItems,
  research,
  variants: parsed.slice(0, 2),
  requestedSceneCount: 4,
  generationBatchId: "reviews-pack-batch",
  model: "test-model",
  provider: "nvidia-nim",
  now: 123,
});
assert.equal(packReviewScenes.length, 4);
assert.deepEqual(packReviewScenes.map((item) => item.layout.template), ["proof-card", "proof-card", "minimal-quote", "minimal-quote"]);

const minimalQuoteHtml = renderToStaticMarkup(createElement(AdRenderSurface, { scene: manualReviewScenes[4]! }));
assert.ok(minimalQuoteHtml.includes('data-format="reviews"'));
assert.ok(minimalQuoteHtml.includes('data-reviews-template="minimal-quote"'));
assert.ok(minimalQuoteHtml.includes('data-reviews-minimal-quote-mark="true"'));
assert.ok(minimalQuoteHtml.includes('data-reviews-minimal-quote-text="true"'));
assert.ok(minimalQuoteHtml.includes('data-reviews-minimal-brand-lockup="true"'));
assert.ok(minimalQuoteHtml.includes("Julia B."));
assert.ok(minimalQuoteHtml.includes("David&#x27;s Cookies"));
assert.ok(!minimalQuoteHtml.includes('data-reviews-image-rail="true"'));
assert.ok(!minimalQuoteHtml.includes("Best seller review"));

const legacyScene = {
  ...scene,
  layout: {
    ...scene.layout,
    template: undefined,
    proofIndex: 3,
    proofTotal: undefined,
  },
} as unknown as typeof scene;
const legacyHtml = renderToStaticMarkup(createElement(AdRenderSurface, { scene: legacyScene }));
assert.ok(legacyHtml.includes("4 of 4 reviews"));
assert.ok(!legacyHtml.includes("4 of 1 reviews"));
assert.ok(validateReviewsScene(legacyScene).valid);

const invalidTemplateScene = {
  ...scene,
  layout: {
    ...scene.layout,
    template: "poster-quote",
  },
} as unknown as typeof scene;
assert.equal(validateReviewsScene(invalidTemplateScene).valid, false);

const legacyProofTypeScene = {
  ...scene,
  layout: {
    ...scene.layout,
    proof: {
      ...scene.layout.proof,
      type: "review_count",
    },
  },
} as unknown as typeof scene;
assert.ok(validateReviewsScene(legacyProofTypeScene).valid);

console.log("reviews-format tests passed");
