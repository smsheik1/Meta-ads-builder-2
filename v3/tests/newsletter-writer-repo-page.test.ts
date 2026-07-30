import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/newsletter-writer/page.tsx", "utf8");

assert.match(source, /Wiggly \/ Format Lab/);
assert.match(source, /format-repositories\/newsletter-writer-v1/);
assert.match(source, /Download runnable kit/);
assert.match(source, /Holden Brand proof/);
assert.match(source, /Website-only profile/);
assert.match(source, /Three distinct inbox angles/);
assert.match(source, /No image, video, voice, or paid Wiggly provider is called/);
assert.equal(
  existsSync(
    "public/format-repositories/newsletter-writer-v1/downloads/wiggly-newsletter-writer-format-kit.zip",
  ),
  true,
);
assert.equal(
  existsSync("public/discovery/newsletter-writer/holden-brand-history.png"),
  true,
);

const profile = getDiscoveryFormatProfile("newsletter-writer");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/newsletter-writer");
assert.equal(
  profile?.handoff?.firstQuestion,
  "What company is this for? Share its website if it has one.",
);
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);
const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /Exact public version: 1\.0\.0/);
assert.match(prompt, /Ask me one short question at a time/);
assert.ok(
  prompt.trim().endsWith('"What company is this for? Share its website if it has one."'),
);

console.log("Newsletter writer repo page tests passed.");
