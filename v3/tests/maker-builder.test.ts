import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMakerDraftFixture } from "../features/builder/fixture";
import { createDefaultBuilderInteractionSnapshot, reduceBuilderInteraction } from "../features/builder/interactionStore";
import { mergeMakerAnalysisActivity } from "../features/builder/analysisProgress";
import { scaleTextLayer, scaleTextLayerToValue } from "../features/builder/textResize";
import { flattenStaticLayers } from "../features/builder/model";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) || null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: new MemoryStorage() },
});

const { loadLocalDraft, loadLocalVersion, publishLocalDraft, saveLocalDraft } = await import("../features/builder/localRepository");

const selected = reduceBuilderInteraction(createDefaultBuilderInteractionSnapshot(), { type: "selectionChanged", layerId: "active-tool" });
assert.equal(selected.selectedLayerId, "active-tool");
assert.equal(reduceBuilderInteraction(selected, { type: "interactionReset" }).selectedLayerId, null);

const draft = createMakerDraftFixture({ id: "browser-draft", now: 100 });
const textLayer = flattenStaticLayers(draft.scene.layout.layers).find((layer) => layer.type === "text");
assert.ok(textLayer && textLayer.type === "text");
const doubledText = scaleTextLayer(textLayer, 2);
assert.equal(doubledText.width, textLayer.width * 2, "Corner resizing must scale the text box.");
assert.equal(doubledText.height, textLayer.height * 2, "Corner resizing must preserve the text box ratio.");
assert.equal(doubledText.fontSize, textLayer.fontSize * 2, "Corner resizing must scale the font with its box.");
const inspectorScaledText = scaleTextLayerToValue(textLayer, "width", textLayer.width / 2);
assert.equal(inspectorScaledText.fontSize, textLayer.fontSize / 2, "Inspector width changes must not leave typography behind.");
saveLocalDraft(draft);
assert.deepEqual(loadLocalDraft(draft.id), draft);

const published = publishLocalDraft(draft);
const reopened = loadLocalVersion(published.version.id);
assert.deepEqual(reopened, published.version);
draft.scene.layout.layers[0]!.x = 999;
assert.notEqual(reopened?.scene.layout.layers[0]?.x, 999, "Published version must not change with the draft.");

const startedActivity = [{ id: "ocr", label: "Reading text", status: "active" as const, elapsedSeconds: 1 }];
const finishedActivity = mergeMakerAnalysisActivity(startedActivity, { id: "ocr", label: "Reading text", detail: "12 regions found.", status: "complete", elapsedSeconds: 8 });
assert.equal(finishedActivity.length, 1, "A completed stage should update its live row instead of duplicating it.");
assert.equal(finishedActivity[0]?.status, "complete");

const previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
const originalConsoleError = console.error;
delete process.env.OPENROUTER_API_KEY;
console.error = () => {};
try {
  const { POST } = await import("../app/api/builder/analyze/route");
  const form = new FormData();
  form.set("reference", new File(["not-used"], "stream-test.png", { type: "image/png" }));
  const response = await POST(new Request("http://localhost/api/builder/analyze", { method: "POST", body: form }));
  assert.match(response.headers.get("content-type") || "", /application\/x-ndjson/);
  const streamed = (await response.text()).trim().split("\n").map((line) => JSON.parse(line) as { type: string; error?: string });
  assert.equal(streamed[0]?.type, "progress", "The stream must immediately acknowledge the uploaded reference.");
  assert.equal(streamed.at(-1)?.type, "error", "A provider failure must remain visible inside the activity stream.");
  assert.match(streamed.at(-1)?.error || "", /OpenRouter Maker analysis is not configured/);
} finally {
  console.error = originalConsoleError;
  if (previousOpenRouterKey) process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
  else delete process.env.OPENROUTER_API_KEY;
}

const pageSource = readFileSync("app/builder/page.tsx", "utf8");
const canvasSource = readFileSync("features/builder/BuilderCanvas.tsx", "utf8");
const clientSource = readFileSync("features/builder/MakerBuilderClient.tsx", "utf8");
const analysisServerSource = readFileSync("features/builder/referenceAnalysis.server.ts", "utf8");
const analysisRouteSource = readFileSync("app/api/builder/analyze/route.ts", "utf8");
const inspectorSource = readFileSync("features/builder/BuilderInspector.tsx", "utf8");
const imageSearchRouteSource = readFileSync("app/api/maker/search-images/route.ts", "utf8");
for (const createFile of ["app/create/CreateResearchClient.tsx", "app/create/CreateControlPanel.tsx"]) {
  assert.doesNotMatch(readFileSync(createFile, "utf8"), /features\/builder|static-package/);
}
assert.match(pageSource, /MakerBuilderClient/);
assert.match(canvasSource, /AdRenderSurface/);
assert.match(canvasSource, /react-moveable/);
assert.match(canvasSource, /react-selecto/);
assert.match(canvasSource, /useResizeObserver/, "Moveable controls must follow scene-driven text geometry changes.");
assert.match(canvasSource, /renderDirections=.*\["nw", "ne", "sw", "se", "w", "e"\]/, "Text layers must not expose vertical-only resize handles that can clip glyphs.");
assert.equal(
  (canvasSource.match(/event\.target\.style\.transform = `rotate\(\$\{start\.rotation\}deg\)`/g) || []).length,
  3,
  "Drag, resize, and rotate must clear temporary Moveable transforms before saving scene geometry.",
);
assert.match(clientSource, /fetch\("\/api\/builder\/analyze"/);
assert.match(
  clientSource,
  /id="reference-upload" className="hidden"/,
  "The visible upload label must not be paired with a full-width offscreen input that expands the page.",
);
assert.match(clientSource, /role="log"/);
assert.match(clientSource, /Live milestones from the actual analysis pipeline/);
assert.match(clientSource, /The analysis response failed the Maker schema/);
assert.match(clientSource, /hybrid-news[\s\S]*\/maker-fixtures\/hybrid-news\/reference\.png/, "Saved QA must not store the raw multi-megabyte upload in localStorage.");
assert.doesNotMatch(clientSource, /NVIDIA_NIM_API_KEY|REPLICATE_API_TOKEN|integrate\.api\.nvidia\.com|api\.replicate\.com/);
assert.match(analysisServerSource, /vision\.jpg[\s\S]*callGemmaReferenceAnalysis/);
assert.doesNotMatch(analysisServerSource, /callGemmaReferenceAnalysis\([^)]*referenceImageUrl/);
assert.match(analysisServerSource, /OPENROUTER_API_KEY/);
assert.match(analysisServerSource, /Reading every text region/);
assert.match(analysisServerSource, /Separating editable visual assets/);
assert.match(analysisRouteSource, /application\/x-ndjson/);
assert.doesNotMatch(analysisServerSource, /NVIDIA_NIM_API_KEY|NVIDIA_NIM_MAKER_MODEL|integrate\.api\.nvidia\.com/);
assert.match(inspectorSource, /list:\$\{list\.id\}:\$\{item\.id\}:\$\{itemValue\.key\}/, "Live List edits must update their reconstructed scene layer.");
assert.match(inspectorSource, /layerControlsDisabled = readOnly \|\| Boolean\(selectedLayer\?\.locked\)/, "Locked layers must stay unchanged until the Maker explicitly unlocks them.");
assert.match(inspectorSource, /Why this Format works/);
assert.match(inspectorSource, /Upload image/);
assert.match(inspectorSource, /Image shape/);
assert.match(inspectorSource, /borderRadius.*circle.*Math\.min/, "Replacing an inset image must let the Maker preserve a circle without editing pixels.");
assert.match(inspectorSource, /\/api\/maker\/search-images/);
assert.match(inspectorSource, /loadedImageResults/);
assert.match(inspectorSource, /onError=.*setImageResults/, "Broken search hotlinks must disappear before the Maker can select them.");
assert.match(inspectorSource, /defaultValue=\{selectedLayer\[property\]\}/, "Typing a multi-digit geometry value must commit once instead of resizing after every digit.");
assert.match(inspectorSource, /onKeyDown=.*event\.key === "Enter"/, "Number edits must have an obvious keyboard commit path.");
assert.match(imageSearchRouteSource, /searchSerperImages/);
assert.doesNotMatch(imageSearchRouteSource, /fallback|retry|Replicate|image generation/i);

console.log("maker builder tests passed");
