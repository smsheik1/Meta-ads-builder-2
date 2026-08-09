import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/moody-pink-effect/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /moody-pink-effect/);
assert.equal(
  existsSync(
    "public/format-repositories/moody-pink-effect-v1/downloads/wiggly-moody-pink-effect-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("moody-pink-effect");
assert.ok(profile?.handoff, "Moody Pink Effect should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/moody-pink-effect");
assert.match(profile.handoff.totalEstimate, /\$0\.067/);
assert.equal(profile.proofEntries.length, 6);
assert.match(profile.proofEntries[0]?.media.src ?? "", /skai-hero\.jpg$/);
assert.equal(
  profile.proofEntries.filter((entry) => entry.media.referenceSrc).length,
  0,
  "Every native image already contains one source inset, so Wiggly must not add another.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "moody-pink-effect").length,
  1,
  "All six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 nighttime photo should I turn into a moody pink editorial, and should I use Nano Banana 2 (default), Lite (economy), or Pro (source model)?",
);

const assets = JSON.parse(
  readFileSync(
    "public/format-repositories/moody-pink-effect-v1/assets.json",
    "utf8",
  ),
) as {
  sourceReference: { nativeHero?: string; verification?: string; referenceNote?: string };
  examples: Array<{ id: string }>;
};
assert.equal(assets.sourceReference.nativeHero, "assets/source/skai-hero.jpg");
assert.match(assets.sourceReference.verification ?? "", /Nano Banana Pro/);
assert.match(assets.sourceReference.referenceNote ?? "", /exactly one original-photo inset/);
assert.match(assets.sourceReference.referenceNote ?? "", /CTA slides are intentionally excluded/);
assert.equal(assets.examples.length, 6);

const exactPrompt = readFileSync(
  "public/format-repositories/moody-pink-effect-v1/prompts/transform.txt",
  "utf8",
);
assert.match(exactPrompt, /^Transform this image into a luxury editorial photograph/);
assert.match(exactPrompt, /maintaining realistic skin tones/);
assert.match(exactPrompt, /modern, high-fashion editorial look\.\s*$/);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Moody Pink Effect/);
assert.match(prompt, /formats\/moody-pink-effect/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Moody Pink Effect Repo page tests passed.");
