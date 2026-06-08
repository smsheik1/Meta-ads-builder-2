import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
const previewChromeSource = readFileSync("app/create/CreatePreviewChrome.tsx", "utf8");
const visualizerRenderSource = readFileSync("features/formats/visualizer/render.tsx", "utf8");
const legacyIdleVisualizerSource = readFileSync("features/formats/visualizer/LegacyIdleVisualizer.tsx", "utf8");
const canvasInteractionStoreSource = readFileSync("features/create/canvasInteractionStore.ts", "utf8");
const createSpacebarSource = readFileSync("features/create/useCreateSpacebar.ts", "utf8");
const globalsSource = readFileSync("app/globals.css", "utf8");
assert.ok(createClientSource.includes("Audio preview syncs captions and visualizer"), "/create must expose an obvious audio preview control.");
assert.ok(createClientSource.includes("controls"), "/create audio preview must use native playback controls.");
assert.ok(createClientSource.includes("audioRef"), "/create audio preview must use the generated audio asset.");
assert.ok(createClientSource.includes("setPreviewTimeSeconds"), "/create audio preview must sync the renderer time.");
assert.ok(createClientSource.includes("window.requestAnimationFrame"), "/create must run a smooth preview clock for the visualizer.");
assert.ok(createClientSource.includes('selectedScene.audio.status === "generated" && isAudioPlaying'), "/create must reserve the preview clock for generated audio.");
assert.ok(createClientSource.includes('motionMode={isAudioPlaying ? "audio" : "idle"}'), "/create must render paused generated-audio previews with the moving idle visualizer instead of a frozen audio frame.");
assert.ok(createClientSource.includes("isStoredWebsiteResearchFailure(nextResult)"), "/create must handle failed website research without exposing raw Convex action errors.");
assert.ok(createClientSource.includes("wiggly:v3:create-session"), "/create must restore the active generation after refresh so spacebar reroll still has scenes.");
assert.ok(createClientSource.includes("loadCreateSessionSnapshot"), "/create must load the persisted session before spacebar reroll can silently disappear.");
assert.ok(createClientSource.includes("saveCreateSessionSnapshot"), "/create must persist generated scenes for same-browser reroll continuity.");
assert.ok(createClientSource.includes("dialogueScripts: DialogueScript[]"), "/create must persist generated dialogue script options across refresh.");
assert.ok(createClientSource.includes("setDialogueScripts(snapshot.dialogueScripts)"), "/create must restore generated dialogue options instead of forcing a rewrite after refresh.");
assert.ok(createClientSource.includes("useCreateSpacebar"), "/create must mount the single spacebar handler hook.");
assert.ok(createSpacebarSource.includes("isRerollSpacebarKey"), "/create must route spacebar rerolls through a dedicated key guard.");
assert.ok(createSpacebarSource.includes('event.key === "Spacebar"') && createSpacebarSource.includes('event.code === "Space"'), "/create must accept common browser spacebar key variants.");
assert.ok(createSpacebarSource.includes("blocksSpacebarReroll"), "/create must keep text editors protected while allowing intentional spacebar rerolls.");
assert.ok(createSpacebarSource.includes('mode !== "idle"'), "/create spacebar must be guarded by canvas interaction mode.");
assert.ok(!createClientSource.includes('data-allow-spacebar-reroll="true"'), "/create website input must block rerolls while the user is editing the URL.");
assert.ok(createClientSource.includes("shouldCarryAudio"), "/create spacebar reroll must carry generated audio onto the next visual variant.");
assert.ok(createClientSource.includes("shouldKeepPlayback"), "/create spacebar reroll must not reset playback when the generated audio is preserved.");
assert.ok(createClientSource.includes("triggerRerollFlash"), "/create reroll must trigger the old canvas shine feedback.");
assert.ok(createClientSource.includes('allPreviewSlots: RenderFlashRole[] = ["headline", "visualizer", "captions"]'), "/create reroll shine must cover the headline, visualizer, and caption/audio slots.");
assert.ok(createClientSource.includes("rerollFlashMs = 680"), "/create reroll shine must keep the old short-lived flash timing.");
assert.ok(createClientSource.includes("rerollFlash={rerollFlash}"), "/create phone preview must receive reroll shine state from the create flow.");
assert.ok(canvasInteractionStoreSource.includes("create<CanvasInteractionState>"), "/create canvas interaction state must live in a tiny Zustand store.");
assert.ok(canvasInteractionStoreSource.includes("Canvas interaction only"), "/create canvas store must document its interaction-only boundary.");
assert.ok(createClientSource.includes("useCanvasInteractionStore"), "/create must read canvas interaction state from the store.");
assert.ok(!createClientSource.includes("useState<RenderSelectableSlot"), "/create must not keep selected canvas slot in local page state.");
assert.ok(!createClientSource.includes("useState(createDefaultSceneLocks"), "/create must not keep canvas locks in local page state.");
assert.ok(createClientSource.includes("clearSelectedPreviewSlot()"), "/create must not restore scoped canvas selection after refresh because spacebar should full-reroll by default.");
assert.ok(createClientSource.includes("previewSlotLockKey"), "/create preview selector must reuse the existing scene lock model.");
assert.ok(createClientSource.includes('captions: "captionColor"'), "/create caption slot must lock/reroll caption color, not audio or caption text.");
assert.ok(createClientSource.includes("onChangePreviewSlotColor"), "/create preview selector must support old builder-style hover color changes.");
assert.ok(createClientSource.includes("selectPreviewSlot(slot)"), "/create canvas selection must stay sticky instead of toggling off on normal clicks.");
assert.ok(createClientSource.includes("onChangePreviewBackgroundColor"), "/create preview selector must support background color changes.");
assert.ok(createClientSource.includes("Spacebar rerolls the"), "/create must tell users when spacebar is scoped to one selected part.");
for (const forbiddenStoreImport of ["convex/", "_generated", "AdScene", "scene/types", "server"]) {
  assert.ok(
    !canvasInteractionStoreSource.includes(forbiddenStoreImport),
    `Canvas interaction store must not import or reference server/product data: ${forbiddenStoreImport}`,
  );
}
assert.ok(previewChromeSource.includes("rerollFlash={rerollFlash}"), "/create phone preview must pass reroll shine state into the shared renderer.");
assert.ok(previewChromeSource.includes('data-preview-phone-frame="legacy-instagram-feed"'), "/create phone preview must keep the original /create IG feed chrome as the visible shell.");
assert.ok(previewChromeSource.includes("h-[720px] w-[360px]"), "/create IG feed chrome must keep the original fixed 360x720 frame geometry.");
assert.ok(previewChromeSource.includes('data-preview-ad-viewport="legacy-instagram-feed"') && previewChromeSource.includes("h-[450px]"), "/create IG feed chrome must reserve the original 360x450 ad viewport for AdRenderSurface.");
assert.ok(previewChromeSource.includes('data-preview-play-overlay="legacy-instagram-feed"'), "/create phone preview must keep the original centered Play this ad pill over the IG footer.");
assert.ok(previewChromeSource.includes("onTogglePlayback"), "/create phone play pill must bridge to the existing native audio control instead of creating a second audio system.");
assert.ok(!previewChromeSource.includes("CanvasEditor"), "/create v3 phone chrome must not re-import the old CanvasEditor renderer.");
assert.ok(previewChromeSource.includes("PreviewSelectionOverlay"), "/create phone preview must provide the lightweight component selector overlay.");
assert.ok(previewChromeSource.includes("data-preview-selectable-slot"), "/create selector must expose selectable slots for QA and future format tests.");
assert.ok(previewChromeSource.includes('type="color"'), "/create selector must expose the old hover color picker affordance.");
assert.ok(previewChromeSource.includes("data-preview-background-color"), "/create selector must expose a background color picker.");
assert.ok(previewChromeSource.includes("size-14"), "/create selector lock bubble must keep the large old /builder lock affordance.");
assert.ok(!previewChromeSource.includes("ring-2 ring-slate-950/35"), "/create selected slot must not show the heavy old bounding-box outline.");
assert.ok(!previewChromeSource.includes('selected ? "opacity-70"'), "/create selected slot controls must not stay visible after clicking outside the canvas.");
assert.ok(previewChromeSource.includes("LegacyIdleVisualizer"), "/create empty placeholder must render through the shared legacy idle visualizer recipe.");
assert.ok(previewChromeSource.includes('src="/wiggly-logo.svg"'), "/create empty placeholder must use the old Wiggly logo asset slot.");
assert.ok(previewChromeSource.includes('data-placeholder-slot="logo"'), "/create empty placeholder must expose a locked logo slot.");
assert.ok(previewChromeSource.includes("toPlaceholderPercent(70, \"y\")") && previewChromeSource.includes("toPlaceholderPercent(120, \"x\")"), "/create empty placeholder logo must stay in the old /create x=120 y=70 slot.");
assert.ok(previewChromeSource.includes("toPlaceholderPercent(118, \"y\")") && previewChromeSource.includes("toPlaceholderPercent(20, \"x\")"), "/create empty placeholder headline must stay in the old /create x=20 y=118 slot.");
assert.ok(previewChromeSource.includes("See the angle hiding on your website."), "/create empty placeholder headline must use the shorter old-style copy that does not collide with the visualizer.");
assert.ok(previewChromeSource.includes('fontSize: "clamp(31px, 9.4cqw, 42px)"'), "/create empty placeholder headline must stay small enough to avoid the visualizer.");
assert.ok(previewChromeSource.includes('overflow: "hidden"'), "/create empty placeholder headline must not spill into the visualizer.");
assert.ok(previewChromeSource.includes("toPlaceholderPercent(255, \"y\")") && previewChromeSource.includes("toPlaceholderPercent(360, \"x\")"), "/create empty placeholder visualizer must stay in the old /create x=0 y=255 w=360 slot.");
assert.ok(previewChromeSource.includes("toPlaceholderPercent(350, \"y\")") && previewChromeSource.includes('data-placeholder-slot="caption-action"'), "/create empty placeholder audio action must stay in the old /create caption slot.");
assert.ok(previewChromeSource.includes('data-preview-audio-action="true"'), "/create phone preview must expose a real clickable add-audio hit target over no-audio scenes.");
assert.ok(previewChromeSource.includes("onClick={onOpenAudioPanel}"), "/create phone preview add-audio target must open the audio panel instead of being dead renderer text.");
assert.ok(previewChromeSource.includes("z-50 inline-flex") && previewChromeSource.includes("group/preview-selector absolute inset-0 z-30"), "/create phone preview add-audio target must sit above the selector overlay so clicks are not swallowed.");
assert.ok(previewChromeSource.includes("top: toPlaceholderPercent(336, \"y\")"), "/create preview add-audio hit target must sit clear of the watermark.");
assert.ok(previewChromeSource.includes("self-start") && previewChromeSource.includes("xl:content-start"), "/create format rail must stay compact and not stretch with the preview stack.");
assert.ok(createClientSource.includes("flex items-start justify-center gap-4"), "/create preview column must not stretch the compact format rail.");
assert.ok(existsSync("public/wiggly-logo.svg"), "/create v3 must ship the old Wiggly placeholder logo asset.");
assert.ok(visualizerRenderSource.includes("LegacyIdleVisualizer"), "/create generated no-audio scenes must render through the shared legacy idle visualizer recipe.");
assert.ok(visualizerRenderSource.includes("getSmoothedAnalysisFrame"), "/create generated-audio visualizer must smooth between analysis frames.");
assert.ok(visualizerRenderSource.includes("lerp(fromLevel, toLevel, amount)"), "/create generated-audio visualizer must interpolate audio levels instead of snapping.");
assert.ok(visualizerRenderSource.includes('motionMode !== "idle"'), "/create renderer must support an idle motion mode for paused previews while keeping audio analysis for playback/export.");
assert.ok(visualizerRenderSource.includes("wiggly-reroll-shine-${role}"), "/create renderer must apply the old reroll shine classes to changed slots.");
assert.ok(visualizerRenderSource.includes('height: toCanvasPercent(120, "y")'), "/create generated headline must stay in the fixed old headline slot.");
assert.ok(visualizerRenderSource.includes('overflow: "hidden"'), "/create generated headline must not spill into the visualizer.");
assert.ok(visualizerRenderSource.includes("top: toCanvasPercent(336, \"y\")") && visualizerRenderSource.includes('whiteSpace: "nowrap"'), "/create rendered no-audio action must avoid wrapping or overlapping the watermark.");
assert.ok(legacyIdleVisualizerSource.includes("getIdleVisualizerPercent"), "Shared legacy idle visualizer must use the old idle height formula.");
assert.ok(legacyIdleVisualizerSource.includes("wiggly-idle-bar wiggly-idle-bar-strong"), "Shared legacy idle visualizer must keep the old waveform idle CSS animation.");
assert.ok(legacyIdleVisualizerSource.includes("index * 28") && legacyIdleVisualizerSource.includes("index * 45"), "Legacy idle visualizer must keep the old waveform and bar stagger timings.");
assert.ok(globalsSource.includes(".wiggly-reroll-shine"), "v3 globals must include the old /create reroll shine class.");
assert.ok(globalsSource.includes("@keyframes wiggly-reroll-glint"), "v3 globals must include the old /create reroll glint animation.");
assert.ok(globalsSource.includes("@keyframes wiggly-reroll-focus"), "v3 globals must include the old /create reroll focus animation.");

for (const requiredApiCall of [
  "api.researchRuns.runWebsiteResearch",
  "api.adScenes.generateFromResearch",
  "api.dialogueScripts.generateForScene",
  "api.audioAssets.generateDialogueForScene",
  "api.audioAssets.createUploadUrl",
  "api.audioAssets.attachUploadedToScene",
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
assert.ok(createClientSource.includes("Upload your audio"), "/create must let users upload their own audio instead of forcing generated audio.");
assert.ok(createClientSource.includes('accept="audio/*"'), "/create upload control must only accept audio files.");
assert.ok(createClientSource.includes("onUploadAudio"), "/create uploaded audio must flow through a dedicated stored-audio attach handler.");
assert.ok(createClientSource.includes("Two people talking about this product"), "/create must explain the visualizer dialogue workflow.");
assert.ok(createClientSource.includes('data-dialogue-editor="modal"'), "/create dialogue editing must open in a wide desktop modal, not the skinny action rail.");
assert.ok(createClientSource.includes('data-dialogue-option-grid="true"'), "/create dialogue options must be visible in a grid instead of hidden behind horizontal scroll.");
assert.ok(createClientSource.includes("grid-cols-5"), "/create must show all five dialogue options without sideways scrolling on desktop.");

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
