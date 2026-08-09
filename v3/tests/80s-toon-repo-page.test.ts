import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/80s-toon/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /80s-toon/);
assert.equal(
  existsSync("public/format-repositories/80s-toon-v1/downloads/wiggly-80s-toon-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("80s-toon");
assert.ok(profile?.handoff, "80s Toon should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/80s-toon");
assert.equal(profile.proofEntries.length, 8);
assert.match(profile.proofEntries[0]?.media.src ?? "", /slide-01\.jpg$/);
assert.equal(profile.proofEntries.filter((entry) => entry.media.referenceSrc).length, 0);
assert.equal(
  getPublishedDiscoveryEntries().filter((entry) => entry.format.slug === "80s-toon").length,
  1,
  "The native hero and seven proofs belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 photo should I turn into an 80s Toon, and should I use Nano Banana 2 (default), Lite (economy), or Pro (source-recommended)?",
);

const assets = JSON.parse(
  readFileSync("public/format-repositories/80s-toon-v1/assets.json", "utf8"),
) as {
  sourceReference: { nativeHero?: string; modelShown?: string; commentsAtCollection?: number; guideAccess?: string; referenceNote?: string };
  examples: Array<{ path: string }>;
  excluded: Array<{ path: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/slide-01.jpg");
assert.equal(assets.sourceReference.modelShown, "Nano Banana Pro");
assert.equal(assets.sourceReference.commentsAtCollection, 306);
assert.match(assets.sourceReference.guideAccess ?? "", /Instagram mobile DM/);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one original-photo inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides 9 and 10 are intentionally excluded/);
assert.equal(assets.examples.length, 8);
assert.equal(assets.excluded.length, 2);

const runtime = JSON.parse(
  readFileSync("public/format-repositories/80s-toon-v1/runtime.json", "utf8"),
) as { defaultModel: string; promptPath: string };
assert.equal(runtime.defaultModel, "nano-banana-2");
assert.equal(runtime.promptPath, "prompts/transform.txt");

const exactPrompt = readFileSync(
  "public/format-repositories/80s-toon-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^Transform the exact uploaded image/);
assert.match(exactPrompt, /rubber hose proportions/);
assert.match(exactPrompt, /thick bold black outlines/);
assert.match(exactPrompt, /Preserve the original background exactly/);

const packagedSkill = readFileSync(
  "public/format-repositories/80s-toon-v1/SKILL.md",
  "utf8",
);
assert.match(packagedSkill, /Return the finished image and `quality-report\.json` to the user/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: 80s Toon/);
assert.match(prompt, /formats\/80s-toon/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("80s Toon Repo page tests passed.");
