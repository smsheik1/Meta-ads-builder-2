import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const liveSmokeSource = readFileSync("scripts/live-smoke.ts", "utf8");
const runtimeDoc = readFileSync("../docs/v3-production-runtime.md", "utf8");

assert.ok(
  packageJson.scripts["smoke:live"]?.includes("scripts/live-smoke.ts"),
  "package.json must expose npm run smoke:live.",
);
assert.ok(
  packageJson.scripts.test.includes("tests/live-smoke.test.ts"),
  "npm run test must include live-smoke.test.ts.",
);
assert.ok(
  liveSmokeSource.includes("defaultAdCount = 50"),
  "Live smoke must default to the real 50-ad product promise.",
);
assert.ok(
  liveSmokeSource.includes("https://v3.wiggly.agentenamel.com"),
  "Live smoke must default to the real HTTPS v3 preview domain.",
);
for (const requiredApiCall of [
  "api.researchRuns.runWebsiteResearch",
  "api.adScenes.generateFromResearch",
  "api.audioAssets.generateForScene",
  "api.renderJobs.createFromScene",
  "api.renderJobs.getStatus",
  "api.sharePages.createFromScene",
  "api.sharePages.getBySlug",
]) {
  assert.ok(
    liveSmokeSource.includes(requiredApiCall),
    `Live smoke must exercise ${requiredApiCall}.`,
  );
}
assert.ok(
  liveSmokeSource.includes("rerollScene(") && liveSmokeSource.includes("createDefaultSceneLocks()"),
  "Live smoke must verify the spacebar reroll path without browser-only state.",
);
assert.ok(
  liveSmokeSource.includes("fetchDownloadReachable"),
  "Live smoke must verify the MP4 download URL is reachable.",
);
assert.ok(
  liveSmokeSource.includes("Public share page rendered only the loading shell") &&
    liveSmokeSource.includes("Public share page HTML did not include the frozen scene headline"),
  "Live smoke must verify the public share page renders the frozen scene in HTML.",
);
assert.ok(
  liveSmokeSource.includes("assertSameFrozenScene"),
  "Live smoke must verify the share page preserves the frozen scene.",
);
assert.ok(
  liveSmokeSource.includes("LIVE_SMOKE_RENDER_TIMEOUT_MS"),
  "Live smoke must have an explicit render timeout.",
);
assert.ok(
  !liveSmokeSource.includes("FIRECRAWL_API_KEY") && !liveSmokeSource.includes("GEMINI_API_KEY"),
  "Live smoke must not print or inspect provider secret values.",
);
assert.ok(runtimeDoc.includes("npm run smoke:live"));
assert.ok(runtimeDoc.includes("ogtool.com -> research -> 50 ads"));

console.log("live-smoke tests passed");
