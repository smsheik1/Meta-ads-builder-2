import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  getPublishedDiscoveryEntries,
} from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/selfie-nine-images/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /selfie-nine-images/);
assert.equal(
  existsSync(
    "public/format-repositories/selfie-nine-images-v1/downloads/wiggly-selfie-nine-images-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("selfie-nine-images");
assert.ok(profile?.handoff, "1 Selfie, 9 Images should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/selfie-nine-images");
assert.equal(profile.proofEntries.length, 9);
assert.ok(
  profile.proofEntries.every((entry) => entry.media.referenceSrc),
  "Every scene should show the original selfie as its reference inset.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "selfie-nine-images").length,
  1,
  "The nine examples belong inside one Discoverable Format.",
);
assert.equal(profile.handoff.firstQuestion, "Which selfie should I use?");

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("1 Selfie, 9 Images Repo page tests passed.");
