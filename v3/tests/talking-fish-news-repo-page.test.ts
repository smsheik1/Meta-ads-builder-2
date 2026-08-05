import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const source = readFileSync("app/format-lab/talking-fish-news/page.tsx", "utf8");

assert.match(source, /download-talking-fish-news-kit/);
assert.match(source, /talking-fish-news-proof/);
assert.match(source, /talking-fish-news-pipeline/);
assert.match(source, /What should tonight&apos;s fish report cover/);
assert.doesNotMatch(source, /TalkingFishNewsProofClient|generate.*(?:Image|Video)/i);
assert.equal(
  existsSync("public/format-repositories/talking-fish-news-v1/downloads/wiggly-talking-fish-news-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("talking-fish-news");
assert.ok(profile?.handoff);
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/talking-fish-news");
const handoff = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(handoff, /Exact public version: 1\.0\.0/);
assert.match(handoff, /five concepts/i);
assert.ok(handoff.trim().endsWith('"What should tonight\'s fish report cover? Send a topic or source link, or say pick for me."'));

console.log("Talking Fish News repo page tests passed.");
