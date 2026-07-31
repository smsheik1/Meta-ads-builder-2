import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/dark-aesthetic-filter/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /dark-aesthetic-filter/);
assert.equal(
  existsSync("public/format-repositories/dark-aesthetic-filter-v1/downloads/wiggly-dark-aesthetic-filter-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("dark-aesthetic-filter");
assert.ok(profile?.handoff, "Dark Aesthetic Filter should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/dark-aesthetic-filter");
assert.equal(profile.proofEntries.length, 11);
assert.match(profile.proofEntries[0]?.media.src ?? "", /skai-carousel-01\.jpg$/);
assert.equal(profile.proofEntries.filter((entry) => entry.media.referenceSrc).length, 0);
assert.equal(
  getPublishedDiscoveryEntries().filter((entry) => entry.format.slug === "dark-aesthetic-filter").length,
  1,
  "The hero and ten proofs belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 portrait should I remaster with the dark aesthetic filter, and should I use Nano Banana 2 (default), Lite (economy), or Pro (premium)?",
);

const assets = JSON.parse(
  readFileSync("public/format-repositories/dark-aesthetic-filter-v1/assets.json", "utf8"),
) as {
  sourceReference: { nativeHero?: string; modelShown?: string; commentsAtCollection?: number; referenceNote?: string };
  examples: Array<{ path: string }>;
  excluded: Array<{ path: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/skai-carousel-01.jpg");
assert.equal(assets.sourceReference.modelShown, "Nano Banana 2");
assert.equal(assets.sourceReference.commentsAtCollection, 24113);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one original-photo inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides 12 and 13 are intentionally excluded/);
assert.equal(assets.examples.length, 11);
assert.equal(assets.excluded.length, 2);

const runtime = JSON.parse(
  readFileSync("public/format-repositories/dark-aesthetic-filter-v1/runtime.json", "utf8"),
) as { defaultModel: string; promptPath: string };
assert.equal(runtime.defaultModel, "nano-banana-2");
assert.equal(runtime.promptPath, "prompts/transform.txt");

const exactPrompt = readFileSync(
  "public/format-repositories/dark-aesthetic-filter-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^FULL cinematic remaster of the original image/);
assert.match(exactPrompt, /bright specular highlights on jewelry and skin/);
assert.match(exactPrompt, /high contrast luxury editorial grading/);
assert.match(exactPrompt, /push contrast, lighting, and mood aggressively/);

const packagedSkill = readFileSync(
  "public/format-repositories/dark-aesthetic-filter-v1/SKILL.md",
  "utf8",
);
assert.match(packagedSkill, /Return the finished image and `quality-report\.json` to the user/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: Dark Aesthetic Filter/);
assert.match(prompt, /formats\/dark-aesthetic-filter/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /exact gathered prompt/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Dark Aesthetic Filter Repo page tests passed.");
