import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/sparkling-effect/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /sparkling-effect/);
assert.equal(
  existsSync(
    "public/format-repositories/sparkling-effect-v1/downloads/wiggly-sparkling-effect-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("sparkling-effect");
assert.ok(profile?.handoff, "Sparkling Effect should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/sparkling-effect");
assert.equal(profile.proofEntries.length, 4);
const goldens = JSON.parse(
  readFileSync("public/format-repositories/sparkling-effect-v1/goldens.json", "utf8"),
) as { examples: Array<{ referencePath?: string }> };
assert.ok(
  goldens.examples.every((entry) => entry.referencePath),
  "Every Sparkling Effect example should package its original-photo reference.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "sparkling-effect").length,
  1,
  "The four examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I give the Sparkling Effect?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: Sparkling Effect/);
assert.match(prompt, /formats\/sparkling-effect/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.match(prompt, /GPT Image 2 as creator provenance/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Sparkling Effect Repo page tests passed.");
