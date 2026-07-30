import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/passport-click/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /passport-click/);
assert.equal(
  existsSync("public/format-repositories/passport-click-v1/downloads/wiggly-passport-click-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("passport-click");
assert.ok(profile?.handoff, "Passport Click should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/passport-click");
assert.equal(profile.proofEntries.length, 6);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  "/format-repositories/passport-click-v1/assets/source/reference-input.jpg",
  "The hero should show the original portrait inset at the top-right.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "passport-click").length,
  1,
  "The six examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which portrait should I turn into a Passport Click?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("Passport Click Repo page tests passed.");
