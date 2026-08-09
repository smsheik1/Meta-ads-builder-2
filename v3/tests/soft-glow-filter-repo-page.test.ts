import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/soft-glow-filter/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /soft-glow-filter/);
assert.equal(
  existsSync(
    "public/format-repositories/soft-glow-filter-v1/downloads/wiggly-soft-glow-filter-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("soft-glow-filter");
assert.ok(profile?.handoff, "Soft Glow Filter should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/soft-glow-filter");
assert.match(profile.handoff.totalEstimate, /\$0\.067/);
assert.equal(profile.proofEntries.length, 7);
assert.match(profile.proofEntries[0]?.media.src ?? "", /skai-hero\.jpg$/);
assert.match(
  profile.proofEntries[0]?.media.referenceSrc ?? "",
  /reference-input\.jpg$/,
  "The title cover should add exactly one truthful reference inset.",
);
assert.equal(
  profile.proofEntries.slice(1).filter((entry) => entry.media.referenceSrc).length,
  0,
  "Nested native examples already contain their own reference insets.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "soft-glow-filter").length,
  1,
  "All seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 photo should I turn into a soft-glow memory?",
);

const assets = JSON.parse(
  readFileSync(
    "public/format-repositories/soft-glow-filter-v1/assets.json",
    "utf8",
  ),
) as {
  sourceReference: { nativeHero?: string; verification?: string; referenceNote?: string };
  examples: Array<{ id: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/skai-hero.jpg");
assert.match(assets.sourceReference.verification ?? "", /GPT Image 2/);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one reference inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides are intentionally excluded/);
assert.equal(assets.examples.length, 7);

const exactPrompt = readFileSync(
  "public/format-repositories/soft-glow-filter-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^Edit this image with a soft cinematic mood/);
assert.match(exactPrompt, /Choose only 2–5 clean Gen Z handwritten captions/);
assert.match(exactPrompt, /Avoid emojis, hashtags, long text, and cheesy quotes\s*$/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Soft Glow Filter/);
assert.match(prompt, /formats\/soft-glow-filter/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Soft Glow Filter Repo page tests passed.");
