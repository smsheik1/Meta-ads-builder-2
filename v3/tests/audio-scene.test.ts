import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createCaptionsForVoiceover,
  createGeneratedSceneAudio,
  createVoiceoverLines,
  getVisibleCaptionText,
  updateGeneratedAudioCaptionText,
} from "../features/audio/sceneAudio";
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
assert.ok(captions.length >= 2);
assert.equal(getVisibleCaptionText(audio, 0.1), captions[0]!.text);
assert.equal(getVisibleCaptionText(audio, 10), captions[0]!.text);
assert.ok(getAdSceneDurationInFrames(scene) > 60 * 6);

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

const html = renderToStaticMarkup(createElement(AdRenderSurface, {
  scene,
  timeSeconds: 0.1,
}));
assert.ok(html.includes(captions[0]!.text));
assert.ok(!html.includes("Add audio for this ad"));

console.log("audio-scene tests passed");
