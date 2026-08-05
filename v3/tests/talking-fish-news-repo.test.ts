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
const skill = readFileSync(path.join(root, "SKILL.md"), "utf8");

assert.match(skill, /never repeat it in adjacent beats/i);

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
  assert.match(buildTalkingFishNewsConceptPrompt(fixture.research), /joke cannot replace the takeaway/i);
  assert.match(buildTalkingFishNewsScriptPrompt({ concept, research: fixture.research }), /38-60 words/);
  const scriptPrompt = buildTalkingFishNewsScriptPrompt({ concept, research: fixture.research });
  for (const storyStage of ["beginning", "escalation", "reveal", "ending"]) {
    assert.match(scriptPrompt, new RegExp(storyStage, "i"));
  }
  assert.match(scriptPrompt, /removal test/i);
  assert.match(scriptPrompt, /cold-scroll test/i);
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

const punchlineOnlyScript = structuredClone(mars.script);
punchlineOnlyScript.beats[3] = getSelectedTalkingFishNewsConcept(mars.concepts, mars.selection).punchline;
assert.ok(validateTalkingFishNewsScript(
  punchlineOnlyScript,
  getSelectedTalkingFishNewsConcept(mars.concepts, mars.selection),
).some((error) => error.includes("approved takeaway")));

const runner = readFileSync(path.resolve("scripts", "talking-fish-news-format.ts"), "utf8");
assert.match(runner, /--approve-voice/);
assert.doesNotMatch(runner, /from\s+["']replicate["']|generate.*(?:Image|Video|Music)/i);
assert.ok(
  runner.indexOf("await writeFile(audioFile, generated.bytes)")
    < runner.indexOf("transcription = await transcribeAudioWithDeepgram"),
  "Fish narration must be saved before Deepgram timing starts.",
);
assert.match(runner, /reusing saved Fish narration; no new voice call was made/i);
assert.match(runner, /Saved Fish narration belongs to a different script/i);
assert.match(runner, /rerun voice to time captions from the saved narration; no new Fish call will be made/i);
assert.match(runner, /process\.env\.REMOTION_BROWSER_EXECUTABLE/);
assert.match(runner, /browserExecutable: executable/);
assert.match(readFileSync(path.resolve("public", "format-repositories", "talking-fish-news-v1", ".env.example"), "utf8"), /REMOTION_BROWSER_EXECUTABLE=/);

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
