import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  getDiscoveryFormatProfile,
} from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/cinematic-photographer/page.tsx", "utf8");
assert.match(source, /SkaiImageFormatPage/);
assert.match(source, /cinematic-photographer/);
assert.equal(
  existsSync(
    "public/format-repositories/cinematic-photographer-v1/downloads/wiggly-cinematic-photographer-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("cinematic-photographer");
assert.ok(profile?.handoff, "Cinematic Photographer should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/cinematic-photographer");
assert.equal(profile.proofEntries.length, 1);
assert.equal(
  profile.handoff.firstQuestion,
  "Should I use the exact packaged photographer concept, or do you want to change the subject while keeping the cinematic recipe?",
);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /download the runnable kit/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Cinematic Photographer Repo page tests passed.");
