import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/light-silhouette/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /light-silhouette/);
assert.equal(
  existsSync(
    "public/format-repositories/light-silhouette-v1/downloads/wiggly-light-silhouette-format-kit.zip",
  ),
  true,
);

const profile = getDiscoveryFormatProfile("light-silhouette");
assert.ok(profile?.handoff, "Light Silhouette should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/light-silhouette");
assert.equal(profile.proofEntries.length, 7);
const goldens = JSON.parse(
  readFileSync("public/format-repositories/light-silhouette-v1/goldens.json", "utf8"),
) as { examples: Array<{ referencePath?: string; referenceType?: string }> };
assert.ok(
  goldens.examples.every(
    (entry) =>
      entry.referencePath && entry.referenceType === "creator-published-inset",
  ),
  "Every Light Silhouette example should retain its creator-published reference inset.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "light-silhouette").length,
  1,
  "The seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I turn into a Light Silhouette?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Wiggly Format: Light Silhouette/);
assert.match(prompt, /formats\/light-silhouette/);
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 700);

console.log("Light Silhouette Repo page tests passed.");
