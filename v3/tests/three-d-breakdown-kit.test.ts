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
  "v3/public/format-repositories/three-d-breakdown-v1/REAL-PROOF.md",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens.json",
  "v3/public/format-repositories/three-d-breakdown-v1/assets/ecommerce-teardown-style-reference-clean-v7.jpg",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/contact-sheet.jpg",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/finalstraw-contact-sheet.jpg",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/finalstraw.mp4",
  "v3/public/format-repositories/three-d-breakdown-v1/fixtures/finalstraw-reproducibility.json",
  "v3/public/format-repositories/three-d-breakdown-v1/fixtures/research.example.json",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/gruns.mp4",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/kiala.mp4",
  "v3/public/format-repositories/three-d-breakdown-v1/goldens/theragun.mp4",
]) {
  assert.match(listing, new RegExp(required.replaceAll(".", "\\.")), `${required} must be downloadable.`);
}
assert.ok(
  entries.includes("wiggly-three-d-breakdown-format-kit/README.md"),
  "The downloaded kit must open with a root README.",
);
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

const skill = readFileSync(
  "public/format-repositories/three-d-breakdown-v1/SKILL.md",
  "utf8",
);
assert.match(skill, /What brand or website is this for\?/);
assert.match(skill, /Do you want Guide Me or Turbo\?/);
assert.match(skill, /Ask only one question in each message/);
assert.match(skill, /Use short sentences and simple words/);
assert.match(skill, /Never ask for a budget or spend limit/);
assert.match(skill, /do it for me[\s\S]*use Turbo/i);
assert.match(skill, /Story ideas and plan: 3 NIM calls/);
assert.match(skill, /Ready to start\?/);
assert.match(skill, /A retry needs a new estimate and a new yes/);
assert.match(skill, /Save the facts in `research\.json`/);
assert.match(skill, /fixtures\/research\.example\.json/);
assert.match(skill, /Research → Story → Script → Images → Clips → Final/);
assert.match(skill, /Start every work update with `Step X of 6: Name`/);
assert.match(skill, /Key image 2 of 4/);
assert.match(skill, /Clip 1 of 2/);

const researchExample = JSON.parse(readFileSync(
  "public/format-repositories/three-d-breakdown-v1/fixtures/research.example.json",
  "utf8",
)) as {
  websiteUrl: string;
  brand?: { name?: string };
  brandBrief?: { offer?: string };
  evidence?: { receipts?: { specificClaims?: string[] } };
  metadata?: { evidenceSources?: Array<{ url?: string; facts?: string[] }> };
  productCatalog?: { products?: Array<{ handle?: string; imageUrl?: string | null }> };
};
assert.equal(researchExample.websiteUrl, "https://example.com/");
assert.ok(researchExample.brand?.name);
assert.ok(researchExample.brandBrief?.offer);
assert.ok(researchExample.evidence?.receipts?.specificClaims?.length);
assert.ok(researchExample.metadata?.evidenceSources?.[0]?.url);
assert.ok(researchExample.metadata?.evidenceSources?.[0]?.facts?.length);
assert.ok(researchExample.productCatalog?.products?.[0]?.handle);
assert.ok(researchExample.productCatalog?.products?.[0]?.imageUrl);

const pipeline = JSON.parse(readFileSync(
  "public/format-repositories/three-d-breakdown-v1/pipeline.json",
  "utf8",
)) as { stages: Array<{ externalProviderCalls?: number }> };
assert.deepEqual(
  pipeline.stages.map((stage) => stage.externalProviderCalls),
  [1, 2, 1, 4, 2, 1],
);

console.log("3D Breakdown Kit tests passed.");
