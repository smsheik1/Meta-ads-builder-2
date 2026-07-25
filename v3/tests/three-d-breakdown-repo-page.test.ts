import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/format-lab/three-d-breakdown/page.tsx", "utf8");
assert.match(source, /download-three-d-format-kit/);
assert.match(source, /video-phase-boundary/);
assert.match(source, /lego-world-arc-proof/);
assert.match(source, /lego-quality-proof/);
assert.match(source, /LEGO Style B proof — final passed/);
assert.match(source, /lifestyle setup → blue breakdown → lifestyle payoff/);
assert.match(source, /lego-origin-world-arc-proof\/final-contact-sheet\.jpg/);
assert.match(source, /lego-origin-world-arc-proof\/final\.mp4/);
assert.match(source, /lego-origin-quality-proof\/video-contact-sheet\.jpg/);
assert.match(source, /Fish narration/);
assert.match(source, /Provider prediction IDs now persist/);
assert.match(source, /renders the final video locally/);
assert.match(source, /pipeline-\$\{stage\.id\}/);
assert.match(source, /ecommerce-teardown-style-reference-clean-v7\.jpg/);
assert.doesNotMatch(source, /CreateResearchClient|generateThreeDClip|generateFinalThreeDVideo/);

console.log("3D Breakdown Repo page tests passed.");
