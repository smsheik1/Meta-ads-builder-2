import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve("public", "format-repositories", "brainrot-v1");
for (const file of [
  "SKILL.md",
  "README.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "prompts/research.md",
  "prompts/script.md",
  "prompts/selection.md",
  "fixtures/finalstraw.json",
  "fixtures/wiggly-homepage.json",
  "fixtures/wiggly-dialogue.mp3",
  "goldens.json",
  "goldens/davids-cookies.mp4"
]) {
  assert.equal(existsSync(path.join(packageRoot, file)), true, `${file} is missing.`);
}

for (const file of [
  "public/brainrot/block-parkour.mp4",
  "public/brainrot/peter.png",
  "public/brainrot/stewie.png"
]) {
  assert.equal(existsSync(path.resolve(file)), true, `${file} is missing.`);
}

const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
const runner = readFileSync("scripts/brainrot-format.ts", "utf8");
assert.match(skill, /What website should I use for this Brainrot ad\?/);
assert.match(skill, /Ask one question at a time/);
assert.match(skill, /Do not ask about budget/);
assert.match(skill, /Step 1 of 5: Research/);
assert.match(skill, /Ready to make the two voices\?/);
assert.match(runner, /--approve-voice/);
assert.match(runner, /generateFishBrainrotDialogue/);
assert.doesNotMatch(
  runner,
  /callNvidiaNimChat|generateGeminiDialogueVoiceover|generate.*Music|from\s+["']replicate["']/i,
);

console.log("Brainrot kit smoke passed. No provider was called.");
