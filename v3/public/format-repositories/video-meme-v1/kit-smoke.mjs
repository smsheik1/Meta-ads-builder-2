import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const v3Root = process.cwd();
const packageRoot = path.join(v3Root, "public", "format-repositories", "video-meme-v1");
const require = createRequire(import.meta.url);

for (const required of [
  ".env.example",
  "README.md",
  "SKILL.md",
  "format.json",
  "goldens.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "prompts/research.md",
  "prompts/template-selection.md",
  "prompts/caption.md",
  "fixtures/bear-secret.json",
  "fixtures/pingu-reversal.json",
  "fixtures/darwin-pain-stack.json",
  "goldens/bear-secret.mp4",
  "goldens/pingu-reversal.mp4",
  "goldens/darwin-pain-stack.mp4",
  "../../video-memes/bear-sniff.mp4",
  "../../video-memes/pingu-noot-noot.mp4",
  "../../video-memes/darwin-journey.mp4"
]) {
  assert.equal(existsSync(path.join(packageRoot, required)), true, `${required} is missing.`);
}

const requirements = JSON.parse(readFileSync(path.join(packageRoot, "requirements.json"), "utf8"));
assert.deepEqual(requirements.environment, {});
assert.deepEqual(requirements.providers, []);

const format = JSON.parse(readFileSync(path.join(packageRoot, "format.json"), "utf8"));
assert.equal(format.providerCostUsd, 0);
assert.deepEqual(format.templates, ["bear-sniff", "pingu-noot-noot", "darwin-journey"]);

assert.ok(require.resolve("tailwindcss"));

console.log("Video Meme Format Kit files are complete. No provider key is required.");
