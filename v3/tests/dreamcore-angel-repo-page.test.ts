import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/dreamcore-angel/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /dreamcore-angel/);
assert.equal(
  existsSync(
    "public/format-repositories/dreamcore-angel-v1/downloads/wiggly-dreamcore-angel-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("dreamcore-angel");
assert.ok(profile?.handoff, "Dreamcore Angel should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/dreamcore-angel");
assert.equal(profile.proofEntries.length, 7);
assert.match(profile.proofEntries[0]?.media.src ?? "", /skai-carousel-01\.jpg$/);
assert.equal(
  profile.proofEntries.filter((entry) => entry.media.referenceSrc).length,
  0,
  "The six proof slides already contain their source insets, so Wiggly must not add another.",
);
assert.equal(
  getPublishedDiscoveryEntries().filter((entry) => entry.format.slug === "dreamcore-angel").length,
  1,
  "The hero and six proofs belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 portrait should I turn into a dreamcore fallen angel, and should I use Nano Banana 2 (default), Lite (economy), or Pro (premium)?",
);

const assets = JSON.parse(
  readFileSync("public/format-repositories/dreamcore-angel-v1/assets.json", "utf8"),
) as {
  sourceReference: {
    nativeHero?: string;
    modelShown?: string;
    commentsAtCollection?: number;
    referenceNote?: string;
  };
  examples: Array<{ path: string }>;
  excluded: Array<{ path: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/skai-carousel-01.jpg");
assert.equal(assets.sourceReference.modelShown, "GPT Image 2.0");
assert.equal(assets.sourceReference.commentsAtCollection, 31900);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one original-photo inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides 8 and 9 are intentionally excluded/);
assert.equal(assets.examples.length, 7);
assert.equal(assets.excluded.length, 2);

const runtime = JSON.parse(
  readFileSync("public/format-repositories/dreamcore-angel-v1/runtime.json", "utf8"),
) as { defaultModel: string; promptPath: string };
assert.equal(runtime.defaultModel, "nano-banana-2");
assert.equal(runtime.promptPath, "prompts/transform.txt");

const exactPrompt = readFileSync(
  "public/format-repositories/dreamcore-angel-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^young man, same face as reference, ethereal fallen angel aesthetic/);
assert.match(exactPrompt, /massive luminous feathered wings/);
assert.match(exactPrompt, /damaged VHS tape aesthetic/);
assert.match(exactPrompt, /avoid: clean modern photography/);

const packagedSkill = readFileSync(
  "public/format-repositories/dreamcore-angel-v1/SKILL.md",
  "utf8",
);
assert.match(packagedSkill, /Return the finished image and `quality-report\.json` to the user/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Dreamcore Angel/);
assert.match(prompt, /formats\/dreamcore-angel/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Dreamcore Angel Repo page tests passed.");
