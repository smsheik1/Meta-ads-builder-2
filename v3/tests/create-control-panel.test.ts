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
const remotionRootSource = readFileSync("remotion-entry/Root.tsx", "utf8");
const quickActionsSource = readFileSync("app/create/CreateQuickActions.tsx", "utf8");
const assemblyLineSource = readFileSync("app/create/CreateAssemblyLine.tsx", "utf8");
const brickStoryboardSheetSource = readFileSync("app/create/CreateBrickStoryboardSheet.tsx", "utf8");
const creativeBriefSource = readFileSync("app/create/CreateCreativeBriefCard.tsx", "utf8");
const adScenesSource = readFileSync("convex/adScenes.ts", "utf8");
const threeDImagesSource = readFileSync("convex/threeDImages.ts", "utf8");
const threeDProgressCanvasSource = readFileSync("features/formats/three-d-breakdown/ProgressCanvas.tsx", "utf8");
const storyboardContractsSource = readFileSync("features/formats/three-d-breakdown/storyboardContracts.ts", "utf8");
const threeDMediaPromptsSource = readFileSync("features/formats/three-d-breakdown/mediaPrompts.ts", "utf8");
const jingleStoryboardSource = readFileSync("features/formats/jingle/storyboard.ts", "utf8");
const visualizerSchemaSource = readFileSync("features/formats/visualizer/schema.ts", "utf8");
const visualizerModuleSource = readFileSync("features/formats/visualizer/index.ts", "utf8");
const globalsSource = readFileSync("app/globals.css", "utf8");

assert.ok(
  adScenesSource.includes("const generatedRows = latestRows.filter((row) => row.researchRunId)") &&
    adScenesSource.includes("const latestBatchId = generatedRows[0]?.generationBatchId") &&
    adScenesSource.includes("const batchRows = generatedRows"),
  "/create restore must ignore newer render/share snapshots that do not belong to a generated research run.",
);

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
  createClientSource.includes("showThreeDStoryDirectionStage") &&
    createClientSource.includes("showThreeDProgressCanvas") &&
    createClientSource.includes("selectedSceneForCanvas") &&
    createClientSource.includes("const scriptFailed = threeDStoryDirections.length > 0") &&
    canvasColumnSource.includes("threeDProgress ?") &&
    canvasColumnSource.includes("<ThreeDBreakdownProgressCanvas") &&
    quickActionsSource.includes("!showThreeDStorySlateStage ?") &&
    quickActionsSource.includes("threeDStorySlateActive: boolean") &&
    quickActionsSource.includes('data-create-global-actions="true"') &&
    createClientSource.includes("!showThreeDStoryDirectionStage ? (") &&
    threeDProgressCanvasSource.includes('data-three-d-progress-canvas="true"') &&
    threeDProgressCanvasSource.includes('aspect-[1/2] h-[clamp(470px,calc(100vh-15rem),720px)]') &&
    threeDProgressCanvasSource.includes("Choose your story") &&
    threeDProgressCanvasSource.includes("Write the script") &&
    threeDProgressCanvasSource.includes("Build the storyboard") &&
    threeDProgressCanvasSource.includes("Create the scenes") &&
    threeDProgressCanvasSource.includes("Add motion + voice") &&
    threeDProgressCanvasSource.includes("Finish the video") &&
    threeDProgressCanvasSource.includes("Your final video will appear here") &&
    !threeDProgressCanvasSource.includes("Hidden mechanism") &&
    !threeDProgressCanvasSource.includes("3D reveal") &&
    !threeDProgressCanvasSource.includes("Learn More") &&
    !threeDProgressCanvasSource.includes("Add audio"),
  "3D Breakdown must show a plain-English progress tracker until the final video replaces it.",
);
assert.ok(
  previewChromeSource.includes('aspect-[1/2] h-[clamp(470px,calc(100vh-15rem),720px)]') &&
    !previewChromeSource.includes("h-[720px] w-[360px]"),
  "/create phone preview must shrink on short desktop viewports instead of forcing a fixed 720px-tall phone.",
);
assert.ok(
  previewChromeSource.includes('renderScene.format === "three-d-breakdown"') &&
    previewChromeSource.includes('fullHeightVerticalAd ? "h-full w-full" : "h-[62.5%] w-full"') &&
    createClientSource.includes('selectedAdFormat === "three-d-breakdown" && previewPlatform === "instagram-feed"') &&
    createClientSource.includes('setPreviewPlatform("reels")'),
  "3D Breakdown must use the full Reels preview canvas instead of a cropped feed-style viewport.",
);
assert.ok(
  remotionRootSource.includes('scene.format === "three-d-breakdown"') &&
    remotionRootSource.includes("height: 1920") &&
    remotionRootSource.includes("height: 1350") &&
    remotionRootSource.includes("...getAdSceneDimensions(props.scene)"),
  "3D Breakdown MP4 export must be 9:16 while existing feed formats keep their 4:5 export dimensions.",
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
  createLeftColumnSource.includes("const pillLabel = singleSubmitBusy") &&
    createLeftColumnSource.includes('? "Ads ready to review"') &&
    createLeftColumnSource.includes('? "Website ready"'),
  "/create must not tell users to add a website after research exists but generation failed.",
);
assert.ok(
  createClientSource.includes("api.adScenes.listForResearchRun") &&
    createClientSource.includes("hydrateCreativePackGroupsFromSceneRows") &&
    createClientSource.includes("recoverCreativePackGroupsFromSceneRows({") &&
    createClientSource.includes("creativePackWasStarted(result.researchRunId)") &&
    createClientSource.includes("creativePackWasStarted(research.researchRunId, true)") &&
    createClientSource.includes("minimumReadyFormats: CREATIVE_PACK_MONEY_SHOT_READY_COUNT"),
  "/create must restore the Creative Pack rail only after an explicit pack click, never after ordinary format generation.",
);
assert.ok(
  createClientSource.includes('if (format === "video-meme") return Math.min(3, getVideoMemeTemplate') &&
    !createClientSource.includes("generateCreativePackAudioForScene") &&
    !createClientSource.includes("format === \"motion-story\" ? getCreativePackReviewProductHandles") &&
    !createClientSource.includes("void generateJingleMusicForScene(firstScene") &&
    !createClientSource.includes("void generateJingleMusicForScene(nextScene") &&
    !createClientSource.includes("void generateJingleMusicForScene(scene, sceneIds[index])"),
  "/create must keep Video Meme's first batch small and must never spend on jingle audio until the user presses the visible audio control.",
);
assert.ok(
  createClientSource.includes('format === "reviews" && /at least 2 actual review or testimonial lines/i.test(debugMessage)') &&
    createClientSource.includes('status: "needs-input" as const') &&
    createClientSource.includes('Needs two real customer quotes from a page you share.') &&
    createLeftColumnSource.includes('const needsInput = groupStatus === "needs-input"'),
  "Creative Pack must say when review proof is missing instead of presenting that site-data gap as a retryable generation failure.",
);
assert.ok(
  adScenesSource.includes('generateBrainrotVariantsFromResearch(research, { count })'),
  "A one-script Creative Pack Brainrot preview must not ask NVIDIA NIM to write the three-script direct-generation batch.",
);
assert.ok(
  createClientSource.includes("sceneIds[selectedSceneIndex]") &&
    createClientSource.includes("row.generationBatchId === selectedScene?.metadata.generationBatchId") &&
    createClientSource.includes("const sceneId = selectedSceneId;") &&
    createClientSource.includes("This 3D Breakdown scene is still syncing. Wait a moment and try again."),
  "/create must recover the persisted scene id before paid 3D media actions instead of silently doing nothing.",
);
assert.ok(
  createClientSource.includes("api.adScenes.generateThreeDStoryDirections") &&
    createClientSource.includes("generateThreeDStoryDirectionSlate") &&
    createClientSource.includes("threeDStoryDirection: direction") &&
    createClientSource.includes('format === "three-d-breakdown" && !options.threeDStoryDirection') &&
    quickActionsSource.includes("data-three-d-story-directions-card") &&
    quickActionsSource.includes("Pick the premise") &&
    !quickActionsSource.includes("data-three-d-use-manual-story-direction") &&
    adScenesSource.includes("export const generateThreeDStoryDirections") &&
    adScenesSource.includes("threeDStoryDirection: v.optional"),
  "3D Breakdown must show a five-card story slate before generating the script/media pipeline.",
);
assert.ok(
  createClientSource.includes('if (firstScene?.format === "three-d-breakdown") resetThreeDStoryDirections();') &&
    createClientSource.includes('setThreeDStoryDirectionStatus("loading")') &&
    createClientSource.includes('setThreeDStoryDirectionError(message)') &&
    quickActionsSource.indexOf('role="alert"') < quickActionsSource.indexOf('{directions.length ? (') &&
    quickActionsSource.includes('status === "error" && selected ? "Retry direction" : "Use direction"'),
  "Choosing a 3D story direction must clear stale slate state after success and expose a recoverable error after failure.",
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
  quickActionsSource.includes("const shareSupported = staticPngSelected ||"),
  "Static formats that can download as PNG must also expose the share action.",
);
assert.ok(
	  quickActionsSource.includes("threeDRenderBlocked") &&
	    quickActionsSource.includes("threeDVoiceoverBlocked") &&
	    quickActionsSource.includes("threeDClipPlans.length > 0") &&
	    quickActionsSource.includes("threeDClipPlans.every((clipPlan) => clipPlan.video?.status === \"ready\")") &&
    quickActionsSource.includes("Add the documentary voiceover before building the MP4.") &&
    quickActionsSource.includes("Generate the storyboard, production anchors, and Seedance clips before building the MP4."),
  "3D Breakdown must not allow the global MP4 action before generated clips and voiceover exist.",
);
assert.ok(
  quickActionsSource.includes("scene.layout.scriptBeats.map") &&
    quickActionsSource.includes('data-three-d-script-beat="true"') &&
    quickActionsSource.includes("scene.layout.storyContract.referenceScript") &&
    quickActionsSource.includes('data-three-d-reference-script="true"'),
  "3D Breakdown Script ready state must show the narrator script when present plus all narration beats, not only the first line.",
);
assert.ok(
	  quickActionsSource.includes('data-three-d-storyboard-board="true"') &&
	    quickActionsSource.includes("Generate the six-panel storyboard first. Stop here until it matches the reference.") &&
	    quickActionsSource.includes("Generate anchors") &&
	    quickActionsSource.includes("Anchors ready") &&
	    quickActionsSource.includes('id: isPresenterStyle ? "storyboard" : "frames"') &&
	    quickActionsSource.includes('id: "anchors"') &&
	    quickActionsSource.includes('isPresenterStyle ? "Anchors ready" : "Frames ready"') &&
	    quickActionsSource.includes("requiredFrames.map") &&
	    quickActionsSource.includes("storyboardBoard.imagePrompt") &&
	    quickActionsSource.includes("formatStoryboardFramePrompt(frame)") &&
	    quickActionsSource.includes('data-three-d-storyboard-frames="true"') &&
    !quickActionsSource.includes("Six-frame 3D Breakdown storyboard board"),
  "3D Breakdown must split storyboard review and production anchors into compact inspectable assembly stages.",
);
assert.ok(
  quickActionsSource.includes('data-three-d-anchor-errors="true"') &&
    quickActionsSource.includes("Frame {frame.frameIndex}:") &&
    quickActionsSource.includes("frame.image?.error"),
  "3D Breakdown anchor failures must expose the failed frame and provider error instead of only generic retry copy.",
);
assert.ok(
	  quickActionsSource.includes('data-three-d-clip-plan="true"') &&
    quickActionsSource.includes("clipPlans.map") &&
    quickActionsSource.includes("isPresenterStyle ? [clipPlan.frameIndexes[0]] : clipPlan.frameIndexes") &&
    quickActionsSource.includes("Frames {clipPlan.frameIndexes.join(\"-\")}") &&
    quickActionsSource.includes("clipPlan.video?.status") &&
    quickActionsSource.includes("Clip {clipPlan.clipIndex}") &&
    quickActionsSource.includes("All clips ready · build the final MP4") &&
	    quickActionsSource.includes('!hasVoiceover ? "Add voice" : "Build final video"') &&
    quickActionsSource.includes("onAddVoice={onOpenAudioPanel}") &&
    quickActionsSource.includes("onClick={hasVoiceover ? onBuildFinalVideo : onAddVoice}") &&
    quickActionsSource.includes("disabled={!videosReady || renderBusy}") &&
    quickActionsSource.includes("Generate clip ${nextClipPlan.clipIndex} next") &&
    quickActionsSource.includes("Generate clip ${clipPlan.clipIndex - 1} first") &&
    quickActionsSource.includes("data-three-d-generate-clip={clipPlan.clipIndex}") &&
    quickActionsSource.includes("data-three-d-clip-preview={clipPlan.clipIndex}") &&
    quickActionsSource.includes("autoPlay") &&
    quickActionsSource.includes("playsInline") &&
    quickActionsSource.includes("PromptHelp") &&
    quickActionsSource.includes("clipPlan.prompt") &&
    quickActionsSource.includes('data-three-d-prompt-help="true"'),
  "3D Breakdown preflight must show planned clips, inspectable prompts, visible ready previews, and explicit sequential Seedance actions.",
);
assert.ok(
  storyboardContractsSource.includes("const presenterFrameGroups") &&
    storyboardContractsSource.includes("[[1, 2, 3], [4, 5, 6]]") &&
    storyboardContractsSource.includes("Time-code the clip into storyboard sub-shots") &&
    storyboardContractsSource.includes("durationSeconds: 10") &&
    !storyboardContractsSource.includes("Clip 6: product reframe"),
  "Presenter teardown 3D Breakdown must use two 10s clips from the six-frame storyboard, not six separate Seedance clips.",
);
assert.ok(
  !createClientSource.includes("min-w-[1280px]") &&
    !createClientSource.includes("overflow-x-auto") &&
    createClientSource.includes("overflow-x-hidden"),
  "/create must not force horizontal desktop scroll at normal 100% browser zoom.",
);
assert.ok(
  !quickActionsSource.includes("scene.layout.shots.every((shot) => shot.video?.status === \"ready\")"),
  "3D Breakdown final-video readiness must use clip plans, not retired three-shot video state.",
);
assert.ok(
  !quickActionsSource.includes("onAnimateThreeDClips") &&
    !quickActionsSource.includes("onRegenerateThreeDClip") &&
    !quickActionsSource.includes("onRegenerateThreeDImage") &&
    !createClientSource.includes("onAnimateThreeDClips") &&
    !createClientSource.includes("onRegenerateThreeDClip") &&
    !createClientSource.includes("onRegenerateThreeDImage"),
  "3D Breakdown /create UI must not keep the old three-shot image/video retry wiring while the preflight flow stops before Seedance.",
);
assert.ok(
  !adScenesSource.includes("export const animateThreeDClips") &&
    !adScenesSource.includes("export const regenerateThreeDClip") &&
    !adScenesSource.includes("export const regenerateThreeDImage") &&
    !adScenesSource.includes("generateReplicateSeedanceVideo"),
  "3D Breakdown backend must not keep the old three-shot media actions inside adScenes.",
);
assert.ok(
    createClientSource.includes("api.threeDImages.generateThreeDImages") &&
    createClientSource.includes("api.threeDImages.generateThreeDClip") &&
    threeDImagesSource.includes('"use node"') &&
    threeDImagesSource.includes("export const generateThreeDClip") &&
    threeDImagesSource.includes("clipIndex < 1 || clipIndex > 4") &&
    threeDImagesSource.includes("Generate 3D Breakdown clip ${previousClipIndex} before clip ${typedClipIndex}.") &&
    threeDImagesSource.includes("generateReplicateSeedanceVideo") &&
    jingleStoryboardSource.includes("generate_audio: false") &&
    threeDImagesSource.includes("THREE_D_BREAKDOWN_STYLE_REFERENCE_PATH") &&
    threeDImagesSource.includes("ecommerce-teardown-style-reference-clean-v7.jpg") &&
    threeDImagesSource.includes("THREE_D_BREAKDOWN_STYLE_REFERENCE_URL") &&
    threeDImagesSource.includes("requireThreeDStyleReferenceUrl") &&
    threeDImagesSource.includes("getThreeDImageInput") &&
    threeDImagesSource.includes('mode: v.optional(v.union(v.literal("storyboard"), v.literal("anchors"), v.literal("anchor-1"), v.literal("anchor-2"), v.literal("all")))') &&
    threeDImagesSource.includes('const imageMode = mode || (isPresenterStyle ? "storyboard" : "all")') &&
    quickActionsSource.includes('onGenerateImages("storyboard")') &&
	    quickActionsSource.includes('data-three-d-regenerate-storyboard={storyboardBoardReady ? "true" : undefined}') &&
    quickActionsSource.includes("Regenerate storyboard") &&
    quickActionsSource.includes('onGenerateImages(clipPlan.clipIndex === 1 ? "anchor-1" : "anchor-2")') &&
    quickActionsSource.includes('data-three-d-regenerate-anchor={clipPlan.clipIndex}') &&
    threeDImagesSource.includes("generateBoard && !generateAnchors") &&
    threeDImagesSource.includes("Generate the 3D Breakdown storyboard board before production anchors.") &&
    threeDImagesSource.includes("storyboard-gate:ready") &&
    threeDImagesSource.includes("buildThreeDProductionFramePrompt") &&
    threeDImagesSource.includes("production-frame:start") &&
    threeDImagesSource.includes("anchorFramesToGenerate") &&
    threeDImagesSource.includes("frame.image?.status !== \"ready\"") &&
    threeDImagesSource.includes("frame.frameIndex === regenerateAnchorFrameIndex || frame.image?.status !== \"ready\"") &&
    threeDImagesSource.includes("changedAnchorFrameIndexes.includes(plan.frameIndexes[0])") &&
    threeDImagesSource.includes("activeFrameIndex") &&
    threeDImagesSource.includes("storyboard board must define 6 frames before image generation") &&
    !threeDImagesSource.includes("createThreeDStoryboardFrames") &&
    !threeDImagesSource.includes("Promise.all(baseFrames.map") &&
    threeDImagesSource.includes("buildThreeDSeedancePrompt") &&
    threeDImagesSource.includes("createThreeDClipPlans(nextScene.layout)") &&
    threeDMediaPromptsSource.includes("MAX_SEEDANCE_PROMPT_CHARS = 3900") &&
    threeDMediaPromptsSource.includes("simplify the approved frame plan before generation") &&
    !threeDMediaPromptsSource.includes(".slice(0, MAX_SEEDANCE_PROMPT_CHARS)") &&
    threeDImagesSource.includes("seedancePromptLength") &&
    threeDImagesSource.includes("cropThreeDStoryboardPanel") &&
    threeDImagesSource.includes("getReplicateImageInput(startFrame.image.url)") &&
    threeDImagesSource.includes("getReplicateImageInput(endFrameImage.url)") &&
    threeDImagesSource.includes("imageUrl: startFrameImageInput") &&
    threeDImagesSource.includes("lastFrameImageUrl: endFrameImageInput") &&
    jingleStoryboardSource.includes("last_frame_image") &&
    threeDImagesSource.includes("imageInput,") &&
    threeDImagesSource.includes("getThreeDProductReferences") &&
    threeDImagesSource.includes("LEGACY_THREE_D_STYLE_REFERENCE") &&
    threeDImagesSource.includes("Style B cannot use the legacy anatomy-only reference"),
  "3D Breakdown media generation must require the style reference and expose explicit sequential Seedance clips without preflight/repair scaffolding.",
);
assert.ok(
    threeDImagesSource.includes("getThreeDProductReferences(scene)") &&
    threeDImagesSource.includes("continuityAnchorDataUrl") &&
    threeDImagesSource.includes("hasContinuityAnchor") &&
    !threeDImagesSource.includes("getThreeDAnchorImageInput(nextScene, imageInput)"),
  "Production anchors must use only the approved storyboard and selected product references, not competing site/style images.",
);
const productionFramesReadyIndex = threeDImagesSource.indexOf('console.log("[wiggly:3d-breakdown] production-frames:ready"');
const preserveReadyAnchorIndex = threeDImagesSource.indexOf('if (frame.image?.status === "ready") return frame;');
assert.ok(
  preserveReadyAnchorIndex !== -1 &&
    productionFramesReadyIndex !== -1 &&
    preserveReadyAnchorIndex < productionFramesReadyIndex,
  "3D Breakdown anchor retry must preserve previously ready anchors when saving newly generated anchors.",
);
assert.ok(
  jingleStoryboardSource.includes('BRICK_STORYBOARD_IMAGE_MODEL = "google/nano-banana-2-lite"') &&
    jingleStoryboardSource.includes("Replicate Nano Banana prediction polling") &&
    jingleStoryboardSource.includes("Array.isArray(payload?.output)") &&
    jingleStoryboardSource.includes("payload?.status === \"failed\" || payload?.status === \"canceled\"") &&
    !jingleStoryboardSource.includes('resolution: "1K"'),
  "Replicate image generation must use Nano Banana 2 Lite and poll created predictions instead of treating delayed output as a missing image.",
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
    brickStoryboardSheetSource.includes("<CreateAssemblyLine") &&
    quickActionsSource.includes("<CreateAssemblyLine") &&
    quickActionsSource.includes('data-three-d-breakdown-assembly-card="true"') &&
    assemblyLineSource.includes('data-create-assembly-line="true"') &&
    assemblyLineSource.includes('data-create-assembly-toggle="true"') &&
    assemblyLineSource.includes('data-create-assembly-compact-steps="true"') &&
    assemblyLineSource.includes("aria-expanded={!collapsed}") &&
    assemblyLineSource.includes("Assembly line") &&
    assemblyLineSource.includes("Collapse") &&
    !brickStoryboardSheetSource.includes("Build health") &&
    brickStoryboardSheetSource.includes("Song") &&
    brickStoryboardSheetSource.includes("Scenes") &&
    brickStoryboardSheetSource.includes("Images") &&
    brickStoryboardSheetSource.includes("Animation") &&
    brickStoryboardSheetSource.includes("Final Video") &&
    quickActionsSource.includes('label: "Script"') &&
    quickActionsSource.includes('label: isPresenterStyle ? "Storyboard" : "Frames"') &&
    quickActionsSource.includes('label: "Anchors"') &&
    quickActionsSource.includes('label: "Clips"') &&
    quickActionsSource.includes('label: "Final Video"') &&
    !quickActionsSource.includes("const stepClass") &&
    brickStoryboardSheetSource.includes("data-brick-storyboard-animate") &&
    brickStoryboardSheetSource.includes("data-brick-storyboard-build") &&
    !quickActionsSource.includes("if (!brickStoryboard && canGenerateBrickStoryboard"),
  "Jingle and 3D Breakdown must share one bounded assembly rail while only explicit buttons may spend image/video calls.",
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
    createClientSource.includes('const playableAudioUrl = selectedFinalVideoUrl ? "" : selectedAudio?.url || selectedMotionStoryMusicUrl') &&
    createClientSource.includes("if (!audio) return") &&
    createClientSource.includes("void audio.play()") &&
    createClientSource.includes("src={playableAudioUrl}") &&
    createClientSource.includes("...(sceneId ? { sceneId } : {})") &&
    quickActionsSource.includes("const hasPlayableAudio = Boolean(playableAudioUrl)") &&
    quickActionsSource.includes('const hasThreeDVoiceover = threeDScene?.audio.status === "generated"') &&
    quickActionsSource.includes("const hasPreviewMedia = hasPlayableAudio ||") &&
    quickActionsSource.includes('selectedFormat === "motion-story"') &&
    quickActionsSource.includes('selectedFormat === "jingle" || selectedFormat === "brainrot"') &&
    quickActionsSource.includes('selectedFormat === "three-d-breakdown"') &&
    quickActionsSource.includes('audioStatus === "loading"') &&
    quickActionsSource.includes("onClick={hasPreviewMedia ? onTogglePreviewPlayback : onOpenAudioPanel}") &&
    quickActionsSource.includes("hasVoiceover={hasThreeDVoiceover}") &&
    createClientSource.includes("renderDownloadUrl={selectedFinalVideoUrl || renderDownloadUrl}") &&
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
assert.equal(
  createClientSource.match(/generateBrainrotAudioForSceneSelected\(/g)?.length,
  1,
  "Brainrot voice generation must run only from the explicit Add audio action, never automatically after generation, reroll, or selection.",
);
assert.ok(
  !createClientSource.includes('if (firstScene?.format === "visualizer" && firstScene.audio.status !== "generated")'),
  "Visualizer voice generation must wait for an explicit user audio action instead of running after scene generation.",
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
  createClientSource.includes("shareResetRenderJobRef") &&
    createClientSource.includes('selectedScene?.format === "three-d-breakdown"') &&
    createClientSource.includes("currentRenderStatus === \"ready\""),
  "3D Breakdown render completion must invalidate stale share links so new links include the final MP4.",
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
    !createClientSource.includes("onFormatChange={setSelectedAdFormat}") &&
    !createClientSource.includes("void generateScenesOnly(reusableResearch, format);") &&
    createClientSource.includes("selected. Generate when ready."),
  "Format dropdown changes must preserve reusable research without automatically generating against the previous URL.",
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
  createLeftColumnSource.includes('const errorPanel = error ?') &&
    !createLeftColumnSource.includes('const errorPanel = status === "error" || adStatus === "error" ?'),
  "Website and ad-generation errors must remain visible when Wiggly preserves an older canvas after failure.",
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
    createClientSource.includes("CREATE_FORMAT_GUIDES[selectedAdFormat].label") &&
    createClientSource.includes("function getThreeDBreakdownLoadingLabel(elapsedSeconds: number)") &&
    createClientSource.includes("Still waiting on NVIDIA NIM. Slow, not frozen.") &&
    createClientSource.includes("adGenerationStatusLabel={adGenerationStatusLabel}") &&
    createLeftColumnSource.includes("Writing 2 story directions") &&
    createLeftColumnSource.includes("adGenerationStatusLabel ? (") &&
    createClientSource.includes('previewBusyLabel={previewBusyLabel}') &&
    createClientSource.includes("const previewBusyHidesScene = Boolean(previewBusyLabel)") &&
    createClientSource.includes("selectedSceneForCanvas?.format !== selectedAdFormat") &&
    createClientSource.includes('previewBusyHidesScene={previewBusyHidesScene}') &&
    canvasColumnSource.includes("previewBusyLabel: string") &&
    canvasColumnSource.includes("previewBusyHidesScene: boolean") &&
    canvasColumnSource.includes("data-preview-loading-overlay") &&
    canvasColumnSource.includes('data-preview-loading-mode={previewBusyHidesScene ? "opaque" : "overlay"}') &&
    createClientSource.includes('result={previewBusyHidesScene ? null : result}') &&
    createClientSource.includes("const selectedSceneMatchesActiveFormat = selectedScene?.format === selectedAdFormat") &&
    createClientSource.includes('selectedScene={previewBusyHidesScene ? null : selectedSceneForActiveCanvas}') &&
    createClientSource.includes('data-create-workspace-stale-content={previewBusyHidesScene ? "hidden" : "visible"}') &&
    createClientSource.includes("!previewBusyHidesScene && selectedSceneMatchesActiveFormat && !showThreeDStoryDirectionStage") &&
    createLeftColumnSource.includes("const pillLabel = singleSubmitBusy") &&
    canvasColumnSource.includes("{previewBusyLabel}"),
  "Cross-format work must name the target format and hide the stale scene, controls, brief, and ideas while it runs.",
);
assert.ok(
  previewChromeSource.includes("useMemo<RenderVideoComponent>") &&
    previewChromeSource.includes('renderScene.audio.status !== "generated" || Boolean(finalCompositedVideoUrl)') &&
    previewChromeSource.includes('!video.paused || typeof clipTimeSeconds !== "number"') &&
    previewChromeSource.includes("muted={isFinalCompositedVideo ? false : props.muted}") &&
    previewChromeSource.includes("if (syncVideoTimeToPreview)") &&
    previewChromeSource.includes("onPreviewTimeChange?.((clipStartSeconds || 0) + event.currentTarget.currentTime)") &&
    createClientSource.includes("finalVideoPreviewRef") &&
    createClientSource.includes("const renderedFinalVideoUrl =") &&
    createClientSource.includes('const playableAudioUrl = selectedFinalVideoUrl ? "" :') &&
    createClientSource.includes("void finalVideo.play()") &&
    previewChromeSource.includes("<RenderAssetProvider Image={PreviewImage} Video={PreviewVideo}>"),
  "A composited final MP4 must own preview timing and audio without corrective seeks while it is playing.",
);

console.log("create-control-panel tests passed");
