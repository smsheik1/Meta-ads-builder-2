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
const generatedAudio = {
  status: "generated" as const,
  storageId: "brainrot-audio",
  url: "https://example.com/brainrot.wav",
  mimeType: "audio/wav",
  durationMs: 9000,
  durationSeconds: 9,
  transcript: "Wait, your CAC is still climbing?",
  captions: [{ text: "Wait, your CAC is still climbing?", startMs: 0, endMs: 1200 }],
  provider: "fish-studio" as const,
  model: "s2-pro",
  generatedAt: 123,
};
const brainrotScene: AdScene = {
  ...scene,
  format: "brainrot",
  audio: generatedAudio,
  layout: {
    preset: "brainrot-dialogue",
    backgroundVideoSrc: "/brainrot/block-parkour.mp4",
    characters: {
      leftSpriteSrc: "/brainrot/peter.png",
      rightSpriteSrc: "/brainrot/stewie.png",
    },
    beats: [
      { speaker: "left", text: "Wait, your CAC is still climbing?", startMs: 0, durationMs: 1200 },
      { speaker: "right", text: "Yeah, because every channel is cooked.", startMs: 1400, durationMs: 1400 },
    ],
    beatGapMs: 200,
    ctaText: "Learn more",
    angle: "paid channels are getting expensive",
    selfCheckPassed: "Beat one hooks the pain and the reveal is traceable.",
  },
};
assert.equal(assertShareableAdScene(brainrotScene), brainrotScene);
assert.throws(
  () => assertShareableAdScene({
    ...brainrotScene,
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
  }),
  /Generate audio before sharing this brainrot video/,
);

const motionStoryScene: AdScene = {
  ...scene,
  format: "motion-story",
  creative: {
    ...scene.creative,
    headline: "The gift that actually gets remembered",
    subheadline: "my mom for her birthday and she loved every fresh bite",
    ctaText: "Send the box they talk about",
    selectedProof: "my mom for her birthday and she loved every fresh bite",
  },
  style: {
    backgroundColor: "#070B1D",
    textColor: "#FFFFFF",
    accentColor: "#D6001C",
    fontFeel: "sans",
  },
  layout: {
    preset: "motion-story-product",
    durationMs: 20_000,
    product: {
      title: "Birthday Cookie Tin",
      handle: "birthday-cookie-tin",
      imageUrl: "https://example.com/product.jpg",
      cutoutUrl: "https://example.com/product-cutout.png",
      isBestSeller: true,
    },
    proof: {
      originalText: "I sent this cookie tin to my mom for her birthday and she loved every fresh bite.",
      displayText: "my mom for her birthday and she loved every fresh bite",
      proofIndex: 0,
      strengthReason: "Specific gift moment plus emotional reaction.",
    },
    beats: [
      { role: "hook", motion: "kinetic-reveal", headline: "The gift that actually gets remembered", startMs: 0, endMs: 3000 },
      { role: "product", motion: "image-expand", headline: "Birthday Cookie Tin", startMs: 3000, endMs: 8000 },
      { role: "proof", motion: "proof-card", headline: "Real birthday proof", startMs: 8000, endMs: 16000 },
      { role: "cta", motion: "cta-slam", headline: "Send the box they talk about", startMs: 16000, endMs: 20000 },
    ],
    brandLockup: {
      fallbackText: "David's Cookies",
    },
    musicBed: {
      id: "polished-upbeat",
      src: "/motion-story/music/polished-upbeat.mp3",
      volume: 0.18,
      loop: true,
    },
    shareCopy: "A better birthday gift, backed by real reviews.",
  },
};
assert.equal(assertShareableAdScene(motionStoryScene), motionStoryScene);
assert.throws(
  () => assertShareableAdScene({
    ...motionStoryScene,
    layout: {
      ...motionStoryScene.layout,
      musicBed: {
        ...motionStoryScene.layout.musicBed,
        src: "",
      },
    },
  }),
  /Motion Story music is missing/,
);
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
