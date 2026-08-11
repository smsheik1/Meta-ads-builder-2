import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/rim-portrait-filter/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /rim-portrait-filter/);
assert.equal(
  existsSync(
    "public/format-repositories/rim-portrait-filter-v1/downloads/wiggly-rim-portrait-filter-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("rim-portrait-filter");
assert.ok(profile?.handoff, "Rim Portrait Filter should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/rim-portrait-filter");
assert.equal(profile.proofEntries.length, 7);
assert.equal(
  profile.proofEntries.filter((entry) => entry.media.referenceSrc).length,
  1,
  "Only the separate Wiggly proof has a verified reference input.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "rim-portrait-filter").length,
  1,
  "The seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which portrait should I turn into a Rim Portrait?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Rim Portrait Filter/);
assert.match(prompt, /formats\/rim-portrait-filter/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Rim Portrait Filter Repo page tests passed.");
