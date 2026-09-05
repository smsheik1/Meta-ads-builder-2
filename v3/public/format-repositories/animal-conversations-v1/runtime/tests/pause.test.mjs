import test from "node:test";
import assert from "node:assert/strict";
import { buildSpeechActivityTrack, speakingPauseFrameRanges } from "../render.mjs";
import { pauseClosuresStable } from "../inspect.mjs";

function stable(ranges, frameCount) {
  return pauseClosuresStable({ inactiveSpeakingFrameRanges: ranges }, frameCount);
}

test("a pause continuing from speech into silence is measured in full", () => {
  const { activeFrames } = buildSpeechActivityTrack([
    ...Array(6).fill(-15), ...Array(10).fill(-80), ...Array(8).fill(-15),
  ]);
  const inactiveSpeakingFrames = [8, 9];
  const before = structuredClone({ activeFrames, inactiveSpeakingFrames });
  const ranges = speakingPauseFrameRanges(activeFrames, inactiveSpeakingFrames);
  assert.deepEqual(ranges, [[8, 13]]);
  assert.equal(stable([[8, 9]], activeFrames.length), false, "clipping the interval at the speech boundary caused the false failure");
  assert.equal(stable(ranges, activeFrames.length), true);
  assert.deepEqual({ activeFrames, inactiveSpeakingFrames }, before, "reporting must not change animation inputs");
});

test("a pause beginning in silence retains its full length when speech resumes", () => {
  const activeFrames = [true, true, false, false, false, false, false, true];
  const ranges = speakingPauseFrameRanges(activeFrames, [5, 6]);
  assert.deepEqual(ranges, [[2, 6]]);
  assert.equal(stable([[5, 6]], activeFrames.length), false);
  assert.equal(stable(ranges, activeFrames.length), true);
});

test("one pause spanning speech, silence, and another speaker stays one interval", () => {
  const activeFrames = [true, false, false, false, false, false, true];
  const ranges = speakingPauseFrameRanges(activeFrames, [1, 5]);
  assert.deepEqual(ranges, [[1, 5]]);
  assert.equal(stable(ranges, activeFrames.length), true);
});

test("genuinely short interior inactive intervals still fail the three-frame gate", () => {
  for (const length of [1, 2, 3]) {
    const activeFrames = [true, ...Array(length).fill(false), true];
    const ranges = speakingPauseFrameRanges(activeFrames, [1]);
    assert.deepEqual(ranges, [[1, length]], "never pad or merge a real short interval to make it pass");
    assert.equal(stable(ranges, activeFrames.length), length >= 3);
  }
});

test("separate pauses cannot be joined across active audio to pass inspection", () => {
  const activeFrames = [true, false, true, false, false, true];
  const ranges = speakingPauseFrameRanges(activeFrames, [1, 3, 4]);
  assert.deepEqual(ranges, [[1, 1], [3, 4]]);
  assert.equal(stable(ranges, activeFrames.length), false);
});

test("leading and trailing exceptions use complete audio intervals", () => {
  const activeFrames = [false, false, true, true, false, false];
  const ranges = speakingPauseFrameRanges(activeFrames, [1, 4]);
  assert.deepEqual(ranges, [[0, 1], [4, 5]]);
  assert.equal(stable(ranges, activeFrames.length), true);
});

test("audio inactivity entirely outside speaking beats is not a speaking pause", () => {
  assert.deepEqual(speakingPauseFrameRanges([true, false, false, false, true], []), []);
  assert.deepEqual(speakingPauseFrameRanges([true, true], []), []);
  assert.equal(stable([], 2), true);
  assert.equal(pauseClosuresStable(undefined, 2), false, "missing evidence must not pass");
});
