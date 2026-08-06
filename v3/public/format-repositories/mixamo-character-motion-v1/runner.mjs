#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));
const runIdPattern = /^[a-z0-9][a-z0-9-]{1,62}$/;

function parseArgs(values) {
  const result = {};
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const [key, ...parts] = value.slice(2).split("=");
    result[key] = parts.length ? parts.join("=") : true;
  }
  return result;
}

function execute(program, values, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, values, { cwd: options.cwd || root, stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    let output = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(`${program} exited ${code}${output ? `\n${output}` : ""}`)));
  });
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function runDirectory(runId) {
  if (!runId || !runIdPattern.test(runId)) throw new Error("Pass --run=<lowercase-hyphenated-id>.");
  return path.join(root, "agent-runs", runId);
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function catalogs() {
  return {
    manifest: await readJson(path.join(root, "assets/motions/manifest.json")),
    characters: await readJson(path.join(root, "assets/character-packs.json")),
  };
}

async function validateInput(file, receiptFile) {
  const input = await readJson(file);
  const { manifest, characters } = await catalogs();
  const errors = [];
  const allowed = new Set(["characterId", "motionId", "title", "background"]);
  for (const field of ["characterId", "motionId", "title"]) if (typeof input[field] !== "string" || !input[field].trim()) errors.push(`${field} is required.`);
  for (const field of Object.keys(input)) if (!allowed.has(field)) errors.push(`Unknown input field: ${field}`);
  const character = characters.packs.find((pack) => pack.id === input.characterId);
  const motion = manifest.motions.find((candidate) => candidate.id === input.motionId);
  if (!character) errors.push(`Unknown characterId: ${input.characterId}`);
  else if (character.status !== "motion-ready") errors.push(`${character.label} is not motion-ready.`);
  else if (!(await exists(path.join(root, character.model)))) errors.push(`Character model is missing: ${character.model}`);
  if (!motion) errors.push(`Unknown motionId: ${input.motionId}`);
  else {
    const motionFile = path.join(root, motion.file);
    if (!(await exists(motionFile))) errors.push(`Motion file is missing: ${motion.file}`);
    else if (await sha256(motionFile) !== motion.normalizedSha256) errors.push(`Motion hash changed: ${motion.file}`);
  }
  if (input.title?.length > 60) errors.push("title exceeds 60 characters.");
  if (input.background && !/^#[0-9a-fA-F]{6}$/.test(input.background)) errors.push("background must be a six-digit hex color.");
  if (errors.length) throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);
  const receipt = {
    status: "pass",
    validatedAt: new Date().toISOString(),
    inputSha256: await sha256(file),
    characterId: input.characterId,
    motionId: input.motionId,
    frameCount: motion.frameCount,
    durationSeconds: motion.durationSeconds,
  };
  if (receiptFile) await writeJson(receiptFile, receipt);
  return { input, character, motion, receipt };
}

async function initialize(runId, motionId) {
  const directory = runDirectory(runId);
  if (await exists(directory)) throw new Error(`Run already exists: ${runId}`);
  await mkdir(directory, { recursive: true });
  const input = await readJson(path.join(root, "fixtures/smoke/input.json"));
  if (motionId) {
    const { manifest } = await catalogs();
    const motion = manifest.motions.find((candidate) => candidate.id === motionId);
    if (!motion) throw new Error(`Unknown motion: ${motionId}`);
    input.motionId = motion.id;
    input.title = motion.label.toUpperCase();
  }
  await writeJson(path.join(directory, "input.json"), input);
  await writeJson(path.join(directory, "state.json"), { status: "initialized", attempts: 0, createdAt: new Date().toISOString() });
  console.log(directory);
}

async function validateRun(runId) {
  const directory = runDirectory(runId);
  const result = await validateInput(path.join(directory, "input.json"), path.join(directory, ".validation.json"));
  const stateFile = path.join(directory, "state.json");
  const state = await exists(stateFile) ? await readJson(stateFile) : { attempts: 0 };
  await writeJson(stateFile, { ...state, status: "validated", validatedAt: new Date().toISOString() });
  console.log(JSON.stringify(result.receipt, null, 2));
}

async function renderRun(runId) {
  const directory = runDirectory(runId);
  const validation = await validateInput(path.join(directory, "input.json"), path.join(directory, ".validation.json"));
  const stateFile = path.join(directory, "state.json");
  const state = await exists(stateFile) ? await readJson(stateFile) : { attempts: 0 };
  const maximumAttempts = (await readJson(path.join(root, "quality.json"))).automatic.maximumAttempts;
  if ((state.attempts || 0) >= maximumAttempts) throw new Error(`Run reached the ${maximumAttempts}-attempt limit.`);
  const attempts = (state.attempts || 0) + 1;
  await writeJson(stateFile, { ...state, status: "rendering", attempts, motionId: validation.motion.id, renderStartedAt: new Date().toISOString() });
  await execute("node", [
    "runtime/render.mjs",
    `--input=${path.relative(root, path.join(directory, "input.json"))}`,
    `--output=${path.relative(root, path.join(directory, "render.mp4"))}`,
    `--work-dir=${path.relative(root, directory)}`,
    `--report=${path.relative(root, path.join(directory, "motion-report.json"))}`,
  ]);
  await writeJson(stateFile, { ...state, status: "rendered", attempts, motionId: validation.motion.id, renderedAt: new Date().toISOString() });
}

async function inspectRun(runId) {
  const directory = runDirectory(runId);
  await execute("node", [
    "runtime/scripts/inspect.mjs",
    `--video=${path.join(directory, "render.mp4")}`,
    `--report=${path.join(directory, "motion-report.json")}`,
    `--quality=${path.join(directory, "quality-report.json")}`,
    `--contact-sheet=${path.join(directory, "contact-sheet.png")}`,
    `--quality-contract=${path.join(root, "quality.json")}`,
  ]);
  const stateFile = path.join(directory, "state.json");
  const state = await readJson(stateFile);
  await writeJson(stateFile, { ...state, status: "automatic-pass-human-pending", inspectedAt: new Date().toISOString() });
}

async function finalizeRun(runId) {
  if (args["human-review"] !== "pass") throw new Error("Finalization requires --human-review=pass after a person watches the MP4.");
  const directory = runDirectory(runId);
  const quality = await readJson(path.join(directory, "quality-report.json"));
  if (quality.status !== "automatic-pass-human-pending") throw new Error(`Automatic quality is not ready: ${quality.status}`);
  await copyFile(path.join(directory, "render.mp4"), path.join(directory, "final.mp4"));
  quality.status = "pass";
  quality.humanReview = { status: "pass", approvedAt: new Date().toISOString(), criteria: quality.humanReview.criteria };
  await writeJson(path.join(directory, "quality-report.json"), quality);
  await writeJson(path.join(directory, "finalization.json"), {
    status: "finalized",
    finalizedAt: new Date().toISOString(),
    inputSha256: await sha256(path.join(directory, "input.json")),
    videoSha256: await sha256(path.join(directory, "final.mp4")),
    humanReview: "pass",
  });
  const state = await readJson(path.join(directory, "state.json"));
  await writeJson(path.join(directory, "state.json"), { ...state, status: "finalized", finalizedAt: new Date().toISOString() });
  console.log(path.join(directory, "final.mp4"));
}

async function checkRepo() {
  for (const tool of ["node", "npm"]) await execute(tool, ["--version"], { capture: true });
  for (const tool of ["ffmpeg", "ffprobe"]) await execute(tool, ["-version"], { capture: true });
  for (const file of ["format.json", "requirements.json", "input-contract.json", "composition-contract.json", "output-contract.json", "quality.json", "assets.json"]) await readJson(path.join(root, file));
  for (const file of [
    "runtime/serve-lab.mjs",
    "runtime/static-server.mjs",
    "runtime/vendor/three.module.js",
    "runtime/vendor/loaders/ColladaLoader.js",
  ]) await access(path.join(root, file));
  const { manifest, characters } = await catalogs();
  if (manifest.motions.length < 2) throw new Error("Format needs at least two normalized proof motions.");
  if (!characters.packs.some((pack) => pack.status === "motion-ready")) throw new Error("Format needs a motion-ready character.");
  for (const motion of manifest.motions) {
    const motionFile = path.join(root, motion.file);
    if (await sha256(motionFile) !== motion.normalizedSha256) throw new Error(`Hash mismatch: ${motion.file}`);
    const normalized = await readJson(motionFile);
    if (normalized.frameCount !== motion.frameCount || normalized.fps !== motion.fps) throw new Error(`Timing mismatch: ${motion.id}`);
  }
  await validateInput(path.join(root, "fixtures/smoke/input.json"));
  await execute("npm", ["test"]);
  console.log(JSON.stringify({ status: "pass", motions: manifest.motions.length, characters: characters.packs.length }, null, 2));
}

async function smoke() {
  const directory = path.join(root, "agent-runs", "_smoke");
  await mkdir(directory, { recursive: true });
  await validateInput(path.join(root, "fixtures/smoke/input.json"), path.join(directory, ".validation.json"));
  await execute("node", [
    "runtime/render.mjs",
    "--input=fixtures/smoke/input.json",
    "--output=agent-runs/_smoke/smoke.mp4",
    "--work-dir=agent-runs/_smoke",
    "--report=agent-runs/_smoke/motion-report.json",
    "--smoke",
  ]);
  await execute("node", ["runtime/scripts/smoke-lab.mjs"]);
  console.log(path.join(directory, "smoke.mp4"));
}

async function importMotion() {
  for (const required of ["source", "id", "label"]) if (!args[required]) throw new Error(`Missing --${required}`);
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(args.id)) throw new Error("Motion id must be lowercase and hyphenated.");
  const manifestFile = path.join(root, "assets/motions/manifest.json");
  const manifest = await readJson(manifestFile);
  if (manifest.motions.some((motion) => motion.id === args.id)) throw new Error(`Motion already exists: ${args.id}`);
  const output = path.join(root, "assets/motions", `${args.id}.json`);
  await execute("node", ["runtime/scripts/extract-mixamo.mjs", `--source=${path.resolve(args.source)}`, `--output=${output}`, `--id=${args.id}`, `--label=${args.label}`]);
  const normalized = await readJson(output);
  manifest.motions.push({
    id: normalized.id,
    label: normalized.label,
    file: `assets/motions/${args.id}.json`,
    fps: normalized.fps,
    frameCount: normalized.frameCount,
    durationSeconds: normalized.durationSeconds,
    sourceFileName: normalized.source.fileName,
    sourceSha256: normalized.source.sha256,
    normalizedSha256: await sha256(output),
  });
  await writeJson(manifestFile, manifest);
  console.log(JSON.stringify(manifest.motions.at(-1), null, 2));
}

switch (command) {
  case "check": await checkRepo(); break;
  case "smoke": await smoke(); break;
  case "init": await initialize(args.run, args.motion); break;
  case "validate": await validateRun(args.run); break;
  case "render": await renderRun(args.run); break;
  case "inspect": await inspectRun(args.run); break;
  case "finalize": await finalizeRun(args.run); break;
  case "import-motion": await importMotion(); break;
  default: throw new Error("Use check, smoke, init, validate, render, inspect, finalize, or import-motion.");
}
