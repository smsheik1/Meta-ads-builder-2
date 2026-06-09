import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const remotionSource = readFileSync("remotion-entry/RemotionAdScene.tsx", "utf8");
const workerSource = readFileSync("scripts/render-worker.ts", "utf8");

assert.ok(
  remotionSource.includes("AdRenderSurface"),
  "Remotion render path must use the shared AdRenderSurface.",
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
  remotionSource.includes("@remotion/media") && remotionSource.includes("<Audio"),
  "Remotion render path must layer generated audio without changing the visual renderer.",
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

console.log("render-job tests passed");
