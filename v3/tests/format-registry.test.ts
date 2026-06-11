import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createFormatRegistry,
  formatRegistry,
  getFormatModule,
  getFormatModuleFromRegistry,
} from "../features/formats/registry";
import type { AdFormatModule } from "../features/formats/types";
import type { AdSceneBase, AdSceneStyleBase } from "../features/scene/types";

const entries = Object.entries(formatRegistry) as Array<[string, AdFormatModule]>;

assert.ok(entries.length >= 1, "At least one ad format must be registered.");

for (const [formatId, module] of entries) {
  assert.equal(module.id, formatId, `${formatId} module id must match its registry key.`);
  assert.ok(module.label.trim(), `${formatId} must expose a human label.`);
  assert.ok(module.defaultSlots.length > 0, `${formatId} must expose default selectable slots.`);
  assert.ok(module.interaction.selectableSlots.length > 0, `${formatId} must expose selectable slot metadata.`);
  assert.equal(typeof module.interaction.getSlotColor, "function", `${formatId} must expose slot color reads.`);
  assert.equal(typeof module.interaction.applySlotColor, "function", `${formatId} must expose slot color writes.`);
  assert.equal(typeof module.interaction.getRerollLocksForSlot, "function", `${formatId} must expose selected-slot reroll locks.`);
  assert.equal(typeof module.interaction.applySlotReroll, "function", `${formatId} must expose selected-slot reroll semantics.`);
  assert.equal(typeof module.validate, "function", `${formatId} must expose a validator.`);
  assert.equal(typeof module.RenderComponent, "function", `${formatId} must expose a render component.`);
  assert.equal(getFormatModule(module.id).id, module.id);
}

type FakeMemeScene = AdSceneBase<"meme", AdSceneStyleBase, { preset: "meme-card" }>;

const fakeMemeFormatModule: AdFormatModule<"meme", FakeMemeScene> = {
  id: "meme",
  label: "Meme image",
  defaultSlots: ["headline"],
  interaction: {
    selectableSlots: [
      {
        slot: "headline",
        label: "Headline",
        lockKey: "headline",
        top: 80,
        left: 24,
        width: 312,
        height: 160,
      },
    ],
    getSlotColor: (scene) => scene.style.textColor,
    applySlotColor: (scene, _slot, color) => ({
      ...scene,
      style: {
        ...scene.style,
        textColor: color,
      },
    }),
    getBackgroundColor: (scene) => scene.style.backgroundColor,
    applyBackgroundColor: (scene, color) => ({
      ...scene,
      style: {
        ...scene.style,
        backgroundColor: color,
      },
    }),
    getRerollLocksForSlot: (_slot, locks) => ({
      ...locks,
      headline: false,
      subheadline: true,
      style: true,
      captionColor: true,
      audio: true,
    }),
    applySlotReroll: ({ nextScene }) => nextScene,
  },
  RenderComponent: () => null,
  validate: (scene) => ({
    valid: scene.format === "meme" && Boolean(scene.creative.headline.trim()),
    errors: scene.format === "meme" && scene.creative.headline.trim() ? [] : ["Fake meme scene is invalid."],
  }),
};

const registryWithFakeFormat = createFormatRegistry({
  ...formatRegistry,
  meme: fakeMemeFormatModule,
});

assert.equal(getFormatModuleFromRegistry(registryWithFakeFormat, "meme").id, "meme");
assert.deepEqual(getFormatModuleFromRegistry(registryWithFakeFormat, "meme").defaultSlots, ["headline"]);

for (const createFilePath of ["app/create/CreateResearchClient.tsx", "app/create/CreatePreviewChrome.tsx"]) {
  const source = readFileSync(createFilePath, "utf8");
  assert.ok(
    !source.includes('"meme"') && !source.includes("'meme'"),
    `${createFilePath} must not change when a fake format is added to the registry.`,
  );
}

const coreFilesThatMustStayFormatAgnostic = [
  "features/render/AdRenderSurface.tsx",
  "remotion-entry/RemotionAdScene.tsx",
  "scripts/render-worker.ts",
  "app/s/[slug]/ShareSceneClient.tsx",
  "convex/renderJobs.ts",
  "convex/sharePages.ts",
];

for (const filePath of coreFilesThatMustStayFormatAgnostic) {
  const source = readFileSync(filePath, "utf8");
  assert.ok(
    !source.includes("formats/visualizer") && !source.includes("formats\\visualizer"),
    `${filePath} must not import the visualizer format directly; use the registry/render surface.`,
  );
  assert.ok(
    !/from\s+["'][^"']*features\/formats\/visualizer/.test(source),
    `${filePath} must not import from features/formats/visualizer; use the registry/render surface.`,
  );
}

const renderSurfaceSource = readFileSync("features/render/AdRenderSurface.tsx", "utf8");
assert.ok(
  renderSurfaceSource.includes("getFormatModule(scene.format)"),
  "AdRenderSurface must delegate format selection through the registry.",
);
assert.ok(
  renderSurfaceSource.includes("FormatRenderer"),
  "AdRenderSurface must render the component returned by the selected format module.",
);

assert.throws(
  () => getFormatModule("not-a-format" as never),
  /Unknown ad format/,
);

console.log("format-registry tests passed");
