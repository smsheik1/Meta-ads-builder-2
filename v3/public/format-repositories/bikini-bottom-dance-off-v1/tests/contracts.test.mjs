import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { wrapWords } from "../runtime/compose.mjs";
import { CAPTION_HEIGHT, CAPTION_Y, CELL_HEIGHT, CELL_POSITIONS, GRID_TOP } from "../runtime/layout.mjs";
import { buildTimeline } from "../runtime/timeline.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (file) => JSON.parse(await readFile(new URL(file, root), "utf8"));

function pngDimensions(bytes) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("the timeline is exactly 47 seconds with no gaps, five-second solos, and a replay bridge", async () => {
  const input = await readJson("fixtures/smoke/input.json");
  const dialogue = [
    { id: "opening", durationSeconds: 0.7 },
    { id: "taunt-patrick", durationSeconds: 2 },
    { id: "taunt-mr-krabs", durationSeconds: 2.1 },
    { id: "taunt-squilliam", durationSeconds: 2.2 },
    { id: "closing-spongebob", timelineEventId: "closing", characterId: "spongebob", durationSeconds: 2.3 },
    { id: "closing-patrick", timelineEventId: "closing", characterId: "patrick", durationSeconds: 1.9 },
    { id: "closing-mr-krabs", timelineEventId: "closing", characterId: "mr-krabs", durationSeconds: 2.2 },
    { id: "closing", timelineEventId: "closing", characterId: "squilliam", durationSeconds: 2 },
  ];
  const timeline = buildTimeline(input, dialogue);
  assert.equal(timeline.events[0].start, 0);
  for (let index = 1; index < timeline.events.length; index += 1) {
    assert.equal(timeline.events[index - 1].end, timeline.events[index].start);
  }
  assert.equal(timeline.events.at(-1).end, 47);
  assert.ok(timeline.danceDuration >= 5);
  assert.ok(Math.abs(timeline.finale.end - timeline.finale.start - 9) < 0.01);
  assert.equal(timeline.events.at(-1).type, "loop-bridge");
  assert.equal(timeline.loopBridge.end - timeline.loopBridge.start, 1);
  assert.deepEqual(timeline.closingChorus.characterIds, ["spongebob", "patrick", "mr-krabs", "squilliam"]);
});

test("the smoke roster uses every verified character once", async () => {
  const input = await readJson("fixtures/smoke/input.json");
  assert.deepEqual(input.characters.map((character) => character.characterId).sort(), ["mr-krabs", "patrick", "spongebob", "squilliam"]);
  assert.ok(input.characters.every((character) => character.reactionMotionId));
});

test("a second proof input replaces every solo and finale without runtime changes", async () => {
  const original = await readJson("fixtures/smoke/input.json");
  const alternate = await readJson("fixtures/alternate/input.json");
  assert.deepEqual(alternate.characters.map((character) => character.characterId), original.characters.map((character) => character.characterId));
  for (const [index, character] of alternate.characters.entries()) {
    assert.notEqual(character.motionId, original.characters[index].motionId);
    assert.notEqual(character.finaleMotionId, original.characters[index].finaleMotionId);
    assert.ok(character.reactionMotionId);
  }
  assert.equal(original.outerBackground, "deep-ocean");
  assert.equal(alternate.outerBackground, "dance-club");
});

test("four packaged outer backgrounds are selectable without changing the character renderer", async () => {
  const [contract, manifest] = await Promise.all([
    readJson("input-contract.json"),
    readJson("assets/background-options.json"),
  ]);
  const ids = ["deep-ocean", "retro-tv", "dance-club", "control-room"];
  assert.equal(manifest.default, "deep-ocean");
  assert.deepEqual(manifest.options.map((option) => option.id), ids);
  assert.deepEqual(contract.properties.outerBackground.enum, ids);
  assert.equal(contract.properties.outerBackground.default, manifest.default);
  for (const option of manifest.options) {
    const bytes = await readFile(new URL(option.path, root));
    assert.deepEqual(pngDimensions(bytes), { width: 1080, height: 1920 });
    assert.equal(createHash("sha256").update(bytes).digest("hex"), option.sha256);
  }
  const [runner, compositor] = await Promise.all([
    readFile(new URL("runner.mjs", root), "utf8"),
    readFile(new URL("runtime/compose.mjs", root), "utf8"),
  ]);
  assert.match(runner, /resolveOuterBackground/);
  assert.match(runner, /Outer background checksum mismatch/);
  assert.match(compositor, /outerBackground\.file/);
  assert.match(compositor, /outerBackground: \{/);
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
  assert.deepEqual(voices.voices.map((voice) => voice.referenceId), [
    "9845e056f37b470d9a1005e41c864e25",
    "d1520b60870b4e9aa01eab5bfefb1c45",
    "394d3112f0da41049c42177f3ca31c5a",
    "f12d545dcc1149bab3b68bba84822a1e",
  ]);
  assert.equal(voices.voices.every((voice) => /^[0-9a-f]{32}$/.test(voice.referenceId)), true);
  assert.equal("privateReferenceEnvironmentVariable" in voices, false);
  const runner = await readFile(new URL("runner.mjs", root), "utf8");
  assert.doesNotMatch(runner, /SQUILLIAM_VOICE_ID/);
  assert.match(runner, /approve-provider/);
  assert.match(runner, /api\.fish\.audio\/v1\/tts/);
  assert.match(runner, /sample_rate: 44100/);
  assert.match(runner, /closing-\$\{character\.characterId\}/);
  assert.match(runner, /timelineEventId: "closing"/);
  assert.match(runner, /timelineEventId: spec\.timelineEventId/);
  assert.ok(runner.indexOf("const cache = await dialogueCacheStatus") < runner.indexOf("await loadLocalEnv()"));
  assert.ok(
    runner.indexOf("const cached = receipt && await exists(output)") <
      runner.indexOf("Missing packaged Fish Audio reference"),
    "cached voice clips must be reusable before a missing preset can stop generation",
  );
});

test("long spoken captions wrap inside the Reel-safe card", async () => {
  const input = await readJson("fixtures/smoke/input.json");
  for (const line of [...input.characters.slice(1).map((character) => character.taunt), input.closingLine]) {
    const wrapped = wrapWords(line);
    assert.equal(wrapped.length, 2);
    assert.ok(wrapped.every((part) => part.length <= 28));
  }
});

test("failed compositions do not consume a completed render attempt", async () => {
  const runner = await readFile(new URL("runner.mjs", root), "utf8");
  assert.match(runner, /const completedAttempts = state\.attempts \|\| 0/);
  assert.match(runner, /status: "rendering", attempts: completedAttempts/);
  assert.match(runner, /catch \(error\)[\s\S]*status: "render-failed"[\s\S]*attempts: completedAttempts/);
  assert.match(runner, /status: "rendered", attempts, renderedAt/);
});

test("the nine-second group showcase uses uninterrupted motions and hands off to a looping CTA", async () => {
  const output = await readJson("output-contract.json");
  assert.equal(output.video.durationSeconds, 47);
  assert.equal(output.timeline.minimumSoloSeconds, 5);
  assert.match(output.timeline.timingRule, /group showcase is 9 seconds/);
  assert.equal(output.timeline.sequence.at(-1).beat, "replay-loop-bridge");
  const quality = await readJson("quality.json");
  assert.ok(quality.automatic.minimumLoopSeamSsim >= 0.995);
  const inputs = await Promise.all([readJson("fixtures/smoke/input.json"), readJson("fixtures/alternate/input.json")]);
  const manifest = await readJson("../mixamo-character-motion-v1/assets/motions/manifest.json");
  for (const input of inputs) {
    for (const character of input.characters) {
      assert.ok(manifest.motions.some((candidate) => candidate.id === character.motionId));
      assert.ok(manifest.motions.some((candidate) => candidate.id === character.reactionMotionId));
      const motion = manifest.motions.find((candidate) => candidate.id === character.finaleMotionId);
      assert.ok(motion.durationSeconds >= 9);
    }
  }
  const compositor = await readFile(new URL("runtime/compose.mjs", root), "utf8");
  assert.doesNotMatch(compositor, /REACTION_MOTION_ID/);
  assert.match(compositor, /character\.reactionMotionId/);
  assert.match(compositor, /IDLE_SPEED = 0\.36/);
  assert.match(compositor, /RIGHT_COLUMN_SAFE_SHIFT = 76/);
  assert.equal(CELL_HEIGHT, 600);
  assert.equal(CAPTION_Y, 1440);
  assert.equal(CAPTION_HEIGHT, 130);
  assert.equal(CELL_POSITIONS.length, 4);
  assert.match(compositor, /stillSegment/);
  assert.ok(CAPTION_Y >= GRID_TOP + CELL_HEIGHT * 2, "caption lane must begin below the complete two-row character grid");
  assert.match(compositor, /countdownGraphic[\s\S]*fill-opacity="0\.68"[\s\S]*WHO CAN DANCE BEST\?/);
  assert.doesNotMatch(compositor, /RUN IT BACK/);
  assert.doesNotMatch(compositor, /ROUND TWO/);
  assert.doesNotMatch(compositor, /dance-punch/, "handoffs must not flash a crop-like panel overlay");
  assert.match(compositor, /finale[\s\S]*rect x="0" y="164" width="1080" height="64" fill="#061829"/);
  assert.doesNotMatch(compositor, /rect x="245" y="164" width="590"/);
  assert.match(compositor, /stinger/);
  assert.match(compositor, /-force_key_frames/);
  assert.match(compositor, /"-g", "30", "-keyint_min", "30", "-sc_threshold", "0"/, "delivery encoding must be seek-safe in browsers and Reels");
  assert.match(compositor, /atempo=/);
  assert.match(compositor, /volume=0\.5/);
  assert.match(compositor, /character\.finaleMotionId/);
  assert.match(compositor, /middleDuration > 1 \/ 30/);
  const inspector = await readFile(new URL("runtime/inspect.mjs", root), "utf8");
  assert.match(inspector, /freezedetect/);
  assert.match(inspector, /format=gray/);
  assert.match(inspector, /scale=540:960:flags=lanczos/);
  assert.match(inspector, /metric: "half-scale-luma-ssim"/);
  assert.match(inspector, /CELL_POSITIONS\.map/);
  assert.match(inspector, /closingChorusVoices/);
  assert.match(inspector, /closingCharacterMovesDuringCta/);
  assert.doesNotMatch(inspector, /squilliamMovesDuringCta/);
  assert.doesNotMatch(inspector, /finaleFrameHashes/);
  assert.match(inspector, /soloDurationSeconds/);
  assert.match(inspector, /groupFinaleDurationSeconds/);
  assert.match(inspector, /finaleRenderedClipCount/);
  assert.match(inspector, /finaleFreezeEventCounts/);
  assert.match(inspector, /noAudioMeasurements/);
  assert.match(inspector, /audio\?\.codec_name \?\? null/);
  assert.ok(
    inspector.indexOf('writeFile(path.join(runDirectory, "quality-report.json"') < inspector.indexOf("if (!technicalPassed)"),
    "failed technical inspections must preserve their evidence report before throwing",
  );
});

test("the compositor delegates character pixels to the motion repo", async () => {
  const composition = await readJson("composition-contract.json");
  assert.match(composition.rendererInvariant, /mixamo-character-motion-v1\/runtime\/renderer\/app\.js/);
  assert.ok(composition.fixed.some((rule) => rule.includes("Fish News underwater flower-and-bubble")));
  const compositor = await readFile(new URL("runtime/compose.mjs", root), "utf8");
  assert.match(compositor, /CHARACTER_BACKGROUND_PRESET = "fish-news"/);
  assert.match(compositor, /backgroundPreset: CHARACTER_BACKGROUND_PRESET/);
  assert.match(compositor, /characterClipName/);
});

test("the package boundary keeps Mixamo local and external calls explicit", async () => {
  const boundary = await readJson("content-boundary.json");
  assert.equal(boundary.localImports[0].providerApiCalls, 0);
  assert.equal(boundary.localImports[0].sourceFilePackaged, false);
  assert.deepEqual(boundary.providerCalls.map((provider) => provider.provider), ["Fish Audio"]);
  assert.equal(boundary.unsupportedAutomation[0].decision, "do not package or execute");
  const runner = await readFile(new URL("runner.mjs", root), "utf8");
  assert.match(runner, /case "list-motions"/);
  assert.match(runner, /case "import-motion"/);
  assert.match(runner, /mixamoApiCalls: 0/);
  assert.match(runner, /execute\("npm", \["test"\], \{ cwd: motionRoot \}\)/);
  const buildKit = await readFile(new URL("build-kit.mjs", root), "utf8");
  assert.match(buildKit, /workspaces: \["bikini-bottom-dance-off-v1", "mixamo-character-motion-v1"\]/);
  assert.match(buildKit, /node verify-entrypoints\.mjs/);
  assert.match(buildKit, /entrypointRoot/);
  assert.match(buildKit, /"kit-entrypoints"/);
  assert.match(buildKit, /await cp\(motionRoot/);
  assert.match(buildKit, /formatVersion = JSON\.parse/);
  assert.doesNotMatch(buildKit, /version: "0\.7/);
});

test("finalization requires a hash-bound blind review and returns one scored delivery bundle", async () => {
  const output = await readJson("output-contract.json");
  assert.equal(output.delivery.finalVideo, "final.mp4");
  assert.equal(output.delivery.machineReadableEval, "eval-report.json");
  assert.equal(output.delivery.friendlyEval, "eval-report.md");
  assert.equal(output.delivery.blindReview, "blind-review.json");
  const quality = await readJson("quality.json");
  assert.equal(quality.schemaVersion, 2);
  assert.equal(quality.technicalGates.length, 16);
  assert.equal(quality.grading.blindCriteria.reduce((sum, criterion) => sum + criterion.weight, 0), 100);
  assert.equal(quality.grading.ratingScale.length, 5);
  assert.equal(quality.grading.passingScore, 85);
  assert.ok(quality.grading.blindCriteria.every((criterion) => Object.keys(criterion.anchors).length === 5));
  assert.equal(quality.blindReview.requiredPlayback.perceptionMode, "direct");
  assert.equal(quality.blindReview.escalation.requireDecisionAgreement, true);
  const runner = await readFile(new URL("runner.mjs", root), "utf8");
  assert.match(runner, /delivery\.json/);
  assert.match(runner, /eval-report\.md/);
  assert.match(runner, /--review=\/absolute\/path\/to\/blind-review\.json/);
  assert.match(runner, /review-packet\.json/);
  assert.match(runner, /--second-review=\/absolute\/path\/to\/an-independent-review\.json/);
  assert.match(runner, /compareBlindReviews/);
  assert.doesNotMatch(runner, /human-review=pass/);
  assert.match(runner, /grade: evaluation\.overall\.grade/);
});
