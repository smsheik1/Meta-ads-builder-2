import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const createClientSource = readFileSync("app/create/CreateResearchClient.tsx", "utf8");
const controlPanelSource = readFileSync("app/create/CreateControlPanel.tsx", "utf8");
const quickActionsSource = readFileSync("app/create/CreateQuickActions.tsx", "utf8");
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
  createClientSource.includes("restoreSavedDesignSelection") &&
    createClientSource.includes("onLoadSavedDesign={onLoadSavedDesign}"),
  "Saved designs must load back onto /create as complete AdScene payloads.",
);
assert.ok(
  quickActionsSource.includes("onClick={hasAudio ? onTogglePreviewPlayback : onOpenAudioPanel}") &&
    quickActionsSource.includes("disabled={hasAudio && !hasSelectedScene}") &&
    quickActionsSource.includes('aria-label={hasAudio ? (isAudioPlaying ? "Stop audio preview" : "Play audio preview") : "Add audio for this ad"}'),
  "The primary audio quick action must open the audio modal before a website exists and switch to playback after audio exists.",
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

console.log("create-control-panel tests passed");
