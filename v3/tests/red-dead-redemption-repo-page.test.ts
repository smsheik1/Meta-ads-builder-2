import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/red-dead-redemption/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /red-dead-redemption/);
assert.equal(
  existsSync("public/format-repositories/red-dead-redemption-v1/downloads/wiggly-red-dead-redemption-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("red-dead-redemption");
assert.ok(profile?.handoff, "Red Dead Redemption should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/red-dead-redemption");
assert.equal(profile.proofEntries.length, 6);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  "/format-repositories/red-dead-redemption-v1/assets/source/reference-input.jpg",
  "The hero should show the clean source photo inset at the top-right.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "red-dead-redemption").length,
  1,
  "The six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I turn into a Red Dead Redemption-style scene?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Red Dead Redemption Repo page tests passed.");
