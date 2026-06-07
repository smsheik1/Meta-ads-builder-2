import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync("../.github/workflows/deploy-v3-oracle.yml", "utf8");
const script = readFileSync("../scripts/deploy-v3-oracle.sh", "utf8");
const runtimeDoc = readFileSync("../docs/v3-production-runtime.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert.ok(workflow.includes("workflow_dispatch"), "v3 deploy must be manually triggered until live smoke passes.");
assert.ok(!workflow.includes("on:\n  push"), "v3 deploy must not auto-run on push yet.");
assert.ok(workflow.includes("V3_CONVEX_DEPLOY_KEY"), "v3 deploy must use a v3-specific Convex deploy key.");
assert.ok(!workflow.includes("secrets.CONVEX_DEPLOY_KEY"), "v3 deploy must not use the legacy Convex deploy key.");
assert.ok(workflow.includes("scripts/deploy-v3-oracle.sh"), "v3 workflow must call the v3 deploy script.");

for (const requiredScript of [
  "npm run test",
  "npm run typecheck",
  "npm run build",
  "npm run remotion:still",
  "npm run runtime:health",
]) {
  assert.ok(script.includes(requiredScript), `v3 deploy script must run ${requiredScript}.`);
}

assert.ok(
  script.includes("pm2 start npm") && script.includes("run render-worker:watch"),
  "v3 deploy script must run the render worker through PM2.",
);
assert.ok(script.includes("wiggly-v3"), "v3 app must have its own PM2 app name.");
assert.ok(script.includes("wiggly-v3-render-worker"), "v3 render worker must have its own PM2 app name.");
assert.ok(script.includes("npx convex deploy"), "v3 deploy must sync Convex functions before smoke.");
assert.ok(script.includes("CONVEX_DEPLOY_KEY=\"$V3_CONVEX_DEPLOY_KEY\""), "script must map v3 key to Convex CLI env.");
assert.ok(script.includes("V3_PUBLIC_HOST"), "v3 deploy script must own the optional public host route.");
assert.ok(script.includes("proxy_pass http://127.0.0.1:$V3_PORT"), "v3 public host must proxy to the v3 app port.");
assert.ok(!script.includes("apps/web"), "v3 deploy script must not deploy the legacy web app.");
assert.ok(!script.includes("deploy-oracle.sh"), "v3 deploy script must not shell into legacy deploy script.");
assert.ok(packageJson.scripts["runtime:health"], "v3 package must expose runtime health.");
assert.ok(runtimeDoc.includes("V3_CONVEX_DEPLOY_KEY"));
assert.ok(runtimeDoc.includes("Do not reuse the legacy `CONVEX_DEPLOY_KEY`"));
assert.ok(runtimeDoc.includes("V3_PUBLIC_HOST"));

console.log("live-deploy tests passed");
