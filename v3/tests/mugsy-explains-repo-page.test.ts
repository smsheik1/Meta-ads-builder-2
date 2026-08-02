import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/mugsy-explains/page.tsx", "utf8");
const packageRoot = "public/format-repositories/mugsy-explains-v1";

assert.match(source, /download-mugsy-explains-kit/);
assert.match(source, /mugsy-explains-proof/);
assert.match(source, /mugsy-explains-original-references/);
assert.match(source, /mugsy-explains-pipeline/);
assert.match(source, /Proof 1 of 2/);
assert.match(source, /These are references, not Wiggly-generated proofs/);
assert.match(source, /mugsyclips\/reel\/Da5cRx2sKhl/);
assert.match(source, /zero provider calls/i);
assert.doesNotMatch(source, /CreateResearchClient|AdRenderSurface|generateThreeDClip/);

for (const file of [
  "SKILL.md",
  "README.md",
  "brief.json",
  "concepts.json",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "prompts/research.md",
  "prompts/concepts.md",
  "prompts/story.md",
  "prompts/visual-plan.md",
  "visual-plan.json",
  "quality.json",
  "requirements.json",
  "runner.py",
  "runtime/build_proof.py",
  "tests/test_contracts.py",
  "goldens/wiggly-format-explainer.mp4",
  "goldens/wiggly-format-explainer-contact.jpg",
  "references/original/mugsyclips_Da5cRx2sKhl.mp4",
  "references/original/mugsyclips_DavoEJ4RAhM.mp4",
  "references/original/mugsyclips_DaqkxFkxXI1.mp4",
  "downloads/wiggly-mugsy-explains-format-kit.zip",
]) {
  assert.equal(existsSync(`${packageRoot}/${file}`), true, `${file} should ship in the public package.`);
}

const format = JSON.parse(readFileSync(`${packageRoot}/format.json`, "utf8"));
assert.equal(format.id, "mugsy-explains");
assert.equal(format.name, "Mugsy Explains");
assert.equal(format.version, "0.2.1-proof");

const storyPrompt = readFileSync(`${packageRoot}/prompts/story.md`, "utf8");
assert.match(storyPrompt, /answer the same viewer question/i);
assert.match(storyPrompt, /tight crop/i);
assert.match(storyPrompt, /natural spoken English/i);
assert.match(storyPrompt, /Teach; do not pitch/i);
assert.match(storyPrompt, /setup.*mechanism.*payoff/i);
assert.match(storyPrompt, /approve-script/i);

const conceptsPrompt = readFileSync(`${packageRoot}/prompts/concepts.md`, "utf8");
assert.match(conceptsPrompt, /exactly five/i);
assert.match(conceptsPrompt, /why it does not feel like an advertisement/i);

const visualPrompt = readFileSync(`${packageRoot}/prompts/visual-plan.md`, "utf8");
assert.match(visualPrompt, /six-image board/i);
assert.match(visualPrompt, /Never use a whole webpage/i);

const runner = readFileSync(`${packageRoot}/runner.py`, "utf8");
assert.match(runner, /minimum 400x200/);
assert.match(runner, /question must be exactly/);
assert.match(runner, /concept approval is stale/i);
assert.match(runner, /script approval is stale/i);
assert.match(runner, /proof-board approval is stale/i);

const profile = getDiscoveryFormatProfile("mugsy-explains");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/mugsy-explains");
assert.equal(profile?.handoff?.firstQuestion, "What should this video explain or compare?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);

const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 0\.2\.1-proof/);
assert.match(prompt, /Use the bundled host, renderer, and pose pack/);
assert.match(prompt, /show five concepts/i);
assert.match(prompt, /show the complete script/i);
assert.ok(prompt.trim().endsWith('"What should this video explain or compare?"'));

console.log("Mugsy Explains repo page tests passed.");
