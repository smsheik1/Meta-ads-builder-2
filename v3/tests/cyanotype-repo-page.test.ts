import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/cyanotype/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /cyanotype/);
assert.equal(
  existsSync(
    "public/format-repositories/cyanotype-v1/downloads/wiggly-cyanotype-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("cyanotype");
assert.ok(profile?.handoff, "Cyanotype should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/cyanotype");
assert.match(profile.handoff.totalEstimate, /\$0\.067/);
assert.equal(profile.proofEntries.length, 7);
assert.equal(
  profile.proofEntries.filter((entry) => entry.media.referenceSrc).length,
  1,
  "Only the separate Wiggly proof has a verified reference input.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "cyanotype").length,
  1,
  "The seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which 3:4 image should I turn into a handcrafted cyanotype?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: Cyanotype/);
assert.match(prompt, /formats\/cyanotype/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Cyanotype Repo page tests passed.");
