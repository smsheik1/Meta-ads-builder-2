import assert from "node:assert/strict";
import {
  assertSavableAdScene,
  canSaveDesignWithoutPaywall,
  createSavedDesignId,
  createSavedDesignTitle,
  FREE_SAVED_DESIGN_LIMIT,
  MAX_SAVED_DESIGNS,
} from "../features/create/savedDesigns";
import { defaultRenderScene } from "../remotion-entry/fixture";

const savedId = createSavedDesignId(defaultRenderScene);
assert.ok(savedId.startsWith(`${defaultRenderScene.format}:`));
assert.ok(savedId.includes(defaultRenderScene.metadata.generationBatchId));
assert.ok(savedId.includes(String(defaultRenderScene.metadata.candidateIndex)));
assert.equal(createSavedDesignTitle(defaultRenderScene), defaultRenderScene.creative.headline);
assert.equal(assertSavableAdScene(defaultRenderScene), defaultRenderScene);
assert.equal(FREE_SAVED_DESIGN_LIMIT, 3);
assert.equal(MAX_SAVED_DESIGNS, 8);
assert.equal(canSaveDesignWithoutPaywall({ alreadySaved: false, paid: false, savedCount: 2 }), true);
assert.equal(canSaveDesignWithoutPaywall({ alreadySaved: false, paid: false, savedCount: 3 }), false);
assert.equal(canSaveDesignWithoutPaywall({ alreadySaved: true, paid: false, savedCount: 3 }), true);
assert.equal(canSaveDesignWithoutPaywall({ alreadySaved: false, paid: true, savedCount: 3 }), true);

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
