import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/halo-effect/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /halo-effect/);
assert.equal(
  existsSync(
    "public/format-repositories/halo-effect-v1/downloads/wiggly-halo-effect-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("halo-effect");
assert.ok(profile?.handoff, "Halo Effect should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/halo-effect");
assert.equal(profile.proofEntries.length, 6);
const goldens = JSON.parse(
  readFileSync("public/format-repositories/halo-effect-v1/goldens.json", "utf8"),
) as { examples: Array<{ referencePath?: string }> };
assert.ok(
  goldens.examples.every((entry) => entry.referencePath),
  "Every Halo Effect example should package its original-photo reference.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "halo-effect").length,
  1,
  "The six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which portrait should I give the Halo Effect?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Halo Effect/);
assert.match(prompt, /formats\/halo-effect/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Halo Effect Repo page tests passed.");
