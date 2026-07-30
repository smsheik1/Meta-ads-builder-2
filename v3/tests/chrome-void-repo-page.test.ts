import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/chrome-void/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /chrome-void/);
assert.equal(
  existsSync("public/format-repositories/chrome-void-v1/downloads/wiggly-chrome-void-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("chrome-void");
assert.ok(profile?.handoff, "Chrome Void should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/chrome-void");
assert.equal(profile.proofEntries.length, 6);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  "/format-repositories/chrome-void-v1/assets/source/reference-input.jpg",
  "The hero should show the creator-provided before inset at the top-right.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "chrome-void").length,
  1,
  "The six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I surround with the Chrome Void?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: Chrome Void/);
assert.match(prompt, /formats\/chrome-void/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Chrome Void Repo page tests passed.");
