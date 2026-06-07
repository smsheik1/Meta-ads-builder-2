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
  remotionSource.includes("@remotion/media") && remotionSource.includes("<Audio"),
  "Remotion render path must layer generated audio without changing the visual renderer.",
);

console.log("render-job tests passed");
