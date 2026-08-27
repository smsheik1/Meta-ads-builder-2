import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { generateCherryCues, loadCherryEngine, verifyCherryEngine } from "../runtime/cherry.mjs";
import { readJson, sha256, validateRun } from "../runtime/run-common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendor = path.join(root, "vendor", "cherry-lip-sync", "v0.1.0");
const hello = path.join(vendor, "fixtures", "hello.ogg");
const expected = path.join(vendor, "fixtures", "hello.filtered.fps24.tsv");

test("bundled Cherry WASI identifies as v0.1.0 and reproduces the upstream fixture exactly", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-cherry-parity-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const engine = await verifyCherryEngine({ root });
  assert.equal(engine.manifest.version, "0.1.0");
  assert.equal(engine.manifest.nativeExecutableIncluded, false);
  assert.equal(engine.manifest.module.abi, "wasi-preview1");
  const wasm = new WebAssembly.Module(await fs.readFile(engine.modulePath));
  const imports = WebAssembly.Module.imports(wasm);
  assert.ok(imports.every(({ module }) => module === "wasi_snapshot_preview1"));
  assert.ok(
    imports.every(({ name }) => !name.startsWith("sock_")),
    "the bundled cue engine must not import WASI networking",
  );

  const outputs = [path.join(scratch, "first.tsv"), path.join(scratch, "second.tsv")];
  for (const outputPath of outputs) {
    const receipt = await generateCherryCues({ root, audioPath: hello, outputPath, totalFrames: 68 });
    assert.equal(receipt.execution, "node-wasi-preview1");
    assert.equal(receipt.cueSource, "bundled-wasi-engine");
    assert.deepEqual(receipt.filesystemPreopens, ["private-run-scratch-only"]);
    assert.equal(receipt.networkUsed, false);
  }
  const expectedBytes = await fs.readFile(expected);
  assert.deepEqual(await fs.readFile(outputs[0]), expectedBytes);
  assert.deepEqual(await fs.readFile(outputs[1]), expectedBytes);
});

test("bundled Cherry module checksum tampering is rejected before execution", async (t) => {
  const scratchRoot = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-cherry-tamper-"));
  t.after(() => fs.rm(scratchRoot, { recursive: true, force: true }));
  const copiedVendor = path.join(scratchRoot, "vendor", "cherry-lip-sync", "v0.1.0");
  await fs.mkdir(path.dirname(copiedVendor), { recursive: true });
  await fs.cp(vendor, copiedVendor, { recursive: true });
  await fs.appendFile(path.join(copiedVendor, "cherrylipsync.wasm"), "tampered");
  await assert.rejects(loadCherryEngine(scratchRoot), /module checksum mismatch/);
});

test("runner init auto-generates checksum-bound Cherry cues for an audio Lego sequence", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-cherry-init-"));
  const runId = `cherry-auto-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const runDirectory = path.join(root, "agent-runs", runId);
  t.after(async () => {
    await fs.rm(scratch, { recursive: true, force: true });
    await fs.rm(runDirectory, { recursive: true, force: true });
  });
  const inputPath = path.join(scratch, "input.json");
  await fs.writeFile(inputPath, `${JSON.stringify({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Bundled Cherry automatic init proof",
    backgroundId: "sisters-room",
    sequence: [{ poseId: "neutral-listening", holdFrames: 67, gapFrames: 0 }],
  }, null, 2)}\n`);
  execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    `--run=${runId}`,
    `--input=${inputPath}`,
    `--audio=${hello}`,
  ], { cwd: root, stdio: "pipe" });

  const [input, state] = await Promise.all([
    readJson(path.join(runDirectory, "input.json")),
    readJson(path.join(runDirectory, "state.json")),
  ]);
  assert.equal(input.lipSync.cueSource, "bundled-wasi-engine");
  assert.equal(input.lipSync.execution, "node-wasi-preview1");
  assert.equal(input.lipSync.cueSha256, await sha256(path.join(runDirectory, "cherry-lipsync.tsv")));
  assert.equal(input.lipSync.sourceAudioSha256, await sha256(path.join(runDirectory, input.audioFile)));
  assert.equal(state.lipSync.engineModuleSha256, input.lipSync.engineModuleSha256);

  const validated = await validateRun({ root, runDirectory });
  assert.equal(validated.mode, "audio-sequence");
  assert.equal(validated.receipt.lipSync.cueSource, "bundled-wasi-engine");
  assert.equal(validated.receipt.lipSync.engineModuleSha256, input.lipSync.engineModuleSha256);
});

test("runner init supports an explicit lipsync opt-out", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-cherry-off-"));
  const runId = `cherry-off-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const runDirectory = path.join(root, "agent-runs", runId);
  t.after(async () => {
    await fs.rm(scratch, { recursive: true, force: true });
    await fs.rm(runDirectory, { recursive: true, force: true });
  });
  const inputPath = path.join(scratch, "input.json");
  await fs.writeFile(inputPath, `${JSON.stringify({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Explicit body-only audio proof",
    backgroundId: "sisters-room",
    sequence: [{ poseId: "neutral-listening", holdFrames: 67, gapFrames: 0 }],
  }, null, 2)}\n`);
  execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    `--run=${runId}`,
    `--input=${inputPath}`,
    `--audio=${hello}`,
    "--lipsync=off",
  ], { cwd: root, stdio: "pipe" });
  const input = await readJson(path.join(runDirectory, "input.json"));
  assert.equal(input.lipSync, undefined);
  await assert.doesNotReject(validateRun({ root, runDirectory }));
});

test("runner init preserves supplied Cherry cues without claiming bundled generation", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-cherry-supplied-"));
  const runId = `cherry-supplied-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const runDirectory = path.join(root, "agent-runs", runId);
  t.after(async () => {
    await fs.rm(scratch, { recursive: true, force: true });
    await fs.rm(runDirectory, { recursive: true, force: true });
  });
  const inputPath = path.join(scratch, "input.json");
  await fs.writeFile(inputPath, `${JSON.stringify({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Supplied Cherry cue provenance proof",
    backgroundId: "sisters-room",
    sequence: [{ poseId: "neutral-listening", holdFrames: 67, gapFrames: 0 }],
  }, null, 2)}\n`);
  execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    `--run=${runId}`,
    `--input=${inputPath}`,
    `--audio=${hello}`,
    `--lipsync-cues=${expected}`,
  ], { cwd: root, stdio: "pipe" });
  const input = await readJson(path.join(runDirectory, "input.json"));
  assert.equal(input.lipSync.cueSource, "supplied-tsv");
  assert.equal(input.lipSync.execution, "external");
  assert.equal(input.lipSync.filterSingleFrames, null);
  assert.equal(input.lipSync.engineManifestSha256, undefined);
  assert.equal(input.lipSync.engineModuleSha256, undefined);
  const validated = await validateRun({ root, runDirectory });
  assert.equal(validated.receipt.lipSync.cueSource, "supplied-tsv");

  await fs.appendFile(path.join(runDirectory, input.audioFile), "tampered");
  await assert.rejects(
    validateRun({ root, runDirectory }),
    /source audio checksum does not match/,
  );
});
