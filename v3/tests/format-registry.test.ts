import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatRegistry, getFormatModule } from "../features/formats/registry";
import type { AdFormatModule } from "../features/formats/types";

const entries = Object.entries(formatRegistry) as Array<[string, AdFormatModule]>;

assert.ok(entries.length >= 1, "At least one ad format must be registered.");

for (const [formatId, module] of entries) {
  assert.equal(module.id, formatId, `${formatId} module id must match its registry key.`);
  assert.ok(module.label.trim(), `${formatId} must expose a human label.`);
  assert.equal(typeof module.validate, "function", `${formatId} must expose a validator.`);
  assert.equal(typeof module.RenderComponent, "function", `${formatId} must expose a render component.`);
  assert.equal(getFormatModule(module.id).id, module.id);
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
}

const renderSurfaceSource = readFileSync("features/render/AdRenderSurface.tsx", "utf8");
assert.ok(
  renderSurfaceSource.includes("getFormatModule(scene.format)"),
  "AdRenderSurface must delegate format selection through the registry.",
);

assert.throws(
  () => getFormatModule("not-a-format" as never),
  /Unknown ad format/,
);

console.log("format-registry tests passed");
