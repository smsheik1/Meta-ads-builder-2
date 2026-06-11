import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getRuntimeConvexUrl,
} from "../scripts/runtime-health";

const healthSource = readFileSync("scripts/runtime-health.ts", "utf8");
const renderJobsSource = readFileSync("convex/renderJobs.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const runtimeDoc = readFileSync("../docs/v3-production-runtime.md", "utf8");

const originalEnv = { ...process.env };
process.env.V3_CONVEX_URL = "https://v3.example.convex.cloud";
process.env.NEXT_PUBLIC_V3_CONVEX_URL = "https://public-v3.example.convex.cloud";
process.env.NEXT_PUBLIC_CONVEX_URL = "https://legacy.example.convex.cloud";
assert.equal(getRuntimeConvexUrl(), "https://v3.example.convex.cloud");
process.env.V3_CONVEX_URL = "";
assert.equal(getRuntimeConvexUrl(), "https://public-v3.example.convex.cloud");
process.env.NEXT_PUBLIC_V3_CONVEX_URL = "";
assert.equal(getRuntimeConvexUrl(), "https://legacy.example.convex.cloud");
process.env = originalEnv;

assert.ok(
  packageJson.scripts["runtime:health"]?.includes("scripts/runtime-health.ts"),
  "package.json must expose npm run runtime:health.",
);
assert.ok(
  packageJson.scripts.test.includes("tests/runtime-health.test.ts"),
  "npm run test must include runtime-health.test.ts.",
);
assert.ok(
  healthSource.includes("api.sessions.getByAnonymousId"),
  "Runtime health must verify Convex public functions without mutating data.",
);
assert.ok(
  healthSource.includes("api.renderJobs.workerReadiness"),
  "Runtime health must verify render-worker queue readiness.",
);
assert.ok(
  healthSource.includes("PINNED_TTS_MODEL") && healthSource.includes("checkPinnedTtsModel"),
  "Runtime health must catch wrong Gemini TTS model configuration.",
);
assert.ok(
  healthSource.includes("checkNotDisabled(\"GEMINI_ENABLED\")") &&
    healthSource.includes("checkNotDisabled(\"TTS_ENABLED\")"),
  "Runtime health must catch disabled Gemini and TTS flags.",
);
assert.ok(
  healthSource.includes("checkRequiredEnv(\"DEEPGRAM_API_KEY\")") &&
    healthSource.includes("checkNotDisabled(\"DEEPGRAM_ENABLED\")"),
  "Runtime health must require Deepgram transcription for uploaded audio captions.",
);
assert.ok(
  healthSource.includes("secretNames") &&
    healthSource.includes("\"DEEPGRAM_API_KEY\"") &&
    !healthSource.includes("process.env.FIRECRAWL_API_KEY)"),
  "Runtime health must avoid printing secret values.",
);
assert.ok(
  renderJobsSource.includes("workerReadiness"),
  "renderJobs must expose a read-only worker readiness query.",
);
const workerReadinessBlock = renderJobsSource
  .split("export const workerReadiness")[1]
  ?.split("export const workerHeartbeat")[0] || "";
assert.ok(
  !/ctx\.db\.(insert|patch|delete)/.test(workerReadinessBlock),
  "workerReadiness must not mutate Convex data.",
);
assert.ok(
  renderJobsSource.includes("workerHeartbeat") &&
    renderJobsSource.includes("renderWorkers"),
  "renderJobs must expose a worker heartbeat so runtime health can detect an offline renderer.",
);
assert.ok(runtimeDoc.includes("npm run runtime:health"));
assert.ok(runtimeDoc.includes("Do not print secret values"));
assert.ok(runtimeDoc.includes("Do not add a second renderer"));
assert.ok(runtimeDoc.includes("TTS model is unset or matches the pinned Gemini TTS model"));

console.log("runtime-health tests passed");
