import assert from "node:assert/strict";
import {
  assertSavableAdScene,
  canSaveDesignWithoutPaywall,
  createSavedDesignId,
  createSavedDesignTitle,
  FREE_SAVED_DESIGN_LIMIT,
  MAX_SAVED_DESIGNS,
  restoreSavedDesignSelection,
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

const savedScene = {
  ...defaultRenderScene,
  creative: {
    ...defaultRenderScene.creative,
    angleId: "saved-angle",
    headline: "Saved design headline",
  },
};
const savedDesign = {
  id: createSavedDesignId(savedScene),
  title: createSavedDesignTitle(savedScene),
  format: savedScene.format,
  scene: savedScene,
  createdAt: 1,
  updatedAt: 2,
};
const existingRestore = restoreSavedDesignSelection({
  scenes: [defaultRenderScene, savedScene],
  design: savedDesign,
});
assert.equal(existingRestore.selectedScene, savedScene);
assert.equal(existingRestore.selectedSceneIndex, 1);
assert.equal(existingRestore.scenes.length, 2);
assert.equal(existingRestore.scenes[1], savedScene);

const newRestore = restoreSavedDesignSelection({
  scenes: [defaultRenderScene],
  design: savedDesign,
});
assert.equal(newRestore.selectedScene, savedScene);
assert.equal(newRestore.selectedSceneIndex, 0);
assert.equal(newRestore.scenes[0], savedScene);
assert.equal(newRestore.scenes[1], defaultRenderScene);

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
