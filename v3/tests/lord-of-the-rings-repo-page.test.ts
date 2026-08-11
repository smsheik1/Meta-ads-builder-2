import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/lord-of-the-rings/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /lord-of-the-rings/);
assert.equal(
  existsSync(
    "public/format-repositories/lord-of-the-rings-v1/downloads/wiggly-lord-of-the-rings-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("lord-of-the-rings");
assert.ok(profile?.handoff, "Lord of the Rings should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/lord-of-the-rings");
assert.match(profile.handoff.totalEstimate, /\$0\.067/);
assert.equal(profile.proofEntries.length, 7);
assert.match(profile.proofEntries[0]?.media.src ?? "", /skai-hero\.jpg$/);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  undefined,
  "The native cover already contains its own before and after, so Discover must not add a second inset.",
);
assert.match(
  profile.proofEntries[1]?.media.referenceSrc ?? "",
  /reference-input\.jpg$/,
  "Only the separate Wiggly proof should add its truthful reference fixture.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "lord-of-the-rings").length,
  1,
  "All seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 photo should I give a cinematic Lord of the Rings sunrise grade?",
);

const assets = JSON.parse(
  readFileSync(
    "public/format-repositories/lord-of-the-rings-v1/assets.json",
    "utf8",
  ),
) as {
  sourceReference: { nativeHero?: string; verification?: string; referenceNote?: string };
  examples: Array<{ id: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/skai-hero.jpg");
assert.match(assets.sourceReference.verification ?? "", /GPT Image 2/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides are intentionally excluded/);
assert.equal(assets.examples.length, 7);

const exactPrompt = readFileSync(
  "public/format-repositories/lord-of-the-rings-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^Edit this photo into a cinematic The Lord of the Rings style/);
assert.match(exactPrompt, /iPhone 16 Pro Smart HDR/);
assert.match(exactPrompt, /not AI-generated artwork\.\s*$/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Lord of the Rings/);
assert.match(prompt, /formats\/lord-of-the-rings/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Lord of the Rings Repo page tests passed.");
