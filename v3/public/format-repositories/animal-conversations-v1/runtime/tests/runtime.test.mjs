import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateTimeline } from "../validate.mjs";
import { LAYOUTS, visualState } from "../render.mjs";

const formatRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("timeline accepts only contiguous approved conversation beats", () => {
  assert.deepEqual(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Hello" },
    { start: 1, end: 2, speaker: "bunny", camera: "bunny-close", caption: "Hi" },
  ], 2), []);
  assert.match(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "wide", caption: "Hello" },
  ], 1).join(" "), /camera/);
});

test("only the active speaker receives the talking pose", () => {
  const beat = { start: 0, end: 2, speaker: "cat", camera: "two-shot", caption: "Hello" };
  const open = visualState(beat, 3);
  assert.equal(open.catPose, "mouth-open");
  assert.notEqual(open.bunnyPose, "mouth-open");
});

test("conversation staging preserves inward orientation and a clear two-shot gap", async () => {
  const twoShot = LAYOUTS["two-shot"];
  const bunnyMetadata = await sharp(path.join(formatRoot, "assets/characters/bunny/idle.png")).metadata();
  const catMetadata = await sharp(path.join(formatRoot, "assets/characters/cat/idle.png")).metadata();
  const bunnyWidth = bunnyMetadata.width * twoShot.bunny.height / bunnyMetadata.height;
  const catWidth = catMetadata.width * twoShot.cat.height / catMetadata.height;
  const characterGap = twoShot.cat.left - (twoShot.bunny.left + bunnyWidth);

  assert.equal(twoShot.bunny.mirrorX, true);
  assert.equal(twoShot.cat.mirrorX, undefined);
  assert.equal(LAYOUTS["bunny-close"].bunny.mirrorX, true);
  assert.ok(characterGap >= 120, `expected at least 120px between characters, received ${characterGap}px`);
  assert.ok(twoShot.cat.left + catWidth <= 1080, "cat must remain inside the canvas");
});
