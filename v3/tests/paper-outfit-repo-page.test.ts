import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/paper-outfit/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /paper-outfit/);
assert.equal(
  existsSync(
    "public/format-repositories/paper-outfit-v1/downloads/wiggly-paper-outfit-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("paper-outfit");
assert.ok(profile?.handoff, "Paper Outfit should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/paper-outfit");
assert.match(profile.handoff.totalEstimate, /\$0\.067/);
assert.equal(profile.proofEntries.length, 7);
assert.match(profile.proofEntries[0]?.media.src ?? "", /skai-hero\.jpg$/);
assert.equal(
  profile.proofEntries.filter((entry) => entry.media.referenceSrc).length,
  0,
  "Every native image already contains one source inset, so Wiggly must not add another.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "paper-outfit").length,
  1,
  "All seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 fashion photo should I turn into a handmade paper-outfit editorial?",
);

const assets = JSON.parse(
  readFileSync(
    "public/format-repositories/paper-outfit-v1/assets.json",
    "utf8",
  ),
) as {
  sourceReference: { nativeHero?: string; verification?: string; referenceNote?: string };
  examples: Array<{ id: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/skai-hero.jpg");
assert.match(assets.sourceReference.verification ?? "", /GPT Image 2/);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one original-photo inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides are intentionally excluded/);
assert.equal(assets.examples.length, 7);

const exactPrompt = readFileSync(
  "public/format-repositories/paper-outfit-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^Transforme esta foto em um editorial de moda/);
assert.match(exactPrompt, /As peças devem parecer objetos físicos de papel/);
assert.match(exactPrompt, /lápis de cor visível, textura de papel branco, riscos de pintura\.\s*$/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Paper Outfit/);
assert.match(prompt, /formats\/paper-outfit/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Paper Outfit Repo page tests passed.");
