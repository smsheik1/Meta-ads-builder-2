import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const createClientSource = readFileSync("app/create/CreateResearchClient.tsx", "utf8");
const createCaptionModalSource = readFileSync("app/create/CreateCaptionModal.tsx", "utf8");
const controlPanelSource = readFileSync("app/create/CreateControlPanel.tsx", "utf8");
const createDialogueModalSource = readFileSync("app/create/CreateDialogueModal.tsx", "utf8");
const createLeftColumnSource = readFileSync("app/create/CreateLeftColumn.tsx", "utf8");
const rootLayoutSource = readFileSync("app/layout.tsx", "utf8");
const previewChromeSource = readFileSync("app/create/CreatePreviewChrome.tsx", "utf8");
const quickActionsSource = readFileSync("app/create/CreateQuickActions.tsx", "utf8");
const brickStoryboardSheetSource = readFileSync("app/create/CreateBrickStoryboardSheet.tsx", "utf8");
const visualizerSchemaSource = readFileSync("features/formats/visualizer/schema.ts", "utf8");
const visualizerModuleSource = readFileSync("features/formats/visualizer/index.ts", "utf8");

assert.ok(
  !createClientSource.includes("<CreateActionCard"),
  "The legacy Download Island must not be the primary /create control surface.",
);
assert.ok(
  createClientSource.includes("<CreateQuickActions") && createClientSource.includes("<CreateControlPanel"),
  "/create must use compact quick actions plus the panel control surface.",
);
assert.ok(
  createClientSource.includes("const [clientReady, setClientReady] = useState(false)") &&
    createClientSource.includes("if (!clientReady)") &&
    createClientSource.indexOf("if (!clientReady)") < createClientSource.indexOf("return <ResearchConnected />"),
  "/create must not SSR interactive controls that browser extensions can mutate before hydration.",
);
assert.ok(
  createClientSource.includes('if (format === "text-message") return 6') &&
    createLeftColumnSource.includes('<option value="text-message">iMessage Ad</option>'),
  "/create must expose iMessage Ad and generate six static text-message variants.",
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
assertHydrationGuards(controlPanelSource, 4, "CreateControlPanel");
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
  quickActionsSource.includes("data-create-saved-library-trigger") &&
    quickActionsSource.includes("SheetContent") &&
    quickActionsSource.includes("data-create-saved-design-item"),
  "Saved designs must open from normal app UI, not canvas hover UI.",
);
assert.ok(
  quickActionsSource.includes('const showBrickStoryboard = selectedFormat === "jingle" && hasPlayableAudio') &&
    brickStoryboardSheetSource.includes("data-brick-storyboard-trigger") &&
    brickStoryboardSheetSource.includes("data-brick-storyboard-animate") &&
    brickStoryboardSheetSource.includes("data-brick-storyboard-build") &&
    !quickActionsSource.includes("if (!brickStoryboard && canGenerateBrickStoryboard"),
  "Brick storyboard review must open for free; only the explicit Generate board button may spend image calls.",
);
assert.ok(
  createClientSource.includes("sceneIds: nextGeneration.sceneIds") &&
    createClientSource.includes("api.jingleStoryboards.generateBrickForScene") &&
    createClientSource.includes("api.jingleStoryboards.regenerateBrickShot") &&
    createClientSource.includes("api.jingleStoryboards.animateBrickBoard") &&
    createClientSource.includes("api.jingleStoryboards.buildMusicVideoForScene") &&
    createClientSource.includes("api.jingleStoryboards.latestForScene"),
  "Brick storyboard generation must use stored Convex scene IDs without mutating the AdScene render contract.",
);
assert.ok(
  brickStoryboardSheetSource.includes("data-brick-shot-regenerate") &&
    brickStoryboardSheetSource.includes("data-brick-shot-prompt"),
  "Brick storyboard shot cards must expose visible per-shot regenerate and prompt debug controls.",
);
assert.ok(
  createClientSource.includes("restoreSavedDesignSelection") &&
    createClientSource.includes("onLoadSavedDesign={onLoadSavedDesign}"),
  "Saved designs must load back onto /create as complete AdScene payloads.",
);
assert.ok(
    createClientSource.includes("setUrl(latestGeneration.result.websiteUrl)") &&
    createClientSource.includes("setUrl(restored.selectedScene.brand.url || url)") &&
    createClientSource.includes("setSelectedAdFormat(restoredScene.format)") &&
    createClientSource.includes("setSelectedAdFormat(restored.selectedScene.format)") &&
    createClientSource.includes("setSelectedVideoMemeTemplateId(templateId)"),
  "Restored scenes must restore URL, format, and video meme template state so same-brand format switches do not reread the wrong site.",
);
assert.ok(
  createClientSource.includes("const selectedAudio = selectedScene?.audio.status === \"generated\" ? selectedScene.audio : null") &&
    createClientSource.includes("const playableAudioUrl = selectedAudio?.url || \"\"") &&
    createClientSource.includes("...(sceneId ? { sceneId } : {})") &&
    quickActionsSource.includes("const hasPlayableAudio = Boolean(playableAudioUrl)") &&
    quickActionsSource.includes('selectedFormat === "jingle" || selectedFormat === "brainrot"') &&
    quickActionsSource.includes('((selectedFormat === "jingle" || selectedFormat === "brainrot") && hasPlayableAudio)') &&
    quickActionsSource.includes('audioStatus === "loading"') &&
    quickActionsSource.includes("onClick={hasPlayableAudio ? onTogglePreviewPlayback : onOpenAudioPanel}") &&
    quickActionsSource.includes('"Audio pending"'),
  "The primary audio quick action must derive from selected scene audio and never show Add Audio for pending generated-audio formats.",
);
assert.ok(
  previewChromeSource.includes("data-video-preview-play-button") &&
    previewChromeSource.includes("video.play().catch"),
  "Unmuted video meme previews must show a visible play button when browser autoplay is blocked.",
);
assert.ok(
  createClientSource.includes("import { toPng } from \"html-to-image\"") &&
    createClientSource.includes("const onDownloadMemePng = async () =>") &&
    createClientSource.includes("[data-meme-artboard]") &&
    quickActionsSource.includes("onClick={memeSceneSelected ? onDownloadMemePng : onCreateRenderJob}") &&
    quickActionsSource.includes('const downloadLabel = memeSceneSelected ? "PNG" : "MP4"'),
  "Meme downloads must export the rendered meme artboard as PNG instead of routing through the MP4 render worker.",
);
assert.ok(
  !quickActionsSource.includes("Meme PNG export is coming next."),
  "Meme download must not be left as deferred UI.",
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
    createClientSource.includes("We're Sorry copy generation timed out after reusing the saved research.") &&
    createClientSource.includes("setError(getAdGenerationErrorMessage(nextError))"),
  "Ad generation timeouts must not be reported as website research timeouts.",
);
assert.ok(
  createClientSource.includes("getMusicGenerationErrorMessage") &&
    createClientSource.includes("ElevenLabs Music requires a paid plan for this API key") &&
    createClientSource.includes("setAudioError(getMusicGenerationErrorMessage(nextError))"),
  "Jingle audio failures must surface a clear visible music-generation error instead of a raw Convex stack.",
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
