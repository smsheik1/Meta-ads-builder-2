import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/gta-vi/page.tsx", "utf8");
assert.match(source, /SkaiImageFormatPage/);
assert.match(source, /gta-vi/);
assert.equal(
  existsSync("public/format-repositories/gta-vi-v1/downloads/wiggly-gta-vi-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("gta-vi");
assert.ok(profile?.handoff, "GTA VI should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/gta-vi");
assert.equal(profile.proofEntries.length, 1);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I transform into a cinematic GTA VI-style character?",
);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /download the runnable kit/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("GTA VI Repo page tests passed.");
