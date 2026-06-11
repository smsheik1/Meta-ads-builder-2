import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertShareableAdScene,
  createShareSlug,
  sanitizeCtaUrl,
  slugifyShareTitle,
} from "../features/share/shareScene";
import type { AdScene } from "../features/scene/types";

const scene: AdScene = {
  version: 1,
  format: "visualizer",
  brand: {
    name: "OGTool",
    url: "https://ogtool.com/",
    host: "ogtool.com",
    title: "OGTool",
    description: "AI visibility campaigns.",
    faviconUrl: "https://ogtool.com/favicon.ico",
    logoUrl: "https://ogtool.com/logo.svg",
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#07111F", "#82DFFF"],
    fonts: {
      heading: "Inter",
      body: "Inter",
      feel: "sans",
    },
    vibeTags: ["technical"],
    receipts: {
      specificClaims: ["First ChatGPT mention in 14 days."],
      buyerMoments: ["Your competitor shows up first."],
      exactSiteLanguage: ["ChatGPT mentions in 14 days"],
      namedProof: [],
    },
  },
  creative: {
    angleId: "angle-1",
    headline: "Your Competitor Shows Up in ChatGPT. You Don't.",
    subheadline: "First ChatGPT mention in 14 days from managed Reddit visibility campaigns.",
    ctaText: "See the proof",
    headlineType: "contrast",
    selectedPain: "Your competitor shows up first.",
    selectedProof: "First ChatGPT mention in 14 days.",
  },
  style: {
    backgroundColor: "#FBFAF5",
    textColor: "#070B1D",
    accentColor: "#82DFFF",
    visualizerColor: "#82DFFF",
    fontFeel: "sans",
  },
  audio: {
    status: "none",
    transcript: "",
    captions: [],
  },
  layout: {
    preset: "centered-hero",
  },
  metadata: {
    candidateIndex: 0,
    generationBatchId: "batch-1",
    researchRunId: "research-1",
    brandSnapshotId: "brand-1",
    model: "test-model",
    provider: "gemini",
    generatedAt: 123,
  },
};

assert.equal(
  slugifyShareTitle(scene.creative.headline),
  "your-competitor-shows-up-in-chatgpt-you-dont",
);
assert.equal(
  createShareSlug(scene, "AbC_123!!!"),
  "your-competitor-shows-up-in-chatgpt-you-dont-abc123",
);
assert.equal(slugifyShareTitle("   "), "wiggly-ad");

assert.equal(assertShareableAdScene(scene), scene);
assert.throws(
  () => assertShareableAdScene({
    ...scene,
    creative: {
      ...scene.creative,
      headline: "",
    },
  }),
  /headline is missing/,
);
assert.throws(
  () => assertShareableAdScene({
    ...scene,
    audio: {
      status: "generated",
      storageId: "",
      url: "https://example.com/audio.wav",
      mimeType: "audio/wav",
      durationMs: 5000,
      durationSeconds: 5,
      transcript: "Hello",
      captions: [{ text: "Hello", startMs: 0, endMs: 1000 }],
      provider: "gemini",
      model: "gemini-3.1-flash-tts-preview",
      generatedAt: 123,
    },
  }),
  /audio storage is missing/,
);

assert.equal(sanitizeCtaUrl(undefined, scene.brand.url), "https://ogtool.com/");
assert.equal(sanitizeCtaUrl("https://example.com/demo", scene.brand.url), "https://example.com/demo");
assert.equal(sanitizeCtaUrl("javascript:alert(1)", scene.brand.url), undefined);
assert.equal(sanitizeCtaUrl("not a url", undefined), undefined);

const sharePageSource = readFileSync("app/s/[slug]/page.tsx", "utf8");
const shareClientSource = readFileSync("app/s/[slug]/ShareSceneClient.tsx", "utf8");
assert.ok(
  sharePageSource.includes("ConvexHttpClient") &&
    sharePageSource.includes("api.sharePages.getBySlug"),
  "Share page must server-read the share scene before hydration.",
);
assert.ok(
  shareClientSource.includes("initialShare") &&
    shareClientSource.includes("liveShare === undefined ? initialShare : liveShare"),
  "Share client must render the server-loaded share scene instead of showing a spinner first.",
);
assert.ok(
  shareClientSource.includes('href="/create"') &&
    shareClientSource.includes("Made with Wiggly"),
  "Share pages must include the small Made with Wiggly link back to /create.",
);

console.log("share-scene tests passed");
