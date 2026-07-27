import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/text-message/page.tsx", "utf8");
assert.match(source, /Wiggly \/ Format Lab/);
assert.match(source, /format-repositories\/text-message-v1/);
assert.match(source, /Download runnable kit/);
assert.match(source, /Six 1080 x 1350 PNGs/);
assert.equal(
  existsSync("public/format-repositories/text-message-v1/downloads/wiggly-text-message-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("text-message");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/text-message");
assert.equal(profile?.handoff?.firstQuestion, "What website should I use?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);
const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /Ask me one short question at a time/);
assert.ok(prompt.trim().endsWith('"What website should I use?"'));

console.log("Text message repo page tests passed.");
