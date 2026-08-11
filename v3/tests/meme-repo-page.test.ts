import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/meme/page.tsx", "utf8");
assert.match(source, /Wiggly \/ Format Lab/);
assert.match(source, /format-repositories\/meme-v1/);
assert.match(source, /Download runnable kit/);
assert.match(source, /Twelve 1080 x 1350 PNGs/);
assert.equal(
  existsSync("public/format-repositories/meme-v1/downloads/wiggly-meme-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("meme");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/meme");
assert.equal(profile?.handoff?.firstQuestion, "What website should I use?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);
const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Meme repo page tests passed.");
