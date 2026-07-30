import assert from "node:assert/strict";
import {
  playbackPaused,
  playbackStarted,
  playbackSynced,
} from "../features/discovery/playbackState";

const first = playbackStarted("first");

assert.deepEqual(
  first,
  { id: "first", muted: false, playing: true },
  "Explicit playback should start the selected media with sound.",
);
assert.deepEqual(
  playbackPaused(first, "first"),
  { id: "first", muted: true, playing: false },
  "Pausing should also silence the selected media.",
);
assert.equal(
  playbackPaused(first, "second"),
  first,
  "Pausing stale media should not change the selected media.",
);
assert.deepEqual(
  playbackSynced(first, "first", { muted: true, paused: false }),
  { id: "first", muted: true, playing: true },
  "Native mute events should reconcile the visible controls.",
);
assert.deepEqual(
  playbackSynced(first, "first", { muted: false, paused: true }),
  { id: "first", muted: true, playing: false },
  "Native pause events should leave the controls silent.",
);
assert.equal(
  playbackSynced(first, "second", { muted: false, paused: true }),
  first,
  "Native events from stale media should not change the selected media.",
);
assert.deepEqual(
  playbackStarted("second"),
  { id: "second", muted: false, playing: true },
  "Starting another card should replace the selected playback.",
);

console.log("discovery playback tests passed");
