import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const createClientSource = readFileSync("app/create/CreateResearchClient.tsx", "utf8");
const createCaptionModalSource = readFileSync("app/create/CreateCaptionModal.tsx", "utf8");
const controlPanelSource = readFileSync("app/create/CreateControlPanel.tsx", "utf8");
const createDialogueModalSource = readFileSync("app/create/CreateDialogueModal.tsx", "utf8");
const createLeftColumnSource = readFileSync("app/create/CreateLeftColumn.tsx", "utf8");
const canvasColumnSource = readFileSync("app/create/CreateCanvasColumn.tsx", "utf8");
const reviewsProductPickerSource = readFileSync("app/create/CreateReviewsProductPicker.tsx", "utf8");
const rootLayoutSource = readFileSync("app/layout.tsx", "utf8");
const previewChromeSource = readFileSync("app/create/CreatePreviewChrome.tsx", "utf8");
const quickActionsSource = readFileSync("app/create/CreateQuickActions.tsx", "utf8");
const brickStoryboardSheetSource = readFileSync("app/create/CreateBrickStoryboardSheet.tsx", "utf8");
const creativeBriefSource = readFileSync("app/create/CreateCreativeBriefCard.tsx", "utf8");
const adScenesSource = readFileSync("convex/adScenes.ts", "utf8");
const visualizerSchemaSource = readFileSync("features/formats/visualizer/schema.ts", "utf8");
const visualizerModuleSource = readFileSync("features/formats/visualizer/index.ts", "utf8");
const globalsSource = readFileSync("app/globals.css", "utf8");

assert.ok(
  !createClientSource.includes("<CreateActionCard"),
  "The legacy Download Island must not be the primary /create control surface.",
);
assert.ok(
  createClientSource.includes("<CreateQuickActions") && createClientSource.includes("<CreateControlPanel"),
  "/create must use compact quick actions plus the panel control surface.",
);
assert.ok(
  createClientSource.includes("grid max-w-[1500px] items-start") &&
    createClientSource.includes("grid items-start gap-5") &&
    !createClientSource.includes("grid max-w-[1500px] items-center") &&
    !createClientSource.includes("grid items-center gap-5"),
  "/create must top-align the desktop tool surface so the phone and action rail do not fall below the fold at 100% zoom.",
);
assert.ok(
  previewChromeSource.includes('aspect-[1/2] h-[clamp(470px,calc(100vh-15rem),720px)]') &&
    !previewChromeSource.includes("h-[720px] w-[360px]"),
  "/create phone preview must shrink on short desktop viewports instead of forcing a fixed 720px-tall phone.",
);
assert.ok(
  !createClientSource.includes("clientReady") &&
    createClientSource.includes("return <ResearchConnected />"),
  "/create must render the app directly; a clientReady hydration gate can strand users on a blank/loading shell.",
);
assert.ok(
  createClientSource.includes('if (format === "text-message") return 6') &&
    createLeftColumnSource.includes('["text-message", "iMessage Ad"]'),
  "/create must expose iMessage Ad and generate six static text-message variants.",
);
assert.ok(
  createClientSource.includes('if (format === "reviews") return 8') &&
    createLeftColumnSource.includes('["reviews", "Reviews Proof Ad"]') &&
    reviewsProductPickerSource.includes("Choose proof products") &&
    createClientSource.includes("selectedProductHandles"),
  "/create must expose Reviews Proof Ad, product selection, and generate eight review template scenes.",
);
assert.ok(
  createClientSource.includes('if (format === "motion-story") return 4') &&
    createLeftColumnSource.includes('["motion-story", "Motion Story"]') &&
    createClientSource.includes('format === "reviews" || format === "motion-story"') &&
    quickActionsSource.includes('selectedFormat === "motion-story"') &&
    createClientSource.includes('requiresProductImage: selectedAdFormat === "motion-story"') &&
    createClientSource.includes('requiresProductImage: format === "motion-story"'),
  "/create must expose Motion Story, product selection, playable music preview, and generate four manual variants.",
);
assert.ok(
  !createClientSource.includes("data-creative-pack-hover-dock") &&
    !createClientSource.includes("<CreateCreativePackOverview"),
  "Creative Pack status must not render as an overlapping hover dock on the canvas side.",
);
assert.ok(
  createLeftColumnSource.includes('data-creative-pack-mini-status="true"') &&
    createLeftColumnSource.includes("data-creative-pack-mini-chip={packFormat}") &&
    createLeftColumnSource.includes("CREATIVE_PACK_FORMATS.map") &&
    createLeftColumnSource.includes("onCreativePackGroupSelect") &&
    createLeftColumnSource.includes("onCreativePackGroupRetry") &&
    createLeftColumnSource.includes("`${label} · Retry`"),
  "Creative Pack status must render visible per-format chips with failed-format retry inside the left form.",
);
assert.ok(
  createLeftColumnSource.includes('workingMode ? "Website ready"') &&
    createLeftColumnSource.includes('adScenesCount ? "Ads ready to review"'),
  "/create must not tell users to add a website after research exists but generation failed.",
);
assert.ok(
  createClientSource.includes("api.adScenes.listForResearchRun") &&
    createClientSource.includes("hydrateCreativePackGroupsFromSceneRows") &&
    createClientSource.includes("minimumReadyFormats: 2"),
  "/create must hydrate the Creative Pack rail from saved research-run scenes after refresh.",
);
assert.ok(
  createClientSource.includes("function isRenderableScene") &&
    createClientSource.includes("getFormatModule(scene.format).validate(scene).valid") &&
    createClientSource.includes("getRenderableSceneEntries(latestGeneration.scenes") &&
    createClientSource.includes("Previous saved ads used an older format contract. Generate again.") &&
    createClientSource.includes("assertRenderableScenes(scenes)") &&
    createClientSource.includes("That saved design uses an older format contract. Generate it again."),
  "/create must validate persisted/generated scenes before selecting them so stale format contracts cannot crash AdRenderSurface.",
);

const nativeControlPattern = /<(?:input|select|textarea)\b/g;
const countMatches = (source: string, pattern: RegExp) => source.match(pattern)?.length || 0;
const assertHydrationGuards = (source: string, expectedControls: number, name: string) => {
  assert.equal(countMatches(source, nativeControlPattern), expectedControls, `${name} native form control count changed; update hydration guard coverage.`);
  assert.equal(countMatches(source, /suppressHydrationWarning/g), expectedControls, `${name} native form controls must suppress extension-injected hydration attrs.`);
};

assert.ok(
  rootLayoutSource.includes("<body suppressHydrationWarning>"),
  "Root body must suppress extension-injected hydration attrs before React boots.",
);
assertHydrationGuards(createLeftColumnSource, 5, "CreateLeftColumn");
assertHydrationGuards(reviewsProductPickerSource, 1, "CreateReviewsProductPicker");
assertHydrationGuards(controlPanelSource, 6, "CreateControlPanel");
assertHydrationGuards(createDialogueModalSource, 2, "CreateDialogueModal");
assertHydrationGuards(createCaptionModalSource, 1, "CreateCaptionModal");

for (const railLabel of ["Text", "Style", "Format"]) {
  assert.ok(controlPanelSource.includes(`label: "${railLabel}"`), `Create rail must expose ${railLabel}.`);
}
for (const forbiddenRailLabel of ["Audio", "Export"]) {
  assert.ok(!controlPanelSource.includes(`label: "${forbiddenRailLabel}"`), `${forbiddenRailLabel} must not be a top-level rail item.`);
}

assert.ok(
  visualizerSchemaSource.includes("export const visualizerEditorSchema = {") &&
    visualizerSchemaSource.includes("text: [") &&
    visualizerSchemaSource.includes("style: [") &&
    visualizerSchemaSource.includes("format: ["),
  "Visualizer edit schema must stay a dead-simple object literal with text/style/format arrays.",
);
assert.ok(!visualizerSchemaSource.includes("class "), "Visualizer edit schema must not become a class hierarchy.");
assert.ok(!visualizerSchemaSource.includes("zod"), "Visualizer edit schema must not become a validation framework.");
assert.ok(
  visualizerSchemaSource.includes('{ id: "audio", label: "Audio", kind: "audio" }') &&
    visualizerSchemaSource.includes('{ id: "captions", label: "Captions", kind: "captions" }'),
  "Audio and captions must live under the visualizer format schema.",
);
assert.ok(
  controlPanelSource.includes("Background music") &&
    controlPanelSource.includes("Replace music") &&
    controlPanelSource.includes("Remove") &&
    controlPanelSource.includes("Music volume"),
  "Visualizer audio controls must expose visible background music upload/replace/remove/volume actions.",
);
assert.ok(
  controlPanelSource.includes('const musicBusy = backgroundMusicStatus === "loading"') &&
    createClientSource.includes("const [backgroundMusicStatus") &&
    createClientSource.includes("updateBackgroundMusicVolumeOnScene") &&
    createClientSource.includes("backgroundMusicVolumeSaveTimeoutRef") &&
    !createClientSource.includes('selectedScene.format !== "visualizer" || audioStatus === "loading"'),
  "Background music upload must not be blocked by primary voice audio generation state.",
);
assert.ok(
  visualizerModuleSource.includes("editorSchema: visualizerEditorSchema"),
  "Visualizer format module must expose its editor schema through the registry.",
);
assert.ok(
  controlPanelSource.includes("getFormatModule(selectedScene.format).editorSchema"),
  "CreateControlPanel must read editor controls from the active format module.",
);
assert.ok(
  !controlPanelSource.includes("features/formats/visualizer/schema") &&
    !controlPanelSource.includes("visualizerEditorSchema") &&
    !controlPanelSource.includes("visualizerSceneVariants"),
  "CreateControlPanel must not hardcode the visualizer schema or variants; future formats plug in through their modules.",
);

assert.ok(
  quickActionsSource.includes(".slice(0, 2)") && quickActionsSource.includes("data-create-status-banner"),
  "Inline status feedback must be capped at two visible banners.",
);
assert.ok(
  quickActionsSource.includes("threeDRenderBlocked") &&
    quickActionsSource.includes("Generate 3D images and animate clips before building the MP4."),
  "3D Breakdown must not allow the global MP4 action before generated clips exist.",
);
assert.ok(
  quickActionsSource.includes("scene.layout.scriptBeats.map") &&
    quickActionsSource.includes('data-three-d-script-beat="true"'),
  "3D Breakdown Script ready state must show all narration beats, not only the first line.",
);
assert.ok(
  quickActionsSource.includes('data-three-d-storyboard-board="true"') &&
    quickActionsSource.includes("One six-frame visual plan for the whole ad.") &&
    quickActionsSource.includes("Generate 3D images to draw the storyboard board and production stills."),
  "3D Breakdown Images step must show the generated six-frame storyboard board separately from production stills.",
);
assert.ok(
  adScenesSource.includes("THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH") &&
    adScenesSource.includes("getThreeDImageInput") &&
    adScenesSource.includes("imageInput,") &&
    adScenesSource.includes("scene.layout.referenceImages?.productImageUrls"),
  "3D Breakdown image generation must pass the style reference sheet plus product/brand references to Nano Banana.",
);
assert.ok(
  quickActionsSource.includes("Story direction {storyDirectionNumber}") &&
    quickActionsSource.includes("Press Spacebar to compare before generating images."),
  "3D Breakdown must explain that generated scripts are story directions users can compare before paid media.",
);
assert.ok(
  quickActionsSource.includes("data-create-saved-library-trigger") &&
    quickActionsSource.includes("SheetContent") &&
    quickActionsSource.includes("data-create-saved-design-item"),
  "Saved designs must open from normal app UI, not canvas hover UI.",
);
assert.ok(
    quickActionsSource.includes('const showBrickStoryboard = selectedFormat === "jingle"') &&
    brickStoryboardSheetSource.includes("data-music-video-assembly-card") &&
    brickStoryboardSheetSource.includes("data-music-video-assembly-toggle") &&
    brickStoryboardSheetSource.includes("data-music-video-assembly-compact-steps") &&
    brickStoryboardSheetSource.includes("aria-expanded={!collapsed}") &&
    brickStoryboardSheetSource.includes("Assembly line") &&
    brickStoryboardSheetSource.includes("Collapse") &&
    !brickStoryboardSheetSource.includes("Build health") &&
    brickStoryboardSheetSource.includes("Song") &&
    brickStoryboardSheetSource.includes("Scenes") &&
    brickStoryboardSheetSource.includes("Images") &&
    brickStoryboardSheetSource.includes("Animation") &&
    brickStoryboardSheetSource.includes("Final Video") &&
    brickStoryboardSheetSource.includes("data-brick-storyboard-animate") &&
    brickStoryboardSheetSource.includes("data-brick-storyboard-build") &&
    !quickActionsSource.includes("if (!brickStoryboard && canGenerateBrickStoryboard"),
  "Jingle music video assembly rail must stay in the right panel and only explicit buttons may spend image/video calls.",
);
assert.ok(
  createClientSource.includes("sceneIds: nextGeneration.sceneIds") &&
    createClientSource.includes("api.jingleStoryboards.generateBrickForScene") &&
    createClientSource.includes("api.jingleStoryboards.regenerateBrickShot") &&
    createClientSource.includes("api.jingleStoryboards.regenerateBrickShotVideo") &&
    createClientSource.includes("api.jingleStoryboards.animateBrickBoard") &&
    createClientSource.includes("api.jingleStoryboards.buildMusicVideoForScene") &&
    createClientSource.includes("api.jingleStoryboards.latestForScene"),
  "Brick storyboard generation must use stored Convex scene IDs without mutating the AdScene render contract.",
);
assert.ok(
  brickStoryboardSheetSource.includes("data-brick-shot-regenerate") &&
    brickStoryboardSheetSource.includes("data-brick-shot-retry-video") &&
    brickStoryboardSheetSource.includes("Retry animation") &&
    brickStoryboardSheetSource.includes("New image") &&
    brickStoryboardSheetSource.includes("data-brick-shot-card") &&
    brickStoryboardSheetSource.includes("data-brick-shot-prompt") &&
    brickStoryboardSheetSource.includes("Still image prompt") &&
    brickStoryboardSheetSource.includes("Seedance video prompt") &&
    !brickStoryboardSheetSource.includes("Retry video") &&
    createClientSource.includes("brickStoryboardVideoBusyIndex") &&
    createClientSource.includes("onRegenerateBrickShotVideo"),
  "Functional assembly rail must expose distinct visible image-regenerate and Seedance-video retry controls plus prompts.",
);
assert.ok(
  createClientSource.includes("restoreSavedDesignSelection") &&
    createClientSource.includes("onLoadSavedDesign={onLoadSavedDesign}"),
  "Saved designs must load back onto /create as complete AdScene payloads.",
);
assert.ok(
    createClientSource.includes("setUrl(latestGeneration.result.websiteUrl)") &&
    createClientSource.includes("setUrl(selectedEntry.scene.brand.url || url)") &&
    createClientSource.includes("setSelectedAdFormat(restoredScene.format)") &&
    createClientSource.includes("setSelectedAdFormat(selectedEntry.scene.format)") &&
    createClientSource.includes("setSelectedVideoMemeTemplateId(templateId)"),
  "Restored scenes must restore URL, format, and video meme template state so same-brand format switches do not reread the wrong site.",
);
assert.ok(
  createClientSource.includes("const selectedAudio = selectedScene?.audio.status === \"generated\" ? selectedScene.audio : null") &&
    createClientSource.includes("const selectedMotionStoryMusicUrl = selectedScene?.format === \"motion-story\" ? selectedScene.layout.musicBed.src : \"\"") &&
    createClientSource.includes("const playableAudioUrl = selectedAudio?.url || selectedMotionStoryMusicUrl") &&
    createClientSource.includes("if (!audio) return") &&
    createClientSource.includes("void audio.play()") &&
    createClientSource.includes("src={playableAudioUrl}") &&
    createClientSource.includes("...(sceneId ? { sceneId } : {})") &&
    quickActionsSource.includes("const hasPlayableAudio = Boolean(playableAudioUrl)") &&
    quickActionsSource.includes('selectedFormat === "motion-story"') &&
    quickActionsSource.includes('selectedFormat === "jingle" || selectedFormat === "brainrot"') &&
    quickActionsSource.includes('selectedFormat === "three-d-breakdown"') &&
    quickActionsSource.includes('audioStatus === "loading"') &&
    quickActionsSource.includes("onClick={hasPlayableAudio ? onTogglePreviewPlayback : onOpenAudioPanel}") &&
    quickActionsSource.includes('"Audio pending"') &&
    quickActionsSource.includes('const visualizerAudioReady = selectedFormat === "visualizer" && hasPlayableAudio') &&
    quickActionsSource.includes('"Regenerate audio"') &&
    createClientSource.includes("onRegenerateVisualizerAudio") &&
    createClientSource.includes("count: 1") &&
    createClientSource.includes("generateDialogueAudioForScene({") &&
    createClientSource.includes("api.audioAssets.generateForScene") &&
    createClientSource.includes('format: "three-d-breakdown"'),
  "The primary audio quick action must derive from selected scene audio and 3D Breakdown must use the existing generated voiceover path.",
);
assert.ok(
  createClientSource.includes("const generateScenesOnly = async") &&
    createClientSource.includes("if (research.result) {") &&
    createClientSource.includes("setResult(research.result)") &&
    createClientSource.includes("setUrl(research.result.websiteUrl)"),
  "Generating one format from cached research must restore the research result so the Creative Brief stays visible.",
);
assert.ok(
  previewChromeSource.includes("data-video-preview-play-button") &&
    previewChromeSource.includes("video.play().catch"),
  "Unmuted video meme previews must show a visible play button when browser autoplay is blocked.",
);
assert.ok(
  createClientSource.includes("import { toPng } from \"html-to-image\"") &&
    createClientSource.includes("const onDownloadStaticPng = async () =>") &&
    createClientSource.includes("[data-meme-artboard]") &&
    createClientSource.includes('[data-render-surface="ad"][data-format="${selectedScene.format}"]') &&
    quickActionsSource.includes('selectedFormat === "text-message"') &&
    quickActionsSource.includes("onClick={staticPngSelected ? onDownloadStaticPng : onCreateRenderJob}") &&
    quickActionsSource.includes('const downloadLabel = staticPngSelected ? "PNG" : "MP4"'),
  "Static formats must export the rendered AdRenderSurface as PNG instead of routing through the MP4 render worker.",
);
assert.ok(
  !quickActionsSource.includes("Meme PNG export is coming next."),
  "Meme download must not be left as deferred UI.",
);
assert.ok(
  !quickActionsSource.includes("const showProductPhotoshoot") &&
    !quickActionsSource.includes("{showProductPhotoshoot ? ("),
  "Product photoshoot must not appear as a helper tile inside ad-format quick actions.",
);
assert.ok(
  creativeBriefSource.includes('data-create-brief-products="true"') &&
    creativeBriefSource.includes("productCount") &&
    creativeBriefSource.includes("bestSellerCount"),
  "Creative Brief must surface the products Wiggly found during research.",
);
assert.ok(
  createClientSource.includes("resetShareState();") &&
    createClientSource.includes("resetRenderState();") &&
    createClientSource.includes("resetSaveState();"),
  "Scene mutations must invalidate stale share/render/save UI state.",
);
assert.ok(
  createClientSource.includes("normalizePublicWebsiteUrl") &&
  createClientSource.includes("latestReadyForAnonymousIdAndUrl") &&
  createClientSource.includes("cachedResearchForUrl") &&
    createClientSource.includes("getReusableResearchForUrl") &&
    createClientSource.includes("researchByUrlRef") &&
    createClientSource.includes("rememberResearchForReuse") &&
    createClientSource.includes("for (const value of [research.websiteUrl, research.finalUrl])") &&
    createClientSource.includes("selectedScene?.metadata.researchRunId") &&
    createClientSource.includes("getSceneProgressFacts(selectedScene)"),
  "Format changes must reuse stored research by normalized URL instead of domain or transient result state.",
);
assert.ok(
  createClientSource.includes("onFormatChange={onFormatChange}") &&
    !createClientSource.includes("onFormatChange={setSelectedAdFormat}"),
  "Format dropdown changes must route through the reuse-aware generation handler.",
);
assert.ok(
  createClientSource.indexOf("const reusableResearch = getReusableResearchForUrl(url)") <
    createClientSource.indexOf('fetchBillingJson("/api/billing/consume-run"'),
  "Same-URL format regeneration must not consume a paid/free research run.",
);
assert.ok(
  createClientSource.includes("getAdGenerationErrorMessage") &&
    createClientSource.includes("We're Sorry copy generation timed out. Try again.") &&
    createClientSource.includes("Ad generation timed out. Try again.") &&
    createClientSource.includes("/NVIDIA NIM|Gemini|Replicate|Seedance|Nano Banana|director/i.test(message)") &&
    createClientSource.includes("const nextGeneration = await generateAdScenes(generationArgs) as AdSceneGenerationResponse") &&
    !createClientSource.includes("Ad generation timed out after reusing the saved research.") &&
    createClientSource.includes("setError(getAdGenerationErrorMessage(nextError))"),
  "Manual ad generation must not use a fake client timer or blame saved research for slow provider calls.",
);
assert.ok(
  createClientSource.includes("getMusicGenerationErrorMessage") &&
    createClientSource.includes("ElevenLabs Music requires a paid plan for this API key") &&
    createClientSource.includes("setAudioError(getMusicGenerationErrorMessage(nextError))"),
  "Jingle audio failures must surface a clear visible music-generation error instead of a raw Convex stack.",
);
assert.ok(
  createClientSource.includes("function getNextJingleStyleId(styleId: JingleStyleId): JingleStyleId") &&
    createClientSource.includes("JINGLE_STYLES.map((style) => style.id)") &&
    createClientSource.includes('selectedScene?.format === "jingle"') &&
    createClientSource.includes('if (status === "loading" || adStatus === "loading" || audioStatus === "loading") return;') &&
    createClientSource.includes("setRerollCount((count) => count + 1)") &&
    createClientSource.includes('triggerRerollFlash(["headline", "visualizer", "captions"])') &&
    createClientSource.includes("const nextJingleStyleId = getNextJingleStyleId(selectedJingleStyleId)") &&
    createClientSource.includes("setSelectedJingleStyleId(nextJingleStyleId)") &&
    createClientSource.includes('loadingNote: `Making a ${nextJingleStyle?.label || "new"} jingle...`') &&
    createClientSource.includes("jingleStyleId: nextJingleStyleId"),
  "Spacebar on Brand Jingle must visibly start work once, then rotate song style instead of silently cycling one scene.",
);
assert.ok(
  canvasColumnSource.includes("rerollBusy: boolean") &&
    canvasColumnSource.includes("disabled={rerollBusy}") &&
    canvasColumnSource.includes("Making your next version...") &&
    createClientSource.includes('rerollBusy={status === "loading" || adStatus === "loading" || audioStatus === "loading"}'),
  "The spacebar reroll control must show an immediate busy state so users do not spam duplicate generations.",
);
assert.ok(
  canvasColumnSource.includes("/wiggly-wordmark-3d-crop.png") &&
    canvasColumnSource.includes("wiggly-preview-bounce") &&
    globalsSource.includes("@keyframes wigglyPreviewBounce"),
  "The preview loading overlay must use the bouncing Wiggly logo instead of a generic spinner.",
);
assert.ok(
  createClientSource.includes("const previewBusyLabel = status === \"loading\"") &&
    createClientSource.includes("function getThreeDBreakdownLoadingLabel(elapsedSeconds: number)") &&
    createClientSource.includes("Still waiting on NVIDIA NIM. Slow, not frozen.") &&
    createClientSource.includes("adGenerationStatusLabel={adGenerationStatusLabel}") &&
    createLeftColumnSource.includes("Writing 2 story directions") &&
    createLeftColumnSource.includes("adGenerationStatusLabel ? (") &&
    createClientSource.includes('previewBusyLabel={previewBusyLabel}') &&
    canvasColumnSource.includes("previewBusyLabel: string") &&
    canvasColumnSource.includes("data-preview-loading-overlay") &&
    canvasColumnSource.includes("{previewBusyLabel}"),
  "The phone preview must show a visible loading overlay while /create is doing work.",
);
assert.ok(
  previewChromeSource.includes("useMemo<RenderVideoComponent>") &&
    previewChromeSource.includes('const syncVideoTimeToPreview = renderScene.audio.status !== "generated"') &&
    previewChromeSource.includes("if (syncVideoTimeToPreview)") &&
    previewChromeSource.includes("onPreviewTimeChange?.(event.currentTarget.currentTime)") &&
    previewChromeSource.includes("<RenderAssetProvider Image={PreviewImage} Video={PreviewVideo}>"),
  "Preview video assets may drive timing only when generated audio is not already the master clock.",
);

console.log("create-control-panel tests passed");
