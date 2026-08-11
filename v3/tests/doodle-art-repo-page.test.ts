import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/doodle-art/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /doodle-art/);
assert.equal(
  existsSync(
    "public/format-repositories/doodle-art-v1/downloads/wiggly-doodle-art-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("doodle-art");
assert.ok(profile?.handoff, "Doodle Art should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/doodle-art");
assert.equal(profile.proofEntries.length, 5);
const goldens = JSON.parse(
  readFileSync("public/format-repositories/doodle-art-v1/goldens.json", "utf8"),
) as { examples: Array<{ referencePath?: string; referenceType?: string }> };
assert.ok(
  goldens.examples.every(
    (entry) => entry.referencePath && entry.referenceType === "reconstructed",
  ),
  "Every Doodle Art example should disclose its reconstructed reference inset.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "doodle-art").length,
  1,
  "The five examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I turn into Doodle Art?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Doodle Art/);
assert.match(prompt, /formats\/doodle-art/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Doodle Art Repo page tests passed.");
