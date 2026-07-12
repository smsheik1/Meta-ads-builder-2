import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PhonePreviewFrame } from "../app/create/CreatePreviewChrome";
import { brainrotCtaDurationMs } from "../features/formats/brainrot/render";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import type { AdScene } from "../features/scene/types";
import { adSceneFps, getAdSceneDurationInFrames } from "../remotion-entry/Root";

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

const textMessageParityScene: AdScene = {
  ...parityScene,
  format: "text-message",
  creative: {
    ...parityScene.creative,
    headline: "did your office answer calls at lunch?",
    subheadline: "ours added OGTool",
  },
  style: {
    backgroundColor: "#FFFFFF",
    textColor: "#111827",
    accentColor: "#82DFFF",
    fontFeel: "sans",
  },
  audio: {
    status: "none",
    transcript: "",
    captions: [],
  },
  layout: {
    preset: "text-message-screenshot",
    contactName: "Jordan",
    timestampLabel: "Today 9:41 AM",
    messages: [
      { side: "left", text: "did your ads get weird again?" },
      { side: "right", text: "yep. spend up, leads flat" },
      { side: "left", text: "ours switched to OGTool" },
      { side: "right", text: "send me that" },
    ],
  },
};

const brainrotParityScene: AdScene = {
  ...parityScene,
  format: "brainrot",
  creative: {
    ...parityScene.creative,
    headline: "ad spend up again",
    subheadline: "brainrot banter",
  },
  style: {
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    accentColor: "#82DFFF",
    fontFeel: "sans",
  },
  audio: {
    status: "generated",
    storageId: "brainrot_audio",
    url: "https://example.com/brainrot.wav",
    mimeType: "audio/wav",
    durationMs: 7200,
    durationSeconds: 7.2,
    transcript: "ad spend up again\nand leads still flat",
    captions: [
      { text: "ad spend up again", startMs: 0, endMs: 1000 },
      { text: "and leads still flat", startMs: 1200, endMs: 2400 },
      { text: "that is the whole spreadsheet crying", startMs: 2600, endMs: 3600 },
      { text: "the buyer moment is brutal", startMs: 3800, endMs: 4800 },
      { text: "OGTool makes the trail visible", startMs: 5000, endMs: 6000 },
      { text: "finally, receipts instead of vibes", startMs: 6200, endMs: 7200 },
    ],
    provider: "fish-studio",
    model: "fish-audio/s2-pro",
    generatedAt: 123,
  },
  layout: {
    preset: "brainrot-dialogue",
    backgroundVideoSrc: "/brainrot/block-parkour.mp4",
    characters: {
      leftSpriteSrc: "/brainrot/peter.png",
      rightSpriteSrc: "/brainrot/stewie.png",
    },
    beats: [
      { speaker: "left", text: "ad spend up again", startMs: 0, durationMs: 1000 },
      { speaker: "right", text: "and leads still flat", startMs: 1200, durationMs: 1200 },
      { speaker: "left", text: "that is the whole spreadsheet crying", startMs: 2600, durationMs: 1000 },
      { speaker: "right", text: "the buyer moment is brutal", startMs: 3800, durationMs: 1000 },
      { speaker: "left", text: "OGTool makes the trail visible", startMs: 5000, durationMs: 1000 },
      { speaker: "right", text: "finally, receipts instead of vibes", startMs: 6200, durationMs: 1000 },
    ],
    beatGapMs: 200,
    angle: "ad spend pain",
    selfCheckPassed: "Both speakers roast the same buyer pain.",
  },
};

const reviewsParityScene: AdScene = {
  ...parityScene,
  format: "reviews",
  creative: {
    ...parityScene.creative,
    headline: "Proof people can taste",
    subheadline: "The cookies arrived fresh and everyone asked where they came from.",
    ctaText: "Shop gifts",
    selectedProof: "The cookies arrived fresh and everyone asked where they came from.",
  },
  style: {
    backgroundColor: "#F8FAFC",
    textColor: "#0F172A",
    accentColor: "#EF1B1B",
    fontFeel: "sans",
  },
  audio: {
    status: "none",
    transcript: "",
    captions: [],
  },
  layout: {
    preset: "reviews-proof-card",
    proof: {
      type: "review",
      text: "The cookies arrived fresh and everyone asked where they came from.",
      rating: 5,
      sourceName: "Mia R.",
      provider: "website",
    },
    proofIndex: 0,
    proofTotal: 4,
    proofText: "The cookies arrived fresh and everyone asked where they came from.",
    headline: "Proof people can taste",
    ctaText: "Shop gifts",
    productAnchor: {
      title: "Butter Pecan Meltaway Tin",
      handle: "butter-pecan-meltaway-tin",
      url: "https://example.com/products/butter-pecan-meltaway-tin",
      imageUrl: "https://example.com/cookie-tin.jpg",
      imageAlt: "Butter Pecan Meltaway Tin",
      isBestSeller: true,
    },
    backgroundImages: ["https://example.com/cookie-tin.jpg"],
  },
};

const motionStoryParityScene: AdScene = {
  ...parityScene,
  format: "motion-story",
  creative: {
    ...parityScene.creative,
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
  audio: {
    status: "none",
    transcript: "",
    captions: [],
  },
  layout: {
    preset: "motion-story-product",
    durationMs: 20_000,
    product: {
      title: "Birthday Cookie Tin",
      handle: "birthday-cookie-tin",
      imageUrl: "https://example.com/product.jpg",
      cutoutUrl: "https://example.com/product-cutout.png",
      url: "https://example.com/products/birthday-cookie-tin",
      isBestSeller: true,
    },
    proof: {
      originalText: "I sent this cookie tin to my mom for her birthday and she loved every fresh bite.",
      displayText: "my mom for her birthday and she loved every fresh bite",
      sourceName: "Sarah K.",
      rating: 5,
      proofIndex: 0,
      strengthReason: "Specific gift moment plus emotional reaction.",
    },
    beats: [
      {
        role: "hook",
        motion: "kinetic-reveal",
        headline: "The gift that actually gets remembered",
        startMs: 0,
        endMs: 3000,
      },
      {
        role: "product",
        motion: "image-expand",
        headline: "Birthday Cookie Tin",
        supportingText: "Fresh-baked and shipped to the door.",
        startMs: 3000,
        endMs: 8000,
      },
      {
        role: "proof",
        motion: "proof-card",
        headline: "Real birthday proof",
        supportingText: "my mom for her birthday and she loved every fresh bite",
        startMs: 8000,
        endMs: 16000,
      },
      {
        role: "cta",
        motion: "cta-slam",
        headline: "Send the box they talk about",
        startMs: 16000,
        endMs: 20000,
      },
    ],
    brandLockup: {
      logoUrl: "https://example.com/logo.png",
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
    "app/create/MakerFormatTestClient.tsx",
    "features/builder/BuilderCanvas.tsx",
    "features/render/AdRenderSurface.tsx",
    "remotion-entry/RemotionAdScene.tsx",
  ],
  "Only /create, /builder, and Remotion may draw ad pixels through AdRenderSurface.",
);

const previewSource = readFileSync("app/create/CreatePreviewChrome.tsx", "utf8");
const shareSource = readFileSync("app/s/[slug]/ShareSceneClient.tsx", "utf8");
const remotionSource = readFileSync("remotion-entry/RemotionAdScene.tsx", "utf8");
const remotionEntrySource = readFileSync("remotion-entry/index.ts", "utf8");
const renderSurfaceSource = readFileSync("features/render/AdRenderSurface.tsx", "utf8");
const workerSource = readFileSync("scripts/render-worker.ts", "utf8");
const renderJobsSource = readFileSync("convex/renderJobs.ts", "utf8");
const sceneUrlRefreshSource = readFileSync("convex/sceneUrlRefresh.ts", "utf8");
const rendererVersionSource = readFileSync("features/render/rendererVersion.ts", "utf8");
const jingleRendererSource = readFileSync("features/formats/jingle/render.tsx", "utf8");
const appGlobalsSource = readFileSync("app/globals.css", "utf8");
const renderGlobalsSource = readFileSync("features/render/renderGlobals.css", "utf8");

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
  remotionEntrySource.includes("../features/render/renderGlobals.css") &&
    appGlobalsSource.includes("../features/render/renderGlobals.css") &&
    renderGlobalsSource.includes("@import \"tailwindcss\""),
  "Preview and Remotion export must import shared render CSS for base fonts and animations.",
);
assert.ok(
  renderSurfaceSource.includes("getFormatModule(scene.format)") &&
    renderSurfaceSource.includes("FormatRenderer"),
  "AdRenderSurface must delegate actual pixels to the format registry.",
);
assert.ok(
  renderSurfaceSource.includes('height: "100%"'),
  "AdRenderSurface must own full-frame height so absolute-positioned format renderers cannot collapse in MP4 export.",
);
assert.ok(
  workerSource.includes("getWorkerRendererVersion") &&
    renderJobsSource.includes('q.field("rendererVersion")'),
  "Render jobs must be version-locked so stale workers cannot render current preview jobs.",
);
assert.ok(
  workerSource.includes("adSceneCompositionId") &&
    workerSource.includes("api.renderJobs.markReady") &&
    workerSource.includes("rendererVersion: getWorkerRendererVersion()"),
  "Render worker must use the shared composition id, mark completed jobs, and claim only its renderer version.",
);
assert.ok(
  workerSource.includes("outDir: bundleDir") && workerSource.includes("rm(bundleDir"),
  "Render worker must clean its controlled Remotion bundle directory.",
);
assert.ok(
  remotionSource.includes("@remotion/media") &&
    remotionSource.includes("<Audio") &&
    remotionSource.includes("motionStoryMusicSrc") &&
    remotionSource.includes("RemotionImageAsset") &&
    remotionSource.includes("resolveRenderAssetSrc") &&
    remotionSource.includes("OffthreadVideo") &&
    remotionSource.includes("clipStartSeconds") &&
    remotionSource.includes("<Sequence"),
  "Remotion exports must layer generated audio and render public image/video assets through the shared asset provider.",
);
assert.ok(
  renderJobsSource.includes("refreshJingleMusicVideoUrls") &&
    renderJobsSource.includes("refreshSceneAudioUrls") &&
    sceneUrlRefreshSource.includes("scene.layout.musicVideo.clips") &&
    sceneUrlRefreshSource.includes("scene.layout.musicVideo.stitchedVideo") &&
    sceneUrlRefreshSource.includes("backgroundMusic"),
  "Render jobs must refresh stored audio, background music, music-video clip, and stitched-video URLs before export.",
);
assert.ok(
  workerSource.includes("ffmpeg background music mix") &&
    workerSource.includes("amix=inputs=2") &&
    workerSource.includes("backgroundMusic.volume") &&
    workerSource.includes("getAdSceneDurationInFrames"),
  "Render worker must mix uploaded background music into one final MP4 audio track.",
);
assert.ok(
  workerSource.includes("api.jingleStoryboards.claimNextStitch") &&
    workerSource.includes("ffmpeg music video stitch") &&
    workerSource.includes("api.jingleStoryboards.markStitchReady"),
  "Brick music videos must be stitched into one stored MP4 by the worker before the shared renderer plays them.",
);
assert.ok(
  jingleRendererSource.includes("stitchedMusicVideo") &&
    jingleRendererSource.includes("data-jingle-stitched-music-video") &&
    jingleRendererSource.includes("data-jingle-music-video-lyric") &&
    jingleRendererSource.includes('bottom: "11cqw"') &&
    jingleRendererSource.includes('fontSize: "5.6cqw"') &&
    !jingleRendererSource.includes("data-jingle-music-video-active"),
  "Jingle music-video rendering must use one stitched video asset and lower-third lyric pixels, not source swapping or a preview-only caption layout.",
);
assert.ok(
  renderJobsSource.includes("rendererVersion: v.string()") &&
    renderJobsSource.includes("args: {\n    rendererVersion: v.string(),\n  }") &&
    renderJobsSource.includes("worker.rendererVersion === rendererVersion"),
  "Render job creation and worker readiness must require matching renderer versions.",
);
assert.ok(
  rendererVersionSource.includes('defaultRendererVersion = "local-dev:render-contract-v2"') &&
    !rendererVersionSource.includes("renderFormatSupport") &&
    !rendererVersionSource.includes("Record<AdFormatId"),
  "Renderer version must be one render contract, not a duplicate format registry.",
);
assert.ok(
  renderJobsSource.includes("assertRenderableAdScene") &&
    !renderJobsSource.includes("assertShareableAdScene"),
  "MP4 render jobs must not reuse share-only scene validation.",
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
  assert.ok(html.includes("height:100%"), "Every visual path must give AdRenderSurface full-frame height.");
  assert.ok(html.includes('data-format="visualizer"'), "Every visual path must preserve the scene format.");
  assert.ok(html.includes("Your Competitor Shows Up First"), "Every visual path must render the same headline.");
  assert.ok(html.includes("First ChatGPT mention in 14 days."), "Every visual path must render the same caption/proof text.");
  assert.ok(html.includes("#82DFFF"), "Every visual path must render the same visualizer color.");
  assert.ok(html.includes("Made with Wiggly"), "Every visual path must render the same watermark.");
  assert.ok(html.includes('data-visualizer-motion="audio-analysis"'), "Every visual path must use the same audio visualizer branch while playing/rendering.");
}

const textMessagePreviewHtml = renderToStaticMarkup(createElement(PhonePreviewFrame, {
    scene: textMessageParityScene,
    result: null,
    platform: "instagram-feed",
    motionMode: "idle",
    timeSeconds: 0,
  }));

assert.ok(
  textMessagePreviewHtml.includes('data-preview-phone-header="instagram-feed"') &&
    textMessagePreviewHtml.includes('data-preview-phone-footer="instagram-feed"') &&
    textMessagePreviewHtml.includes('data-text-message-status-bar="true"'),
  "Text message preview must stay an Instagram feed post containing a native-looking Messages screenshot.",
);

for (const html of [
  textMessagePreviewHtml,
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: textMessageParityScene,
    mode: "preview",
    motionMode: "idle",
  })),
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: textMessageParityScene,
    mode: "video",
    motionMode: "idle",
  })),
]) {
  assert.ok(html.includes('data-render-surface="ad"'), "Text message preview/export must use the shared render surface.");
  assert.ok(html.includes('data-format="text-message"'), "Text message preview/export must preserve the format.");
  assert.ok(html.includes('data-text-message-screen="true"'), "Text message preview/export must render the screenshot surface.");
  assert.ok(html.includes('data-text-message-status-bar="true"'), "Text message preview/export must render native phone status chrome.");
  assert.ok(html.includes('data-text-message-bubble="left"') && html.includes('data-text-message-bubble="right"'), "Text message preview/export must render both bubble sides.");
  assert.ok(html.includes("background-color:#0A84FF"), "Text message preview/export must keep critical right-bubble color inline.");
  assert.ok(html.includes("overflow:hidden"), "Text message preview/export must not scroll the screenshot.");
}

for (const html of [
  renderToStaticMarkup(createElement(PhonePreviewFrame, {
    scene: brainrotParityScene,
    result: null,
    platform: "instagram-feed",
    motionMode: "audio",
    timeSeconds: 0.5,
  })),
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: brainrotParityScene,
    mode: "preview",
    motionMode: "audio",
    timeSeconds: 0.5,
  })),
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: brainrotParityScene,
    mode: "video",
    motionMode: "audio",
    timeSeconds: 0.5,
  })),
]) {
  assert.ok(html.includes('data-render-surface="ad"'), "Brainrot preview/export must use the shared render surface.");
  assert.ok(html.includes('data-format="brainrot"'), "Brainrot preview/export must preserve the format.");
  assert.ok(html.includes("/brainrot/block-parkour.mp4"), "Brainrot preview/export must use the stored parkour asset.");
  assert.ok(html.includes("/brainrot/peter.png") && html.includes("/brainrot/stewie.png"), "Brainrot preview/export must render both character sprites.");
  assert.ok(html.includes("object-fit:cover"), "Brainrot preview/export must keep background cover critical pixels inline.");
  assert.ok(html.includes("bottom:30cqw"), "Brainrot preview/export must keep caption placement inline.");
  assert.ok(html.includes("opacity:0.42"), "Brainrot preview/export must keep inactive speaker opacity inline.");
  assert.ok(html.includes("ad spend up again"), "Brainrot preview/export must render the active beat caption.");
}
assert.equal(
  getAdSceneDurationInFrames(brainrotParityScene, adSceneFps),
  Math.ceil((brainrotParityScene.audio.status === "generated"
    ? brainrotParityScene.audio.durationSeconds + (brainrotCtaDurationMs / 1000)
    : 5) * adSceneFps),
  "Brainrot export must keep the CTA end card after generated audio ends.",
);

for (const html of [
  renderToStaticMarkup(createElement(PhonePreviewFrame, {
    scene: reviewsParityScene,
    result: null,
    platform: "instagram-feed",
    motionMode: "idle",
    timeSeconds: 0,
  })),
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: reviewsParityScene,
    mode: "preview",
    motionMode: "idle",
  })),
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: reviewsParityScene,
    mode: "video",
    motionMode: "idle",
  })),
]) {
  assert.ok(html.includes('data-render-surface="ad"'), "Reviews preview/export must use the shared render surface.");
  assert.ok(html.includes('data-format="reviews"'), "Reviews preview/export must preserve the format.");
  assert.ok(html.includes('data-reviews-card="true"'), "Reviews preview/export must render the proof card.");
  assert.ok(html.includes('data-reviews-image-rail="true"'), "Reviews preview/export must render the image rail.");
  assert.ok(html.includes('data-reviews-product-context="true"'), "Reviews preview/export must render product context.");
  assert.ok(html.includes("Butter Pecan Meltaway Tin"), "Reviews preview/export must render the product anchor.");
  assert.ok(html.includes("The cookies arrived fresh"), "Reviews preview/export must render verbatim proof text.");
  assert.ok(html.includes("background-color:rgba(255,255,255,0.94)"), "Reviews preview/export must keep proof card fill inline.");
  assert.ok(html.includes("border-radius:6cqw"), "Reviews preview/export must keep proof card radius inline.");
}

for (const html of [
  renderToStaticMarkup(createElement(PhonePreviewFrame, {
    scene: motionStoryParityScene,
    result: null,
    platform: "instagram-feed",
    motionMode: "idle",
    timeSeconds: 0.5,
  })),
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: motionStoryParityScene,
    mode: "preview",
    motionMode: "idle",
    timeSeconds: 0.5,
  })),
  renderToStaticMarkup(createElement(AdRenderSurface, {
    scene: motionStoryParityScene,
    mode: "video",
    motionMode: "idle",
    timeSeconds: 0.5,
  })),
]) {
  assert.ok(html.includes('data-render-surface="ad"'), "Motion Story preview/export must use the shared render surface.");
  assert.ok(html.includes('data-format="motion-story"'), "Motion Story preview/export must preserve the format.");
  assert.ok(html.includes('data-motion-story-screen="true"'), "Motion Story preview/export must render the product-story surface.");
  assert.ok(html.includes('data-motion-story-beat="hook"'), "Motion Story preview/export must render the fixed hook beat.");
  assert.ok(html.includes('data-motion-story-proof-card="true"'), "Motion Story preview/export must render the real proof card.");
  assert.ok(html.includes("The gift that actually gets remembered"), "Motion Story preview/export must render the hook.");
  assert.ok(html.includes("https://example.com/product-cutout.png"), "Motion Story preview/export must use the product cutout.");
  assert.ok(html.includes("object-fit:contain"), "Motion Story preview/export must keep product sizing critical pixels inline.");
  assert.ok(html.includes("position:absolute"), "Motion Story preview/export must keep beat positioning critical pixels inline.");
}

assert.equal(
  getAdSceneDurationInFrames(motionStoryParityScene, adSceneFps),
  Math.ceil(20 * adSceneFps),
  "Motion Story export must use the fixed 20 second timeline.",
);

console.log("render-parity tests passed");
