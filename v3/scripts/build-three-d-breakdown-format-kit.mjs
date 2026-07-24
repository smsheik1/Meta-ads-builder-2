import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const formatRelative = path.join("public", "format-repositories", "three-d-breakdown-v1");
const formatRoot = path.join(v3Root, formatRelative);
const stagingParent = path.join(v3Root, "tmp", "three-d-breakdown-format-kit");
const kitName = "wiggly-three-d-breakdown-format-kit";
const stagingRoot = path.join(stagingParent, kitName);
const stagingV3 = path.join(stagingRoot, "v3");
const outputDirectory = path.join(formatRoot, "downloads");
const outputPath = path.join(outputDirectory, `${kitName}.zip`);

const copyFromV3 = async (relativePath, targetPath = relativePath) => {
  await cp(path.join(v3Root, relativePath), path.join(stagingV3, targetPath), { recursive: true });
};

await rm(stagingParent, { force: true, recursive: true });
await mkdir(path.join(stagingV3, formatRelative), { recursive: true });
await mkdir(outputDirectory, { recursive: true });

for (const relativePath of [
  "features/audio/visualizerPresets.ts",
  "features/formats/three-d-breakdown",
  "features/formats/jingle/storyboard.ts",
  "features/formats/types.ts",
  "features/llm/nvidiaNim.ts",
  "features/llm/nvidiaNimModels.ts",
  "features/llm/timeout.ts",
  "features/research/types.ts",
  "features/research/url.ts",
  "features/scene/types.ts",
  "features/scene/createThreeDBreakdownScene.ts",
  "features/scene/createVisualizerScene.ts",
  "features/scene/visualizerVariants.ts",
  "features/scene/visualizerStyle.ts",
  "scripts/three-d-breakdown-format.ts",
  "scripts/smoke-three-d-breakdown-format.ts",
  "tests/helpers/research.ts",
  "tests/three-d-breakdown-repo.test.ts",
]) {
  await copyFromV3(relativePath);
}

for (const name of [
  ".env.example",
  "README.md",
  "SKILL.md",
  "assets.json",
  "format.json",
  "inputs.json",
  "kit-smoke.mjs",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "scene-contract.json",
]) {
  await copyFromV3(path.join(formatRelative, name));
}
for (const directory of ["assets", "fixtures"]) {
  await copyFromV3(path.join(formatRelative, directory));
}
await copyFromV3(path.join(formatRelative, "kit-smoke.mjs"), "kit-smoke.mjs");

await writeFile(path.join(stagingV3, "package.json"), await readFile(path.join(formatRoot, "kit.package.json")));

const fixedDate = new Date("2026-01-01T00:00:00.000Z");
const normalizeTimes = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await normalizeTimes(entryPath);
    await utimes(entryPath, fixedDate, fixedDate);
  }
};
await normalizeTimes(stagingRoot);
await utimes(stagingRoot, fixedDate, fixedDate);

await rm(outputPath, { force: true });
const zip = spawnSync("zip", ["-X", "-q", "-r", outputPath, kitName], {
  cwd: stagingParent,
  encoding: "utf8",
});
if (zip.status !== 0) throw new Error(`zip failed: ${zip.stderr}`);
const size = (await stat(outputPath)).size;
console.log(`Built ${path.relative(v3Root, outputPath)} (${Math.round(size / 1_024)} KB).`);
