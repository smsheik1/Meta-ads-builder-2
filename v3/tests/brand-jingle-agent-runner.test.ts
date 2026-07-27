import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  createBrandJingleCompositionPlan,
  createBrandJingleCoverSvg,
  createBrandJingleDurationTemplate,
  estimateBrandJingleMusicCost,
  generateBrandJingleMusic,
  validateBrandJinglePlan,
  type BrandJinglePlan,
  type BrandJingleResearch,
} from "../features/formats/jingle/repoRuntime";

const packageRoot = path.resolve("public", "format-repositories", "brand-jingle-v1");
const readJson = <T,>(relativePath: string) => JSON.parse(readFileSync(path.join(packageRoot, relativePath), "utf8")) as T;
const fixture = readJson<{ research: BrandJingleResearch; plan: BrandJinglePlan }>("fixtures/ecommerce-20s.json");

assert.deepEqual(validateBrandJinglePlan(fixture.research, fixture.plan), []);
assert.deepEqual(createBrandJingleDurationTemplate(20), [
  { section: "hook", durationMs: 6_000 },
  { section: "verse", durationMs: 8_000 },
  { section: "hook", durationMs: 6_000 },
]);
assert.equal(createBrandJingleDurationTemplate(30).reduce((total, chunk) => total + chunk.durationMs, 0), 30_000);
assert.equal(createBrandJingleDurationTemplate(60).reduce((total, chunk) => total + chunk.durationMs, 0), 60_000);
assert.equal(createBrandJingleDurationTemplate(47).reduce((total, chunk) => total + chunk.durationMs, 0), 47_000);
assert.equal(estimateBrandJingleMusicCost(20), 0.05);
assert.equal(estimateBrandJingleMusicCost(30), 0.075);
assert.equal(estimateBrandJingleMusicCost(60), 0.15);

const composition = createBrandJingleCompositionPlan(fixture.research, fixture.plan);
assert.equal(composition.chunks.length, 3);
assert.equal(composition.chunks[0]?.duration_ms, 6_000);
assert.match(composition.chunks[0]?.text || "", /\[Hook]/);
assert.match(composition.chunks[0]?.text || "", /David's Cookies/);
assert.equal(composition.chunks[0]?.positive_styles.includes("modern hip hop"), true);

const unsupportedNumber = structuredClone(fixture.plan);
unsupportedNumber.verseLines[0] = "Fresh baked joy in 30 minutes";
assert.ok(validateBrandJinglePlan(fixture.research, unsupportedNumber).some((error) => error.includes("unsupported numbers")));

const brandInHook = structuredClone(fixture.plan);
brandInHook.hook = "David's Cookies makes the perfect gift";
assert.ok(validateBrandJinglePlan(fixture.research, brandInHook).some((error) => error.includes("must not contain the brand name")));

const blankTemplate = structuredClone(fixture);
blankTemplate.research.brandName = "";
blankTemplate.plan.hook = "";
const blankTemplateErrors = validateBrandJinglePlan(blankTemplate.research, blankTemplate.plan);
assert.ok(blankTemplateErrors.includes("brandName is required."));
assert.ok(blankTemplateErrors.includes("hook is required."));
assert.equal(blankTemplateErrors.filter((error) => error.includes("must not contain the brand name")).length, 0);

const wrongDuration = structuredClone(fixture.plan);
wrongDuration.durationSeconds = 7;
assert.ok(validateBrandJinglePlan(fixture.research, wrongDuration).some((error) => error.includes("10-300")));

const cover = createBrandJingleCoverSvg({ plan: fixture.plan, research: fixture.research });
assert.match(cover, /David&apos;s Cookies/);
assert.match(cover, /Need a gift that hits/);
assert.match(cover, /#D6001C/);
assert.doesNotMatch(cover, /<script/i);

let requestBody: unknown;
const mockFetch: typeof fetch = async (_input, init) => {
  requestBody = JSON.parse(String(init?.body || "{}"));
  return new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
};
const generated = await generateBrandJingleMusic({
  apiKey: "test-key",
  fetcher: mockFetch,
  plan: fixture.plan,
  research: fixture.research,
});
assert.equal(generated.bytes.length, 3);
assert.equal(generated.estimatedCostUsd, 0.05);
assert.deepEqual((requestBody as { model_id: string }).model_id, "music_v2");
assert.equal((requestBody as { composition_plan: { chunks: unknown[] } }).composition_plan.chunks.length, 3);
await assert.rejects(
  generateBrandJingleMusic({ apiKey: "", fetcher: mockFetch, plan: fixture.plan, research: fixture.research }),
  /ELEVENLABS_API_KEY is required/,
);

for (const required of [
  "SKILL.md",
  "README.md",
  "format.json",
  "requirements.json",
  "inputs.json",
  "pipeline.json",
  "song-contract.json",
  "quality.json",
  "goldens.json",
  "prompts/research.md",
  "prompts/angle.md",
  "prompts/jingle.md",
  "fixtures/ecommerce-20s.json",
  "fixtures/saas-30s.json",
  "fixtures/no-website-60s.json",
  "goldens/apple-all-in-one-place.mp3",
  "goldens/davids-no-time-to-bake.mp3",
  "goldens/ogtool-break-the-rules.mp3",
]) {
  assert.equal(existsSync(path.join(packageRoot, required)), true, `${required} must be packaged.`);
}

const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
const runner = readFileSync("scripts/brand-jingle-format.ts", "utf8");
assert.match(skill, /What website is this for\?/);
assert.match(skill, /what is the brand name and what should the song promote/i);
assert.match(skill, /Ask one question at a time/);
assert.match(skill, /Do not ask about a budget/);
assert.match(skill, /Research → Angle → Song → Generate → Deliver/);
assert.match(skill, /Ready to make the song\?/);
assert.match(skill, /Never retry automatically/);
assert.match(skill, /Music video is not part/);
assert.match(runner, /hasFlag\("approve-music"\)/);
assert.match(runner, /This run already has music/);
assert.match(runner, /No automatic retry was attempted/);
assert.doesNotMatch(runner, /Seedance|Replicate|music-video|musicVideo/i);

console.log("Brand Jingle agent runner tests passed.");
