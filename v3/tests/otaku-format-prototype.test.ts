import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import {
  materializeScenePlan,
  validateScenePlan,
  type OtakuLayoutManifest,
  type OtakuScenePlan,
  type OtakuWorldPack,
} from "../features/experiments/otaku-format/agentRunner";

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
  speakerRole: "learner" | "guide" | "challenger";
  visibleRoles: Array<"learner" | "guide" | "challenger">;
  layout: string;
  dialogue: string;
  background: string;
  estimatedDurationMs: number;
  callout?: { label: string; theme: string };
};

const sourceIds = ["naruto-compilers", "naruto-mcp", "yugioh-compilers"];
for (const sourceId of sourceIds) {
  const source = readJson<OtakuScenePlan>(`scenes/${sourceId}.json`);
  const world = readJson<OtakuWorldPack>(`worlds/${source.input.storyWorld}.json`);
  const layouts = readJson<OtakuLayoutManifest>("layouts.json");
  assert.deepEqual(validateScenePlan(source, world, layouts), [], `${sourceId} must satisfy the agent scene contract.`);
  assert.ok(source.scenes.length >= 15, `${sourceId} must be a complete lesson.`);
  const concreteScenes = materializeScenePlan(source, world, layouts);
  for (const scene of source.scenes) {
    assert.ok(scene.dialogue.length <= 100, `${scene.id} is too long for the speech bubble.`);
    assert.ok(scene.estimatedDurationMs >= 2_000, `${scene.id} needs a readable duration.`);
    assert.ok(scene.visibleRoles.includes(scene.speakerRole), `${scene.id} must show its speaker.`);
    assert.ok(!("characters" in scene), `${scene.id} must use an approved layout instead of raw coordinates.`);
    assert.ok(!("accent" in scene), `${scene.id} must use a generic callout.`);
  }
  assert.ok(concreteScenes.every((scene) => scene.characters.every((character) => character.bottom >= 0 && character.bottom <= 8)), `${sourceId} layouts must stay near the ground line.`);
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
for (const assetId of ["yugi", "kaiba"]) {
  const asset = assets.characters.find((candidate) => candidate.id === assetId);
  assert.equal(asset?.postprocess, "remove-checkerboard-and-trim");
  const image = PNG.sync.read(readFileSync(path.join(packageRoot, asset!.localPath)));
  const opaqueBorderPixels = Array.from({ length: image.width }, (_, x) => [x, 0, x, image.height - 1])
    .flatMap(([topX, topY, bottomX, bottomY]) => [
      image.data[((topY * image.width + topX) * 4) + 3],
      image.data[((bottomY * image.width + bottomX) * 4) + 3],
    ])
    .filter((alpha) => alpha > 16).length;
  assert.equal(opaqueBorderPixels, 0, `${assetId} must not keep a fake checkerboard background.`);
}

for (const sourceId of sourceIds) {
  const run = readJson<{
    renderer: string;
    rendererVersion: string;
    scenes: Array<{ audioPath?: string; durationMs?: number }>;
  }>(`outputs/${sourceId}.run.json`);
  assert.equal(run.renderer, format.renderer);
  assert.match(run.rendererVersion, /^otaku-format-renderer@/);
  assert.equal(run.scenes.length, readJson<{ scenes: SourceScene[] }>(`scenes/${sourceId}.json`).scenes.length);
  for (const scene of run.scenes) {
    assert.ok((scene.durationMs || 0) > 2_000);
    assert.ok(scene.audioPath && existsSync(path.resolve("public", scene.audioPath)));
  }
  assert.ok(existsSync(path.join(packageRoot, "outputs", `${sourceId}.mp4`)), `${sourceId} is missing its proof video.`);
}

const repositoryPage = readFileSync("app/format-lab/otaku-explainer/OtakuFormatRepositoryClient.tsx", "utf8");
assert.match(repositoryPage, /Needs rerun/);
assert.match(repositoryPage, /Local draft/);
assert.match(repositoryPage, /Replace \$\{asset\.label\}/);
assert.match(repositoryPage, /Copy rerun commands/);
assert.ok(existsSync(path.join(packageRoot, "SKILL.md")));
assert.ok(existsSync(path.join(packageRoot, "requirements.json")));
assert.ok(existsSync(path.join(packageRoot, "worlds", "naruto.json")));
assert.ok(existsSync(path.join(packageRoot, "worlds", "yugioh.json")));

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
