import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

const packageRoot = path.resolve(
  "public",
  "format-repositories",
  "fortnite-filter-v1",
);
const readJson = <T,>(relativePath: string) =>
  JSON.parse(readFileSync(path.join(packageRoot, relativePath), "utf8")) as T;

const format = readJson<{ id: string; version: string }>("format.json");
const inputs = readJson<{
  defaults: { model: string };
  modelRoutes: Record<string, string>;
}>("inputs.json");
const proofs = readJson<{
  proofs: Array<{
    model: string;
    predictionId: string;
    attemptsUsed: number;
    status: string;
    outputPath: string;
    qualityReportPath: string;
  }>;
}>("proofs.json");

assert.equal(format.id, "fortnite-filter");
assert.equal(format.version, "1.0.0");
assert.equal(inputs.defaults.model, "nano-banana-2");
assert.deepEqual(inputs.modelRoutes, {
  economy: "google/nano-banana-2-lite",
  default: "google/nano-banana-2",
  premium: "google/nano-banana-pro",
});
assert.equal(proofs.proofs.length, 2);
assert.deepEqual(
  proofs.proofs.map((proof) => proof.model),
  ["google/nano-banana-2", "google/nano-banana-2-lite"],
);

for (const proof of proofs.proofs) {
  assert.match(proof.predictionId, /^[a-z0-9]+$/);
  assert.equal(proof.attemptsUsed, 1);
  assert.equal(proof.status, "finalized");
  const outputPath = path.join(packageRoot, proof.outputPath);
  const qualityPath = path.join(packageRoot, proof.qualityReportPath);
  assert.equal(existsSync(outputPath), true);
  assert.equal(existsSync(qualityPath), true);
  const dimensions = imageSize(readFileSync(outputPath));
  assert.ok(dimensions.width && dimensions.height);
  assert.ok(Math.abs(dimensions.width / dimensions.height - 0.75) <= 0.015);
  const quality = JSON.parse(readFileSync(qualityPath, "utf8")) as {
    automaticPass: boolean;
    manualPass: boolean;
    reviewNotes?: string;
  };
  assert.equal(quality.automaticPass, true);
  assert.equal(quality.manualPass, true);
  assert.ok(quality.reviewNotes);
}

const prompt = readFileSync(path.join(packageRoot, "prompts/transform.txt"), "utf8").trim();
const runner = readFileSync("scripts/skai-image-format.ts", "utf8");
const runtime = readJson<{
  maximumAttempts: number;
  modelRoutes: Record<string, { model: string }>;
}>("runtime.json");
const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
assert.ok(prompt.length > 0);
assert.equal(runtime.maximumAttempts, 3);
assert.deepEqual(
  Object.values(runtime.modelRoutes).map((route) => route.model),
  [
    "google/nano-banana-2-lite",
    "google/nano-banana-2",
    "google/nano-banana-pro",
  ],
);
assert.match(runner, /predictions\.create/);
assert.match(runner, /predictionId/);
assert.match(runner, /--approve-paid/);
assert.match(runner, /--approve-final/);
assert.match(skill, /Which photo should I turn into a Fortnite-style character\?/);
assert.doesNotMatch(readFileSync(path.join(packageRoot, ".env.example"), "utf8"), /r8_/);

const smoke = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "scripts/skai-image-format.ts",
    "smoke",
    "--format=fortnite-filter",
  ],
  { cwd: process.cwd(), encoding: "utf8" },
);
assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
assert.match(smoke.stdout, /Free smoke passed/);
assert.match(smoke.stdout, /No provider was called/);
assert.match(smoke.stdout, /finalization stayed gated/);

console.log("Fortnite Filter agent runner tests passed.");
