import assert from "node:assert/strict";
import {
  assertSavableAdScene,
  createSavedDesignId,
  createSavedDesignTitle,
  MAX_SAVED_DESIGNS,
} from "../features/create/savedDesigns";
import { defaultRenderScene } from "../remotion-entry/fixture";

const savedId = createSavedDesignId(defaultRenderScene);
assert.ok(savedId.startsWith(`${defaultRenderScene.format}:`));
assert.ok(savedId.includes(defaultRenderScene.metadata.generationBatchId));
assert.ok(savedId.includes(String(defaultRenderScene.metadata.candidateIndex)));
assert.equal(createSavedDesignTitle(defaultRenderScene), defaultRenderScene.creative.headline);
assert.equal(assertSavableAdScene(defaultRenderScene), defaultRenderScene);
assert.equal(MAX_SAVED_DESIGNS, 8);

assert.throws(
  () => assertSavableAdScene({
    ...defaultRenderScene,
    creative: {
      ...defaultRenderScene.creative,
      headline: "",
    },
  }),
  /headline is missing/,
);

console.log("saved-designs tests passed");
