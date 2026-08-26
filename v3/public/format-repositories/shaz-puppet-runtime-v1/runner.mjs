#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { inspectRun } from "./runtime/inspect-run.mjs";
import { renderSequence } from "./runtime/render-sequence.mjs";
import {
  execute,
  exists,
  parseArgs,
  readJson,
  requireRunId,
  resolveRunDirectory,
  sha256,
  validateRun,
  writeJson,
} from "./runtime/run-common.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const ATTEMPT_LIMIT = 3;

function usage() {
  return `Usage:
  node runner.mjs check
  node runner.mjs smoke
  node runner.mjs init --run=<id> --input=/absolute/path/input.json
  node runner.mjs validate --run=<id>
  node runner.mjs render --run=<id>
  node runner.mjs inspect --run=<id>
  node runner.mjs finalize --run=<id>`;
}

function toolVersion(program, args = ["-version"]) {
  return execute(program, args).split("\n")[0].trim();
}

async function verifyAssetReceipt() {
  const manifest = await readJson(path.join(root, "rig-v2", "runtime.json"));
  const receipt = await readJson(path.join(root, "rig-v2", "assets", "receipt.json"));
  if (receipt.schemaVersion !== "shaz-tvg-asset-receipt-v2") {
    throw new Error("unsupported rig-v2 asset receipt");
  }
  if (receipt.sourceXstageSha256 !== manifest.source.sha256) {
    throw new Error("rig manifest and compiled asset receipt reference different Xstage sources");
  }
  if (receipt.artistRenderedFramesUsed !== false) {
    throw new Error("compiled asset receipt does not prove artist-frame exclusion");
  }
  for (const asset of receipt.assets) {
    const file = path.join(root, "rig-v2", "assets", asset.filename);
    if (await sha256(file) !== asset.outputSha256) {
      throw new Error(`compiled rig asset checksum mismatch: ${asset.filename}`);
    }
  }
  return { manifest, receipt };
}

async function check() {
  const requiredFiles = [
    "format.json",
    "requirements.json",
    "input-contract.json",
    "composition-contract.json",
    "output-contract.json",
    "quality.json",
    "content-boundary.json",
    "assets.json",
    "poses/index.json",
    "rig-v2/runtime.json",
    "rig-v2/assets/receipt.json",
  ];
  for (const relative of requiredFiles) {
    if (!(await exists(path.join(root, relative)))) throw new Error(`missing required kit file: ${relative}`);
  }
  const { manifest, receipt } = await verifyAssetReceipt();
  const propRecords = (await readJson(path.join(root, "assets.json"))).props;
  for (const prop of propRecords) {
    const file = path.resolve(root, prop.path);
    if (!file.startsWith(`${path.join(root, "assets", "props")}${path.sep}`)) {
      throw new Error(`prop escapes assets/props: ${prop.id}`);
    }
    if (await sha256(file) !== prop.sha256) throw new Error(`prop checksum mismatch: ${prop.id}`);
  }
  await validateRun({
    root,
    runDirectory: await stageValidationFixture("check-contract", "fixtures/smoke/input.json"),
  });
  await fs.rm(path.join(root, "agent-runs", "check-contract"), { recursive: true, force: true });
  const sharpVersion = sharp.versions.sharp;
  const report = {
    status: "pass",
    formatVersion: (await readJson(path.join(root, "format.json"))).version,
    tools: {
      node: process.version,
      npm: toolVersion("npm", ["--version"]),
      ffmpeg: toolVersion("ffmpeg"),
      ffprobe: toolVersion("ffprobe"),
      sharp: sharpVersion,
    },
    sourceXstageSha256: manifest.source.sha256,
    artistRenderedFramesUsed: false,
    compiledAssetCount: receipt.assets.length,
    tests: "run separately by npm test",
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function stageValidationFixture(runId, fixture) {
  const runDirectory = resolveRunDirectory(root, runId);
  await fs.rm(runDirectory, { recursive: true, force: true });
  await fs.mkdir(runDirectory, { recursive: true });
  await fs.copyFile(path.join(root, fixture), path.join(runDirectory, "input.json"));
  return runDirectory;
}

async function init(args) {
  const runId = requireRunId(args.run);
  if (!args.input || !path.isAbsolute(args.input)) throw new Error("--input must be an absolute JSON path");
  await fs.access(args.input);
  const runDirectory = resolveRunDirectory(root, runId);
  if (await exists(runDirectory)) throw new Error(`run already exists: ${runId}`);
  await fs.mkdir(runDirectory, { recursive: true });
  await fs.copyFile(args.input, path.join(runDirectory, "input.json"));
  await writeJson(path.join(runDirectory, "state.json"), {
    schemaVersion: 1,
    runId,
    status: "initialized",
    attempts: 0,
    initializedAt: new Date().toISOString(),
  });
  console.log(JSON.stringify({ status: "initialized", runId, runDirectory }, null, 2));
  return runDirectory;
}

async function runDirectoryFromArgs(args) {
  const runDirectory = resolveRunDirectory(root, requireRunId(args.run));
  if (!(await exists(runDirectory))) throw new Error(`unknown run: ${args.run}`);
  return runDirectory;
}

async function render(args) {
  const runDirectory = await runDirectoryFromArgs(args);
  const statePath = path.join(runDirectory, "state.json");
  const state = await readJson(statePath);
  if (!Number.isInteger(state.attempts) || state.attempts >= ATTEMPT_LIMIT) {
    throw new Error(`render attempt limit reached (${ATTEMPT_LIMIT})`);
  }
  state.attempts += 1;
  state.status = "rendering";
  state.lastAttemptAt = new Date().toISOString();
  await writeJson(statePath, state);
  try {
    const result = await renderSequence({ root, runDirectory });
    state.status = "rendered";
    state.outputSha256 = result.report.outputSha256;
    await writeJson(statePath, state);
    console.log(JSON.stringify(result.report, null, 2));
    return result;
  } catch (error) {
    state.status = "render-failed";
    state.lastError = error.message;
    await writeJson(statePath, state);
    throw error;
  }
}

async function finalize(args) {
  const runDirectory = await runDirectoryFromArgs(args);
  const validated = await validateRun({ root, runDirectory });
  const quality = await readJson(path.join(runDirectory, "quality-report.json"));
  const review = await readJson(path.join(runDirectory, "human-review.json"));
  const output = path.join(runDirectory, "final.mp4");
  const outputSha256 = await sha256(output);
  const failures = [];
  if (quality.status !== "pass") failures.push("automatic quality report did not pass");
  if (quality.inputSha256 !== validated.receipt.inputSha256) failures.push("quality report input is stale");
  if (quality.outputSha256 !== outputSha256) failures.push("quality report output is stale");
  if (review.schemaVersion !== 1 || review.status !== "approved") failures.push("human review has not approved the output");
  if (review.reviewedOutputSha256 !== outputSha256) failures.push("human review checksum is stale");
  if (typeof review.reviewer !== "string" || review.reviewer.trim().length < 1) failures.push("human review must name its reviewer");
  if (failures.length > 0) throw new Error(`finalization blocked:\n- ${failures.join("\n- ")}`);
  const delivery = {
    schemaVersion: 1,
    status: "ready",
    finalizedAt: new Date().toISOString(),
    finalVideo: "final.mp4",
    inputSha256: validated.receipt.inputSha256,
    outputSha256,
    sourceXstageSha256: validated.receipt.sourceXstageSha256,
    artistRenderedFramesUsed: false,
    providerCalls: 0,
    cost: "$0",
    reviewer: review.reviewer,
  };
  await writeJson(path.join(runDirectory, "delivery.json"), delivery);
  console.log(JSON.stringify(delivery, null, 2));
  return delivery;
}

async function smoke() {
  await check();
  const runId = "smoke-proof";
  const runDirectory = await stageValidationFixture(runId, "fixtures/smoke/input.json");
  await writeJson(path.join(runDirectory, "state.json"), {
    schemaVersion: 1,
    runId,
    status: "initialized",
    attempts: 0,
    initializedAt: new Date().toISOString(),
  });
  await render({ run: runId });
  await inspectRun({ root, runDirectory });
  const outputSha256 = await sha256(path.join(runDirectory, "final.mp4"));
  await writeJson(path.join(runDirectory, "human-review.json"), {
    schemaVersion: 1,
    status: "approved",
    reviewedOutputSha256: outputSha256,
    reviewer: "packaged-smoke-fixture",
    notes: "Deterministic local smoke fixture; creative human review remains required for real runs.",
  });
  const delivery = await finalize({ run: runId });
  console.log(JSON.stringify({ status: "pass", runId, outputSha256: delivery.outputSha256 }, null, 2));
}

async function main() {
  const [command, ...values] = process.argv.slice(2);
  if (!command) throw new Error(usage());
  const args = parseArgs(values);
  if (command === "check") return check();
  if (command === "smoke") return smoke();
  if (command === "init") return init(args);
  if (command === "validate") {
    const result = await validateRun({ root, runDirectory: await runDirectoryFromArgs(args) });
    console.log(JSON.stringify(result.receipt, null, 2));
    return result.receipt;
  }
  if (command === "render") return render(args);
  if (command === "inspect") {
    const report = await inspectRun({ root, runDirectory: await runDirectoryFromArgs(args) });
    console.log(JSON.stringify(report, null, 2));
    return report;
  }
  if (command === "finalize") return finalize(args);
  throw new Error(`unknown command ${command}\n\n${usage()}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
