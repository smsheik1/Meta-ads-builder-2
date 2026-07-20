import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultSceneLocks, rerollScene } from "../features/create/reroll";
import { generateElevenLabsJingleMusic } from "../features/audio/elevenlabsMusic";
import { JINGLE_MUSIC_LENGTH_MS, JINGLE_STYLES, buildJinglePrompt } from "../features/formats/jingle/prompt";
import {
  extractJingleVariantsFromResponse,
  generateJingleVariantsFromResearch,
} from "../features/formats/jingle/generate";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { createJingleAdScene } from "../features/scene/createJingleScene";
import { assertShareableAdScene } from "../features/share/shareScene";
import { makeResearch } from "./helpers/research";

const research = makeResearch({
  websiteUrl: "https://ogtool.com/",
  finalUrl: "https://ogtool.com/",
  host: "ogtool.com",
  brand: {
    ...makeResearch().brand,
    name: "OGTool",
    url: "https://ogtool.com/",
    host: "ogtool.com",
    title: "OGTool",
    description: "Track whether AI answers mention your brand.",
  },
  brandBrief: {
    ...makeResearch().brandBrief,
    brandName: "OGTool",
    offer: "Track whether AI answers mention your brand.",
    audience: "marketers who need to know if AI search is recommending them.",
    buyerMoments: ["The CEO asks why competitors show up in AI answers first."],
    proof: ["Tracks brand visibility in AI answers."],
    siteLanguage: ["AI answers", "brand visibility"],
  },
});

const hookStarts = ["Be the name they see", "Show up where they ask", "Win the AI search"];
const makeModelVariant = (index: number, angle = `AI answer visibility angle ${index}`) => ({
  angle,
  brandPhonetic: "Oh Gee Tool",
  hook: hookStarts[index - 1],
  verseLines: ["AI answers move fast", "See your brand at last"],
});

const validModelVariant = makeModelVariant(1);
const extraModelVariant = makeModelVariant(2, "brand visibility tracking");
const modelVariants = [validModelVariant];
const parsed = extractJingleVariantsFromResponse(JSON.stringify({ variants: modelVariants }));
assert.equal(parsed.length, 1);
assert.equal(parsed[0]!.brandPhonetic, "Oh Gee Tool");
assert.equal(parsed[0]!.compositionPlan.chunks.length, 3);
assert.equal(parsed[0]!.compositionPlan.chunks[0]!.text, "[Hook]\nBe the name they see\nOh Gee Tool");
assert.equal(parsed[0]!.compositionPlan.chunks[1]!.text, "[Verse]\nAI answers move fast\nSee your brand at last");
assert.equal(parsed[0]!.compositionPlan.chunks[2]!.text, "[Hook]\nBe the name they see\nOh Gee Tool");
assert.deepEqual(parsed[0]!.compositionPlan.chunks.map((chunk) => chunk.duration_ms), [6000, 8000, 6000]);

const parsedOverGenerated = extractJingleVariantsFromResponse(JSON.stringify({ variants: [validModelVariant, extraModelVariant] }));
assert.equal(parsedOverGenerated.length, 1);
assert.equal(parsedOverGenerated[0]!.angle, validModelVariant.angle);

assert.ok(parsed[0]!.compositionPlan.chunks[0]!.positive_styles.includes("modern hip hop"));
assert.ok(parsed[0]!.compositionPlan.chunks[0]!.positive_styles.includes("90 BPM"));
const parsedCinematicStyles = extractJingleVariantsFromResponse(
  JSON.stringify({ variants: modelVariants }),
  "Jingle provider",
  "cinematic-trap-diss",
);
assert.ok(parsedCinematicStyles[0]!.compositionPlan.chunks[0]!.positive_styles.includes("cinematic trap diss rap"));
assert.ok(parsedCinematicStyles[0]!.compositionPlan.chunks[0]!.positive_styles.includes("95 BPM"));

const appleLikeVariant = {
  angle: "new phone launch energy",
  brandPhonetic: "Apple",
  hook: "Pocket glow, camera clean",
  verseLines: ["Daily stuff feels smooth", "Keep the moments close"],
};
const parsedAppleLike = extractJingleVariantsFromResponse(JSON.stringify({ variants: [appleLikeVariant] }));
assert.equal(parsedAppleLike[0]!.brandPhonetic, "Apple");
assert.equal(parsedAppleLike[0]!.lyrics.at(-1), "Apple");

const adScenesActionSource = readFileSync(new URL("../convex/adScenes.ts", import.meta.url), "utf8");
for (const style of JINGLE_STYLES) {
  assert.ok(adScenesActionSource.includes(`v.literal("${style.id}")`), `Convex jingleStyleId validator must accept ${style.id}.`);
}

const invalidJingleCases = [
  [],
  [{
    ...validModelVariant,
    verseLines: ["Only one line"],
  }],
  [{
    ...validModelVariant,
    verseLines: ["AI answers grew 47 percent", "See your brand at last"],
  }],
];
for (const invalidVariants of invalidJingleCases) {
  assert.throws(
    () => extractJingleVariantsFromResponse(JSON.stringify({ variants: invalidVariants })),
    /incomplete jingle variants/,
  );
}

const prompt = buildJinglePrompt(research);
assert.ok(prompt.includes("modern hip hop"));
assert.ok(prompt.includes("90 BPM"));
assert.ok(prompt.includes("Wiggly adds brandPhonetic to both hooks"));
assert.ok(!prompt.includes('"compositionPlan"'));
assert.ok(prompt.includes('"Agent Enamel" -> "Agent Enamel"'));
assert.ok(!prompt.includes("Ay-jent"));
const cinematicPrompt = buildJinglePrompt(research, "cinematic-trap-diss");
assert.ok(cinematicPrompt.includes("cinematic trap diss rap"));
assert.ok(cinematicPrompt.includes("95 BPM"));
assert.ok(cinematicPrompt.includes("diss the buyer's old problem"));
assert.ok(cinematicPrompt.includes("STYLE-SPECIFIC TONE"));
assert.ok(cinematicPrompt.includes("Diss the OLD PROBLEM"));
assert.ok(cinematicPrompt.includes("brand lands as the chant"));
assert.ok(cinematicPrompt.includes("Keep shouted energy for the hook"));
const retailDancePrompt = buildJinglePrompt(research, "retail-dance");
assert.ok(retailDancePrompt.includes("dance pop"));
assert.ok(retailDancePrompt.includes("118 BPM"));
assert.ok(retailDancePrompt.includes("chantable vocal hook"));

await assert.rejects(
  () => generateJingleVariantsFromResearch(research, {
    nvidiaNimApiKey: "",
  }),
  /NVIDIA NIM jingle generation is not configured/,
);

const generated = await generateJingleVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ guidedJson, maxTokens, prompt: callPrompt }) => {
    assert.ok(callPrompt.includes("Write exactly 1 short"));
    const variantsSchema = (guidedJson?.properties as Record<string, unknown>)?.variants as Record<string, unknown>;
    assert.equal(variantsSchema.minItems, 1);
    assert.equal(variantsSchema.maxItems, 1);
    assert.equal(maxTokens, 1000);
    return JSON.stringify({ variants: modelVariants });
  },
});
assert.equal(generated.variants.length, 1);
assert.equal(generated.provider, "nvidia-nim");
const cinematicGenerated = await generateJingleVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  jingleStyleId: "cinematic-trap-diss",
  nvidiaNimChatCompletion: async ({ prompt: callPrompt }) => {
    assert.ok(callPrompt.includes("cinematic trap diss rap"));
    return JSON.stringify({ variants: modelVariants });
  },
});
assert.ok(cinematicGenerated.variants[0]!.compositionPlan.chunks[0]!.positive_styles.includes("cinematic trap diss rap"));

const scenes = parsed.map((variant, index) => createJingleAdScene({
  research,
  variant,
  candidateIndex: index,
  generationBatchId: "jingle-batch",
  model: "test-model",
  provider: "nvidia-nim",
  now: 123,
}));
assert.equal(scenes[0]!.format, "jingle");
assert.equal(scenes[0]!.audio.status, "none");
assert.equal(scenes[0]!.layout.musicLengthMs, 20000);

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: scenes[0]!,
}));
assert.ok(html.includes('data-format="jingle"'));
assert.ok(html.includes('data-jingle-active-lyric="true"'));
assert.ok(html.includes('data-jingle-waveform="true"'));
assert.ok(!html.includes('data-jingle-music-video-lyric="true"'));
assert.ok(html.includes("Oh Gee Tool"));
assert.ok(html.includes("position:relative"));
assert.ok(html.includes("text-align:center"));
assert.ok(html.includes("bottom:10cqw"));
assert.ok(html.includes("width:1.8cqw"));

const musicVideoScene = {
  ...scenes[0]!,
  layout: {
    ...scenes[0]!.layout,
    musicVideo: {
      sourceStoryboardId: "storyboard_1",
      builtAt: 1,
      clips: [
        { shotIndex: 0, storageId: "video_0", url: "https://example.com/hook.mp4", startMs: 0, endMs: 6000 },
        { shotIndex: 1, storageId: "video_1", url: "https://example.com/verse.mp4", startMs: 6000, endMs: 14000 },
        { shotIndex: 2, storageId: "video_2", url: "https://example.com/hook-2.mp4", startMs: 14000, endMs: 20000 },
      ],
      stitchedVideo: {
        storageId: "stitched_video",
        url: "https://example.com/stitched.mp4",
        mimeType: "video/mp4",
        durationMs: 20000,
        builtAt: 2,
      },
    },
  },
};
const musicVideoHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: musicVideoScene,
  timeSeconds: 7,
}));
assert.ok(musicVideoHtml.includes('data-jingle-music-video="true"'));
assert.ok(musicVideoHtml.includes('data-jingle-stitched-music-video="true"'));
assert.ok(musicVideoHtml.includes("https://example.com/stitched.mp4"));
assert.ok(!musicVideoHtml.includes("https://example.com/hook.mp4"));
assert.ok(!musicVideoHtml.includes("https://example.com/verse.mp4"));
assert.ok(!musicVideoHtml.includes("https://example.com/hook-2.mp4"));
assert.ok(musicVideoHtml.includes("object-fit:cover"));
assert.ok(musicVideoHtml.includes('data-jingle-music-video-lyric="true"'));
assert.ok(musicVideoHtml.includes("bottom:11cqw"));
assert.ok(!musicVideoHtml.includes("rgba(0,0,0,0.56)"));
assert.ok(!musicVideoHtml.includes('data-jingle-waveform="true"'));
assert.ok(!musicVideoHtml.includes("translateX"));

const phoneticDisplayScene = {
  ...scenes[0]!,
  layout: {
    ...scenes[0]!.layout,
    lyrics: ["Oh Gee Tool"],
  },
};
const phoneticDisplayHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: phoneticDisplayScene,
}));
assert.ok(phoneticDisplayHtml.includes("OGTool"));
assert.ok(!phoneticDisplayHtml.includes(">Oh Gee Tool<"));

const captionPhoneticDisplayHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: {
    ...phoneticDisplayScene,
    audio: {
      status: "generated",
      storageId: "audio_1",
      url: "https://example.com/jingle.mp3",
      mimeType: "audio/mpeg",
      durationMs: 20000,
      durationSeconds: 20,
      transcript: "O GEE Tool",
      captions: [{
        startMs: 0,
        endMs: 20000,
        text: "O GEE Tool",
      }],
      provider: "elevenlabs",
      model: "music_v2",
      generatedAt: 1,
    },
  },
}));
assert.ok(captionPhoneticDisplayHtml.includes("OGTool"));
assert.ok(!captionPhoneticDisplayHtml.includes(">O GEE Tool<"));

const rerolled = rerollScene(scenes, {
  ...scenes[0]!,
  audio: {
    status: "generated",
    storageId: "audio_1",
    url: "https://example.com/jingle.mp3",
    mimeType: "audio/mpeg",
    durationMs: 20000,
    durationSeconds: 20,
    transcript: "old jingle",
    captions: [],
    provider: "elevenlabs",
    model: "music_v2",
    generatedAt: 1,
  },
}, 0, createDefaultSceneLocks());
assert.equal(rerolled.scene?.audio.status, "none", "Jingle rerolls must not carry old audio into a new concept.");

assert.throws(
  () => assertShareableAdScene(scenes[0]!),
  /Generate music before sharing this jingle/,
);
assert.equal(assertShareableAdScene({
  ...scenes[0]!,
  audio: {
    status: "generated",
    storageId: "audio_1",
    url: "https://example.com/jingle.mp3",
    mimeType: "audio/mpeg",
    durationMs: 20000,
    durationSeconds: 20,
    transcript: "jingle",
    captions: [],
    provider: "elevenlabs",
    model: "music_v2",
    generatedAt: 1,
  },
}).format, "jingle");

const capturedRequest: { body: Record<string, unknown> | null } = { body: null };
const musicResult = await generateElevenLabsJingleMusic({
  apiKey: "test-key",
  scene: scenes[0]!,
  fetcher: async (_input, init) => {
    capturedRequest.body = JSON.parse(String(init?.body || "{}"));
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  },
});
assert.ok(capturedRequest.body?.composition_plan);
assert.equal(capturedRequest.body?.prompt, undefined);
assert.equal(capturedRequest.body?.model_id, "music_v2");
assert.equal(musicResult.durationMs, 20000);

await assert.rejects(
  () => generateElevenLabsJingleMusic({ apiKey: "", scene: scenes[0]! }),
  /ElevenLabs music generation is not configured/,
);

console.log("jingle-format tests passed");
