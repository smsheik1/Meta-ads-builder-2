import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/dark-studio-portrait/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /dark-studio-portrait/);
assert.equal(
  existsSync(
    "public/format-repositories/dark-studio-portrait-v1/downloads/wiggly-dark-studio-portrait-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("dark-studio-portrait");
assert.ok(profile?.handoff, "Dark Studio Portrait should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/dark-studio-portrait");
assert.equal(profile.proofEntries.length, 6);
assert.ok(
  profile.proofEntries.every((entry) => entry.media.referenceSrc),
  "Every portrait should show the reference identity inset.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "dark-studio-portrait").length,
  1,
  "The six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which portrait should I turn into a Dark Studio Portrait?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Dark Studio Portrait/);
assert.match(prompt, /formats\/dark-studio-portrait/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Dark Studio Portrait Repo page tests passed.");
