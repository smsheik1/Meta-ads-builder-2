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
assert.match(prompt, /Format: Doodle Art/);
assert.match(prompt, /formats\/doodle-art/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.match(prompt, /GPT Image 2 as creator provenance/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Doodle Art Repo page tests passed.");
