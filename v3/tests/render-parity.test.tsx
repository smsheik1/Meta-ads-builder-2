import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PhonePreviewFrame } from "../app/create/CreatePreviewChrome";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import type { AdScene } from "../features/scene/types";

const repoRoot = process.cwd();

const parityScene: AdScene = {
  version: 1,
  format: "visualizer",
  brand: {
    name: "OGTool",
    url: "https://ogtool.com/",
    host: "ogtool.com",
    title: "OGTool",
    description: "Managed Reddit and ChatGPT visibility campaigns.",
    faviconUrl: "https://ogtool.com/favicon.ico",
    logoUrl: "https://ogtool.com/logo.png",
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#82DFFF", "#070B1D"],
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
    subheadline: "First ChatGPT mention in 14 days.",
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
    visualizer: {
      type: "waveform-strip",
      barCount: 24,
      sensitivity: 1,
      heightScale: 0.82,
      baseline: 4,
      gain: 1.7,
      compression: 4,
      floor: 0.08,
      ceiling: 0.92,
      curve: "sqrt",
      bandFocus: "voice",
      mirror: true,
      splitSpeakers: false,
    },
  },
  audio: {
    status: "generated",
    storageId: "audio_storage",
    url: "https://example.com/audio.wav",
    mimeType: "audio/wav",
    durationMs: 2000,
    durationSeconds: 2,
    transcript: "First ChatGPT mention in 14 days.",
    captions: [
      {
        text: "First ChatGPT mention in 14 days.",
        startMs: 0,
        endMs: 2000,
      },
    ],
    analysis: {
      fps: 2,
      levels: [0.2, 0.8, 0.4, 0.9],
      bands: [
        Array.from({ length: 24 }, () => 0.2),
        Array.from({ length: 24 }, () => 0.8),
        Array.from({ length: 24 }, () => 0.4),
        Array.from({ length: 24 }, () => 0.9),
      ],
    },
    provider: "gemini",
    model: "test-audio",
    generatedAt: 123,
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

function getSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return getSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

const appAndRenderSources = [
  ...getSourceFiles(join(repoRoot, "app")),
  ...getSourceFiles(join(repoRoot, "features")),
  ...getSourceFiles(join(repoRoot, "remotion-entry")),
].map((filePath) => ({
  filePath: filePath.replace(`${repoRoot}/`, ""),
  source: readFileSync(filePath, "utf8"),
}));

const adRenderSurfaceImporters = appAndRenderSources
  .filter(({ source }) => source.includes("AdRenderSurface"))
  .map(({ filePath }) => filePath)
  .sort();

assert.deepEqual(
  adRenderSurfaceImporters,
  [
    "app/create/CreatePreviewChrome.tsx",
    "features/render/AdRenderSurface.tsx",
    "remotion-entry/RemotionAdScene.tsx",
  ],
  "Only the shared preview chrome and Remotion entry may draw ad pixels through AdRenderSurface.",
);

const previewSource = readFileSync("app/create/CreatePreviewChrome.tsx", "utf8");
const shareSource = readFileSync("app/s/[slug]/ShareSceneClient.tsx", "utf8");
const remotionSource = readFileSync("remotion-entry/RemotionAdScene.tsx", "utf8");
const renderSurfaceSource = readFileSync("features/render/AdRenderSurface.tsx", "utf8");
const workerSource = readFileSync("scripts/render-worker.ts", "utf8");
const renderJobsSource = readFileSync("convex/renderJobs.ts", "utf8");

assert.equal(
  (previewSource.match(/<AdRenderSurface/g) || []).length,
  1,
  "/create and share preview chrome must have one shared AdRenderSurface call.",
);
assert.ok(
  shareSource.includes("PhonePreviewFrame") && !shareSource.includes("AdRenderSurface"),
  "Share pages must reuse PhonePreviewFrame instead of drawing their own ad pixels.",
);
assert.ok(
  remotionSource.includes("AdRenderSurface") && remotionSource.includes('mode="video"'),
  "MP4 renders must route through the same AdRenderSurface in video mode.",
);
assert.ok(
  renderSurfaceSource.includes("getFormatModule(scene.format)") &&
    renderSurfaceSource.includes("FormatRenderer"),
  "AdRenderSurface must delegate actual pixels to the format registry.",
);
assert.ok(
  workerSource.includes("getWorkerRendererVersion") &&
    renderJobsSource.includes('q.field("rendererVersion")'),
  "Render jobs must be version-locked so stale workers cannot render current preview jobs.",
);

const previewHtml = renderToStaticMarkup(createElement(PhonePreviewFrame, {
  scene: parityScene,
  result: null,
  platform: "instagram-feed",
  motionMode: "audio",
  timeSeconds: 0.5,
}));
const directPreviewHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: parityScene,
  mode: "preview",
  motionMode: "audio",
  timeSeconds: 0.5,
}));
const videoHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: parityScene,
  mode: "video",
  motionMode: "audio",
  timeSeconds: 0.5,
}));

for (const html of [previewHtml, directPreviewHtml, videoHtml]) {
  assert.ok(html.includes('data-render-surface="ad"'), "Every visual path must include the shared render surface marker.");
  assert.ok(html.includes('data-format="visualizer"'), "Every visual path must preserve the scene format.");
  assert.ok(html.includes("Your Competitor Shows Up First"), "Every visual path must render the same headline.");
  assert.ok(html.includes("First ChatGPT mention in 14 days."), "Every visual path must render the same caption/proof text.");
  assert.ok(html.includes("#82DFFF"), "Every visual path must render the same visualizer color.");
  assert.ok(html.includes("Made with Wiggly"), "Every visual path must render the same watermark.");
  assert.ok(html.includes('data-visualizer-motion="audio-analysis"'), "Every visual path must use the same audio visualizer branch while playing/rendering.");
}

console.log("render-parity tests passed");
