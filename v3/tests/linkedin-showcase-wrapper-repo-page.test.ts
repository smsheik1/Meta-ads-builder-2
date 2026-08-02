import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { discoveryCatalog, groupDiscoveryEntriesByShelf } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";

const source = readFileSync("app/format-lab/linkedin-showcase-wrapper/page.tsx", "utf8");
assert.match(source, /download-linkedin-showcase-wrapper-kit/);
assert.match(source, /linkedin-showcase-wrapper-goldens/);
assert.match(source, /linkedin-showcase-wrapper-pipeline/);
assert.match(source, /featured product or primary offering/);
assert.match(source, /Standalone asset sourcing/);
assert.match(source, /format-repositories\/linkedin-showcase-wrapper-v1/);
assert.ok(existsSync("public/format-repositories/linkedin-showcase-wrapper-v1/prompts/asset-sourcing.md"));
const sourcing = readFileSync("public/format-repositories/linkedin-showcase-wrapper-v1/prompts/asset-sourcing.md", "utf8");
assert.match(sourcing, /must work when no parent Format exists/);
assert.match(sourcing, /official brand website/);
assert.ok(
  existsSync("public/format-repositories/linkedin-showcase-wrapper-v1/downloads/wiggly-linkedin-showcase-wrapper-format-kit.zip"),
  "The downloadable LinkedIn Showcase Wrapper ZIP must exist.",
);

const profile = getDiscoveryFormatProfile("linkedin-showcase-wrapper");
assert.equal(profile?.technicalHref, "/format-lab/linkedin-showcase-wrapper");
assert.equal(profile?.version, "1.0.0");
assert.equal(profile?.proofEntries.length, 1);
assert.equal(profile?.proofEntries[0]?.media.aspectRatio, "landscape");
assert.deepEqual(profile?.handoff?.requiredInputs, ["One finished and explicitly approved video", "The official brand website"]);
assert.equal(profile?.handoff?.firstQuestion, "Which approved finished video should I package for LinkedIn?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0 provider cost/);

const postProduction = groupDiscoveryEntriesByShelf(discoveryCatalog).find((shelf) => shelf.id === "post-production");
assert.equal(postProduction?.title, "Post-Production");
assert.deepEqual(postProduction?.entries.map((entry) => entry.format.slug), ["linkedin-showcase-wrapper"]);

console.log("LinkedIn Showcase Wrapper repository page tests passed");
