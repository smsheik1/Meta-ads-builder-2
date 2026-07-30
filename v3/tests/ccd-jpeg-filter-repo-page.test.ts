import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/ccd-jpeg-filter/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /ccd-jpeg-filter/);
assert.equal(
  existsSync("public/format-repositories/ccd-jpeg-filter-v1/downloads/wiggly-ccd-jpeg-filter-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("ccd-jpeg-filter");
assert.ok(profile?.handoff, "CCD JPEG Filter should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/ccd-jpeg-filter");
assert.equal(profile.proofEntries.length, 5);
assert.equal(
  profile.proofEntries[0]?.media.referenceSrc,
  "/format-repositories/ccd-jpeg-filter-v1/assets/source/reference-input.jpg",
  "The hero should show the creator-provided before inset at the top-right.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "ccd-jpeg-filter").length,
  1,
  "The five examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I give the CCD JPEG look?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Format: CCD JPEG Filter/);
assert.match(prompt, /formats\/ccd-jpeg-filter/);
assert.match(prompt, /download the runnable kit/i);
assert.match(prompt, /Nano Banana 2 by default/i);
assert.ok(prompt.trim().endsWith(`"${profile.handoff.firstQuestion}"`));

console.log("CCD JPEG Filter Repo page tests passed.");
