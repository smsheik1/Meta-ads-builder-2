import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/mood-notes/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /mood-notes/);
assert.equal(
  existsSync("public/format-repositories/mood-notes-v1/downloads/wiggly-mood-notes-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("mood-notes");
assert.ok(profile?.handoff, "Mood Notes should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/mood-notes");
assert.equal(profile.proofEntries.length, 7);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  "/format-repositories/mood-notes-v1/assets/source/reference-input.jpg",
  "The hero should show the clean source photo inset at the top-right.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "mood-notes").length,
  1,
  "The seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I turn into a personal Mood Notes journal image?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Mood Notes Repo page tests passed.");
