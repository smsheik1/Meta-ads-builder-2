import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/reviews/page.tsx", "utf8");
assert.match(source, /download-reviews-kit/);
assert.match(source, /reviews-golden/);
assert.match(source, /reviews-pipeline/);
assert.match(source, /Eight 1080 x 1350 PNGs/);
assert.match(source, /format-repositories\/reviews-v1/);
assert.doesNotMatch(source, /Replicate|Seedance|voice generation/i);
assert.equal(
  existsSync("public/format-repositories/reviews-v1/downloads/wiggly-reviews-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("reviews");
assert.ok(profile?.handoff, "Reviews should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/reviews");
assert.equal(
  profile.handoff.firstQuestion,
  "What website has the customer reviews you want to turn into ads?",
);
assert.equal(profile.handoff.estimates.length, 3);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Reviews Repo page tests passed.");
