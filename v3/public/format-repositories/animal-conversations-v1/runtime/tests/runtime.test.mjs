import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateTimeline } from "../validate.mjs";
import { blinkStateAtFrame, buildBlinkSchedule, buildMouthAnimationTrack, buildSpeechActivityTrack, CAPTION_TOP_Y, captionChunks, captionSvg, captionTextAtFrame, LAYOUTS, visualState } from "../render.mjs";
import { approveScriptReviewDocument, createScriptReviewDocument, reviewedScriptHash, scriptApprovalHash } from "../speaker-review.mjs";
import { readJson, requireEpisodeInputSource } from "../common.mjs";

test("real episode initialization fails closed without a timing input", () => {
  assert.throws(() => requireEpisodeInputSource(), /every real episode/);
  assert.equal(requireEpisodeInputSource("/tmp/episode.json"), "/tmp/episode.json");
});

const formatRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function markCompleteScriptApproved(input, review, basis = "user-confirmed-complete-script") {
  review.approval = {
    approved: true,
    basis,
    approvedBy: basis === "packaged-smoke-fixture" ? "packaged smoke fixture" : "episode user",
    approvalNote: "The complete ordered script, including all roles, words, nonverbal vocalizations, and silence, was explicitly approved.",
    scriptHash: reviewedScriptHash(input, review),
  };
  return review;
}

test("timeline accepts only contiguous approved conversation beats", () => {
  assert.deepEqual(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Hello" },
    { start: 1, end: 2, speaker: "bunny", camera: "bunny-close", caption: "Hi" },
  ], 2), []);
  assert.match(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "wide", caption: "Hello" },
  ], 1).join(" "), /camera/);
  assert.match(validateTimeline([
    { start: 0, end: 1, speaker: "both", camera: "two-shot", caption: "Together" },
  ], 1).join(" "), /overlapEvidence.*required/);
  assert.deepEqual(validateTimeline([
    { start: 0, end: 1, speaker: "both", camera: "two-shot", caption: "Together", overlapEvidence: "Two independently identified voices are simultaneous." },
  ], 1), []);
  assert.match(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "two-shot", caption: "Solo", overlapEvidence: "uncertain" },
  ], 1).join(" "), /permitted only when speaker=both/);
  assert.deepEqual(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "", vocalization: "Emotional gasp and shriek" },
  ], 1), []);
  assert.match(validateTimeline([
    { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Words", vocalization: "Shriek" },
  ], 1).join(" "), /exactly one of caption or vocalization/);
  assert.match(validateTimeline([
    { start: 0, end: 1, speaker: "none", camera: "two-shot", caption: "", vocalization: "Unknown sound" },
  ], 1).join(" "), /speaker=none cannot contain/);
});

test("only the active speaker receives the talking pose", () => {
  const beat = { start: 0, end: 2, speaker: "cat", camera: "two-shot", caption: "Hello" };
  const open = visualState(beat, 3);
  assert.equal(open.catPose, "mouth-open");
  assert.notEqual(open.bunnyPose, "mouth-open");
});

test("mouth motion closes for real pauses without reacting to brief quiet frames", () => {
  const loud = [-60, -60, -60, -15, -15, -15, -50, -50, -15, -15, -15, -60, -60, -60, -60, -60, -60, -60, -60, -15, -15, -15];
  const quiet = loud.map((level) => level - 20);
  const loudTrack = buildSpeechActivityTrack(loud);
  const quietTrack = buildSpeechActivityTrack(quiet);
  assert.deepEqual(loudTrack.activeFrames, quietTrack.activeFrames, "volume changes should not change the mouth timing");
  assert.ok(loudTrack.activeFrames[6], "a brief quiet dip inside speech should remain active");
  assert.equal(loudTrack.activeFrames[15], false, "the middle of a sustained pause should close the mouth");
  for (let start = 1; start < loudTrack.activeFrames.length - 1;) {
    if (loudTrack.activeFrames[start]) {
      start += 1;
      continue;
    }
    let end = start + 1;
    while (end < loudTrack.activeFrames.length && !loudTrack.activeFrames[end]) end += 1;
    if (end < loudTrack.activeFrames.length) assert.ok(end - start >= 3, "a detected interior pause must never create a one-frame mouth twitch");
    start = end;
  }

  const beat = { start: 0, end: 2, speaker: "cat", camera: "cat-close", caption: "Hello" };
  assert.equal(visualState(beat, 3, { cat: false, bunny: false }, true).catPose, "mouth-open");
  assert.equal(visualState(beat, 3, { cat: false, bunny: false }, false).catPose, "idle");
  assert.notEqual(visualState(beat, 3, { cat: false, bunny: false }, false).bunnyPose, "mouth-open");
});

test("mouth cadence follows the audio envelope instead of a fixed frame clock", () => {
  const slowLevels = Array(16).fill(-18);
  const slowTrack = buildMouthAnimationTrack(slowLevels, slowLevels.map(() => true));
  assert.ok(slowTrack.slice(1).every(Boolean), "a sustained slow vowel should hold the mouth open instead of flapping");

  const fastLevels = [-16, -15, -38, -39, -17, -16, -37, -38, -15, -16, -39, -38];
  const fastTrack = buildMouthAnimationTrack(fastLevels, fastLevels.map(() => true));
  const transitions = fastTrack.slice(1).filter((isOpen, index) => isOpen !== fastTrack[index]).length;
  assert.ok(transitions >= 4, "syllabic energy peaks should produce a visibly faster cadence");
  assert.deepEqual(
    buildMouthAnimationTrack(fastLevels.map((level) => level - 20), fastLevels.map(() => true)),
    fastTrack,
    "cadence should be stable after a volume shift",
  );
  assert.deepEqual(buildMouthAnimationTrack([-16, -16, -16], [true, false, true]), [true, false, true]);
});

test("blinks use independent deterministic tracks and favor dialogue boundaries", () => {
  const timeline = [
    { start: 0, end: 2.25, speaker: "both", camera: "two-shot", caption: "Together" },
    { start: 2.25, end: 6.85, speaker: "cat", camera: "cat-close", caption: "Cat talks" },
    { start: 6.85, end: 8, speaker: "bunny", camera: "bunny-close", caption: "Bunny talks" },
    { start: 8, end: 12, speaker: "both", camera: "two-shot", caption: "Together again" },
  ];
  const schedule = buildBlinkSchedule(timeline, 12 * 24);
  assert.deepEqual(schedule, buildBlinkSchedule(timeline, 12 * 24), "the same input must always produce the same blinks");
  assert.equal(schedule.cat[0], 53, "cat's first due blink should align just before the 2.25s dialogue boundary");
  assert.equal(schedule.bunny[0], 191, "an offscreen bunny blink should be skipped and the next due blink aligned to a visible boundary");
  assert.ok(schedule.cat.every((frame) => !schedule.bunny.some((other) => Math.abs(frame - other) <= 5)), "character blinks should not look mechanically synchronized");
  for (const starts of Object.values(schedule)) {
    for (let index = 1; index < starts.length; index += 1) assert.ok(starts[index] - starts[index - 1] >= 72);
  }

  assert.deepEqual(blinkStateAtFrame(schedule, 53), { cat: true, bunny: false });
  assert.deepEqual(blinkStateAtFrame(schedule, 55), { cat: true, bunny: false });
  assert.deepEqual(blinkStateAtFrame(schedule, 56), { cat: false, bunny: false });
  const speaking = timeline[0];
  assert.equal(visualState(speaking, 53, blinkStateAtFrame(schedule, 53)).catPose, "blink", "a due blink should not be swallowed by the mouth cycle");

  const sharedBoundary = buildBlinkSchedule([
    { start: 0, end: 259 / 24, speaker: "both", camera: "two-shot", caption: "Together" },
    { start: 259 / 24, end: 14, speaker: "both", camera: "two-shot", caption: "Still together" },
  ], 14 * 24);
  assert.ok(sharedBoundary.cat.includes(258), "the cat should use the nearby shared boundary");
  assert.ok(sharedBoundary.bunny.includes(266), "the bunny should stagger instead of blinking with the cat");
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

test("captions stay in the lower bottom-third lane without a background panel", () => {
  const svg = captionSvg({ speaker: "cat" }, "I have something", "ANIMAL CONVERSATIONS").toString();
  assert.equal(CAPTION_TOP_Y, 1400);
  assert.match(svg, /<text x="540" y="1476"/);
  assert.doesNotMatch(svg, /<rect x="68"/);
  assert.doesNotMatch(svg, /fill-opacity="0\.70"/);
  assert.match(svg, /<rect x="173" y="1764"/, "the separate episode label should remain intact");
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

test("complete script approval is required and binds words, nonverbal events, roles, and timing", () => {
  const input = {
    audioFile: "user-audio.wav",
    timeline: [
      { start: 0, end: 1, speaker: "bunny", camera: "two-shot", caption: "No judging." },
      { start: 1, end: 2, speaker: "cat", camera: "cat-close", caption: "Okay." },
    ],
  };
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash", generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(review.beats[0].confirmedSpeaker, null);
  assert.match(review.instructions, /complete timed role script.*nonverbal vocalization.*user sees and approves the entire written script/);
  assert.throws(() => approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" }), /complete written role script must be explicitly approved/);
  assert.throws(() => approveScriptReviewDocument({ input, review, audioSha256: "replacement-audio" }), /user audio changed/);
  review.beats[0].confirmedSpeaker = "cat";
  review.beats[0].evidence = "direct-audio-review";
  review.beats[1].confirmedSpeaker = "cat";
  review.beats[1].evidence = "user-provided-label";
  markCompleteScriptApproved(input, review);
  const recastReview = structuredClone(review);
  recastReview.beats[0].confirmedSpeaker = "bunny";
  assert.throws(() => approveScriptReviewDocument({ input, review: recastReview, audioSha256: "audio-hash" }), /script approval is stale/);
  const changedTimeline = structuredClone(input);
  changedTimeline.timeline[0].camera = "cat-close";
  assert.throws(() => approveScriptReviewDocument({ input: changedTimeline, review, audioSha256: "audio-hash" }), /timing, words, vocalizations, or cameras changed/);
  const applied = approveScriptReviewDocument({ input, review, audioSha256: "audio-hash", appliedAt: "2026-01-01T00:01:00.000Z" });
  assert.equal(applied.receipt.method, "explicit-complete-script-approval");
  assert.equal(applied.input.timeline[0].speaker, "cat");
  assert.equal(applied.receipt.scriptHash, scriptApprovalHash(applied.input));
  assert.equal(applied.receipt.reviewedBeats, 2);
  assert.equal(applied.receipt.nonverbalBeats, 0);
  assert.equal(applied.receipt.approval.basis, "user-confirmed-complete-script");
});

test("nonverbal vocalizations are first-class approved beats and invalidate stale receipts", () => {
  const input = {
    audioFile: "user-audio.wav",
    timeline: [
      { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "", vocalization: "Emotional gasp and shriek" },
      { start: 1, end: 2, speaker: "bunny", camera: "bunny-close", caption: "No, no, no!" },
    ],
  };
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" });
  review.beats.forEach((beat) => {
    beat.confirmedSpeaker = beat.proposedSpeaker;
    beat.evidence = "user-provided-label";
  });
  markCompleteScriptApproved(input, review);
  const applied = approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" });
  assert.equal(applied.receipt.nonverbalBeats, 1);
  assert.equal(applied.receipt.spokenBeats, 1);
  const revised = structuredClone(applied.input);
  revised.timeline[0].vocalization = "Quiet gasp";
  assert.notEqual(scriptApprovalHash(revised), applied.receipt.scriptHash);
});

test("local audio analysis is explicit evidence only when its basis is documented", () => {
  const input = {
    audioFile: "user-audio.wav",
    timeline: [{ start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Hello" }],
  };
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" });
  review.beats[0].confirmedSpeaker = "cat";
  review.beats[0].evidence = "local-audio-analysis";
  assert.throws(() => approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" }), /evidenceNote/);
  review.beats[0].evidenceNote = "Local ASR word timings plus two-speaker diarization; speaker 0 was creatively cast as cat.";
  review.voiceCharacterMap.voice_0 = "cat";
  review.beats[0].detectedVoices = ["voice_0"];
  markCompleteScriptApproved(input, review);
  const applied = approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" });
  assert.equal(applied.receipt.evidenceCounts["local-audio-analysis"], 1);
  assert.equal(applied.receipt.voiceBoundBeats, 1);
  assert.equal(applied.receipt.voiceCharacterMap.voice_0, "cat");
});

test("local audio analysis cannot recast one detected voice at a later dialogue turn", () => {
  const input = {
    audioFile: "user-audio.wav",
    timeline: [
      { start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "First" },
      { start: 1, end: 2, speaker: "bunny", camera: "bunny-close", caption: "Later" },
    ],
  };
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" });
  review.voiceCharacterMap.voice_0 = "cat";
  review.beats.forEach((beat) => {
    beat.evidence = "local-audio-analysis";
    beat.evidenceNote = "The same diarized voice_0 continues across this caption boundary.";
    beat.detectedVoices = ["voice_0"];
  });
  review.beats[0].confirmedSpeaker = "cat";
  review.beats[1].confirmedSpeaker = "bunny";
  markCompleteScriptApproved(input, review);
  assert.throws(() => approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" }), /same confirmed character/);
});

test("speaker=both requires explicitly confirmed simultaneous speech and never represents uncertainty", () => {
  const input = {
    audioFile: "user-audio.wav",
    timeline: [{ start: 0, end: 1, speaker: "both", camera: "two-shot", caption: "Together" }],
  };
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" });
  review.voiceCharacterMap.voice_cat = "cat";
  review.voiceCharacterMap.voice_bunny = "bunny";
  review.beats[0].confirmedSpeaker = "both";
  review.beats[0].evidence = "local-audio-analysis";
  review.beats[0].evidenceNote = "Overlap-aware local analysis identifies cat and bunny speaking simultaneously from 0.20–0.72 seconds.";
  review.beats[0].detectedVoices = ["voice_cat", "voice_bunny"];
  markCompleteScriptApproved(input, review);
  assert.throws(() => approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" }), /overlapConfirmed=true/);
  review.beats[0].overlapConfirmed = true;
  const applied = approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" });
  assert.equal(applied.receipt.confirmedOverlapBeats, 1);
  assert.match(applied.input.timeline[0].overlapEvidence, /simultaneously/);

  review.beats[0].confirmedSpeaker = "cat";
  assert.throws(() => approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" }), /only when confirmedSpeaker=both/);
});

test("the supplied sample assigns the disputed blue-caption lines to the cat", async () => {
  const sample = await readJson(path.join(formatRoot, "fixtures/sample/input.json"));
  const speakersByCaption = new Map(sample.timeline.map((beat) => [beat.caption, beat.speaker]));
  assert.equal(speakersByCaption.get("No judging. No judging. No judging."), "cat");
  assert.equal(speakersByCaption.get("We listen."), "cat");
  assert.equal(speakersByCaption.get("We're just listening..."), "cat");
});

test("quality review requires complete-script approval and honest perception disclosure", async () => {
  const quality = await readJson(path.join(formatRoot, "quality.json"));
  const requirements = await readJson(path.join(formatRoot, "requirements.json"));
  const inputContract = await readJson(path.join(formatRoot, "input-contract.json"));
  const compositionContract = await readJson(path.join(formatRoot, "composition-contract.json"));
  const kitManifest = await readJson(path.join(formatRoot, "KIT-MANIFEST.json"));
  assert.equal(quality.blindReview.requiredPlayback.perceptionMode, "best-available-with-explicit-disclosure");
  const criteria = quality.blindReview.criteria.join(" ");
  assert.match(criteria, /complete role script.*spoken line.*nonverbal vocalization.*character assignment/);
  assert.match(criteria, /automated transcription.*diarization.*never approve roles/);
  assert.match(criteria, /mentor, lead, questioner, and foil.*episode-specific roles.*user-approved complete script/);
  assert.doesNotMatch(criteria, /grounded, wise lead|questioner\/foil/);
  assert.match(criteria, /elongated phrases.*trailing words.*same speaker.*last audible word/);
  assert.match(criteria, /intelligibility.*otherwise explicitly left unscored/);
  assert.match(requirements.notes.join(" "), /complete role script.*spoken line.*nonverbal vocalization.*character assignment/);
  assert.match(requirements.notes.join(" "), /speaker=both.*simultaneous-speech evidence.*uncertainty must stop/);
  assert.match(requirements.notes.join(" "), /stable detected voice ID.*user-confirmed character.*Never infer.*mentor.*lead.*questioner.*foil/);
  assert.doesNotMatch(requirements.notes.join(" "), /grounded, wise lead|questioner\/foil/);
  assert.match(requirements.notes.join(" "), /speaker handoff.*last audible word.*elongated phrases.*trailing words/);
  assert.match(inputContract.timingRules.join(" "), /spoken caption text.*named nonverbal vocalization/);
  assert.match(inputContract.timingRules.join(" "), /speaker boundary.*last audible word.*elongated phrases.*trailing words.*delivery slows down/);
  assert.match(inputContract.timingRules.join(" "), /user sees and approves the complete written role script/);
  assert.match(inputContract.timingRules.join(" "), /speaker=both.*simultaneous speech.*alternating voices.*single-speaker beats/);
  assert.match(inputContract.timingRules.join(" "), /voiceCharacterMap.*detectedVoices.*cannot change characters/);
  assert.match(compositionContract.fixed.join(" "), /blue dog.*runtime ID cat.*pink bunny.*narrative roles are not fixed.*approved episode script/);
  assert.doesNotMatch(compositionContract.fixed.join(" "), /grounded, wise lead|questioner\/foil/);
  assert.match(compositionContract.replaceable.join(" "), /episode-specific narrative roles.*mentor.*lead.*questioner.*foil/);
  assert.match(kitManifest.excluded.join(" "), /raw user-supplied runtime audio.*proof MP4 retains its distributable soundtrack/);
});

test("format kit build strips nondeterministic ZIP metadata", async () => {
  const buildSource = await readFile(path.join(formatRoot, "build-kit.mjs"), "utf8");
  assert.match(buildSource, /"-X", "-r"/);
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
