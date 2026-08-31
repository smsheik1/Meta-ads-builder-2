import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const v3EnvExample = readFileSync(".env.example", "utf8");
assert.ok(v3EnvExample.includes("NEXT_PUBLIC_V3_CONVEX_URL="));
assert.ok(v3EnvExample.includes("V3_CONVEX_URL="));
assert.ok(!v3EnvExample.includes("intent-capybara-375"));

const rootPackageJson = JSON.parse(readFileSync("../package.json", "utf8")) as {
  workspaces?: string[];
};
assert.deepEqual(rootPackageJson.workspaces, ["v3"]);

const providerSource = readFileSync("app/ConvexClientProvider.tsx", "utf8");
assert.ok(providerSource.includes("getV3ConvexUrl"));
assert.ok(!providerSource.includes("process.env.NEXT_PUBLIC_CONVEX_URL"));

const workerSource = readFileSync("scripts/render-worker.ts", "utf8");
assert.ok(workerSource.includes("V3_CONVEX_URL"));
assert.ok(workerSource.includes("NEXT_PUBLIC_V3_CONVEX_URL"));
assert.ok(workerSource.includes("const heartbeatIntervalMs = 10_000;"));
assert.ok(workerSource.includes("const idlePollIntervalMs = 30_000;"));
assert.ok(workerSource.includes("await wait(idlePollIntervalMs)"));

console.log("convex-boundary tests passed");
