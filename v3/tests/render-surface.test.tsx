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
const flashHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene,
  rerollFlash: {
    key: "test-flash",
    roles: ["headline", "visualizer", "captions"],
  },
  timeSeconds: 1,
}));
const noAudioHtmlAtLaterFrame = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene,
  timeSeconds: 7,
}));
assert.equal(
  html,
  noAudioHtmlAtLaterFrame,
  "No-audio visualizer must be CSS-idle, not recalculated by preview time.",
);
assert.ok(html.includes('data-render-surface="ad"'));
assert.ok(html.includes('data-format="visualizer"'));
assert.ok(html.includes("Your Competitor Shows Up First"));
assert.ok(html.includes("Add audio for this ad"));
assert.ok(html.includes("Made with Wiggly"));
assert.ok(html.includes('data-visualizer-kind="legacy-create-waveform-strip"'), "Visualizer must use the legacy /create waveform renderer.");
assert.ok(html.includes('data-visualizer-motion="css-idle"'), "No-audio visualizer must use the legacy CSS idle motion.");
assert.ok(html.includes("top:56.666666666666664%"), "Visualizer must stay in the legacy /create y=255 canvas slot.");
assert.ok(html.includes("height:20%"), "Visualizer must stay in the legacy /create 90px canvas slot.");
assert.ok(html.includes("gap:0.56cqw"), "Visualizer must keep the legacy /create 2px waveform gap scaled by canvas width.");
assert.ok(html.includes("animation-delay:28ms"), "Legacy waveform idle bars must keep the old 28ms stagger.");
assert.ok(html.includes("height:36.04347826086957%"), "Legacy waveform idle bars must keep the old center-weighted height recipe.");
assert.ok(html.includes("min-width:0.83cqw"), "Legacy waveform idle bars must keep the old 3px minimum width scaled by canvas width.");
assert.equal(
  (html.match(/data-visualizer-bar="true"/g) || []).length,
  24,
  "Legacy /create waveform uses 24 bars by default.",
);
assert.ok(html.includes("wiggly-idle-bar-strong"), "No-audio visualizer must use the legacy idle animation.");
assert.ok(flashHtml.includes("wiggly-reroll-shine-headline"), "Reroll flash must shine the headline slot.");
assert.ok(flashHtml.includes("wiggly-reroll-shine-visualizer"), "Reroll flash must shine the visualizer slot.");
assert.ok(flashHtml.includes("wiggly-reroll-shine-captions"), "Reroll flash must shine the caption/audio slot.");

const generatedAudioScene: AdScene = {
  ...scene,
  audio: {
    status: "generated",
    storageId: "audio_storage",
    url: "https://example.com/audio.wav",
    mimeType: "audio/wav",
    durationMs: 2000,
    durationSeconds: 2,
    transcript: "I just checked the dashboard.",
    captions: [
      {
        text: "I just checked the dashboard.",
        startMs: 0,
        endMs: 2000,
      },
    ],
    analysis: {
      fps: 1,
      levels: [0, 1],
      bands: [
        Array.from({ length: 24 }, () => 0),
        Array.from({ length: 24 }, () => 1),
      ],
    },
    provider: "gemini",
    model: "test-tts",
    generatedAt: 123,
  },
};
const generatedAtStart = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: generatedAudioScene,
  timeSeconds: 0,
}));
const generatedAtMiddle = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: generatedAudioScene,
  timeSeconds: 0.5,
}));
const generatedAtEnd = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: generatedAudioScene,
  timeSeconds: 1,
}));
assert.notEqual(generatedAtMiddle, generatedAtStart, "Audio visualizer should interpolate beyond the previous analysis frame.");
assert.notEqual(generatedAtMiddle, generatedAtEnd, "Audio visualizer should interpolate before the next analysis frame.");
assert.ok(generatedAtMiddle.includes('data-visualizer-motion="audio-analysis"'));
assert.ok(!generatedAtMiddle.includes("wiggly-idle-bar-strong"), "Generated audio should not use the idle CSS animation.");

const generatedIdleAtStart = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: generatedAudioScene,
  motionMode: "idle",
  timeSeconds: 0,
}));
const generatedIdleAtLaterFrame = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: generatedAudioScene,
  motionMode: "idle",
  timeSeconds: 1,
}));
assert.equal(
  generatedIdleAtStart,
  generatedIdleAtLaterFrame,
  "Paused generated-audio preview must use CSS-idle bars instead of a frozen audio-analysis frame.",
);
assert.ok(generatedIdleAtStart.includes('data-visualizer-motion="css-idle"'));
assert.ok(generatedIdleAtStart.includes("wiggly-idle-bar-strong"), "Paused generated-audio preview must keep the old moving placeholder animation.");
assert.ok(!generatedIdleAtStart.includes('data-visualizer-motion="audio-analysis"'), "Idle preview must not render the frozen audio-analysis branch.");

const bottomBarsHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: {
    ...scene,
    style: {
      ...scene.style,
      visualizer: {
        type: "bars-bottom",
        barCount: 18,
        sensitivity: 1.25,
        heightScale: 0.78,
        baseline: 4,
        gain: 1.35,
        compression: 3.8,
        floor: 0.06,
        ceiling: 0.86,
        curve: "sqrt",
        bandFocus: "voice",
        mirror: false,
        splitSpeakers: false,
      },
    },
  },
  timeSeconds: 1,
}));
assert.ok(bottomBarsHtml.includes('data-visualizer-kind="legacy-create-bars-bottom"'), "Bottom bar variants must use the old /create idle branch.");
assert.ok(bottomBarsHtml.includes("align-items:flex-end"), "bars-bottom variants must render as bottom-aligned bars.");
assert.ok(bottomBarsHtml.includes("animation-delay:45ms"), "Bottom/center idle bars must keep the old 45ms stagger.");
assert.ok(bottomBarsHtml.includes("min-width:1.11cqw"), "Bottom/center idle bars must keep the old 4px minimum width scaled by canvas width.");
assert.ok(!bottomBarsHtml.includes("wiggly-idle-bar-strong"), "Only waveform-strip uses the old strong idle animation branch.");
assert.equal(
  (bottomBarsHtml.match(/data-visualizer-bar="true"/g) || []).length,
  18,
  "Renderer must honor the scene visualizer bar count.",
);

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
