import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const archivePath = path.resolve(
  "public",
  "format-repositories",
  "three-d-breakdown-v1",
  "downloads",
  "wiggly-three-d-breakdown-format-kit.zip",
);
const archive = readFileSync(archivePath);
const entries: string[] = [];
for (let offset = 0; offset <= archive.length - 46;) {
  offset = archive.indexOf("PK\u0001\u0002", offset, "binary");
  if (offset < 0) break;
  const nameLength = archive.readUInt16LE(offset + 28);
  const extraLength = archive.readUInt16LE(offset + 30);
  const commentLength = archive.readUInt16LE(offset + 32);
  entries.push(archive.subarray(offset + 46, offset + 46 + nameLength).toString());
  offset += 46 + nameLength + extraLength + commentLength;
}
assert.ok(entries.length > 0);
const listing = entries.join("\n");
for (const required of [
  "v3/package.json",
  "v3/tsconfig.json",
  "v3/kit-smoke.mjs",
  "v3/scripts/three-d-breakdown-format.ts",
  "v3/scripts/smoke-three-d-breakdown-format.ts",
  "v3/features/audio/fishStudio.ts",
  "v3/features/formats/three-d-breakdown/repoRuntime.ts",
  "v3/features/formats/three-d-breakdown/render.tsx",
  "v3/features/render/AdRenderSurface.tsx",
  "v3/features/scene/visualizerStyle.ts",
  "v3/remotion-entry/index.ts",
  "v3/remotion-entry/RemotionAdScene.tsx",
  "v3/public/format-repositories/three-d-breakdown-v1/SKILL.md",
  "v3/public/format-repositories/three-d-breakdown-v1/REAL-PROOF.md",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens.json",
  "v3/public/format-repositories/three-d-breakdown-v1/assets/ecommerce-teardown-style-reference-clean-v7.jpg",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/contact-sheet.jpg",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/finalstraw-contact-sheet.jpg",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/finalstraw.mp4",
  "v3/public/format-repositories/three-d-breakdown-v1/fixtures/finalstraw-reproducibility.json",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/gruns.mp4",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/kiala.mp4",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/theragun.mp4",
]) {
  assert.match(listing, new RegExp(required.replaceAll(".", "\\.")), `${required} must be downloadable.`);
}
assert.equal(entries.some((entry) => entry.includes("/agent-runs/")), false);
assert.equal(entries.some((entry) => entry.includes("/downloads/")), false);
assert.equal(entries.some((entry) => /seedance.*\.mp4/i.test(entry)), false);
for (const relative of [
  "scripts/three-d-breakdown-format.ts",
  "features/formats/three-d-breakdown/planning.ts",
  "public/format-repositories/three-d-breakdown-v1/requirements.json",
  "public/format-repositories/three-d-breakdown-v1/format.json",
]) {
  const archived = execFileSync("unzip", ["-p", archivePath, `wiggly-three-d-breakdown-format-kit/v3/${relative}`], { encoding: "utf8" });
  assert.equal(archived, readFileSync(relative, "utf8"), `${relative}: downloadable ZIP must match the source, not an older NIM runner.`);
}

const packageJson = JSON.parse(readFileSync(
  "public/format-repositories/three-d-breakdown-v1/kit.package.json",
  "utf8",
)) as { scripts: Record<string, string>; dependencies: Record<string, string> };
assert.match(packageJson.scripts["format:three-d"], /three-d-breakdown-format\.ts/);
assert.match(packageJson.scripts.smoke, /smoke-three-d-breakdown-format\.ts/);
assert.equal(packageJson.dependencies["@remotion/renderer"], "4.0.473");
assert.equal(packageJson.dependencies.remotion, "4.0.473");
const archivedTsconfig = JSON.parse(execFileSync("unzip", ["-p", archivePath, "wiggly-three-d-breakdown-format-kit/v3/tsconfig.json"], { encoding: "utf8" }));
assert.equal(archivedTsconfig.compilerOptions.jsx, "react-jsx", "The extracted kit must render without inheriting the app's JSX settings.");

const skill = readFileSync(
  "public/format-repositories/three-d-breakdown-v1/SKILL.md",
  "utf8",
);
assert.match(skill, /What brand or website is this for\?/);
assert.match(skill, /Do you want Guide Me or Turbo\?/);
assert.match(skill, /Ask only one question in each message/);
assert.match(skill, /Use short sentences and simple words/);
assert.match(skill, /Never ask for a budget or spend limit/);
assert.match(skill, /Story ideas and plan: your coding agent/);
assert.match(skill, /Ready to start\?/);
assert.match(skill, /A retry needs a new estimate and a new yes/);
assert.match(skill, /Save the facts in `research\.json`/);
assert.match(skill, /Research → Story → Script → Images → Clips → Final/);
assert.match(skill, /Start every work update with `Step X of 6: Name`/);
assert.match(skill, /Key image 2 of 4/);
assert.match(skill, /Clip 1 of 2/);

console.log("3D Breakdown Kit tests passed.");
