import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/brand-jingle/page.tsx", "utf8");
assert.match(source, /download-brand-jingle-kit/);
assert.match(source, /brand-jingle-goldens/);
assert.match(source, /brand-jingle-pipeline/);
assert.match(source, /golden-audio-\$\{example\.id\}/);
assert.match(source, /Website or one sentence in/);
assert.match(source, /One approval buys one song attempt/);
assert.match(source, /format-repositories\/brand-jingle-v1/);
assert.doesNotMatch(source, /Seedance|Replicate|music video/i);
assert.equal(
  existsSync("public/format-repositories/brand-jingle-v1/downloads/wiggly-brand-jingle-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("jingle");
assert.ok(profile?.handoff, "Brand Jingle should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/brand-jingle");
assert.equal(profile.handoff.firstQuestion, "What website is this for? If you do not have one, just say so.");
assert.equal(profile.handoff.estimates.length, 3);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Brand Jingle Repo page tests passed.");
