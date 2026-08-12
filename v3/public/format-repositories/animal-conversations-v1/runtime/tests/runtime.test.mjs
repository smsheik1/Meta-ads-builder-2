import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateTimeline } from "../validate.mjs";
import { captionChunks, captionTextAtFrame, LAYOUTS, visualState } from "../render.mjs";
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

test("captions progress in readable one-to-three-word chunks instead of full sentences", () => {
  assert.deepEqual(captionChunks("I thought you liked it."), ["I thought you", "liked it."]);
  assert.deepEqual(captionChunks("One two three four"), ["One two", "three four"]);
  assert.deepEqual(captionChunks("No judging. No judging. No judging."), ["No judging.", "No judging.", "No judging."]);
  assert.ok(captionChunks("Whatever. I always thought I'd end up with Liam Hemsworth").every((chunk) => chunk.split(/\s+/).length <= 3));

  const beat = { start: 2, end: 4, speaker: "bunny", camera: "bunny-close", caption: "I thought you liked it." };
  assert.equal(captionTextAtFrame(beat, 48), "I thought you");
  assert.equal(captionTextAtFrame(beat, 72), "liked it.");
  assert.equal(visualState(beat, 72).captionText, "liked it.");
});

test("normal speech stays vertically still and bounce cues animate only the speaker", () => {
  const normal = { start: 0, end: 2, speaker: "cat", camera: "cat-close", caption: "Hello" };
  for (const frame of [0, 6, 12, 18, 24, 30]) {
    const state = visualState(normal, frame);
    assert.equal(state.catBob, 0);
    assert.equal(state.bunnyBob, 0);
  }

  const emphasized = { ...normal, bounceAt: [0.25] };
  assert.equal(visualState(emphasized, 6).catBob, 0);
  assert.ok(visualState(emphasized, 10).catBob < 0);
  assert.equal(visualState(emphasized, 10).bunnyBob, 0);
  assert.equal(visualState(emphasized, 16).catBob, 0);
});

test("bounce cues are optional, ordered, inside the beat, and capped at two", () => {
  const beat = { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Hello" };
  assert.deepEqual(validateTimeline([{ ...beat, bounceAt: [0.1, 0.4] }], 1), []);
  assert.match(validateTimeline([{ ...beat, bounceAt: [0.4, 0.1] }], 1).join(" "), /strictly increasing/);
  assert.match(validateTimeline([{ ...beat, bounceAt: [0.1, 0.4, 0.7] }], 1).join(" "), /at most two/);
  assert.match(validateTimeline([{ ...beat, bounceAt: [1] }], 1).join(" "), /inside the beat/);
  assert.match(validateTimeline([{ ...beat, jump: true }], 1).join(" "), /unknown field/);
  assert.match(validateTimeline([{ ...beat, speaker: "none", caption: "", bounceAt: [0.1] }], 1).join(" "), /active speaker/);
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
  assert.match(review.instructions, /direct audio.*user-provided label.*reference video.*silence/);
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
  assert.equal(applied.receipt.method, "explicit-per-beat-speaker-confirmation");
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

test("quality review requires honest perception disclosure for fallback speaker evidence", async () => {
  const quality = await readJson(path.join(formatRoot, "quality.json"));
  const requirements = await readJson(path.join(formatRoot, "requirements.json"));
  const inputContract = await readJson(path.join(formatRoot, "input-contract.json"));
  const kitManifest = await readJson(path.join(formatRoot, "KIT-MANIFEST.json"));
  assert.equal(quality.blindReview.requiredPlayback.perceptionMode, "best-available-with-explicit-disclosure");
  const criteria = quality.blindReview.criteria.join(" ");
  assert.match(criteria, /direct audio.*user label.*checksum-matched documented reference video.*silence/);
  assert.match(criteria, /intelligibility.*otherwise explicitly left unscored/);
  assert.match(requirements.notes.join(" "), /direct review.*user label.*checksum-matched documented reference video.*silence/);
  assert.match(inputContract.timingRules.join(" "), /direct audio.*user label.*checksum-matched documented reference video.*silence/);
  assert.match(kitManifest.excluded.join(" "), /raw user-supplied runtime audio.*proof MP4 retains its distributable soundtrack/);
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
