import test from "node:test";
import assert from "node:assert/strict";
import { approvedRevisionId, canonicalHash, semanticContent } from "../identity.mjs";

const input = {
  schemaVersion: 1, title: "Hello", episodeLabel: "A", background: "living-room", audioFile: "user-audio.wav",
  timeline: [{ start: 0, end: 1, speaker: "cat", camera: "cat-close", caption: "Hello", bounceAt: [0.2] }],
};

test("approved revision binds complete creative content and audio, not approval time or local filename", () => {
  const revision = approvedRevisionId(input, "audio-a");
  assert.equal(approvedRevisionId({ ...input, audioFile: "renamed.wav" }, "audio-a"), revision);
  assert.notEqual(approvedRevisionId(input, "audio-b"), revision);
  for (const [key, value] of [["title", "Changed"], ["episodeLabel", "B"], ["background", "pool"]]) {
    assert.notEqual(approvedRevisionId({ ...input, [key]: value }, "audio-a"), revision, key);
  }
  for (const [key, value] of [["caption", "Hi"], ["speaker", "bunny"], ["camera", "two-shot"], ["end", 1.1], ["bounceAt", [0.3]]]) {
    assert.notEqual(approvedRevisionId({ ...input, timeline: [{ ...input.timeline[0], [key]: value }] }, "audio-a"), revision, key);
  }
  assert.equal("audioFile" in semanticContent(input), false);
});

test("canonical identity ignores JSON property order, not array order", () => {
  assert.equal(canonicalHash({ z: 1, a: { y: 2, b: 3 } }), canonicalHash({ a: { b: 3, y: 2 }, z: 1 }));
  assert.notEqual(canonicalHash([1, 2]), canonicalHash([2, 1]));
  assert.throws(() => approvedRevisionId(input), /Audio hash/);
});
