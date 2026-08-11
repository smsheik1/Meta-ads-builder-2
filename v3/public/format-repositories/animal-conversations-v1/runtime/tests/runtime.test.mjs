import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateTimeline } from "../validate.mjs";
import { LAYOUTS, visualState } from "../render.mjs";
import { applySpeakerReviewDocument, createSpeakerReviewDocument, speakerAssignmentHash } from "../speaker-review.mjs";
import { readJson } from "../common.mjs";

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

test("speaker review requires explicit evidence and binds the confirmed character to the timeline", () => {
  const input = {
    audioFile: "user-audio.wav",
    timeline: [
      { start: 0, end: 1, speaker: "bunny", camera: "two-shot", caption: "No judging." },
      { start: 1, end: 2, speaker: "cat", camera: "cat-close", caption: "Okay." },
    ],
  };
  const review = createSpeakerReviewDocument({ input, audioSha256: "audio-hash", generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(review.beats[0].confirmedSpeaker, null);
  assert.throws(() => applySpeakerReviewDocument({ input, review, audioSha256: "audio-hash" }), /needs confirmedSpeaker/);
  assert.throws(() => applySpeakerReviewDocument({ input, review, audioSha256: "replacement-audio" }), /user audio changed/);
  review.beats[0].confirmedSpeaker = "cat";
  review.beats[0].evidence = "direct-audio-review";
  review.beats[1].confirmedSpeaker = "cat";
  review.beats[1].evidence = "user-provided-label";
  const changedTimeline = structuredClone(input);
  changedTimeline.timeline[0].camera = "cat-close";
  assert.throws(() => applySpeakerReviewDocument({ input: changedTimeline, review, audioSha256: "audio-hash" }), /timeline timing, captions, or cameras changed/);
  const applied = applySpeakerReviewDocument({ input, review, audioSha256: "audio-hash", appliedAt: "2026-01-01T00:01:00.000Z" });
  assert.equal(applied.input.timeline[0].speaker, "cat");
  assert.equal(applied.receipt.timelineHash, speakerAssignmentHash(applied.input));
  assert.equal(applied.receipt.reviewedBeats, 2);
});

test("the supplied sample assigns the disputed blue-caption lines to the cat", async () => {
  const sample = await readJson(path.join(formatRoot, "fixtures/sample/input.json"));
  const speakersByCaption = new Map(sample.timeline.map((beat) => [beat.caption, beat.speaker]));
  assert.equal(speakersByCaption.get("No judging. No judging. No judging."), "cat");
  assert.equal(speakersByCaption.get("We listen."), "cat");
  assert.equal(speakersByCaption.get("We're just listening..."), "cat");
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
