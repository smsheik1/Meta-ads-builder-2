import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getVisualizerBars } from "../features/audio/visualizer";
import { getFormatModule } from "../features/formats/registry";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import type { AdScene } from "../features/scene/types";

const scene: AdScene = {
  version: 1,
  format: "visualizer",
  brand: {
    name: "OGTool",
    url: "https://ogtool.com/",
    host: "ogtool.com",
    title: "OGTool",
    description: "Managed Reddit and ChatGPT visibility campaigns.",
    faviconUrl: "https://ogtool.com/favicon.ico",
    logoUrl: null,
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#82DFFF"],
    fonts: {
      feel: "sans",
    },
    vibeTags: ["growth"],
    receipts: {
      specificClaims: ["First ChatGPT mention in 14 days."],
      buyerMoments: ["Your competitor shows up in ChatGPT first."],
      exactSiteLanguage: ["ChatGPT mentions in 14 days"],
      namedProof: [],
    },
  },
  creative: {
    angleId: "chatgpt-mentions",
    headline: "Your Competitor Shows Up First",
    subheadline: "First ChatGPT mention in 14 days from managed Reddit and AI visibility campaigns.",
    ctaText: "See the proof",
    headlineType: "contrast",
    selectedPain: "Your competitor shows up in ChatGPT first.",
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
    generationBatchId: "batch_1",
    researchRunId: "research_1",
    brandSnapshotId: "brand_1",
    model: "test-model",
    provider: "deterministic",
    generatedAt: 123,
  },
};

const visualizer = getFormatModule("visualizer");
assert.equal(visualizer.id, "visualizer");
assert.equal(visualizer.validate(scene).valid, true);

const barsA = getVisualizerBars({
  type: "waveform-strip",
  count: 8,
  frame: 12,
  height: 100,
  color: "#82DFFF",
});
const barsB = getVisualizerBars({
  type: "waveform-strip",
  count: 8,
  frame: 12,
  height: 100,
  color: "#82DFFF",
});
assert.deepEqual(barsA, barsB);
assert.equal(barsA.length, 8);

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene,
  timeSeconds: 1,
}));
assert.ok(html.includes('data-render-surface="ad"'));
assert.ok(html.includes('data-format="visualizer"'));
assert.ok(html.includes("Your Competitor Shows Up First"));
assert.ok(html.includes("Add audio for this ad"));
assert.ok(html.includes("Made with Wiggly"));

assert.throws(
  () => getFormatModule("missing" as never),
  /Unknown ad format/,
);

assert.throws(
  () => renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: {
      ...scene,
      creative: {
        ...scene.creative,
        headline: "",
      },
    },
  })),
  /Scene headline is required/,
);

console.log("render-surface tests passed");
