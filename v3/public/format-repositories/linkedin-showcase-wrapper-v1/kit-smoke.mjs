import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const required = [
  "SKILL.md",
  "README.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "prompts/asset-sourcing.md",
  "requirements.json",
  "assets/wiggly-wordmark.png",
  "fixtures/northstar/input.json",
  "fixtures/northstar/source-video.mp4",
  "goldens/owala-linkedin-showcase.mp4",
  "goldens/northstar-linkedin-showcase.mp4"
];

for (const file of required) {
  assert.ok(existsSync(`public/format-repositories/linkedin-showcase-wrapper-v1/${file}`), `Missing ${file}`);
}

const manifest = JSON.parse(readFileSync("public/format-repositories/linkedin-showcase-wrapper-v1/format.json", "utf8"));
assert.equal(manifest.id, "linkedin-showcase-wrapper");
assert.equal(manifest.providerCostUsd, 0);
assert.deepEqual(JSON.parse(readFileSync("public/format-repositories/linkedin-showcase-wrapper-v1/requirements.json", "utf8")).apiKeys, []);
console.log("LinkedIn Showcase Wrapper kit smoke passed");
