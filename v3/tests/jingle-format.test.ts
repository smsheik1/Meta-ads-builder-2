import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createDefaultSceneLocks, rerollScene } from "../features/create/reroll";
import { generateElevenLabsJingleMusic } from "../features/audio/elevenlabsMusic";
import { JINGLE_MUSIC_LENGTH_MS, buildJinglePrompt } from "../features/formats/jingle/prompt";
import {
  extractJingleVariantsFromResponse,
  generateJingleVariantsFromResearch,
} from "../features/formats/jingle/generate";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { createJingleAdScene } from "../features/scene/createJingleScene";
import { assertShareableAdScene } from "../features/share/shareScene";
import type { StoredWebsiteResearchResult } from "../features/research/types";

const research: StoredWebsiteResearchResult = {
  sessionId: "session_1",
  researchRunId: "research_1",
  brandSnapshotId: "brand_1",
  websiteUrl: "https://ogtool.com/",
  finalUrl: "https://ogtool.com/",
  host: "ogtool.com",
  brand: {
    name: "OGTool",
    url: "https://ogtool.com/",
    host: "ogtool.com",
    title: "OGTool",
    description: "Track whether AI answers mention your brand.",
    faviconUrl: null,
    logoUrl: null,
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#4F46E5", "#0F172A"],
    fonts: { feel: "sans" },
    vibeTags: ["sharp"],
  },
  brandBrief: {
    brandName: "OGTool",
    offer: "Track whether AI answers mention your brand.",
    audience: "marketers who need to know if AI search is recommending them.",
    buyerMoments: ["The CEO asks why competitors show up in AI answers first."],
    proof: ["Tracks brand visibility in AI answers."],
    siteLanguage: ["AI answers", "brand visibility"],
    ctaDirection: "Try it",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  evidence: {
    headings: ["Track your AI visibility"],
    paragraphs: ["See where your brand shows up in AI answers."],
    receipts: {
      specificClaims: ["Tracks brand visibility in AI answers."],
      buyerMoments: ["Competitors show up first in AI answers."],
      exactSiteLanguage: ["AI answers"],
      namedProof: [],
    },
    rawMarkdown: "# OGTool",
  },
  metadata: {},
  branding: {},
  providerStatus: [],
  adAngles: [{
    buyer: "growth marketer",
    moment: "the CEO asks about AI answers",
    pain: "competitors show up first",
    proof: "tracks brand visibility in AI answers",
    sitePhrase: "AI answers",
  }],
};

const baseStyles = ["modern hip hop", "90 BPM", "confident vocal delivery", "punchy 808 bass", "crisp hi-hats", "clean trap drums", "polished studio production"];
const negativeStyles = ["sad", "slow", "lo-fi", "distorted", "off-key"];
const hookStarts = ["Be the name they see", "Show up where they ask", "Win the AI search"];
const makeVariant = (index: number, angle = `AI answer visibility angle ${index}`) => ({
  angle,
  brandPhonetic: "Oh Gee Tool",
  musicLengthMs: JINGLE_MUSIC_LENGTH_MS,
  compositionPlan: {
    chunks: [
      {
        text: `[Hook]\n${hookStarts[index - 1]}\nOh Gee Tool`,
        duration_ms: 6000,
        positive_styles: baseStyles,
        negative_styles: negativeStyles,
        context_adherence: "high",
      },
      {
        text: `[Verse]\nAI answers move fast\nSee your brand at last`,
        duration_ms: 8000,
        positive_styles: baseStyles,
        negative_styles: negativeStyles,
        context_adherence: "high",
      },
      {
        text: `[Hook]\n${hookStarts[index - 1]}\nOh Gee Tool`,
        duration_ms: 6000,
        positive_styles: baseStyles,
        negative_styles: negativeStyles,
        context_adherence: "high",
      },
    ],
  },
  selfCheckPassed: "Hook lines 6/3 syllables; verse lines 5/5 syllables; durations sum to 20000; final line is Oh Gee Tool; no invented claims.",
});

const variants = [makeVariant(1), makeVariant(2, "competitors show up first"), makeVariant(3, "brand visibility tracking")];
const parsed = extractJingleVariantsFromResponse(JSON.stringify({ variants }));
assert.equal(parsed.length, 1);
assert.equal(parsed[0]!.brandPhonetic, "Oh Gee Tool");
assert.equal(parsed[0]!.compositionPlan.chunks.length, 3);

const looseStylesVariant = makeVariant(1, "loose style wording");
looseStylesVariant.compositionPlan.chunks = looseStylesVariant.compositionPlan.chunks.map((chunk) => ({
  ...chunk,
  positive_styles: ["modern hip-hop", "confident rap vocal"],
}));
const parsedLooseStyles = extractJingleVariantsFromResponse(JSON.stringify({ variants: [looseStylesVariant] }));
assert.ok(parsedLooseStyles[0]!.compositionPlan.chunks[0]!.positive_styles.includes("modern hip hop"));
assert.ok(parsedLooseStyles[0]!.compositionPlan.chunks[0]!.positive_styles.includes("90 BPM"));

assert.throws(
  () => extractJingleVariantsFromResponse(JSON.stringify({ variants: [] })),
  /incomplete jingle variants/,
);
assert.throws(
  () => extractJingleVariantsFromResponse(JSON.stringify({
    variants: [{
      ...variants[0]!,
      musicLengthMs: 31000,
      compositionPlan: {
        chunks: variants[0]!.compositionPlan.chunks.map((chunk) => ({ ...chunk, duration_ms: 31000 })),
      },
    }],
  })),
  /incomplete jingle variants/,
);
assert.throws(
  () => extractJingleVariantsFromResponse(JSON.stringify({
    variants: [{
      ...variants[0]!,
      compositionPlan: {
        chunks: variants[0]!.compositionPlan.chunks.map((chunk) => ({ ...chunk, positive_styles: [...baseStyles, "like Drake"] })),
      },
    }],
  })),
  /incomplete jingle variants/,
);
assert.throws(
  () => extractJingleVariantsFromResponse(JSON.stringify({
    variants: [{
      ...variants[0]!,
      compositionPlan: {
        chunks: variants[0]!.compositionPlan.chunks.map((chunk) => ({ ...chunk, text: chunk.text.replace("AI answers move fast", "AI answers grew 47 percent") })),
      },
    }],
  })),
  /incomplete jingle variants/,
);

const prompt = buildJinglePrompt(research);
assert.ok(prompt.includes("modern hip hop"));
assert.ok(prompt.includes("90 BPM"));
assert.ok(prompt.includes("Final lyric line is brandPhonetic") || prompt.includes("FINAL lyric line is the phonetic brand name"));

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
  nvidiaNimChatCompletion: async ({ prompt: callPrompt }) => {
    assert.ok(callPrompt.includes("Write exactly 1 short"));
    return JSON.stringify({ variants });
  },
});
assert.equal(generated.variants.length, 1);
assert.equal(generated.provider, "nvidia-nim");

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
assert.ok(html.includes("position:absolute"));
assert.ok(!html.includes("relative h-full w-full"), "Jingle renderer must not depend on Tailwind layout classes for MP4 export.");
assert.ok(html.includes("Oh Gee Tool"));

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
