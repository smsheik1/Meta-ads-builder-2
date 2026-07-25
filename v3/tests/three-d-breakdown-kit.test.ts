import assert from "node:assert/strict";
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
  "v3/public/format-repositories/three-d-breakdown-v1/assets/ecommerce-teardown-style-reference-clean-v7.jpg",
]) {
  assert.match(listing, new RegExp(required.replaceAll(".", "\\.")), `${required} must be downloadable.`);
}
assert.equal(entries.some((entry) => entry.includes("/agent-runs/")), false);
assert.equal(entries.some((entry) => entry.includes("/downloads/")), false);
assert.equal(entries.some((entry) => /seedance.*\.mp4/i.test(entry)), false);

const packageJson = JSON.parse(readFileSync(
  "public/format-repositories/three-d-breakdown-v1/kit.package.json",
  "utf8",
)) as { scripts: Record<string, string>; dependencies: Record<string, string> };
assert.match(packageJson.scripts["format:three-d"], /three-d-breakdown-format\.ts/);
assert.match(packageJson.scripts.smoke, /smoke-three-d-breakdown-format\.ts/);
assert.equal(packageJson.dependencies["@remotion/renderer"], "4.0.473");
assert.equal(packageJson.dependencies.remotion, "4.0.473");

console.log("3D Breakdown Kit tests passed.");
