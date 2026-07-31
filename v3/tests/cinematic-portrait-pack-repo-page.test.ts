import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/cinematic-portrait-pack/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /cinematic-portrait-pack/);
assert.equal(
  existsSync(
    "public/format-repositories/cinematic-portrait-pack-v1/downloads/wiggly-cinematic-portrait-pack-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("cinematic-portrait-pack");
assert.ok(profile?.handoff, "Cinematic Portrait Pack should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/cinematic-portrait-pack");
assert.equal(profile.proofEntries.length, 9);
assert.match(profile.proofEntries[0]?.media.src ?? "", /skai-carousel-01\.jpg$/);
assert.equal(
  profile.proofEntries.filter((entry) => entry.media.referenceSrc).length,
  0,
  "The native prompt cards already contain their source insets, so Wiggly must not add another.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "cinematic-portrait-pack").length,
  1,
  "The hero and eight looks belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which portrait should I use, and do you want one cinematic look or the complete eight-image pack?",
);

const assets = JSON.parse(
  readFileSync(
    "public/format-repositories/cinematic-portrait-pack-v1/assets.json",
    "utf8",
  ),
) as {
  sourceReference: {
    nativeHero?: string;
    modelShown?: string;
    commentsAtCollection?: number;
    referenceNote?: string;
  };
  examples: Array<{ variant: string; path: string; cleanPath: string }>;
  excluded: Array<{ path: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/skai-carousel-01.jpg");
assert.equal(assets.sourceReference.modelShown, "Nano Banana 2");
assert.equal(assets.sourceReference.commentsAtCollection, 39600);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one original-photo inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides 10 and 11 are intentionally excluded/);
assert.equal(assets.examples.length, 8);
assert.equal(assets.excluded.length, 2);

const runtime = JSON.parse(
  readFileSync(
    "public/format-repositories/cinematic-portrait-pack-v1/runtime.json",
    "utf8",
  ),
) as { promptVariants: Record<string, string>; defaultModel: string };
assert.equal(Object.keys(runtime.promptVariants).length, 8);
assert.equal(runtime.defaultModel, "nano-banana-2");

const mirrorPrompt = readFileSync(
  "public/format-repositories/cinematic-portrait-pack-v1/prompts/mirror-selfie.txt",
  "utf8",
);
assert.match(mirrorPrompt, /^A realistic vertical mirror selfie/);
assert.match(mirrorPrompt, /The face must not be altered\./);

const rainPrompt = readFileSync(
  "public/format-repositories/cinematic-portrait-pack-v1/prompts/rain-mask.txt",
  "utf8",
);
assert.match(rainPrompt, /heavy nighttime rainfall/);
assert.match(rainPrompt, /pulling the Spider-Man mask upward/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: Cinematic Portrait Pack/);
assert.match(prompt, /formats\/cinematic-portrait-pack/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /eight packaged looks/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Cinematic Portrait Pack Repo page tests passed.");
