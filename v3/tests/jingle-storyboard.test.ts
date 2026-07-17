import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BRICK_MUSIC_VIDEO_STYLE_ID,
  BRICK_STORYBOARD_IMAGE_MODEL,
  BRICK_STORYBOARD_VIDEO_RESOLUTION,
  buildBrickStoryboardStoryPrompt,
  createBrickStoryboardPromptPlan,
  buildBrickMusicVideoClips,
  deriveBrickStoryboardShots,
  extractBrickStoryboardStoryPlan,
  generateBrickStoryboardStoryPlan,
  toSeedanceSafeBrickPrompt,
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

const overChunkedScene = createJingleAdScene({
  research: makeResearch(),
  variant: {
    ...variant,
    compositionPlan: {
      chunks: [
        { ...variant.compositionPlan.chunks[0]!, text: "[Hook]\nFirst hook", duration_ms: 4000 },
        { ...variant.compositionPlan.chunks[1]!, text: "[Verse]\nFirst verse", duration_ms: 5000 },
        { ...variant.compositionPlan.chunks[1]!, text: "[Verse]\nSecond verse", duration_ms: 6000 },
        { ...variant.compositionPlan.chunks[2]!, text: "[Hook]\nFinal hook", duration_ms: 5000 },
      ],
    },
  },
  candidateIndex: 0,
  generationBatchId: "jingle-board-over-chunked",
  model: "test-model",
  provider: "nvidia-nim",
  now: 1,
});
const overChunkedSlots = deriveBrickStoryboardShots(overChunkedScene);
assert.equal(overChunkedSlots.length, 3);
assert.deepEqual(overChunkedSlots.map((slot) => slot.shotIndex), [0, 1, 2]);
assert.equal(overChunkedSlots.reduce((sum, slot) => sum + slot.durationMs, 0), JINGLE_MUSIC_LENGTH_MS);
assert.equal(overChunkedSlots[0]!.startMs, 0);
assert.equal(overChunkedSlots[2]!.endMs, JINGLE_MUSIC_LENGTH_MS);

const storyPlan: BrickStoryboardStoryPlan = {
  recurringHeroObject: "glowing brick-style search dashboard",
  shots: [
    {
      shotIndex: 0,
      lyricLine: slots[0]!.lyricLine,
      funMechanism: "dramatic_reveal",
      sceneDescription: "a bright signal tower rises above the brick-style city",
      motionHint: "purple signal bricks climb upward from the search dashboard",
    },
    {
      shotIndex: 1,
      lyricLine: slots[1]!.lyricLine,
      funMechanism: "tiny_disaster",
      sceneDescription: "rival names appear as blocks while the brand dashboard starts lighting up",
      motionHint: "a block-figure character turns red rival tiles into purple brand tiles",
    },
    {
      shotIndex: 2,
      lyricLine: slots[2]!.lyricLine,
      funMechanism: "crowd_reaction",
      sceneDescription: "booking a demo becomes a block-figure hand pressing the glowing dashboard action lever",
      motionHint: "the hero object opens a lit path from the dashboard to a booked calendar tile",
    },
  ],
};

const storyPrompt = buildBrickStoryboardStoryPrompt(scene);
assert.ok(storyPrompt.includes("Return B-roll beats only, NOT image prompts"));
assert.ok(storyPrompt.includes("EXACTLY two top-level keys: recurringHeroObject and shots"));
assert.ok(storyPrompt.includes("funMechanism, sceneDescription, motionHint"));
assert.ok(!storyPrompt.includes("Do not use double quote characters inside any string value"));
assert.ok(storyPrompt.includes("LYRIC SLOTS"));
assert.ok(storyPrompt.includes("red brick cookie tin"));
assert.ok(storyPrompt.includes("dramatic_reveal"));
assert.ok(storyPrompt.includes("tiny_disaster"));
assert.ok(storyPrompt.includes("crowd_reaction"));
assert.ok(storyPrompt.includes("oven door blasts warm light as a crowd of block-figures gasps"));
assert.ok(storyPrompt.includes("the tin knocks one stale display aside"));
assert.ok(!storyPrompt.includes("literal brick-style B-roll visual"));
assert.ok(!storyPrompt.includes("one simple CTA-driven physical motion"));
assert.ok(storyPrompt.includes("recurringHeroObject describes the recurring brand/product motif"));
assert.ok(storyPrompt.includes("Do not write camera directions, provider prompts, style tags, image prompts, or shotPrompt text"));
assert.ok(storyPrompt.includes("Lyric -> surprising miniature event -> visible reaction -> brand payoff"));
assert.ok(storyPrompt.includes("fun with audio muted"));
assert.ok(storyPrompt.includes("different funMechanism"));
assert.ok(storyPrompt.includes("visible character reaction, old-vs-new contrast, object in motion"));
assert.ok(!storyPrompt.includes("eventArchetype"));
assert.ok(!storyPrompt.includes("lyricInterpretation"));
assert.ok(!storyPrompt.includes("cinematicIngredients"));
assert.ok(storyPrompt.includes("must include that same recurringHeroObject as a recognizable motif"));
assert.ok(storyPrompt.includes("it must not be the whole shot"));
assert.ok(storyPrompt.includes("must not include brand name, logo, label, wordmark, or readable text"));
assert.ok(storyPrompt.includes("Never choose a generic box"));
assert.ok(storyPrompt.includes("no more than two distinct spatial zones"));
assert.ok(storyPrompt.includes("one frozen peak moment"));
assert.ok(storyPrompt.includes('final shot should turn the CTA direction "Book a demo" into a visible physical action'));
assert.ok(!storyPrompt.includes("CTA action words"));
assert.ok(!storyPrompt.includes("CTA action word"));
assert.ok(!storyPrompt.includes("Parser safety"));
assert.ok(storyPrompt.includes("never baked text, a button, or a caption"));
assert.ok(storyPrompt.includes("No stage performance, band, DJ, concert crowd, captions, subtitles, lyric text, CTA text, buttons, panel layouts, realistic human faces"));
assert.ok(storyPrompt.includes("Brand name or logo may appear only as natural in-world set dressing"));
assert.ok(!storyPrompt.includes("product tin label"));
assert.ok(storyPrompt.includes("Do not use trademarked toy names"));
assert.ok(!/\bLego\b/i.test(storyPrompt));
assert.ok(!storyPrompt.includes('"role"'));

assert.deepEqual(
  extractBrickStoryboardStoryPlan(JSON.stringify(storyPlan), slots, "Story Director", { ctaDirection: "Book a demo" }),
  storyPlan,
);
assert.equal(
  extractBrickStoryboardStoryPlan(
    JSON.stringify({ ...storyPlan, recurringHeroObject: "Lego cookie tin" }),
    slots,
    "Story Director",
    { ctaDirection: "Book a demo" },
  ).recurringHeroObject,
  "brick-style cookie tin",
);
assert.equal(
  extractBrickStoryboardStoryPlan(
    JSON.stringify({ ...storyPlan, recurringHeroObject: "red tin with David's Cookies label" }),
    slots,
    "Story Director",
    { ctaDirection: "Book a demo", brandName: "David's Cookies" },
  ).recurringHeroObject,
  "red tin",
);
assert.equal(
  extractBrickStoryboardStoryPlan(
    JSON.stringify({ ...storyPlan, recurringHeroObject: "red cookie tin with printed logo" }),
    slots,
    "Story Director",
    { ctaDirection: "Book a demo" },
  ).recurringHeroObject,
  "red cookie tin",
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
assert.equal(storyDirectorMaxTokens, 2400);
assert.equal(BRICK_STORYBOARD_VIDEO_RESOLUTION, "480p");
const invalidStoryPlans = [
  [
    { shots: storyPlan.shots },
    /must choose one recurring hero object/,
  ],
  [
    { ...storyPlan, recurringHeroObject: "realistic human faces in a crowd" },
    /banned language in the recurring hero object/,
  ],
  [
    { ...storyPlan, recurringHeroObject: "generic delivery box" },
    /must not be a generic box or package/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 1 ? {
        ...shot,
        funMechanism: "not_fun",
      } : shot)),
    },
    /valid funMechanism/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 1 ? {
        ...shot,
        funMechanism: storyPlan.shots[0]!.funMechanism,
      } : shot)),
    },
    /different funMechanism/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 1 ? {
        ...shot,
        sceneDescription: "quiet tabletop product render in a generic branded wallpaper setup",
      } : shot)),
    },
    /product-only or showroom scene/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 1 ? {
        ...shot,
        eventArchetype: "public_spectacle",
      } : shot)),
    },
    /extra story fields/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 1 ? {
        ...shot,
        cinematicIngredients: ["crowd_reaction"],
      } : shot)),
    },
    /extra story fields/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 1 ? {
        ...shot,
        heroObject: "different brick phone",
      } : {
        ...shot,
        heroObject: storyPlan.recurringHeroObject,
      })),
    },
    /must share the recurring hero object/,
  ],
  [
    { ...storyPlan, shots: [storyPlan.shots[0], storyPlan.shots[2], storyPlan.shots[1]] },
    /preserve lyric slot indexes/,
  ],
  [
    {
      ...storyPlan,
      shots: storyPlan.shots.map((shot) => (shot.shotIndex === 0 ? {
        ...shot,
        motionHint: "a brick band plays on a concert stage",
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
      recurringHeroObject: storyPlan.recurringHeroObject,
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
assert.equal(
  toSeedanceSafeBrickPrompt("Lego-built storefront in a Lego world with Lego minifigures and one Lego tray"),
  "brick-built storefront in a snap-together brick world with plastic brick characters and one brick-style tray",
);
assert.equal(generatedPlan.shots.length, 3);
assert.ok(generatedPlan.storyboardSheetPrompt.includes("Experimental 3-panel brick-style storyboard sheet"));
assert.ok(generatedPlan.storyboardSheetPrompt.includes("NOT a Seedance input"));
assert.ok(generatedPlan.referenceFramePrompt.includes("brick-style"));
assert.ok(generatedPlan.referenceFramePrompt.includes("Single full-frame vertical 9:16"));
assert.ok(generatedPlan.referenceFramePrompt.includes("music-video B-roll reference still"));
assert.ok(generatedPlan.referenceFramePrompt.includes(scene.brand.name));
assert.ok(generatedPlan.referenceFramePrompt.includes("storefront sign, product tin label, menu board, delivery van mark, or product display as set dressing"));
assert.ok(generatedPlan.referenceFramePrompt.includes("Stable upright vertical frame, no sideways framing, no Dutch angle"));
assert.ok(generatedPlan.referenceFramePrompt.includes("one clear visual idea"));
assert.ok(generatedPlan.referenceFramePrompt.includes("strong foreground and midground separation"));
assert.ok(generatedPlan.referenceFramePrompt.includes(storyPlan.shots[0]!.sceneDescription));
assert.ok(generatedPlan.referenceFramePrompt.includes(storyPlan.shots[2]!.sceneDescription));
assert.ok(generatedPlan.referenceFramePrompt.includes("No captions, subtitles, lyric text"));
assert.ok(generatedPlan.referenceFramePrompt.includes(storyPlan.recurringHeroObject));
for (const shot of generatedPlan.shots) {
  assert.equal(shot.shotIndex, slots[shot.shotIndex]!.shotIndex);
  assert.ok(shot.shotPrompt.includes("brick-style"));
  assert.ok(shot.shotPrompt.includes("Single full-frame 9:16 brick-style commercial still"));
  assert.ok(shot.shotPrompt.includes("One frozen moment"));
  assert.ok(shot.shotPrompt.includes("No storyboard sheet, comic strip, collage, split-screen"));
  assert.ok(shot.shotPrompt.includes("No realistic human faces. Block-figure characters only."));
  assert.ok(shot.shotPrompt.includes("no sideways framing"));
  assert.ok(shot.shotPrompt.includes(`Keep any ${scene.brand.name} branding as natural in-world set dressing only.`));
  assert.ok(!/\bBPM\b|hi-hats|808s|vocal delivery/i.test(shot.shotPrompt));
  assert.ok(!/\bLego\b|minifigure/i.test(shot.shotPrompt));
  assert.ok(shot.shotPrompt.includes(storyPlan.shots[shot.shotIndex]!.sceneDescription));
  assert.ok(!shot.shotPrompt.includes(storyPlan.shots[shot.shotIndex]!.motionHint));
  assert.ok(shot.animationPrompt.includes(storyPlan.shots[shot.shotIndex]!.motionHint));
  assert.ok(shot.animationPrompt.includes(storyPlan.recurringHeroObject));
  assert.ok(shot.animationPrompt.includes("Animate this exact single-frame brick-style miniature still"));
  assert.ok(shot.animationPrompt.includes("Animate only the described motion"));
  assert.ok(shot.animationPrompt.includes("preserve the input still's composition"));
  assert.ok(shot.animationPrompt.includes("No stage performance, band, DJ, concert crowd"));
  assert.ok(!shot.animationPrompt.includes(scene.brand.name));
  assert.ok(!/brand names|brand signage|readable logos/i.test(shot.animationPrompt));
  assert.ok(!/\bLego\b|minifigure/i.test(shot.animationPrompt));
  assert.ok(/no .*captions|do not render captions/i.test(shot.shotPrompt));
}
assert.ok(generatedPlan.shots[2]!.shotPrompt.includes("booking a demo"));
assert.ok(generatedPlan.shots[2]!.animationPrompt.includes("booked calendar tile"));

const storyboard: BrickStoryboard = {
  jingleSceneId: "scene_1",
  visualStyle: BRICK_MUSIC_VIDEO_STYLE_ID,
  imageModel: BRICK_STORYBOARD_IMAGE_MODEL,
  shotCount: 3,
  storyPlan,
  storyboardSheetPrompt: generatedPlan.storyboardSheetPrompt,
  referenceFrame: { prompt: "brick-style stage", status: "ok" },
  shots: slots.map((slot) => ({
    ...slot,
    shotPrompt: `shot ${slot.shotIndex}`,
    animationPrompt: `animate shot ${slot.shotIndex}`,
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

const storyboardActionSource = readFileSync(new URL("../convex/jingleStoryboards.ts", import.meta.url), "utf8");
const animateBrickBoardSource = storyboardActionSource.match(/export const animateBrickBoard[\s\S]*?export const generateBrickForScene/)?.[0] || "";
const regenerateBrickShotSource = storyboardActionSource.match(/export const regenerateBrickShot[\s\S]*?export const buildMusicVideoForScene/)?.[0] || "";
const regenerateBrickShotVideoSource = storyboardActionSource.match(/export const regenerateBrickShotVideo[\s\S]*?export const buildMusicVideoForScene/)?.[0] || "";
assert.ok(storyboardActionSource.includes("const referenceImagePromise = storeStoryboardImage"), "Reference image generation should not block shot image generation.");
assert.ok(storyboardActionSource.includes("generateStoryboardImageWithThrottleRetry"), "Paid image generation may retry only after an explicit throttle rejection.");
assert.ok(!storyboardActionSource.includes("retryPrompt"), "Ambiguous image failures must not trigger a second paid generation.");
assert.ok(storyboardActionSource.includes("const shotResultsPromise = Promise.all(promptPlan.shots.map(async (shot)"), "Shot stills should generate in parallel.");
assert.ok(storyboardActionSource.includes("await Promise.all([referenceImagePromise, shotResultsPromise])"), "Reference and shot stills should resolve in parallel.");
assert.ok(animateBrickBoardSource.includes("Promise.all(nextStoryboard.shots.map(async (shot)"), "Seedance clips should generate in parallel.");
assert.ok(animateBrickBoardSource.includes("animationErrors.length"), "Parallel animation should surface partial failures.");
assert.equal(
  (animateBrickBoardSource.match(/patchStoryboard/g) || []).length,
  1,
  "Parallel Seedance generation must patch the storyboard once to avoid Convex write conflicts.",
);
assert.ok(
  !/for \(const shot of nextStoryboard\.shots\)[\s\S]*await generateReplicateSeedanceVideo/.test(animateBrickBoardSource),
  "Seedance animation must not regress to one-shot-at-a-time generation.",
);
assert.ok(regenerateBrickShotSource.includes("musicVideo: undefined"), "Regenerating a still must clear the built music video.");
assert.ok(regenerateBrickShotSource.includes("video: undefined"), "Regenerating a still must clear the old Seedance clip for that shot.");
assert.ok(regenerateBrickShotVideoSource.includes("shotIndex: v.number()"), "Retrying animation must target one shot.");
assert.ok(regenerateBrickShotVideoSource.includes("storeStoryboardVideo"), "Retrying animation must use the Seedance video path.");
assert.ok(regenerateBrickShotVideoSource.includes("clearSceneMusicVideo: true"), "Retrying animation must clear stale final music videos.");
assert.ok(!regenerateBrickShotVideoSource.includes("storeStoryboardImage"), "Retrying animation must not regenerate the still image.");
assert.ok(storyboardActionSource.includes("stitchStatus: undefined"), "Clearing a built music video must clear stale stitch status.");

console.log("jingle-storyboard tests passed");
