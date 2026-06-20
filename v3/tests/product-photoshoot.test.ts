import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PRODUCT_PHOTOSHOOT_ASPECT_RATIO,
  PRODUCT_PHOTOSHOOT_IMAGE_MODEL,
  PRODUCT_PHOTOSHOOT_SHOT_COUNT,
  createProductPhotoshootPromptPlan,
  findPhotoshootProduct,
  findLatestUsableProductPhotoshoot,
  getProductPhotoshootPartialStopMessage,
  hasUsableProductPhotoshootBoard,
  type ProductPhotoshootBoard,
} from "../features/product-photoshoot/photoshoot";
import type { StoredWebsiteResearchResult } from "../features/research/types";

const research = {
  researchRunId: "research-1",
  sessionId: "session-1",
  brandSnapshotId: "brand-1",
  websiteUrl: "https://davidscookies.com",
  finalUrl: "https://davidscookies.com",
  host: "davidscookies.com",
  brand: {
    name: "David's Cookies",
    url: "https://davidscookies.com",
    host: "davidscookies.com",
    title: "David's Cookies",
    description: "Cookies and desserts",
    faviconUrl: null,
    logoUrl: null,
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#E30613", "#0B1220"],
    fonts: { heading: "Inter", body: "Inter", feel: "sans" },
    vibeTags: [],
  },
  brandBrief: {
    brandName: "David's Cookies",
    offer: "Fresh baked cookies and gift tins.",
    audience: "Gift buyers.",
    buyerMoments: ["needs a gift that arrives fresh"],
    proof: ["real cookie reviews"],
    siteLanguage: ["fresh baked"],
    ctaDirection: "Shop fresh baked gifts.",
    visualNotes: ["product hero"],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  adAngles: [],
  productCatalog: {
    provider: "shopify-products-json",
    sourceUrl: "https://davidscookies.com/products.json",
    groups: { bestSellers: ["butter-pecan-tin"] },
    summary: { productCount: 1, bestSellerCount: 1 },
    products: [{
      title: "Butter Pecan Meltaways Tin",
      handle: "butter-pecan-tin",
      url: "https://davidscookies.com/products/butter-pecan-tin",
      imageUrl: "https://cdn.example.com/tin.jpg",
      imageAlt: "Butter Pecan Meltaways Tin",
      productType: "Cookies",
      vendor: "David's Cookies",
      priceMin: 59.95,
      priceMax: 59.95,
      currency: "USD",
      available: true,
      badges: ["best-seller"],
    }],
  },
  evidence: {
    headings: [],
    paragraphs: [],
    receipts: {
      specificClaims: [],
      buyerMoments: [],
      exactSiteLanguage: [],
      namedProof: [],
    },
    rawMarkdown: "",
  },
  metadata: {},
  branding: {},
  providerStatus: [],
} satisfies StoredWebsiteResearchResult;

const product = findPhotoshootProduct(research, "butter-pecan-tin");
assert.ok(product);
assert.equal(PRODUCT_PHOTOSHOOT_IMAGE_MODEL, "google/nano-banana-2");
assert.equal(PRODUCT_PHOTOSHOOT_ASPECT_RATIO, "4:5");

const shots = createProductPhotoshootPromptPlan(research, product);
assert.equal(shots.length, PRODUCT_PHOTOSHOOT_SHOT_COUNT);
assert.equal(new Set(shots.map((shot) => shot.family)).size, PRODUCT_PHOTOSHOOT_SHOT_COUNT);
for (const shot of shots) {
  assert.match(shot.prompt, /Keep the product identical to the reference image, unchanged/);
  assert.match(shot.prompt, /Do not alter the product package, logo, label/);
  assert.match(shot.prompt, /no captions, no watermarks/i);
}

const quickActionsSource = readFileSync("app/create/CreateQuickActions.tsx", "utf8");
const sheetSource = readFileSync("app/create/CreateProductPhotoshootSheet.tsx", "utf8");
const clientSource = readFileSync("app/create/CreateResearchClient.tsx", "utf8");
const convexSource = readFileSync("convex/productPhotoshoots.ts", "utf8");
assert.ok(quickActionsSource.includes("CreateProductPhotoshootSheet"));
assert.ok(sheetSource.includes("data-product-photoshoot-trigger"));
assert.ok(sheetSource.includes("data-product-photoshoot-regenerate-failed"));
assert.ok(sheetSource.includes("data-product-shot-regenerate"));
assert.ok(sheetSource.includes("data-product-shot-prompt"));
assert.ok(sheetSource.includes("shots ready"));
assert.ok(sheetSource.includes("needs retry"));
assert.ok(sheetSource.includes("Regenerate all shots"));
assert.ok(sheetSource.includes("bg-slate-100 text-slate-500"));
assert.ok(clientSource.includes("api.productPhotoshoots.generateForResearch"));
assert.ok(clientSource.includes("api.productPhotoshoots.regenerateShot"));
assert.ok(clientSource.includes("onRegenerateFailedProductPhotoShots"));
assert.ok(clientSource.includes(".filter((shot) => shot.status === \"failed\")"));
assert.ok(convexSource.includes("isReplicateHardStopError"));
assert.ok(convexSource.includes("if (isReplicateHardStopError(error)) throw error"));
assert.ok(convexSource.indexOf("internal.productPhotoshoots.saveGenerated") < convexSource.indexOf("for (const shot of shots)"));
assert.ok(convexSource.indexOf("internal.productPhotoshoots.patchBoard") > convexSource.indexOf("for (const shot of shots)"));

const failedBoard: ProductPhotoshootBoard = {
  researchRunId: "research-1",
  brandName: "David's Cookies",
  imageModel: PRODUCT_PHOTOSHOOT_IMAGE_MODEL,
  aspectRatio: PRODUCT_PHOTOSHOOT_ASPECT_RATIO,
  product,
  shots: shots.map((shot) => ({ ...shot, status: "failed" as const, error: "credit" })),
  createdAt: 1,
};
const usableBoard: ProductPhotoshootBoard = {
  researchRunId: "research-1",
  brandName: "David's Cookies",
  imageModel: PRODUCT_PHOTOSHOOT_IMAGE_MODEL,
  aspectRatio: PRODUCT_PHOTOSHOOT_ASPECT_RATIO,
  product,
  shots: [{ ...shots[0], status: "ok", image: { storageId: "shot-1", url: "https://cdn.example.com/shot.jpg", mimeType: "image/jpeg" } }],
  createdAt: 1,
};

assert.equal(hasUsableProductPhotoshootBoard(failedBoard), false);
assert.equal(hasUsableProductPhotoshootBoard(usableBoard), true);
assert.equal(findLatestUsableProductPhotoshoot([
  { id: "newer-failed", board: failedBoard },
  { id: "older-usable", board: usableBoard },
])?.id, "older-usable");
assert.equal(findLatestUsableProductPhotoshoot([{ id: "failed", board: failedBoard }]), null);
assert.equal(
  getProductPhotoshootPartialStopMessage("Product photoshoot images hit the Replicate quota or rate limit."),
  "Product photoshoot images hit the Replicate quota or rate limit. Shots that finished before the stop were saved below.",
);
assert.equal(
  getProductPhotoshootPartialStopMessage("Product photoshoot images hit the Replicate quota or rate limit. Shots that finished before the stop were saved below."),
  "Product photoshoot images hit the Replicate quota or rate limit. Shots that finished before the stop were saved below.",
);
assert.equal(getProductPhotoshootPartialStopMessage("Product photoshoot generation failed."), "Product photoshoot generation failed.");

console.log("product-photoshoot tests passed");
