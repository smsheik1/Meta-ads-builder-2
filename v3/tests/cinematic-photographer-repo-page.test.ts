import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  getDiscoveryFormatProfile,
} from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/cinematic-photographer/page.tsx", "utf8");
assert.match(source, /SkaiImageFormatPage/);
assert.match(source, /cinematic-photographer/);
assert.equal(
  existsSync(
    "public/format-repositories/cinematic-photographer-v1/downloads/wiggly-cinematic-photographer-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("cinematic-photographer");
assert.ok(profile?.handoff, "Cinematic Photographer should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/cinematic-photographer");
assert.equal(profile.proofEntries.length, 1);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  "/format-repositories/cinematic-photographer-v1/assets/source/style-reference.jpg",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Should I use the exact packaged photographer concept, or do you want to change the subject while keeping the cinematic recipe?",
);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Cinematic Photographer Repo page tests passed.");
