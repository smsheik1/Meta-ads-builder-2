import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildVideoMemePrompt } from "../features/formats/video-meme/prompt";
import {
  extractVideoMemeVariantsFromResponse,
  generateVideoMemeVariantsFromResearch,
} from "../features/formats/video-meme/generate";
import { VIDEO_MEME_VARIANT_COUNT } from "../features/formats/video-meme/templates";
import { createDefaultSceneLocks, rerollScene } from "../features/create/reroll";
import { assertSavableAdScene, createSavedDesignId, restoreSavedDesignSelection } from "../features/create/savedDesigns";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { createVideoMemeAdScene } from "../features/scene/createVideoMemeScene";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import { getAdSceneDurationInFrames } from "../remotion-entry/Root";

const research: StoredWebsiteResearchResult = {
  sessionId: "session_1",
  researchRunId: "research_1",
  brandSnapshotId: "brand_1",
  websiteUrl: "https://agentenamel.com/",
  finalUrl: "https://agentenamel.com/",
  host: "agentenamel.com",
  brand: {
    name: "Agent Enamel",
    url: "https://agentenamel.com/",
    host: "agentenamel.com",
    title: "Agent Enamel",
    description: "An AI receptionist that answers dental calls and books patients.",
    faviconUrl: null,
    logoUrl: "https://cdn.example/logo.png",
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#22C55E", "#0F172A"],
    fonts: {
      feel: "sans",
    },
    vibeTags: ["calm"],
  },
  brandBrief: {
    brandName: "Agent Enamel",
    offer: "An AI receptionist that answers dental calls and books patients.",
    audience: "Dental practices missing calls while the front desk is busy.",
    buyerMoments: [
      "The patient called while the front desk was already juggling check-ins.",
      "After-hours callers leave before anyone can call back.",
      "Lunch breaks send new patients to voicemail.",
      "Missed calls turn into empty chair time.",
    ],
    proof: [
      "Answers calls and books patients.",
      "Built for dental practices.",
      "Handles callers when the team is busy.",
    ],
    siteLanguage: ["AI receptionist", "Books patients", "Answers dental calls"],
    ctaDirection: "Book a demo",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  evidence: {
    headings: ["AI receptionist for dental practices"],
    paragraphs: ["An AI receptionist that answers dental calls and books patients."],
    receipts: {
      specificClaims: ["Answers calls and books patients."],
      buyerMoments: ["The patient called while the front desk was busy."],
      exactSiteLanguage: ["AI receptionist"],
      namedProof: [],
    },
    rawMarkdown: "# Agent Enamel",
  },
  metadata: {},
  branding: {},
  adAngles: [
    {
      buyer: "dental practice owner",
      moment: "phones pile up during check-ins",
      pain: "new patients hit voicemail",
      proof: "answers calls and books patients",
      sitePhrase: "Books patients",
    },
  ],
  providerStatus: [],
};

const variants = Array.from({ length: VIDEO_MEME_VARIANT_COUNT }, (_, index) => ({
  angle: `distinct bear angle ${index + 1}`,
  target: `front desks guilty behavior ${index + 1}`,
  clipId: "bear-sniff" as const,
  caption: [
    "This bear sniffs front desks sending callers to voicemail at lunch.",
    "This bear sniffs people checking caller ID during the morning rush.",
    "This bear sniffs practices pretending missed calls are no big deal.",
    "This bear sniffs teams saying they will call back after one more chart.",
    "This bear sniffs owners wondering who answered after hours.",
    "This bear sniffs people letting the phone ring through check-ins.",
    "This bear sniffs offices losing new patients to a busy signal.",
    "This bear sniffs dentists asking why Tuesday has an empty chair.",
  ][index]!,
  mode: "caught" as const,
  selfCheckPassed: "The caption exposes a recognizable hidden behavior and never names the product.",
}));

const payload = { variants };
const parsed = extractVideoMemeVariantsFromResponse(JSON.stringify(payload), {
  brandNames: [research.brand.name, research.brandBrief.brandName],
});
assert.equal(parsed.length, VIDEO_MEME_VARIANT_COUNT);
assert.deepEqual(parsed[0], variants[0]);

const prompt = buildVideoMemePrompt(research);
assert.ok(prompt.includes("This bear sniffs people who want to quit their job."));
assert.ok(prompt.includes("This bear sniffs people updating LinkedIn at office hours."));
assert.ok(prompt.includes("This bear sniffs people with eleven half-used serums in the drawer."));
assert.ok(prompt.includes("Default to caught mode."));
assert.ok(prompt.includes("Never name the brand or product"));
assert.ok(prompt.includes('"clipId": "bear-sniff"'));

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.slice(0, 7),
  })),
  /incomplete video meme variants/,
);

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.map((variant, index) => ({
      ...variant,
      clipId: index === 0 ? "penguin-noot-noot" : "bear-sniff",
    })),
  })),
  /incomplete video meme variants/,
);

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.map((variant, index) => ({
      ...variant,
      caption: index === 0 ? "This cat watches front desks miss calls." : variant.caption,
    })),
  })),
  /incomplete video meme variants/,
);

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.map((variant, index) => ({
      ...variant,
      caption: index === 0 ? "This bear sniffs Agent Enamel users missing zero calls." : variant.caption,
    })),
  }), {
    brandNames: [research.brand.name, research.brandBrief.brandName],
  }),
  /incomplete video meme variants/,
);

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.map((variant, index) => ({
      ...variant,
      caption: index === 0 ? "This bear sniffs people writing captions so long they cover the whole clip before the bear even reacts and nobody can read it" : variant.caption,
    })),
  })),
  /incomplete video meme variants/,
);

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.map((variant, index) => ({
      ...variant,
      caption: index === 1 ? variants[0]!.caption : variant.caption,
    })),
  })),
  /incomplete video meme variants/,
);

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.map((variant, index) => ({
      ...variant,
      angle: index === 1 ? variants[0]!.angle : variant.angle,
    })),
  })),
  /incomplete video meme variants/,
);

assert.throws(
  () => extractVideoMemeVariantsFromResponse(JSON.stringify({
    variants: variants.map((variant, index) => ({
      ...variant,
      target: index === 1 ? variants[0]!.target : variant.target,
    })),
  })),
  /incomplete video meme variants/,
);

await assert.rejects(
  () => generateVideoMemeVariantsFromResearch(research, {
    nvidiaNimApiKey: "",
    nvidiaNimModel: "test-kimi-model",
  }),
  /NVIDIA NIM video meme generation is not configured/,
);

const retryResult = await generateVideoMemeVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ prompt: callPrompt }) => {
    if (callPrompt.includes("previous output was invalid")) return JSON.stringify(payload);
    return JSON.stringify({ variants: [] });
  },
});
assert.equal(retryResult.provider, "nvidia-nim");
assert.equal(retryResult.model, "test-kimi-model");
assert.equal(retryResult.variants.length, VIDEO_MEME_VARIANT_COUNT);

let defaultTimeoutMs = 0;
await generateVideoMemeVariantsFromResearch(research, {
  nvidiaNimApiKey: "test-key",
  nvidiaNimBaseUrl: "https://nim.test/v1",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ timeoutMs }) => {
    defaultTimeoutMs = timeoutMs;
    return JSON.stringify(payload);
  },
});
assert.ok(defaultTimeoutMs >= 60_000, "Video meme generation needs a longer timeout than the default 30s NIM call.");

const scenes = parsed.map((variant, index) => createVideoMemeAdScene({
  research,
  variant,
  candidateIndex: index,
  generationBatchId: "bear-batch",
  model: "test-model",
  provider: "nvidia-nim",
  now: 123,
}));

assert.equal(scenes.length, VIDEO_MEME_VARIANT_COUNT);
assert.ok(scenes.every((scene) => scene.format === "video-meme"));
assert.equal(scenes[0]!.layout.templateId, "bear-sniff");
assert.equal(scenes[0]!.layout.videoSrc, "/video-memes/bear-sniff.mp4");
assert.equal(scenes[0]!.layout.captionPosition, "top");
assert.equal(scenes[0]!.layout.slots.caption, variants[0]!.caption);
assert.equal(scenes[0]!.creative.headline, variants[0]!.caption);
assert.equal(getAdSceneDurationInFrames(scenes[0]!, 60), 480);

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: scenes[0]!,
}));
assert.ok(html.includes('data-format="video-meme"'));
assert.ok(html.includes('data-video-meme-template="bear-sniff"'));
assert.ok(html.includes('/video-memes/bear-sniff.mp4'));
assert.ok(html.includes('data-video-meme-caption-position="top"'));
assert.ok(html.includes('data-video-meme-caption-text="true"'));
assert.ok(html.includes(variants[0]!.caption));
assert.ok(!html.includes("muted"), "Video meme preview must not force-mute source clip audio.");

const rerolled = rerollScene(scenes, scenes[0]!, 0, createDefaultSceneLocks());
assert.equal(rerolled.index, 1);
assert.equal(rerolled.scene?.format, "video-meme");
assert.equal(rerolled.scene?.creative.headline, variants[1]!.caption);

const savedDesign = {
  id: createSavedDesignId(scenes[0]!),
  title: scenes[0]!.creative.headline,
  format: scenes[0]!.format,
  scene: scenes[0]!,
  createdAt: 1,
  updatedAt: 2,
};
assert.equal(assertSavableAdScene(scenes[0]!), scenes[0]);
const restored = restoreSavedDesignSelection({ scenes: [], design: savedDesign });
assert.equal(restored.selectedScene.format, "video-meme");

console.log("video-meme-format tests passed");
