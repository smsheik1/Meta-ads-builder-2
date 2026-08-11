import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/old-money-shot/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /old-money-shot/);
assert.equal(
  existsSync("public/format-repositories/old-money-shot-v1/downloads/wiggly-old-money-shot-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("old-money-shot");
assert.ok(profile?.handoff, "Old Money Shot should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/old-money-shot");
assert.equal(profile.proofEntries.length, 6);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  "/format-repositories/old-money-shot-v1/assets/source/reference-input.jpg",
  "The hero should show a separate reference portrait inset at the top-right.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "old-money-shot").length,
  1,
  "The six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which portrait should I turn into an Old Money Shot?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Old Money Shot Repo page tests passed.");
