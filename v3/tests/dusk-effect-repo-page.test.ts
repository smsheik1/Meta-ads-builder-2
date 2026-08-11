import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/dusk-effect/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /dusk-effect/);
assert.equal(
  existsSync(
    "public/format-repositories/dusk-effect-v1/downloads/wiggly-dusk-effect-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("dusk-effect");
assert.ok(profile?.handoff, "Dusk Effect should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/dusk-effect");
assert.equal(profile.proofEntries.length, 3);
const goldens = JSON.parse(
  readFileSync("public/format-repositories/dusk-effect-v1/goldens.json", "utf8"),
) as { examples: Array<{ referencePath?: string }> };
assert.ok(
  goldens.examples.every((entry) => entry.referencePath),
  "Every Dusk Effect example should package its original-photo reference.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "dusk-effect").length,
  1,
  "The three examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which outdoor photo should I give the Dusk Effect?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Dusk Effect/);
assert.match(prompt, /formats\/dusk-effect/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Dusk Effect Repo page tests passed.");
