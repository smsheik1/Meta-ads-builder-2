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

test("the compositor delegates character pixels to the motion repo", async () => {
  const composition = await readJson("composition-contract.json");
  assert.match(composition.rendererInvariant, /mixamo-character-motion-v1\/runtime\/renderer\/app\.js/);
});
