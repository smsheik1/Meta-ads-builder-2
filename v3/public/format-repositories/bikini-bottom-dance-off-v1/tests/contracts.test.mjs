import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (file) => JSON.parse(await readFile(new URL(file, root), "utf8"));

test("the timeline is exactly 30 seconds with no gaps", async () => {
  const output = await readJson("output-contract.json");
  assert.equal(output.timeline[0].start, 0);
  for (let index = 1; index < output.timeline.length; index += 1) {
    assert.equal(output.timeline[index - 1].end, output.timeline[index].start);
  }
  assert.equal(output.timeline.at(-1).end, 30);
  assert.equal(output.video.durationSeconds, 30);
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

test("the song is enabled only for dances and the countdown uses beeps", async () => {
  const output = await readJson("output-contract.json");
  assert.deepEqual(output.timeline[0], { start: 0, end: 3, beat: "countdown-beeps", song: false });
  for (const beat of output.timeline) {
    assert.equal(beat.song, beat.beat.startsWith("dance-") || beat.beat.includes("finale"));
  }
  const compositor = await readFile(new URL("runtime/compose.mjs", root), "utf8");
  assert.match(compositor, /sine=frequency=700/);
  assert.match(compositor, /anullsrc=r=48000:cl=stereo:d=/);
});

test("the compositor delegates character pixels to the motion repo", async () => {
  const composition = await readJson("composition-contract.json");
  assert.match(composition.rendererInvariant, /mixamo-character-motion-v1\/runtime\/renderer\/app\.js/);
});
