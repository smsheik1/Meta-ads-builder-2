import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const packageRoot = path.resolve("public", "format-repositories", "otaku-explainer-v1");
const readJson = <T>(relativePath: string) => JSON.parse(readFileSync(path.join(packageRoot, relativePath), "utf8")) as T;

const format = readJson<{ components: string[]; renderer: string }>("format.json");
assert.deepEqual(format.components, [
  "instructions",
  "user-inputs",
  "fixed-assets",
  "ai-generated-content",
  "scene-slots",
  "renderer",
  "audio",
  "quality-checks",
  "final-output",
]);
assert.equal(format.renderer, "renderer/OtakuFormatRenderer.tsx");

type SourceScene = {
  id: string;
  speaker: string;
  dialogue: string;
  background: string;
  estimatedDurationMs: number;
  characters: Array<{ asset: string; x: number; bottom: number; width: number }>;
};

const sourceIds = ["naruto-compilers", "naruto-mcp", "yugioh-compilers"];
for (const sourceId of sourceIds) {
  const source = readJson<{ scenes: SourceScene[] }>(`scenes/${sourceId}.json`);
  assert.ok(source.scenes.length >= 15, `${sourceId} must be a complete lesson.`);
  for (const scene of source.scenes) {
    assert.ok(scene.dialogue.length <= 100, `${scene.id} is too long for the speech bubble.`);
    assert.ok(scene.estimatedDurationMs >= 2_000, `${scene.id} needs a readable duration.`);
    assert.ok(scene.characters.some((character) => character.asset === scene.speaker), `${scene.id} must show its speaker.`);
    assert.ok(scene.characters.every((character) => character.bottom >= 0 && character.bottom <= 8), `${scene.id} characters must stay near the ground line.`);
  }
}

const assets = readJson<{
  characters: Array<{ id: string; localPath: string; postprocess?: string }>;
  backgrounds: Array<{ id: string; localPath: string }>;
}>("assets.json");
for (const asset of [...assets.characters, ...assets.backgrounds]) {
  assert.ok(existsSync(path.join(packageRoot, asset.localPath)), `${asset.id} is missing its local asset.`);
}
assert.equal(assets.characters.find((asset) => asset.id === "naruto")?.postprocess, "remove-white-and-trim");
assert.equal(assets.characters.find((asset) => asset.id === "orochimaru")?.postprocess, "remove-white-and-trim");

const slice = readJson<{
  renderer: string;
  rendererVersion: string;
  scenes: Array<{ audioPath?: string; durationMs?: number }>;
}>("outputs/naruto-compilers-slice.run.json");
assert.equal(slice.renderer, format.renderer);
assert.match(slice.rendererVersion, /^otaku-format-renderer@/);
assert.equal(slice.scenes.length, 4);
for (const scene of slice.scenes) {
  assert.ok((scene.durationMs || 0) > 2_000);
  assert.ok(scene.audioPath);
  assert.ok(existsSync(path.resolve("public", scene.audioPath!)));
}
assert.ok(existsSync(path.join(packageRoot, "outputs", "naruto-compilers-slice.mp4")));

const productionFiles = [
  "app/create/page.tsx",
  "app/builder/page.tsx",
  "features/formats/registry.ts",
  "features/render/AdRenderSurface.tsx",
];
for (const file of productionFiles) {
  assert.doesNotMatch(readFileSync(file, "utf8"), /otaku-format|otaku-explainer/i, `${file} must not know about the experiment.`);
}

console.log("Otaku Format prototype contract tests passed.");
