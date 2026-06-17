import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildVideoMemePrompt } from "../features/formats/video-meme/prompt";
import {
  extractVideoMemeVariantsFromResponse,
  generateVideoMemeVariantsFromResearch,
} from "../features/formats/video-meme/generate";
import { DARWIN_JOURNEY_VARIANT_COUNT, PINGU_NOOT_NOOT_VARIANT_COUNT, VIDEO_MEME_VARIANT_COUNT } from "../features/formats/video-meme/templates";
import { createDefaultSceneLocks, rerollScene } from "../features/create/reroll";
import { assertSavableAdScene, createSavedDesignId, restoreSavedDesignSelection } from "../features/create/savedDesigns";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { createVideoMemeAdScene } from "../features/scene/createVideoMemeScene";
import { getAdSceneDurationInFrames } from "../remotion-entry/Root";
import { makeResearch } from "./helpers/research";

const research = makeResearch();

const bearCaptionSuffixes = [
  "sending callers to voicemail at lunch",
  "checking caller ID during the morning rush",
  "pretending missed calls are no big deal",
  "saying they will call back after one more chart",
  "wondering who answered after hours",
  "letting the phone ring through check-ins",
  "losing new patients to a busy signal",
  "asking why Tuesday has an empty chair",
];
const variants = Array.from({ length: VIDEO_MEME_VARIANT_COUNT }, (_, index) => ({
  angle: `distinct bear angle ${index + 1}`,
  target: `front desks guilty behavior ${index + 1}`,
  clipId: "bear-sniff" as const,
  caption: `This bear sniffs people ${bearCaptionSuffixes[index]!}.`,
  mode: "caught" as const,
  selfCheckPassed: "The caption exposes a recognizable hidden behavior and never names the product.",
}));

const payload = { variants };
const parsed = extractVideoMemeVariantsFromResponse(JSON.stringify(payload), {
  brandNames: [research.brand.name, research.brandBrief.brandName],
});
assert.equal(parsed.length, VIDEO_MEME_VARIANT_COUNT);
assert.deepEqual(parsed[0], variants[0]);

const parsedOversampled = extractVideoMemeVariantsFromResponse(JSON.stringify({
  variants: [
    ...variants,
    {
      ...variants[0]!,
      angle: "extra valid bear angle",
      target: "extra valid bear target",
      caption: "This bear sniffs people checking the call log after lunch.",
    },
  ],
}), {
  brandNames: [research.brand.name, research.brandBrief.brandName],
});
assert.equal(parsedOversampled.length, VIDEO_MEME_VARIANT_COUNT);

const pinguVariants = Array.from({ length: PINGU_NOOT_NOOT_VARIANT_COUNT }, (_, index) => ({
  angle: `distinct pingu angle ${index + 1}`,
  templateId: "pingu-noot-noot" as const,
  slots: [
    { setupText: "schedule looks light today", dreadText: "every patient calls at the exact same minute" },
    { setupText: "the phones stayed quiet at lunch", dreadText: "voicemail has three new patient calls" },
    { setupText: "ad spend looks efficient this month", dreadText: "call log says they all hit voicemail" },
  ][index]!,
  selfCheckPassed: "The dread directly undercuts the calm setup and is specific to a dental front desk.",
}));
const parsedPingu = extractVideoMemeVariantsFromResponse(JSON.stringify({ variants: pinguVariants }), {
  brandNames: [research.brand.name, research.brandBrief.brandName],
  templateId: "pingu-noot-noot",
});
assert.equal(parsedPingu.length, PINGU_NOOT_NOOT_VARIANT_COUNT);
assert.equal(parsedPingu[0]!.clipId, "pingu-noot-noot");
assert.equal(parsedPingu[0]!.slots?.setupText, "schedule looks light today");

const darwinVariants = [
  {
    angle: "customer calls multiple dentists and hits voicemail",
    templateId: "darwin-journey" as const,
    mode: "customer_pain" as const,
    slots: { caption: "POV: the patient who called 4 dentists and got voicemail at every one" },
    selfCheckPassed: "Calm face contrasts with a specific patient pain stack.",
  },
  {
    angle: "front desk survives busy season and stacked voicemails",
    templateId: "darwin-journey" as const,
    mode: "business_pain" as const,
    slots: { caption: "POV: the front desk after flu season, 30 voicemails, and a triple-booked Monday" },
    selfCheckPassed: "Calm face contrasts with a specific operator workload.",
  },
  {
    angle: "missed calls overwhelming the voicemail box",
    templateId: "darwin-journey" as const,
    mode: "goofy_exaggeration" as const,
    slots: { caption: "POV: the front desk whose voicemail box filed a restraining order" },
    selfCheckPassed: "The goofy line is based on the real pain underneath: missed calls piling up.",
  },
];
const parsedDarwin = extractVideoMemeVariantsFromResponse(JSON.stringify({ variants: darwinVariants }), {
  brandNames: [research.brand.name, research.brandBrief.brandName],
  templateId: "darwin-journey",
});
assert.equal(parsedDarwin.length, DARWIN_JOURNEY_VARIANT_COUNT);
assert.equal(parsedDarwin[0]!.clipId, "darwin-journey");
assert.equal(parsedDarwin[0]!.caption, darwinVariants[0]!.slots.caption);

const prompt = buildVideoMemePrompt(research);
assert.ok(prompt.includes("This bear sniffs people who want to quit their job."));
assert.ok(prompt.includes("This bear sniffs people updating LinkedIn at office hours."));
assert.ok(prompt.includes("This bear sniffs people with eleven half-used serums in the drawer."));
assert.ok(prompt.includes("Default to caught mode."));
assert.ok(prompt.includes("Never name the brand or product"));
assert.ok(prompt.includes('"clipId": "bear-sniff"'));

const pinguPrompt = buildVideoMemePrompt(research, PINGU_NOOT_NOOT_VARIANT_COUNT, "pingu-noot-noot");
assert.ok(pinguPrompt.includes("Pingu Noot Noot Meme"));
assert.ok(pinguPrompt.includes("Write exactly 3 variants."));
assert.ok(pinguPrompt.includes("setupText"));
assert.ok(pinguPrompt.includes("dreadText"));
assert.ok(pinguPrompt.includes("Do not write generic dread words"));
assert.ok(pinguPrompt.includes('"templateId": "pingu-noot-noot"'));

const darwinPrompt = buildVideoMemePrompt(research, DARWIN_JOURNEY_VARIANT_COUNT, "darwin-journey");
assert.ok(darwinPrompt.includes("Darwin's Journey"));
assert.ok(darwinPrompt.includes("Write exactly 3 variants."));
assert.ok(darwinPrompt.includes("POV: the ${persona} who survived ${specific stacked pains}"));
assert.ok(darwinPrompt.includes("Prefer a mode mix when evidence supports it"));
assert.ok(darwinPrompt.includes("real pain underneath"));
assert.ok(darwinPrompt.includes('"templateId": "darwin-journey"'));

const invalidVideoMemeCases = [
  { variants: variants.slice(0, 7) },
  { variants: variants.map((variant, index) => ({ ...variant, clipId: index === 0 ? "pingu-noot-noot" : "bear-sniff" })) },
  { variants: variants.map((variant, index) => ({ ...variant, caption: index === 0 ? "This cat watches front desks miss calls." : variant.caption })) },
  {
    variants: variants.map((variant, index) => ({ ...variant, caption: index === 0 ? "This bear sniffs Agent Enamel users missing zero calls." : variant.caption })),
    options: { brandNames: [research.brand.name, research.brandBrief.brandName] },
  },
  { variants: variants.map((variant, index) => ({ ...variant, caption: index === 0 ? "This bear sniffs people writing captions so long they cover the whole clip before the bear even reacts and nobody can read it" : variant.caption })) },
  { variants: variants.map((variant, index) => ({ ...variant, caption: index === 1 ? variants[0]!.caption : variant.caption })) },
  { variants: variants.map((variant, index) => ({ ...variant, angle: index === 1 ? variants[0]!.angle : variant.angle })) },
  { variants: variants.map((variant, index) => ({ ...variant, target: index === 1 ? variants[0]!.target : variant.target })) },
  {
    variants: darwinVariants.map((variant, index) => ({ ...variant, templateId: index === 0 ? "bear-sniff" : "darwin-journey" })),
    options: { templateId: "darwin-journey" as const },
  },
  {
    variants: darwinVariants.map((variant, index) => ({ ...variant, slots: index === 0 ? {} : variant.slots })),
    options: { templateId: "darwin-journey" as const },
  },
  {
    variants: darwinVariants.map((variant, index) => ({ ...variant, slots: index === 0 ? { caption: "POV: Agent Enamel users calmly watching every call get booked" } : variant.slots })),
    options: { brandNames: [research.brand.name, research.brandBrief.brandName], templateId: "darwin-journey" as const },
  },
  {
    variants: darwinVariants.map((variant, index) => ({ ...variant, slots: index === 0 ? { caption: "This bear sniffs front desks after a triple-booked Monday" } : variant.slots })),
    options: { templateId: "darwin-journey" as const },
  },
  {
    variants: darwinVariants.map((variant, index) => ({
      ...variant,
      slots: index === 0 ? { caption: "POV: the front desk after a caption that keeps going past the readable top band and should never be accepted here" } : variant.slots,
    })),
    options: { templateId: "darwin-journey" as const },
  },
  {
    variants: darwinVariants.map((variant, index) => ({ ...variant, slots: index === 0 ? { setupText: "schedule looks light", dreadText: "voicemail is full" } : variant.slots })),
    options: { templateId: "darwin-journey" as const },
  },
  {
    variants: darwinVariants.map((variant, index) => ({ ...variant, angle: index === 1 ? darwinVariants[0]!.angle : variant.angle })),
    options: { templateId: "darwin-journey" as const },
  },
  {
    variants: darwinVariants.map((variant, index) => ({
      ...variant,
      mode: index === 2 ? "goofy_exaggeration" : variant.mode,
      selfCheckPassed: index === 2 ? "It is silly and specific." : variant.selfCheckPassed,
    })),
    options: { templateId: "darwin-journey" as const },
  },
];
for (const testCase of invalidVideoMemeCases) {
  assert.throws(
    () => extractVideoMemeVariantsFromResponse(JSON.stringify({ variants: testCase.variants }), testCase.options),
    /incomplete video meme variants/,
  );
}

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
    assert.ok(callPrompt.includes("Write exactly 11 variants"));
    if (callPrompt.includes("previous output was invalid")) return JSON.stringify({ variants: [...variants, ...variants.slice(0, 3).map((variant, index) => ({
      ...variant,
      angle: `retry extra angle ${index}`,
      target: `retry extra target ${index}`,
      caption: `This bear sniffs people checking missed calls after ${index + 1} meetings.`,
    }))] });
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

const pinguScenes = parsedPingu.map((variant, index) => createVideoMemeAdScene({
  research,
  variant,
  candidateIndex: index,
  generationBatchId: "pingu-batch",
  model: "test-model",
  provider: "nvidia-nim",
  now: 123,
}));
assert.equal(pinguScenes[0]!.layout.templateId, "pingu-noot-noot");
assert.equal(pinguScenes[0]!.layout.videoSrc, "/video-memes/pingu-noot-noot.mp4");
assert.equal(pinguScenes[0]!.layout.slots.setupText, pinguVariants[0]!.slots.setupText);
assert.equal(pinguScenes[0]!.layout.slots.dreadText, pinguVariants[0]!.slots.dreadText);
assert.equal(getAdSceneDurationInFrames(pinguScenes[0]!, 60), 510);

const pinguHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: pinguScenes[0]!,
  timeSeconds: 0,
}));
assert.ok(pinguHtml.includes('data-video-meme-template="pingu-noot-noot"'));
assert.ok(pinguHtml.includes('data-video-meme-setup-text="true"'));
assert.ok(!pinguHtml.includes('data-video-meme-dread-text="true"'));
assert.ok(pinguHtml.includes(pinguVariants[0]!.slots.setupText));

const pinguDreadHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: pinguScenes[0]!,
  timeSeconds: 4,
}));
assert.ok(!pinguDreadHtml.includes('data-video-meme-setup-text="true"'));
assert.ok(pinguDreadHtml.includes('data-video-meme-dread-text="true"'));
assert.ok(pinguDreadHtml.includes(pinguVariants[0]!.slots.dreadText));

const darwinScenes = parsedDarwin.map((variant, index) => createVideoMemeAdScene({
  research,
  variant,
  candidateIndex: index,
  generationBatchId: "darwin-batch",
  model: "test-model",
  provider: "nvidia-nim",
  now: 123,
}));
assert.equal(darwinScenes[0]!.layout.templateId, "darwin-journey");
assert.equal(darwinScenes[0]!.layout.videoSrc, "/video-memes/darwin-journey.mp4");
assert.equal(darwinScenes[0]!.layout.durationSeconds, 19.39);
assert.equal(darwinScenes[0]!.layout.slots.caption, darwinVariants[0]!.slots.caption);

const darwinHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: darwinScenes[0]!,
}));
assert.ok(darwinHtml.includes('data-video-meme-template="darwin-journey"'));
assert.ok(darwinHtml.includes('data-video-meme-caption-text="true"'));
assert.ok(darwinHtml.includes(darwinVariants[0]!.slots.caption));

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
