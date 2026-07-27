import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";

const source = readFileSync("app/format-lab/visualizer/page.tsx", "utf8");
assert.match(source, /download-visualizer-kit/);
assert.match(source, /visualizer-goldens/);
assert.match(source, /visualizer-pipeline/);
assert.match(source, /two voices/);
assert.match(source, /format-repositories\/visualizer-v1/);
assert.ok(
  existsSync("public/format-repositories/visualizer-v1/downloads/wiggly-visualizer-format-kit.zip"),
  "The downloadable Visualizer ZIP must exist.",
);

const profile = getDiscoveryFormatProfile("visualizer");
assert.equal(profile?.technicalHref, "/format-lab/visualizer");
assert.equal(profile?.version, "1.0.0");
assert.equal(profile?.handoff?.firstQuestion, "What website is this conversation ad for?");
assert.match(profile?.handoff?.totalEstimate || "", /\$0\.01-\$0\.02/);

console.log("visualizer repository page tests passed");
