import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildTalkingFishNewsConceptPrompt,
  buildTalkingFishNewsScriptPrompt,
  createExactTimedCaptions,
  getSelectedTalkingFishNewsConcept,
  validateTalkingFishNewsConcepts,
  validateTalkingFishNewsScript,
  type TalkingFishNewsConcepts,
  type TalkingFishNewsResearch,
  type TalkingFishNewsScript,
  type TalkingFishNewsSelection,
} from "../features/formats/talking-fish-news/repoRuntime";

type Fixture = {
  research: TalkingFishNewsResearch;
  concepts: TalkingFishNewsConcepts;
  selection: TalkingFishNewsSelection;
  script: TalkingFishNewsScript;
};

const root = path.resolve("public", "format-repositories", "talking-fish-news-v1");
const readJson = <T,>(relative: string) => JSON.parse(readFileSync(path.join(root, relative), "utf8")) as T;

for (const relative of [
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
  "goldens/nasa-curiosity.mp4",
]) assert.equal(existsSync(path.join(root, relative)), true, `${relative} is missing.`);

for (const fixtureName of ["nasa-curiosity.json"]) {
  const fixture = readJson<Fixture>(`fixtures/${fixtureName}`);
  const conceptErrors = validateTalkingFishNewsConcepts(fixture.concepts, fixture.selection, fixture.research);
  assert.deepEqual(conceptErrors, [], `${fixtureName}: ${conceptErrors.join(" ")}`);
  const concept = getSelectedTalkingFishNewsConcept(fixture.concepts, fixture.selection);
  const scriptErrors = validateTalkingFishNewsScript(fixture.script, concept);
  assert.deepEqual(scriptErrors, [], `${fixtureName}: ${scriptErrors.join(" ")}`);
  assert.equal(fixture.concepts.concepts.length, 5);
  assert.equal(concept.assetIds.length, 4);
  assert.equal(concept.storyMoves.length, 4);
  assert.match(buildTalkingFishNewsConceptPrompt(fixture.research), /exactly five concepts/i);
  assert.match(buildTalkingFishNewsConceptPrompt(fixture.research), /setup, escalation, reveal, payoff/i);
  assert.match(buildTalkingFishNewsConceptPrompt(fixture.research), /shuffle test/i);
  assert.match(buildTalkingFishNewsConceptPrompt(fixture.research), /fact stacking/i);
  assert.match(buildTalkingFishNewsScriptPrompt({ concept, research: fixture.research }), /38-60 words/);
  const scriptPrompt = buildTalkingFishNewsScriptPrompt({ concept, research: fixture.research });
  for (const storyStage of ["beginning", "escalation", "reveal", "ending"]) {
    assert.match(scriptPrompt, new RegExp(storyStage, "i"));
  }
  assert.match(scriptPrompt, /removal test/i);
}

const rejectedVisualFixture = readJson<Fixture>("fixtures/nasa-wandering-black-hole.json");
assert.ok(validateTalkingFishNewsConcepts(
  rejectedVisualFixture.concepts,
  rejectedVisualFixture.selection,
  rejectedVisualFixture.research,
).some((error) => error.includes("phone-size readability")));

const mars = readJson<Fixture & { audio: { captions: Array<{ text: string; startMs: number; endMs: number }> } }>(
  "fixtures/nasa-curiosity.json",
);
const exactCaptions = createExactTimedCaptions({
  script: mars.script,
  timingCaptions: mars.audio.captions.map((caption, index) => ({
    ...caption,
    text: `timing placeholder ${index + 1}`,
  })),
});
assert.equal(exactCaptions.map((caption) => caption.text).join(" "), mars.script.beats.join(" "));
assert.ok(exactCaptions.every((caption) => caption.text.split(/\s+/).length <= 6));

const invalidConcepts = structuredClone(mars.concepts);
invalidConcepts.concepts.pop();
assert.ok(validateTalkingFishNewsConcepts(
  invalidConcepts as TalkingFishNewsConcepts,
  mars.selection,
  mars.research,
).some((error) => error.includes("Exactly five concepts")));

const flatConcepts = structuredClone(mars.concepts);
flatConcepts.concepts[0].storyMoves = [] as unknown as [string, string, string, string];
assert.ok(validateTalkingFishNewsConcepts(
  flatConcepts,
  mars.selection,
  mars.research,
).some((error) => error.includes("four clear story moves")));

const duplicatedAssetResearch = structuredClone(mars.research);
duplicatedAssetResearch.visualAssets[1].src = duplicatedAssetResearch.visualAssets[0].src;
assert.ok(validateTalkingFishNewsConcepts(
  mars.concepts,
  mars.selection,
  duplicatedAssetResearch,
).some((error) => error.includes("distinct local image files")));

const invalidScript = structuredClone(mars.script);
invalidScript.beats[3] = "Visit a website now.";
assert.ok(validateTalkingFishNewsScript(
  invalidScript,
  getSelectedTalkingFishNewsConcept(mars.concepts, mars.selection),
).some((error) => error.includes("approved punchline")));

const runner = readFileSync(path.resolve("scripts", "talking-fish-news-format.ts"), "utf8");
assert.match(runner, /--approve-voice/);
assert.doesNotMatch(runner, /from\s+["']replicate["']|generate.*(?:Image|Video|Music)/i);

const blockedVoice = spawnSync(process.execPath, [
  "--import",
  "tsx",
  "scripts/talking-fish-news-format.ts",
  "voice",
  "--run=unapproved-voice-probe",
], {
  cwd: path.resolve("."),
  encoding: "utf8",
});
assert.notEqual(blockedVoice.status, 0);
assert.match(
  `${blockedVoice.stdout}${blockedVoice.stderr}`,
  /Use --approve-voice only after showing the selected script and estimate to the user/,
);

console.log("talking fish news repo tests passed");
