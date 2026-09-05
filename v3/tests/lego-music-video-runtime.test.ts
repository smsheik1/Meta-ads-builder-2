import assert from "node:assert/strict";
import { mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { collectRunStage, generateRunStage, requestForRun } from "../features/formats/lego-music-video/providers";
import { finalizeRun, fingerprint, importRun, LEGO_TECHNICAL_CHECKS, localAsset, readInput, readJson, technicalChecksPassed, validateRun, writeJson, type LegoState } from "../features/formats/lego-music-video/runtime";

const root = await mkdtemp(path.join(tmpdir(), "lego-contract-"));
const golden = path.resolve("public/format-repositories/lego-music-video-v1/goldens/cookies/input.json");
const directory = path.join(root, "imported");
await importRun(directory, golden);
const valid = await validateRun(directory, true);
assert.equal(valid.input.scene.format, "lego-music-video");
assert.equal(valid.inventory.length, 8);
assert.equal((await readJson<LegoState>(path.join(directory, "state.json"))).paid.length, 0);
assert.equal(technicalChecksPassed({}), false, "An empty check map cannot finalize.");
const checks = Object.fromEntries(LEGO_TECHNICAL_CHECKS.map(key => [key, true]));
assert.equal(technicalChecksPassed(checks), true);
for (const key of LEGO_TECHNICAL_CHECKS) assert.equal(technicalChecksPassed({ ...checks, [key]: false }), false);
await assert.rejects(localAsset(directory, "../outside.mp4"));
await assert.rejects(localAsset(directory, "https://example.com/clip.mp4"));
await writeFile(path.join(root, "outside.jpg"), "outside");
await symlink(path.join(root, "outside.jpg"), path.join(directory, "media/escape.jpg"));
await assert.rejects(localAsset(directory, "media/escape.jpg"));
const before = (await fingerprint(directory, valid.input)).hash;
await writeFile(path.join(directory, "media/reference.jpg"), "changed");
assert.notEqual((await fingerprint(directory, valid.input)).hash, before);

// Every fetch below is a local mock. No provider key or network is used.
process.env.REPLICATE_API_TOKEN = "local-test-placeholder";
delete process.env.LEGO_DISABLE_PAID_CALLS;
const input = await readInput(directory);
input.media.reference = null;
input.media.shots = input.media.shots.map(() => ({ image: null, video: null }));
await writeJson(path.join(directory, "input.json"), input);
let posts = 0, gets = 0;
const options = { secretsFile: path.join(root, "absent-secrets.env"), approvedCostUsd: 0.1, budgetUsd: 0.3, fetcher: (async (_url: unknown, init?: RequestInit) => {
  if (init?.method === "POST") { posts++; return new Response(JSON.stringify({ id: "saved-prediction" })); }
  gets++; return new Response(JSON.stringify({ status: "processing" }));
}) as typeof fetch };
await assert.rejects(generateRunStage(directory, "reference", { ...options, approvedCostUsd: undefined }), /approval/);
await assert.rejects(generateRunStage(directory, "reference", { ...options, budgetUsd: 0.01 }), /budget/);
assert.equal(posts, 0);
process.env.LEGO_DISABLE_PAID_CALLS = "1";
await assert.rejects(generateRunStage(directory, "reference", options), /disabled/);
delete process.env.LEGO_DISABLE_PAID_CALLS;
assert.equal((await generateRunStage(directory, "reference", options)).status, "running");
assert.equal(posts, 1);
const pending = await readJson<LegoState>(path.join(directory, "state.json"));
assert.equal(pending.paid[0]!.predictionId, "saved-prediction");
assert.equal(pending.paid[0]!.budgetUsd, 0.3);
assert.ok(pending.paid[0]!.approvedAt);
await assert.rejects(generateRunStage(directory, "reference", options), /existing request/);
await collectRunStage(directory, "reference", options);
assert.equal(posts, 1, "Polling must never submit a replacement.");
assert.equal(gets, 2);
const image = await readFile(path.join(path.dirname(golden), "media/reference.jpg"));
// Simulate a stopped collector after the exact output bytes were saved.
await writeFile(path.join(directory, "media/reference-1.jpg"), image);
await collectRunStage(directory, "reference", { ...options, fetcher: (async (url: unknown) => String(url).includes("/predictions/") ? new Response(JSON.stringify({ status: "succeeded", output: "https://mock.invalid/output.jpg" })) : new Response(image, { headers: { "content-type": "image/jpeg" } })) as typeof fetch });
assert.equal((await readInput(directory)).media.reference, "media/reference-1.jpg");
assert.equal((await readJson<LegoState>(path.join(directory, "state.json"))).paid[0]!.status, "succeeded");
await assert.rejects(generateRunStage(directory, "shot-1", options), /image-review/);
await requestForRun(directory, "shot-1");
assert.equal(posts, 1);

const fixture = path.join(root, "fixture");
await importRun(fixture, golden, true);
await assert.rejects(finalizeRun(fixture, "missing-review.json"), /cannot be finalized/);
const fixtureInput = await readInput(fixture);
fixtureInput.media.reference = null;
await writeJson(path.join(fixture, "input.json"), fixtureInput);
await assert.rejects(generateRunStage(fixture, "reference", options), /fixtures/);
delete process.env.REPLICATE_API_TOKEN;
console.log("Lego runtime tests passed: local imports, hash invalidation, path containment, approvals, budget, saved-job resume, interrupted collection, fixture and finalization gates. Zero network calls.");
