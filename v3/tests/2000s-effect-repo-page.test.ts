import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/2000s-effect/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /2000s-effect/);
assert.equal(
  existsSync("public/format-repositories/2000s-effect-v1/downloads/wiggly-2000s-effect-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("2000s-effect");
assert.ok(profile?.handoff, "2000s Effect should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/2000s-effect");
assert.equal(profile.proofEntries.length, 9);
assert.match(profile.proofEntries[0]?.media.src ?? "", /slide-01\.jpg$/);
assert.equal(profile.proofEntries.filter((entry) => entry.media.referenceSrc).length, 0);
assert.equal(
  getPublishedDiscoveryEntries().filter((entry) => entry.format.slug === "2000s-effect").length,
  1,
  "The native hero and eight proofs belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 photo should I turn into an authentic 2000s digicam shot, and should I use Nano Banana 2 (default), Lite (economy), or Pro (premium)?",
);

const assets = JSON.parse(
  readFileSync("public/format-repositories/2000s-effect-v1/assets.json", "utf8"),
) as {
  sourceReference: { nativeHero?: string; modelShown?: string; commentsAtCollection?: number; guideAccess?: string; referenceNote?: string };
  examples: Array<{ path: string }>;
  excluded: Array<{ path: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/slide-01.jpg");
assert.equal(assets.sourceReference.modelShown, "GPT Image 2");
assert.equal(assets.sourceReference.commentsAtCollection, 20558);
assert.match(assets.sourceReference.guideAccess ?? "", /Instagram mobile DM/);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one original-photo inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides 10 and 11 are intentionally excluded/);
assert.equal(assets.examples.length, 9);
assert.equal(assets.excluded.length, 2);

const runtime = JSON.parse(
  readFileSync("public/format-repositories/2000s-effect-v1/runtime.json", "utf8"),
) as { defaultModel: string; promptPath: string };
assert.equal(runtime.defaultModel, "nano-banana-2");
assert.equal(runtime.promptPath, "prompts/transform.txt");

const exactPrompt = readFileSync(
  "public/format-repositories/2000s-effect-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^Apply a realistic early-2000s digital camera/);
assert.match(exactPrompt, /low-end CCD sensor/);
assert.match(exactPrompt, /slight green-yellow tint/);
assert.match(exactPrompt, /do not change composition, pose, or subject identity/);

const packagedSkill = readFileSync(
  "public/format-repositories/2000s-effect-v1/SKILL.md",
  "utf8",
);
assert.match(packagedSkill, /Return the finished image and `quality-report\.json` to the user/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: 2000s Effect/);
assert.match(prompt, /formats\/2000s-effect/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /exact gathered prompt/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("2000s Effect Repo page tests passed.");
