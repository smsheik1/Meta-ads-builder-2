import assert from "node:assert/strict";
import {
  BRICK_MUSIC_VIDEO_STYLE_ID,
  BRICK_STORYBOARD_IMAGE_MODEL,
  buildBrickStoryboardStoryPrompt,
  createBrickStoryboardPromptPlan,
  buildBrickMusicVideoClips,
  deriveBrickStoryboardShots,
  extractBrickStoryboardStoryPlan,
  generateBrickStoryboardStoryPlan,
  type BrickStoryboard,
  type BrickStoryboardStoryPlan,
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
    brandBrief: {
      ...makeResearch().brandBrief,
      ctaDirection: "Book a demo",
    },
  }),
  variant,
  candidateIndex: 0,
  generationBatchId: "jingle-board",
  model: "test-model",
  provider: "nvidia-nim",
  now: 1,
});

const slots = deriveBrickStoryboardShots(scene);
assert.equal(slots.length, 3);
assert.deepEqual(slots.map((slot) => slot.durationMs), [6000, 8000, 6000]);
assert.equal(slots.reduce((sum, slot) => sum + slot.durationMs, 0), JINGLE_MUSIC_LENGTH_MS);
assert.deepEqual(slots.map((slot) => slot.section), ["hook", "verse", "hook"]);

const storyPlan: BrickStoryboardStoryPlan = {
  shots: [
    {
      shotIndex: 0,
      lyricLine: slots[0]!.lyricLine,
      sceneDescription: "the brand name rises as a bright signal tower in the Lego city",
      motionHint: "purple signal bricks climb upward from the search dashboard",
      heroObject: "dim Lego search dashboard",
    },
    {
      shotIndex: 1,
      lyricLine: slots[1]!.lyricLine,
      sceneDescription: "rival names appear as blocks while the brand dashboard starts lighting up",
      motionHint: "a Lego character turns red rival tiles into purple brand tiles",
      heroObject: "overloaded Lego search dashboard",
    },
    {
      shotIndex: 2,
      lyricLine: slots[2]!.lyricLine,
      sceneDescription: "booking a demo becomes a Lego hand pressing the glowing dashboard action lever",
      motionHint: "the hero object opens a lit path from the dashboard to a booked calendar tile",
      heroObject: "glowing Lego search dashboard",
    },
  ],
};

const storyPrompt = buildBrickStoryboardStoryPrompt(scene);
assert.ok(storyPrompt.includes("Return B-roll beats only, NOT image prompts"));
assert.ok(storyPrompt.includes("EXACTLY one top-level key: shots"));
assert.ok(storyPrompt.includes("sceneDescription, motionHint, heroObject"));
assert.ok(storyPrompt.includes("LYRIC SLOTS"));
assert.ok(storyPrompt.includes('final shot sceneDescription must incorporate the CTA direction "Book a demo"'));
assert.ok(!storyPrompt.includes('"role"'));

assert.deepEqual(
  extractBrickStoryboardStoryPlan(JSON.stringify(storyPlan), slots),
  storyPlan,
);
let storyDirectorMaxTokens: number | undefined;
assert.deepEqual(
  await generateBrickStoryboardStoryPlan(scene, {
    nvidiaNimApiKey: "test-key",
    nvidiaNimChatCompletion: async ({ maxTokens }) => {
      storyDirectorMaxTokens = maxTokens;
      return JSON.stringify(storyPlan);
    },
    timeoutMs: 1000,
  }),
  storyPlan,
);
assert.equal(storyDirectorMaxTokens, 4096);
const invalidStoryPlans = [
  [
    { ...storyPlan, shots: [storyPlan.shots[0], storyPlan.shots[2], storyPlan.shots[1]] },
    /preserve lyric slot indexes/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 0 ? {
        ...shot,
        motionHint: "a Lego band plays on a concert stage",
      } : shot)),
    },
    /banned stage/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 0 ? {
        ...shot,
        role: "problem",
      } : shot)),
    },
    /old problem\/escalation\/payoff/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 1 ? {
        ...shot,
        lyricLine: "wrong lyric",
      } : shot)),
    },
    /exact assigned lyric line/,
  ],
  [
    {
      storyPremise: "old setup field",
      visualPremise: "old setup field",
      worldSetting: "old setup field",
      shots: storyPlan.shots,
    },
    /unexpected top-level keys: storyPremise, visualPremise, worldSetting/,
  ],
  [
    {
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 0 ? {
        ...shot,
        visualMetaphor: "old field",
        physicalEvent: "old field",
      } : shot)),
    },
    /old visualMetaphor\/physicalEvent/,
  ],
  [
    "{\"shots\":[{\"shotIndex\":0,\"lyricLine\":\"unfinished",
    /malformed JSON/,
  ],
] as const;
for (const [plan, errorPattern] of invalidStoryPlans) {
  assert.throws(
    () => extractBrickStoryboardStoryPlan(typeof plan === "string" ? plan : JSON.stringify(plan), slots),
    errorPattern,
  );
}
const generatedPlan = createBrickStoryboardPromptPlan(scene, storyPlan);
assert.equal(generatedPlan.shots.length, 3);
assert.ok(generatedPlan.referenceFramePrompt.includes("Lego"));
assert.ok(generatedPlan.referenceFramePrompt.includes("music-video B-roll world"));
assert.ok(generatedPlan.referenceFramePrompt.includes(storyPlan.shots[0]!.sceneDescription));
assert.ok(generatedPlan.referenceFramePrompt.includes(storyPlan.shots[2]!.sceneDescription));
assert.ok(generatedPlan.referenceFramePrompt.includes("No captions, no subtitles, no lyric text"));
for (const shot of generatedPlan.shots) {
  assert.equal(shot.shotIndex, slots[shot.shotIndex]!.shotIndex);
  assert.ok(shot.shotPrompt.includes("Lego"));
  assert.ok(shot.shotPrompt.includes("lyric-driven Lego music-video B-roll"));
  assert.ok(shot.shotPrompt.includes("no stage performance"));
  assert.ok(shot.shotPrompt.includes(storyPlan.shots[shot.shotIndex]!.sceneDescription));
  assert.ok(shot.shotPrompt.includes(storyPlan.shots[shot.shotIndex]!.motionHint));
  assert.ok(/no .*captions|do not render captions/i.test(shot.shotPrompt));
}
assert.ok(generatedPlan.shots[2]!.shotPrompt.includes("booking a demo"));
assert.ok(generatedPlan.shots[2]!.shotPrompt.includes("booked calendar tile"));

const storyboard: BrickStoryboard = {
  jingleSceneId: "scene_1",
  visualStyle: BRICK_MUSIC_VIDEO_STYLE_ID,
  imageModel: BRICK_STORYBOARD_IMAGE_MODEL,
  shotCount: 3,
  storyPlan,
  referenceFrame: { prompt: "Lego stage", status: "ok" },
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
