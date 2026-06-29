import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  compactSceneAudioAnalysis,
  createCaptionsForVoiceover,
  createGeneratedSceneAudio,
  createVoiceoverLines,
  getCaptionWindowText,
  getVisibleCaptionText,
  MAX_CAPTION_WORDS_ON_SCREEN,
  updateGeneratedAudioCaptionText,
} from "../features/audio/sceneAudio";
import {
  applyVoiceVisualizerPreset,
  explainVoiceVisualizerPresetFromAnalysis,
} from "../features/audio/visualizerPresets";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { getAdSceneDurationInFrames } from "../remotion-entry/Root";
import { defaultRenderScene } from "../remotion-entry/fixture";

const captions = createCaptionsForVoiceover(defaultRenderScene, 6200);
const audio = createGeneratedSceneAudio({
  storageId: "audio-storage-id",
  url: "https://example.com/audio.wav",
  mimeType: "audio/wav",
  durationMs: 6200,
  transcript: createVoiceoverLines(defaultRenderScene).join("\n"),
  captions,
  model: "gemini-3.1-flash-tts-preview",
});
const scene = {
  ...defaultRenderScene,
  audio,
};

assert.equal(audio.status, "generated");
assert.equal(audio.durationSeconds, 6.2);
assert.equal(audio.provider, "gemini");
assert.ok(captions.length >= 2);
assert.equal(getVisibleCaptionText(audio, 0.1), captions[0]!.text);
assert.equal(getVisibleCaptionText(audio, 10), captions[0]!.text);
assert.ok(getAdSceneDurationInFrames(scene) > 60 * 6);

const longCaption = {
  text: "My dev team says we cannot ship this mobile feature before the end of the month.",
  startMs: 0,
  endMs: 3000,
};
assert.equal(MAX_CAPTION_WORDS_ON_SCREEN, 7);
assert.equal(getCaptionWindowText(longCaption, 0.1), "My dev team says we cannot ship");
assert.equal(getCaptionWindowText(longCaption, 1.6), "this mobile feature before the end of");
assert.equal(getCaptionWindowText(longCaption, 2.9), "the month.");

const editedAudio = updateGeneratedAudioCaptionText(audio, 0, "ChatGPT, not ChatGP");
assert.equal(editedAudio.status, "generated");
if (editedAudio.status === "generated") {
  assert.equal(editedAudio.captions[0]!.text, "ChatGPT, not ChatGP");
  assert.equal(editedAudio.captions[0]!.startMs, captions[0]!.startMs);
  assert.equal(editedAudio.captions[0]!.endMs, captions[0]!.endMs);
  assert.equal(editedAudio.captions[1]!.text, captions[1]!.text);
  assert.ok(editedAudio.transcript.includes("ChatGPT, not ChatGP"));
}
assert.equal(updateGeneratedAudioCaptionText(audio, 99, "Ignored"), audio);

const uploadedAudio = createGeneratedSceneAudio({
  storageId: "uploaded-audio-storage-id",
  url: "https://example.com/uploaded.mp3",
  mimeType: "audio/mpeg",
  durationMs: 9000,
  transcript: "Uploaded Deepgram caption",
  captions: [
    {
      text: "Uploaded Deepgram caption",
      startMs: 0,
      endMs: 9000,
    },
  ],
  model: "deepgram-listen-smart-format-diarized",
  provider: "upload",
});
assert.equal(uploadedAudio.status, "generated");
assert.equal(uploadedAudio.provider, "upload");
assert.equal(uploadedAudio.model, "deepgram-listen-smart-format-diarized");
assert.equal(getVisibleCaptionText(uploadedAudio, 0.1), "Uploaded Deepgram caption");

const oversizedAnalysis = {
  fps: 60,
  levels: Array.from({ length: 600 }, (_, index) => (index % 100) / 100),
  bands: Array.from({ length: 600 }, (_, frameIndex) => (
    Array.from({ length: 52 }, (_, bandIndex) => ((frameIndex + bandIndex) % 100) / 100)
  )),
};
const compactedAnalysis = compactSceneAudioAnalysis(oversizedAnalysis);
assert.equal(compactedAnalysis?.fps, 30);
assert.ok((compactedAnalysis?.levels.length || 0) <= oversizedAnalysis.levels.length / 2 + 1);
assert.equal(compactedAnalysis?.bands[0]?.length, 24);

const compactedAudio = createGeneratedSceneAudio({
  storageId: "large-analysis-audio-storage-id",
  url: "https://example.com/large-analysis.wav",
  mimeType: "audio/wav",
  durationMs: 10_000,
  transcript: "Large analysis should be stored compactly.",
  captions: [
    {
      text: "Large analysis should be stored compactly.",
      startMs: 0,
      endMs: 10_000,
    },
  ],
  analysis: oversizedAnalysis,
  model: "gemini-3.1-flash-tts-preview",
});
assert.equal(compactedAudio.status, "generated");
if (compactedAudio.status === "generated") {
  assert.equal(compactedAudio.analysis?.fps, 30);
  assert.equal(compactedAudio.analysis?.bands[0]?.length, 24);
}

const quietDecision = explainVoiceVisualizerPresetFromAnalysis({
  fps: 30,
  levels: Array.from({ length: 120 }, () => 0.08),
  bands: Array.from({ length: 120 }, () => Array.from({ length: 24 }, () => 0.08)),
}, 6200);
assert.equal(quietDecision.presetId, "quiet-call-boost");

const loudDecision = explainVoiceVisualizerPresetFromAnalysis({
  fps: 30,
  levels: Array.from({ length: 120 }, () => 0.88),
  bands: Array.from({ length: 120 }, () => Array.from({ length: 24 }, () => 0.96)),
}, 6200);
assert.equal(loudDecision.presetId, "loud-call-control");

const cleanVoiceDecision = explainVoiceVisualizerPresetFromAnalysis({
  fps: 30,
  levels: Array.from({ length: 120 }, (_, index) => 0.34 + ((index % 4) * 0.01)),
  bands: Array.from({ length: 120 }, () => Array.from({ length: 24 }, () => 0.35)),
}, 6200);
assert.equal(cleanVoiceDecision.presetId, "ai-voice-clean");

const quietVisualizer = applyVoiceVisualizerPreset(defaultRenderScene.style.visualizer!, "quiet-call-boost");
assert.equal(quietVisualizer.type, defaultRenderScene.style.visualizer?.type);
assert.equal(quietVisualizer.barCount, defaultRenderScene.style.visualizer?.barCount);
assert.equal(quietVisualizer.gain, 2.25);
assert.equal(quietVisualizer.floor, 0.12);
assert.equal(quietVisualizer.bandFocus, "voice");

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene,
  timeSeconds: 0.1,
}));
assert.ok(html.includes(captions[0]!.text));
assert.ok(!html.includes("Add audio for this ad"));

const uploadHtml = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene: {
    ...defaultRenderScene,
    audio: uploadedAudio,
  },
  timeSeconds: 0.1,
}));
assert.ok(uploadHtml.includes("Uploaded Deepgram caption"));
assert.ok(!uploadHtml.includes("Add audio for this ad"));

console.log("audio-scene tests passed");
