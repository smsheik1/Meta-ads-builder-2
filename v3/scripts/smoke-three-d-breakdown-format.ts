import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  evaluateThreeDBreakdownRepoRequirements,
  type ThreeDBreakdownRepoRequirementManifest,
} from "../features/formats/three-d-breakdown/repoRuntime";

const packageRoot = path.resolve("public", "format-repositories", "three-d-breakdown-v1");
const readJson = <T,>(relativePath: string) => JSON.parse(
  readFileSync(path.join(packageRoot, relativePath), "utf8"),
) as T;

const fixture = readJson<{
  storyDirectionCount: number;
  selectedVisualStyle: string;
  storyboardFrameCount: number;
  productionAnchorFrameIndexes: number[];
  clipCount: number;
  clipDurationSeconds: number;
  videoGenerationEnabled: boolean;
}>("fixtures/style-b-checkpoint.json");
assert.equal(fixture.storyDirectionCount, 5);
assert.equal(fixture.selectedVisualStyle, "presenter-teardown-vsl");
assert.equal(fixture.storyboardFrameCount, 6);
assert.deepEqual(fixture.productionAnchorFrameIndexes, [1, 4]);
assert.equal(fixture.clipCount, 2);
assert.equal(fixture.clipDurationSeconds, 10);
assert.equal(fixture.videoGenerationEnabled, false);

const manifest = readJson<ThreeDBreakdownRepoRequirementManifest>("requirements.json");
const freeCheck = evaluateThreeDBreakdownRepoRequirements({
  stage: "plan",
  environment: {},
  manifest,
  tools: { node: true },
});
assert.deepEqual(freeCheck.missingEnvironment, ["NVIDIA_NIM_API_KEY"]);
const videoCheck = evaluateThreeDBreakdownRepoRequirements({
  stage: "video",
  environment: { REPLICATE_API_TOKEN: "present" },
  manifest,
  tools: { node: true },
});
assert.equal(videoCheck.ok, false);
assert.match(videoCheck.disabledReason || "", /disabled/i);

console.log("3D Breakdown Repo smoke passed without a provider call.");
