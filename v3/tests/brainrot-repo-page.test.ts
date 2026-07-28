import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/brainrot/page.tsx", "utf8");
assert.match(source, /Wiggly \/ Format Lab/);
assert.match(source, /format-repositories\/brainrot-v1/);
assert.match(source, /Download runnable kit/);
assert.match(source, /Three scripts, two voices/);
assert.equal(
  existsSync("public/format-repositories/brainrot-v1/downloads/wiggly-brainrot-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("brainrot");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/brainrot");
assert.equal(profile?.handoff?.firstQuestion, "What website should I use for this Brainrot ad?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);
const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /Ask me one short question at a time/);
assert.ok(prompt.trim().endsWith('"What website should I use for this Brainrot ad?"'));

console.log("Brainrot repo page tests passed.");
