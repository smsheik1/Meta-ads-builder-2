import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createCaptionsForVoiceover,
  createGeneratedSceneAudio,
  createVoiceoverLines,
} from "../features/audio/sceneAudio";
import { AdRenderSurface } from "../features/render/AdRenderSurface";
import { assertShareableAdScene } from "../features/share/shareScene";
import { getAdSceneDurationInFrames } from "../remotion-entry/Root";
import { defaultRenderScene } from "../remotion-entry/fixture";

const durationMs = 7800;
const generatedAudio = createGeneratedSceneAudio({
  storageId: "generated-audio-storage-id",
  url: "https://example.com/generated-audio.wav",
  mimeType: "audio/wav",
  durationMs,
  transcript: createVoiceoverLines(defaultRenderScene).join("\n"),
  captions: createCaptionsForVoiceover(defaultRenderScene, durationMs),
  model: "gemini-3.1-flash-tts-preview",
});
assert.equal(generatedAudio.status, "generated");

const scene = {
  ...defaultRenderScene,
  audio: generatedAudio,
};

assert.equal(assertShareableAdScene(scene), scene);

for (const mode of ["preview", "poster", "video"] as const) {
  const html = renderToStaticMarkup(createElement(AdRenderSurface, {
    scene,
    mode,
    timeSeconds: 0.2,
  }));

  assert.ok(html.includes('data-render-surface="ad"'), `${mode} must render through AdRenderSurface.`);
  assert.ok(html.includes('data-format="visualizer"'), `${mode} must preserve the scene format.`);
  assert.ok(html.includes(scene.creative.headline), `${mode} must render the frozen scene headline.`);
  assert.ok(html.includes(scene.audio.captions[0]!.text), `${mode} must render timed generated-audio captions.`);
  assert.ok(!html.includes("Add audio for this ad"), `${mode} must not show the no-audio prompt once audio exists.`);
}

assert.equal(
  getAdSceneDurationInFrames(scene, 60),
  Math.ceil((generatedAudio.durationSeconds + 0.35) * 60),
  "Remotion duration must be driven by the generated audio duration.",
);

const createClientSource = readFileSync("app/create/CreateResearchClient.tsx", "utf8");
assert.ok(createClientSource.includes("Audio preview syncs captions and visualizer"), "/create must expose an obvious audio preview control.");
assert.ok(createClientSource.includes("controls"), "/create audio preview must use native playback controls.");
assert.ok(createClientSource.includes("audioRef"), "/create audio preview must use the generated audio asset.");
assert.ok(createClientSource.includes("setPreviewTimeSeconds"), "/create audio preview must sync the renderer time.");
assert.ok(createClientSource.includes("isStoredWebsiteResearchFailure(nextResult)"), "/create must handle failed website research without exposing raw Convex action errors.");

for (const requiredApiCall of [
  "api.researchRuns.runWebsiteResearch",
  "api.adScenes.generateFromResearch",
  "api.dialogueScripts.generateForScene",
  "api.audioAssets.generateDialogueForScene",
  "api.renderJobs.createFromScene",
  "api.sharePages.createFromScene",
]) {
  assert.ok(
    createClientSource.includes(requiredApiCall),
    `/create must keep the full v3 smoke path wired: ${requiredApiCall}`,
  );
}
assert.ok(createClientSource.includes("Write script options"), "/create must expose explicit dialogue script generation.");
assert.ok(createClientSource.includes("Generate this audio"), "/create must generate audio from a chosen dialogue script.");
assert.ok(createClientSource.includes("Two people talking about this product"), "/create must explain the visualizer dialogue workflow.");

const renderJobSource = readFileSync("convex/renderJobs.ts", "utf8");
assert.ok(renderJobSource.includes("assertShareableAdScene"), "Render jobs must validate frozen scenes.");
assert.ok(renderJobSource.includes("refreshSceneAudioUrl"), "Render jobs must refresh Convex audio URLs before rendering.");

const researchRunsSource = readFileSync("convex/researchRuns.ts", "utf8");
assert.ok(researchRunsSource.includes('status: "failed"'), "Website research should return a typed failed result for operational read failures.");
assert.ok(!researchRunsSource.includes("throw new Error(message)"), "Website research should not turn Firecrawl timeouts into raw Convex server errors.");

const shareSource = readFileSync("convex/sharePages.ts", "utf8");
assert.ok(shareSource.includes("assertShareableAdScene"), "Share pages must validate frozen scenes.");
assert.ok(shareSource.includes("refreshSceneAudioUrl"), "Share pages must refresh Convex audio URLs before display.");

const remotionSource = readFileSync("remotion-entry/RemotionAdScene.tsx", "utf8");
assert.ok(remotionSource.includes("AdRenderSurface"), "Remotion must render through the shared render surface.");
assert.ok(remotionSource.includes("<Audio"), "Remotion must layer generated audio into the MP4.");

console.log("v3-smoke tests passed");
