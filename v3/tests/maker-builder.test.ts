import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMakerDraftFixture } from "../features/builder/fixture";
import { createDefaultBuilderInteractionSnapshot, reduceBuilderInteraction } from "../features/builder/interactionStore";

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
saveLocalDraft(draft);
assert.deepEqual(loadLocalDraft(draft.id), draft);

const published = publishLocalDraft(draft);
const reopened = loadLocalVersion(published.version.id);
assert.deepEqual(reopened, published.version);
draft.scene.layout.layers[0]!.x = 999;
assert.notEqual(reopened?.scene.layout.layers[0]?.x, 999, "Published version must not change with the draft.");

const pageSource = readFileSync("app/builder/page.tsx", "utf8");
const canvasSource = readFileSync("features/builder/BuilderCanvas.tsx", "utf8");
const clientSource = readFileSync("features/builder/MakerBuilderClient.tsx", "utf8");
for (const createFile of ["app/create/CreateResearchClient.tsx", "app/create/CreateControlPanel.tsx"]) {
  assert.doesNotMatch(readFileSync(createFile, "utf8"), /features\/builder|static-package/);
}
assert.match(pageSource, /MakerBuilderClient/);
assert.match(canvasSource, /AdRenderSurface/);
assert.match(canvasSource, /react-moveable/);
assert.match(canvasSource, /react-selecto/);
assert.equal(
  (canvasSource.match(/event\.target\.style\.transform = `rotate\(\$\{start\.rotation\}deg\)`/g) || []).length,
  3,
  "Drag, resize, and rotate must clear temporary Moveable transforms before saving scene geometry.",
);
assert.match(clientSource, /fetch\("\/api\/builder\/analyze"/);
assert.doesNotMatch(clientSource, /NVIDIA_NIM_API_KEY|REPLICATE_API_TOKEN|integrate\.api\.nvidia\.com|api\.replicate\.com/);

console.log("maker builder tests passed");
