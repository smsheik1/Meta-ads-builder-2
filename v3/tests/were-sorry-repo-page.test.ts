import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/were-sorry/page.tsx", "utf8");
assert.match(source, /Wiggly \/ Format Lab/);
assert.match(source, /format-repositories\/were-sorry-v1/);
assert.match(source, /Download runnable kit/);
assert.match(source, /Eight 1080 x 1350 PNGs/);
assert.equal(
  existsSync("public/format-repositories/were-sorry-v1/downloads/wiggly-were-sorry-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("were-sorry");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/were-sorry");
assert.equal(profile?.handoff?.firstQuestion, "What website should I use?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);
const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("We're Sorry repo page tests passed.");
