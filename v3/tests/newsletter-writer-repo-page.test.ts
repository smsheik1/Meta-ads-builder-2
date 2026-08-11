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
assert.match(source, /read both before revealing the labels/i);
assert.match(source, /run: improvedRun/);
assert.match(source, /Version A is the frozen v1\.0 agent\. Version B is the improved v1\.1 agent\./);
assert.match(source, /historical v1\.0-to-v1\.1\s+comparison/);
assert.match(source, /\[--brand-url=&lt;url&gt;\]/);
assert.match(source, /No image, video, voice, or paid Wiggly provider is called/);
assert.equal(
  existsSync(
    "public/format-repositories/newsletter-writer-v1/downloads/wiggly-newsletter-writer-format-kit.zip",
  ),
  true,
);
assert.equal(
  existsSync("public/discovery/newsletter-writer/newsletter-writer-agent.jpg"),
  true,
);

const profile = getDiscoveryFormatProfile("newsletter-writer");
assert.ok(profile?.handoff);
assert.equal(profile?.technicalHref, "/format-lab/newsletter-writer");
assert.equal(
  profile?.handoff?.firstQuestion,
  "What company is this for? Share its website if it has one.",
);
assert.ok(
  profile?.handoff?.requiredInputs.includes("A company website or short company description"),
);
assert.ok(
  profile?.handoff?.instructions.some((item) => item.includes("historical v1.1 proof")),
);
assert.match(profile?.handoff?.totalEstimate || "", /\$0/);
const prompt = buildDiscoveryHandoffPrompt(profile!, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Newsletter writer repo page tests passed.");
