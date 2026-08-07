import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { wrapWords } from "../runtime/compose.mjs";
import { buildTimeline } from "../runtime/timeline.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (file) => JSON.parse(await readFile(new URL(file, root), "utf8"));

test("the timeline is exactly 30 seconds with no gaps", async () => {
  const input = await readJson("fixtures/smoke/input.json");
  const dialogue = [
    { id: "opening", durationSeconds: 0.7 },
    { id: "taunt-patrick", durationSeconds: 2 },
    { id: "taunt-mr-krabs", durationSeconds: 2.1 },
    { id: "taunt-squilliam", durationSeconds: 2.2 },
    { id: "closing", durationSeconds: 2 },
  ];
  const timeline = buildTimeline(input, dialogue);
  assert.equal(timeline.events[0].start, 0);
  for (let index = 1; index < timeline.events.length; index += 1) {
    assert.equal(timeline.events[index - 1].end, timeline.events[index].start);
  }
  assert.equal(timeline.events.at(-1).end, 30);
  assert.ok(timeline.danceDuration >= 2.5);
});

test("the smoke roster uses every verified character once", async () => {
  const input = await readJson("fixtures/smoke/input.json");
  assert.deepEqual(input.characters.map((character) => character.characterId).sort(), ["mr-krabs", "patrick", "spongebob", "squilliam"]);
});

test("each incoming challenger taunts the dancer directly before them", async () => {
  const input = await readJson("fixtures/smoke/input.json");
  assert.equal(input.characters[0].taunt, "");
  for (let index = 1; index < input.characters.length; index += 1) {
    const previousName = input.characters[index - 1].label.split(" ").at(-1);
    assert.match(input.characters[index].taunt, new RegExp(previousName, "i"));
  }
});

test("the song and Fish voices occupy mutually exclusive timeline beats", async () => {
  const output = await readJson("output-contract.json");
  assert.deepEqual(output.timeline.sequence[0], { beat: "countdown-beeps", song: false, voice: false });
  for (const beat of output.timeline.sequence) {
    assert.equal(beat.song, beat.beat.startsWith("dance-") || beat.beat.includes("finale"));
    assert.equal(beat.voice, beat.beat.includes("opening") || beat.beat.includes("taunts") || beat.beat.includes("cta"));
  }
  const compositor = await readFile(new URL("runtime/compose.mjs", root), "utf8");
  assert.match(compositor, /sine=frequency=700/);
  assert.match(compositor, /anullsrc=r=48000:cl=stereo:d=/);
});

test("the approved Fish voice presets are registered and provider calls require approval", async () => {
  const voices = await readJson("assets/voice-presets.json");
  assert.deepEqual(voices.voices.map((voice) => voice.characterId), ["spongebob", "patrick", "mr-krabs", "squilliam"]);
  assert.equal(voices.voices.at(-1).referenceId, null);
  assert.equal(voices.privateReferenceEnvironmentVariable, "SQUILLIAM_VOICE_ID");
  const runner = await readFile(new URL("runner.mjs", root), "utf8");
  assert.match(runner, /approve-provider/);
  assert.match(runner, /api\.fish\.audio\/v1\/tts/);
  assert.match(runner, /sample_rate: 44100/);
});

test("long spoken captions wrap inside the Reel-safe card", async () => {
  const input = await readJson("fixtures/smoke/input.json");
  for (const line of [...input.characters.slice(1).map((character) => character.taunt), input.closingLine]) {
    const wrapped = wrapWords(line);
    assert.equal(wrapped.length, 2);
    assert.ok(wrapped.every((part) => part.length <= 28));
  }
});

test("the compositor delegates character pixels to the motion repo", async () => {
  const composition = await readJson("composition-contract.json");
  assert.match(composition.rendererInvariant, /mixamo-character-motion-v1\/runtime\/renderer\/app\.js/);
});
