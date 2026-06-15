import assert from "node:assert/strict";
import {
  applySceneLocks,
  createDefaultSceneLocks,
  getNextSceneIndex,
  rerollScene,
} from "../features/create/reroll";
import { createGeneratedSceneAudio } from "../features/audio/sceneAudio";
import type { VisualizerAdScene } from "../features/scene/types";
import { getVisualizerVariantForCandidate } from "../features/scene/visualizerVariants";

function makeScene(index: number): VisualizerAdScene {
  return {
    version: 1,
    format: "visualizer",
    brand: {
      name: "OGTool",
      url: "https://ogtool.com/",
      host: "ogtool.com",
      title: "OGTool",
      description: "AI visibility campaigns.",
      faviconUrl: "https://ogtool.com/favicon.ico",
      logoUrl: "https://ogtool.com/logo.svg",
      ogImageUrl: null,
      screenshotUrl: null,
      colors: ["#07111F", "#82DFFF"],
      fonts: {
        heading: "Inter",
        body: "Inter",
        feel: "sans",
      },
      vibeTags: ["technical"],
      receipts: {
        specificClaims: [`Claim ${index}`],
        buyerMoments: [`Moment ${index}`],
        exactSiteLanguage: [`Language ${index}`],
        namedProof: [`Proof ${index}`],
      },
    },
    creative: {
      angleId: `angle-${index}`,
      headline: `Headline ${index}`,
      subheadline: `Subheadline ${index}`,
      ctaText: `CTA ${index}`,
      headlineType: index % 2 === 0 ? "contrast" : "receipt_drop",
      selectedPain: `Pain ${index}`,
      selectedProof: `Proof ${index}`,
    },
    style: {
      backgroundColor: index % 2 === 0 ? "#F8FAFC" : "#111827",
      textColor: index % 2 === 0 ? "#0F172A" : "#FFFFFF",
      accentColor: index % 2 === 0 ? "#38BDF8" : "#F97316",
      visualizerColor: index % 2 === 0 ? "#82DFFF" : "#FB7185",
      visualizer: getVisualizerVariantForCandidate(index).visualizer,
      fontFeel: "sans",
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "centered-hero",
    },
    metadata: {
      candidateIndex: index,
      generationBatchId: "batch-1",
      researchRunId: "research-1",
      brandSnapshotId: "brand-1",
      model: "test-model",
      provider: "gemini",
      generatedAt: 123,
    },
  };
}

const scenes = [makeScene(0), makeScene(1), makeScene(2)];

assert.equal(getNextSceneIndex(0, scenes.length), 1);
assert.equal(getNextSceneIndex(2, scenes.length), 0);
assert.equal(getNextSceneIndex(0, 0), -1);

const unlocked = createDefaultSceneLocks();
const unlockedResult = applySceneLocks(scenes[0]!, scenes[1]!, unlocked);
assert.equal(unlockedResult.creative.headline, "Headline 1");
assert.equal(unlockedResult.creative.subheadline, "Subheadline 1");
assert.equal(unlockedResult.style.visualizerColor, "#FB7185");
assert.notDeepEqual(unlockedResult.style.visualizer, scenes[0]!.style.visualizer);
assert.equal(unlockedResult.audio, scenes[1]!.audio);

const rerolled = rerollScene(scenes, scenes[0]!, 0, createDefaultSceneLocks());
assert.equal(rerolled.index, 1);
assert.equal(rerolled.scene?.version, scenes[1]!.version);
assert.equal(rerolled.scene?.format, scenes[1]!.format);
assert.equal(rerolled.scene?.brand, scenes[1]!.brand);
assert.equal(rerolled.scene?.layout, scenes[1]!.layout);
assert.equal(rerolled.scene?.metadata, scenes[1]!.metadata);
assert.equal(rerolled.scene?.creative.headline, "Headline 1");
assert.equal(rerolled.scene?.creative.subheadline, "Subheadline 1");

const currentSceneWithAudio: VisualizerAdScene = {
  ...scenes[0]!,
  audio: createGeneratedSceneAudio({
    storageId: "audio-storage-0",
    url: "https://example.com/audio.wav",
    mimeType: "audio/wav",
    durationMs: 5000,
    transcript: "Audio transcript",
    captions: [{ text: "Audio transcript", startMs: 0, endMs: 5000 }],
    model: "test-tts",
  }),
};
const rerolledWithAudioLock = rerollScene(scenes, currentSceneWithAudio, 0, {
  ...createDefaultSceneLocks(),
  audio: true,
});
assert.equal(rerolledWithAudioLock.index, 1);
assert.equal(rerolledWithAudioLock.scene?.creative.headline, "Headline 1");
assert.equal(rerolledWithAudioLock.scene?.audio, currentSceneWithAudio.audio);

const wrapped = rerollScene(scenes, scenes[2]!, 2, createDefaultSceneLocks());
assert.equal(wrapped.index, 0);
assert.equal(wrapped.scene?.creative.headline, "Headline 0");

console.log("reroll tests passed");
