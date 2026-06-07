import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readEnv = (path: string) => {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        const rawValue = rest.join("=").replace(/\s+#.*$/, "").trim();
        return [key, rawValue.replace(/^["']|["']$/g, "")];
      }),
  ) as Record<string, string>;
};

const webEnv = {
  ...readEnv("../.env"),
  ...readEnv("../apps/web/.env.local"),
};
const v3Env = {
  ...readEnv(".env.local"),
};
const webConvexUrl = webEnv.NEXT_PUBLIC_CONVEX_URL || webEnv.CONVEX_URL;
const v3ConvexUrl = v3Env.NEXT_PUBLIC_V3_CONVEX_URL ||
  v3Env.V3_CONVEX_URL ||
  v3Env.NEXT_PUBLIC_CONVEX_URL ||
  v3Env.CONVEX_URL;

if (webConvexUrl && v3ConvexUrl) {
  assert.notEqual(
    v3ConvexUrl,
    webConvexUrl,
    "v3 must not point at the same Convex deployment as apps/web.",
  );
}

const v3EnvExample = readFileSync(".env.example", "utf8");
assert.ok(v3EnvExample.includes("NEXT_PUBLIC_V3_CONVEX_URL="));
assert.ok(v3EnvExample.includes("V3_CONVEX_URL="));
assert.ok(!v3EnvExample.includes("intent-capybara-375"));

const providerSource = readFileSync("app/ConvexClientProvider.tsx", "utf8");
assert.ok(providerSource.includes("getV3ConvexUrl"));
assert.ok(!providerSource.includes("process.env.NEXT_PUBLIC_CONVEX_URL"));

const workerSource = readFileSync("scripts/render-worker.ts", "utf8");
assert.ok(workerSource.includes("V3_CONVEX_URL"));
assert.ok(workerSource.includes("NEXT_PUBLIC_V3_CONVEX_URL"));

console.log("convex-boundary tests passed");
