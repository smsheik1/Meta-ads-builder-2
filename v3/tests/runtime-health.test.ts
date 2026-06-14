import assert from "node:assert/strict";
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

console.log("runtime-health tests passed");
