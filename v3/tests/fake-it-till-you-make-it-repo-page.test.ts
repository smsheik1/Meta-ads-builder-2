import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/fake-it-till-you-make-it/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /fake-it-till-you-make-it/);
assert.equal(
  existsSync(
    "public/format-repositories/fake-it-till-you-make-it-v1/downloads/wiggly-fake-it-till-you-make-it-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("fake-it-till-you-make-it");
assert.ok(profile?.handoff, "Fake It Till You Make It should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/fake-it-till-you-make-it");
assert.equal(profile.proofEntries.length, 8);
assert.ok(
  profile.proofEntries.every((entry) => entry.media.referenceSrc),
  "Every lifestyle scene should show the reference identity inset.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "fake-it-till-you-make-it").length,
  1,
  "The eight examples belong inside one Discoverable Format.",
);
assert.equal(profile.handoff.firstQuestion, "Which portrait should I use?");

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Fake It Till You Make It Repo page tests passed.");
