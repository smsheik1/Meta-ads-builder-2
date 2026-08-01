import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/mugsy-explains/page.tsx", "utf8");
const packageRoot = "public/format-repositories/mugsy-explains-v1";

assert.match(source, /download-mugsy-explains-kit/);
assert.match(source, /mugsy-explains-proof/);
assert.match(source, /mugsy-explains-pipeline/);
assert.match(source, /Proof 1 of 2/);
assert.match(source, /zero provider calls/i);
assert.doesNotMatch(source, /CreateResearchClient|AdRenderSurface|generateThreeDClip/);

for (const file of [
  "SKILL.md",
  "README.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "runner.py",
  "runtime/build_proof.py",
  "goldens/wiggly-format-explainer.mp4",
  "goldens/wiggly-format-explainer-contact.jpg",
  "downloads/wiggly-mugsy-explains-format-kit.zip",
]) {
  assert.equal(existsSync(`${packageRoot}/${file}`), true, `${file} should ship in the public package.`);
}

const format = JSON.parse(readFileSync(`${packageRoot}/format.json`, "utf8"));
assert.equal(format.id, "mugsy-explains");
assert.equal(format.name, "Mugsy Explains");
assert.equal(format.version, "0.1.0-proof");

const profile = getDiscoveryFormatProfile("mugsy-explains");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/mugsy-explains");
assert.equal(profile?.handoff?.firstQuestion, "What should this video explain or compare?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);

const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 0\.1\.0-proof/);
assert.match(prompt, /Use the bundled host, renderer, and pose pack/);
assert.ok(prompt.trim().endsWith('"What should this video explain or compare?"'));

console.log("Mugsy Explains repo page tests passed.");
