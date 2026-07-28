import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve("public", "format-repositories", "were-sorry-v1");
for (const file of [
  "SKILL.md",
  "README.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "prompts/research.md",
  "prompts/apology.md",
  "fixtures/davids-cookies.json",
  "fixtures/davids-apologies.json",
  "goldens.json",
]) {
  assert.equal(existsSync(path.join(packageRoot, file)), true, `${file} is missing.`);
}

const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
const runner = readFileSync("scripts/were-sorry-format.ts", "utf8");
assert.match(skill, /What website should I use\?/);
assert.match(skill, /Ask one short question at a time/);
assert.match(skill, /Do not ask about a budget/);
assert.match(skill, /Step 1 of 4: Research/);
assert.doesNotMatch(
  runner,
  /callNvidiaNimChat|generateGeminiDialogueVoiceover|generateFish|generate.*Music|from\s+["']replicate["']/i,
);

console.log("We're Sorry kit smoke passed. No provider was called.");
