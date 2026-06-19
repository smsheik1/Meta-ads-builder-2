import assert from "node:assert/strict";
import {
  BRICK_MUSIC_VIDEO_STYLE_ID,
  BRICK_STORYBOARD_IMAGE_MODEL,
  createBrickStoryboardPromptPlan,
  DEFAULT_BRICK_STORYBOARD_SHOT_COUNT,
  buildBrickMusicVideoClips,
  deriveBrickStoryboardShots,
  normalizeBrickStoryboardShotCount,
  type BrickStoryboard,
} from "../features/formats/jingle/storyboard";
import { JINGLE_MUSIC_LENGTH_MS } from "../features/formats/jingle/prompt";
import { createJingleAdScene } from "../features/scene/createJingleScene";
import { makeResearch } from "./helpers/research";

const variant = {
  angle: "AI answer visibility",
  brandPhonetic: "Nexrage",
  musicLengthMs: JINGLE_MUSIC_LENGTH_MS,
  compositionPlan: {
    chunks: [
      {
        text: "[Hook]\nNexrage on the rise\nNexrage",
        duration_ms: 6000,
        positive_styles: ["cinematic trap diss rap", "95 BPM", "hard 808s", "trap hi-hat rolls"],
        negative_styles: ["sad", "slow"],
        context_adherence: "high" as const,
      },
      {
        text: "[Verse]\nThey ask and rivals show\nNow your name gets known",
        duration_ms: 8000,
        positive_styles: ["cinematic trap diss rap", "95 BPM", "hard 808s", "trap hi-hat rolls"],
        negative_styles: ["sad", "slow"],
        context_adherence: "high" as const,
      },
      {
        text: "[Hook]\nNexrage on the rise\nNexrage",
        duration_ms: 6000,
        positive_styles: ["cinematic trap diss rap", "95 BPM", "hard 808s", "trap hi-hat rolls"],
        negative_styles: ["sad", "slow"],
        context_adherence: "high" as const,
      },
    ],
  },
  lyrics: ["Nexrage on the rise", "Nexrage", "They ask and rivals show", "Now your name gets known", "Nexrage on the rise", "Nexrage"],
  selfCheckPassed: "durations sum to 20000; final line is Nexrage",
};

const scene = createJingleAdScene({
  research: makeResearch({
    brand: {
      ...makeResearch().brand,
      name: "Nexrage",
      description: "AI visibility tracking for brands.",
      colors: ["#8B5CF6", "#020617"],
    },
  }),
  variant,
  candidateIndex: 0,
  generationBatchId: "jingle-board",
  model: "test-model",
  provider: "nvidia-nim",
  now: 1,
});

assert.equal(BRICK_MUSIC_VIDEO_STYLE_ID, "brick-music-video");
assert.equal(BRICK_STORYBOARD_IMAGE_MODEL, "google/nano-banana-2");
assert.equal(DEFAULT_BRICK_STORYBOARD_SHOT_COUNT, 3);
assert.equal(normalizeBrickStoryboardShotCount(99), 8);
assert.equal(normalizeBrickStoryboardShotCount(1), 3);

const slots = deriveBrickStoryboardShots(scene);
assert.equal(slots.length, 3);
assert.deepEqual(slots.map((slot) => slot.durationMs), [6000, 8000, 6000]);
assert.equal(slots.reduce((sum, slot) => sum + slot.durationMs, 0), JINGLE_MUSIC_LENGTH_MS);
assert.deepEqual(slots.map((slot) => slot.section), ["hook", "verse", "hook"]);

const sixSlots = deriveBrickStoryboardShots(scene, 6);
assert.equal(sixSlots.length, 6);
assert.equal(sixSlots.reduce((sum, slot) => sum + slot.durationMs, 0), JINGLE_MUSIC_LENGTH_MS);

const generatedPlan = createBrickStoryboardPromptPlan(scene);
assert.equal(generatedPlan.shots.length, 3);
assert.ok(generatedPlan.referenceFramePrompt.includes("toy-brick"));
assert.ok(generatedPlan.referenceFramePrompt.includes("Nexrage"));
assert.ok(generatedPlan.referenceFramePrompt.includes("#8B5CF6"));
assert.ok(generatedPlan.referenceFramePrompt.includes("No Dutch angle"));
assert.ok(!/\blego\b/i.test(generatedPlan.referenceFramePrompt));
assert.ok(generatedPlan.referenceFramePrompt.includes("No captions, no subtitles, no lyric text"));
for (const shot of generatedPlan.shots) {
  assert.equal(shot.shotIndex, slots[shot.shotIndex]!.shotIndex);
  assert.ok(shot.shotPrompt.includes("toy-brick"));
  assert.ok(shot.shotPrompt.includes("Same toy-brick stage as the reference frame."));
  assert.ok(shot.shotPrompt.includes("No camera shake"));
  assert.ok(shot.shotPrompt.includes(shot.lyricLine));
  assert.ok(!/\blego\b/i.test(shot.shotPrompt));
}

const storyboard: BrickStoryboard = {
  jingleSceneId: "scene_1",
  visualStyle: BRICK_MUSIC_VIDEO_STYLE_ID,
  imageModel: BRICK_STORYBOARD_IMAGE_MODEL,
  shotCount: 3,
  referenceFrame: { prompt: "toy-brick stage", status: "ok" },
  shots: slots.map((slot) => ({
    ...slot,
    shotPrompt: `shot ${slot.shotIndex}`,
    status: "ok",
    video: {
      storageId: `video_${slot.shotIndex}`,
      url: `https://example.com/video-${slot.shotIndex}.mp4`,
      mimeType: "video/mp4",
    },
  })),
};
const clips = buildBrickMusicVideoClips(storyboard);
assert.deepEqual(clips.map((clip) => [clip.startMs, clip.endMs]), [[0, 6000], [6000, 14000], [14000, 20000]]);
assert.deepEqual(clips.map((clip) => clip.storageId), ["video_0", "video_1", "video_2"]);
assert.throws(
  () => buildBrickMusicVideoClips({
    ...storyboard,
    shots: storyboard.shots.map((shot, index) => (index === 1 ? { ...shot, video: undefined } : shot)),
  }),
  /needs a generated video/,
);

console.log("jingle-storyboard tests passed");
