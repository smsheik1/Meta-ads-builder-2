import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const remotionSource = readFileSync("remotion-entry/RemotionAdScene.tsx", "utf8");
const remotionEntrySource = readFileSync("remotion-entry/index.ts", "utf8");
const workerSource = readFileSync("scripts/render-worker.ts", "utf8");
const rendererVersionSource = readFileSync("features/render/rendererVersion.ts", "utf8");
const createClientSource = readFileSync("app/create/CreateResearchClient.tsx", "utf8");
const appGlobalsSource = readFileSync("app/globals.css", "utf8");
const renderGlobalsSource = readFileSync("features/render/renderGlobals.css", "utf8");

assert.ok(
  remotionSource.includes("AdRenderSurface"),
  "Remotion render path must use the shared AdRenderSurface.",
);
assert.ok(
  remotionEntrySource.includes("../features/render/renderGlobals.css") &&
    appGlobalsSource.includes("../features/render/renderGlobals.css") &&
    renderGlobalsSource.includes("@import \"tailwindcss\""),
  "Preview and Remotion export must import shared render CSS for base fonts and animations.",
);
assert.ok(
  workerSource.includes("adSceneCompositionId"),
  "Render worker must use the shared composition id instead of a stringly-typed duplicate.",
);
assert.ok(
  workerSource.includes("api.renderJobs.markReady"),
  "Render worker must write completed MP4s back through Convex renderJobs.",
);
assert.ok(
  workerSource.includes("getWorkerRendererVersion") &&
  workerSource.includes("rendererVersion: getWorkerRendererVersion()"),
  "Render worker must only claim jobs for its own renderer version.",
);
assert.ok(
  workerSource.includes("outDir: bundleDir") && workerSource.includes("rm(bundleDir"),
  "Render worker must use and clean a controlled Remotion bundle directory instead of leaking default /tmp bundles.",
);
assert.ok(
  remotionSource.includes("@remotion/media") && remotionSource.includes("<Audio"),
  "Remotion render path must layer generated audio without changing the visual renderer.",
);
assert.ok(
  remotionSource.includes("OffthreadVideo") && !remotionSource.includes("import { AbsoluteFill, Img, Video"),
  "Remotion video meme exports must use OffthreadVideo so MP4 assets render reliably in headless export.",
);

const renderJobsSource = readFileSync("convex/renderJobs.ts", "utf8");
assert.ok(
  renderJobsSource.includes("rendererVersion: v.string()"),
  "Render job creation must require a renderer version from the client.",
);
assert.ok(
  renderJobsSource.includes("rendererVersion,") &&
    renderJobsSource.includes('q.field("rendererVersion")'),
  "Render jobs must persist rendererVersion and claim by matching rendererVersion.",
);
assert.ok(
  renderJobsSource.includes("args: {\n    rendererVersion: v.string(),\n  }") &&
    renderJobsSource.includes("worker.rendererVersion === rendererVersion") &&
    createClientSource.includes("api.renderJobs.workerReadiness") &&
    createClientSource.includes("rendererVersion: getClientRendererVersion()"),
  "Render worker readiness must only report healthy workers for the same renderer version as the client.",
);
assert.ok(
  rendererVersionSource.includes('defaultRendererVersion = "local-dev:render-contract-v2"') &&
    !rendererVersionSource.includes("renderFormatSupport") &&
    !rendererVersionSource.includes("Record<AdFormatId"),
  "Renderer version must be a single render contract so old workers cannot claim incompatible jobs without duplicating the format registry.",
);
assert.ok(
  renderJobsSource.includes("assertRenderableAdScene") &&
    !renderJobsSource.includes("assertShareableAdScene"),
  "MP4 render jobs must not reuse share-only scene validation; video-meme download can be supported while share stays disabled.",
);

console.log("render-job tests passed");
