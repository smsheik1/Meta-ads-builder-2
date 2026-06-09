import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = join(process.cwd(), "..");
const workflowDir = join(repoRoot, ".github", "workflows");
const workflowSource = readdirSync(workflowDir)
  .filter((fileName) => fileName.endsWith(".yml") || fileName.endsWith(".yaml"))
  .map((fileName) => readFileSync(join(workflowDir, fileName), "utf8"))
  .join("\n\n");

[
  "NEXT_PUBLIC_V3_CONVEX_URL",
  "NEXT_PUBLIC_V3_CONVEX_SITE_URL",
  "npx playwright install --with-deps chromium",
  "CREATE_SMOKE_BASE_URL: http://localhost:3020",
  "curl -fsS \"$CREATE_SMOKE_BASE_URL/create\"",
  "npm run smoke:create",
].forEach((needle) => {
  assert(workflowSource.includes(needle), `GitHub CI must include create smoke wiring: ${needle}`);
});

console.log("create-smoke-ci tests passed");
