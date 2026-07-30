import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/cool-tone-filter/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /cool-tone-filter/);
assert.equal(
  existsSync(
    "public/format-repositories/cool-tone-filter-v1/downloads/wiggly-cool-tone-filter-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("cool-tone-filter");
assert.ok(profile?.handoff, "Cool Tone Filter should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/cool-tone-filter");
assert.equal(profile.proofEntries.length, 6);
const goldens = JSON.parse(
  readFileSync("public/format-repositories/cool-tone-filter-v1/goldens.json", "utf8"),
) as { examples: Array<{ referencePath?: string }> };
assert.ok(
  goldens.examples.every((entry) => entry.referencePath),
  "Every Cool Tone Filter example should package its original-photo reference.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "cool-tone-filter").length,
  1,
  "The six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I give the Cool Tone Filter?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: Cool Tone Filter/);
assert.match(prompt, /formats\/cool-tone-filter/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.match(prompt, /GPT Image 2 as creator provenance/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Cool Tone Filter Repo page tests passed.");
