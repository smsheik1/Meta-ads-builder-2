import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve("public", "format-repositories", "talking-fish-news-v1");

for (const file of [
  "SKILL.md",
  "README.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "assets.json",
  "scene-contract.json",
  "prompts/concepts.md",
  "prompts/script.md",
  "fixtures/nasa-curiosity.json",
  "fixtures/nasa-wandering-black-hole.json",
  "goldens.json",
  "goldens/nasa-curiosity.mp4"
]) {
  assert.equal(existsSync(path.join(packageRoot, file)), true, `${file} is missing.`);
}

for (const file of [
  "public/talking-fish-news-assets/fixed-fish-anchor-open.png",
  "public/talking-fish-news-assets/fixed-fish-anchor-closed.png",
  "public/talking-fish-news-assets/underwater-studio-background.png",
  "public/talking-fish-news-assets/bikini-bottom-news-theme.mp3",
  "public/talking-fish-news-assets/wandering-black-hole-concept.jpg",
  "public/talking-fish-news-assets/wandering-black-hole-before.jpg",
  "public/talking-fish-news-assets/wandering-black-hole-before-after.jpg",
  "public/talking-fish-news-assets/wandering-black-hole-tidal-event.jpg"
]) {
  assert.equal(existsSync(path.resolve(file)), true, `${file} is missing.`);
}

const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
const runner = readFileSync("scripts/talking-fish-news-format.ts", "utf8");
assert.match(skill, /What should tonight's fish report cover\?/);
assert.match(skill, /Ask one question at a time/);
assert.match(skill, /exactly five concepts/i);
assert.match(skill, /Ready to make the fish voice\?/);
assert.match(runner, /--approve-voice/);
assert.match(runner, /generateFishTalkingFishNewsVoiceover/);
assert.doesNotMatch(runner, /from\s+["']replicate["']|generate.*(?:Image|Video|Music)/i);

console.log("Talking Fish News kit smoke passed. No provider was called.");
