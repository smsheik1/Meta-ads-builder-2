import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getRuntimeConvexUrl } from "../scripts/runtime-health";

const originalEnv = { ...process.env };

try {
  process.env.V3_CONVEX_URL = "https://v3.example.convex.cloud";
  process.env.NEXT_PUBLIC_V3_CONVEX_URL = "https://public-v3.example.convex.cloud";
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://legacy.example.convex.cloud";
  process.env.CONVEX_URL = "https://legacy-server.example.convex.cloud";
  assert.equal(getRuntimeConvexUrl(), "https://v3.example.convex.cloud");

  process.env.V3_CONVEX_URL = "";
  assert.equal(getRuntimeConvexUrl(), "https://public-v3.example.convex.cloud");

  process.env.NEXT_PUBLIC_V3_CONVEX_URL = "";
  assert.equal(getRuntimeConvexUrl(), "");
} finally {
  process.env = originalEnv;
}

const runtimeHealthSource = readFileSync(new URL("../scripts/runtime-health.ts", import.meta.url), "utf8");
for (const requiredRuntimeValue of [
  "BRANDFETCH_API_KEY",
  "NVIDIA_NIM_API_KEY",
  "REPLICATE_API_TOKEN",
  "FISH_STUDIO_APIKEY",
  "ELEVENLABS_API_KEY",
  "V3_PUBLIC_BASE_URL",
]) {
  assert.ok(
    runtimeHealthSource.includes(`checkRequiredEnv(\"${requiredRuntimeValue}\"`),
    `runtime health must fail when ${requiredRuntimeValue} is missing.`,
  );
}

console.log("runtime-health tests passed");
