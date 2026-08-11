import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/blue-phosphor/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /blue-phosphor/);
assert.equal(
  existsSync(
    "public/format-repositories/blue-phosphor-v1/downloads/wiggly-blue-phosphor-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("blue-phosphor");
assert.ok(profile?.handoff, "Blue Phosphor should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/blue-phosphor");
assert.equal(profile.proofEntries.length, 7);
const goldens = JSON.parse(
  readFileSync("public/format-repositories/blue-phosphor-v1/goldens.json", "utf8"),
) as { examples: Array<{ referencePath?: string }> };
assert.ok(
  goldens.examples.every((entry) => entry.referencePath),
  "Every Blue Phosphor example should package its original-photo reference.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "blue-phosphor").length,
  1,
  "The seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I apply the Blue Phosphor Filter to?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Blue Phosphor Filter/);
assert.match(prompt, /formats\/blue-phosphor/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Blue Phosphor Repo page tests passed.");
