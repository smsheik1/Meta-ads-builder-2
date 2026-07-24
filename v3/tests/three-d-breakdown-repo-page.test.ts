import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/format-lab/three-d-breakdown/page.tsx", "utf8");
assert.match(source, /download-three-d-format-kit/);
assert.match(source, /video-phase-boundary/);
assert.match(source, /lego-quality-proof/);
assert.match(source, /LEGO clips passed continuity and technical review/);
assert.match(source, /failed Style B world fidelity/);
assert.match(source, /lifestyle setup → blue breakdown → lifestyle payoff/);
assert.match(source, /lego-origin-quality-proof\/video-contact-sheet\.jpg/);
assert.match(source, /lego-origin-quality-proof\/videos\/clip-\$\{clip\}\.mp4/);
assert.match(source, /paid reproof, voice generation, and final composition remain locked/);
assert.match(source, /one explicitly approved image or video clip at a time/);
assert.match(source, /pipeline-\$\{stage\.id\}/);
assert.match(source, /ecommerce-teardown-style-reference-clean-v7\.jpg/);
assert.doesNotMatch(source, /CreateResearchClient|generateThreeDClip|generateFinalThreeDVideo/);

console.log("3D Breakdown Repo page tests passed.");
