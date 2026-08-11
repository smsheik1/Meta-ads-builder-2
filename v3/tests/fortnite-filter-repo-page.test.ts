import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  getDiscoveryFormatProfile,
} from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/fortnite-filter/page.tsx", "utf8");
assert.match(source, /download-fortnite-filter-kit/);
assert.match(source, /fortnite-filter-proofs/);
assert.match(source, /Two real Replicate proofs/);
assert.match(source, /Nano Banana 2 Lite/);
assert.match(source, /Nano Banana 2/);
assert.match(source, /Nano Banana Pro/);
assert.match(source, /format-repositories\/fortnite-filter-v1/);
assert.equal(
  existsSync(
    "public/format-repositories/fortnite-filter-v1/downloads/wiggly-fortnite-filter-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("fortnite-filter");
assert.ok(profile?.handoff, "Fortnite Filter should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/fortnite-filter");
assert.equal(profile.proofEntries.length, 8);
assert.equal(
  profile.proofEntries.filter((entry) => entry.showInDiscovery !== false).length,
  1,
);
assert.ok(
  profile.proofEntries.every((entry) =>
    entry.media.kind === "image" &&
    entry.media.src.startsWith("/format-repositories/fortnite-filter-v1/assets/source/")
  ),
  "Fortnite public proof should use the canonical SKAI carousel examples.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I turn into a Fortnite-style character?",
);
assert.equal(profile.handoff.estimates.length, 3);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Fortnite Filter Repo page tests passed.");
