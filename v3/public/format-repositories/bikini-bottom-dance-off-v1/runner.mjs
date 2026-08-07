#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAudio } from "./runtime/analyze-audio.mjs";
import { composeRun } from "./runtime/compose.mjs";
import { inspectVideo } from "./runtime/inspect.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const motionRoot = path.resolve(root, "../mixamo-character-motion-v1");
const args = parseArgs(process.argv.slice(3));
const command = process.argv[2];
const runIdPattern = /^[a-z0-9][a-z0-9-]{1,62}$/;

function parseArgs(values) {
  return Object.fromEntries(values.filter((value) => value.startsWith("--")).map((value) => {
    const [key, ...parts] = value.slice(2).split("=");
    return [key, parts.length ? parts.join("=") : true];
  }));
}

function execute(program, values, { capture = false, cwd = root } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, values, { cwd, stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    let output = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
    }
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(`${program} exited ${code}\n${output.slice(-8000)}`)));
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

async function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const file = path.join(root, filename);
    if (await exists(file)) process.loadEnvFile(file);
  }
}

async function probeDuration(file) {
  const result = JSON.parse(await execute("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "json", file,
  ], { capture: true }));
  return Number(result.format.duration);
}

function dialogueSpecs(input) {
  return [
    { id: "opening", characterId: input.characters[0].characterId, text: input.openingLine },
    ...input.characters.slice(1).map((character) => ({ id: `taunt-${character.characterId}`, characterId: character.characterId, text: character.taunt })),
    { id: "closing", characterId: input.characters.at(-1).characterId, text: input.closingLine },
  ];
}

async function generateDialogue(input, directory) {
  await loadLocalEnv();
  const apiKey = process.env.FISH_STUDIO_APIKEY || process.env.FISH_AUDIO_API_KEY || process.env.FISH_API_KEY;
  if (!apiKey) throw new Error("Missing FISH_STUDIO_APIKEY. Add it locally; never paste it into chat.");
  const catalog = await readJson(path.join(root, "assets/voice-presets.json"));
  const presets = new Map(catalog.voices.map((voice) => [voice.characterId, voice]));
  const resolved = dialogueSpecs(input).map((spec) => {
    const preset = presets.get(spec.characterId);
    if (!preset) throw new Error(`No Fish Audio preset for ${spec.characterId}.`);
    const referenceId = preset.referenceId || (spec.characterId === "squilliam" ? process.env.SQUILLIAM_VOICE_ID : null);
    if (!referenceId) throw new Error(`Missing ${catalog.privateReferenceEnvironmentVariable} for the approved private Squilliam clone.`);
    return { ...spec, referenceId, speed: preset.speed };
  });
  const dialogueDirectory = path.join(directory, "dialogue");
  await mkdir(dialogueDirectory, { recursive: true });
  const assets = [];

  for (const spec of resolved) {
    const output = path.join(dialogueDirectory, `${spec.id}.wav`);
    const raw = path.join(dialogueDirectory, `${spec.id}.source.wav`);
    const receiptPath = path.join(dialogueDirectory, `${spec.id}.receipt.json`);
    const contentHash = createHash("sha256").update(JSON.stringify({ text: spec.text, referenceId: spec.referenceId, speed: spec.speed, model: catalog.model })).digest("hex");
    let receipt = await exists(receiptPath) ? await readJson(receiptPath) : null;
    if (!receipt || receipt.contentHash !== contentHash || !(await exists(output))) {
      if (!args["approve-provider"]) throw new Error(`Fish Audio generation is required for ${spec.id}. Re-run render with --approve-provider after reviewing the script.`);
      const response = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", model: catalog.model },
        body: JSON.stringify({
          text: spec.text,
          reference_id: spec.referenceId,
          temperature: 0.35,
          top_p: 0.55,
          format: "wav",
          sample_rate: 44100,
          normalize: true,
          latency: "normal",
          chunk_length: 100,
          min_chunk_length: 0,
          max_new_tokens: 1024,
          repetition_penalty: 1.2,
          condition_on_previous_chunks: false,
          early_stop_threshold: 1,
          prosody: { speed: spec.speed, volume: 0, normalize_loudness: true },
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw new Error(`Fish Audio failed for ${spec.id} with ${response.status}: ${(await response.text()).slice(0, 240)}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length < 5_000) throw new Error(`Fish Audio returned an unexpectedly small ${spec.id} clip.`);
      await writeFile(raw, bytes);
      await execute("ffmpeg", [
        "-y", "-i", raw,
        "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse,apad=pad_dur=0.06",
        "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", output,
      ]);
      const durationSeconds = await probeDuration(output);
      receipt = {
        provider: catalog.provider,
        model: catalog.model,
        generatedAt: new Date().toISOString(),
        id: spec.id,
        characterId: spec.characterId,
        text: spec.text,
        contentHash,
        voiceReferenceFingerprint: createHash("sha256").update(spec.referenceId).digest("hex").slice(0, 12),
        durationSeconds,
        bytes: (await readFile(output)).length,
      };
      await writeJson(receiptPath, receipt);
    }
    assets.push({ id: spec.id, characterId: spec.characterId, text: spec.text, file: output, durationSeconds: await probeDuration(output), sha256: await sha256(output) });
  }
  await writeJson(path.join(dialogueDirectory, "manifest.json"), {
    provider: catalog.provider,
    model: catalog.model,
    generatedAt: new Date().toISOString(),
    assets: assets.map(({ file, ...asset }) => ({ ...asset, file: path.relative(directory, file) })),
  });
  return assets;
}

async function validateInput(inputPath, { receiptPath } = {}) {
  const input = await readJson(inputPath);
  const directory = path.dirname(inputPath);
  const errors = [];
  const allowed = new Set(["title", "songTitle", "songFile", "songExcerptStart", "openingLine", "closingLine", "characters"]);
  for (const field of Object.keys(input)) if (!allowed.has(field)) errors.push(`Unknown input field: ${field}`);
  for (const field of ["title", "songTitle", "songFile"]) if (typeof input[field] !== "string" || !input[field].trim()) errors.push(`${field} is required.`);
  for (const [field, maximum] of [["openingLine", 40], ["closingLine", 58]]) {
    if (typeof input[field] !== "string" || !input[field].trim() || input[field].length > maximum) errors.push(`${field} must be 1-${maximum} characters.`);
  }
  if (!Number.isFinite(input.songExcerptStart) || input.songExcerptStart < 0) errors.push("songExcerptStart must be non-negative.");
  if (!Array.isArray(input.characters) || input.characters.length !== 4) errors.push("Exactly four characters are required.");

  const [catalog, manifest] = await Promise.all([
    readJson(path.join(motionRoot, "assets/character-packs.json")),
    readJson(path.join(motionRoot, "assets/motions/manifest.json")),
  ]);
  const seen = new Set();
  for (const [index, character] of (input.characters || []).entries()) {
    if (seen.has(character.characterId)) errors.push(`Duplicate character: ${character.characterId}`);
    seen.add(character.characterId);
    if (!catalog.packs.some((candidate) => candidate.id === character.characterId && candidate.status === "motion-ready")) errors.push(`Character is not motion-ready: ${character.characterId}`);
    if (!manifest.motions.some((candidate) => candidate.id === character.motionId)) errors.push(`Unknown motion: ${character.motionId}`);
    if (!/^#[0-9a-fA-F]{6}$/.test(character.color || "")) errors.push(`Invalid color for ${character.characterId}`);
    if (typeof character.taunt !== "string" || character.taunt.length > 58 || (index > 0 && !character.taunt.trim())) errors.push(`Invalid taunt for ${character.characterId}`);
  }
  const songPath = path.join(directory, input.songFile || "");
  if (!(await exists(songPath))) errors.push(`Song file is missing: ${input.songFile}`);
  let songDuration = 0;
  if (await exists(songPath)) {
    const probe = JSON.parse(await execute("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", songPath], { capture: true }));
    songDuration = Number(probe.format.duration);
    if (input.songExcerptStart + 30 > songDuration + 0.01) errors.push("The selected excerpt extends beyond the song.");
  }
  if (errors.length) throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);
  const receipt = {
    status: "pass",
    validatedAt: new Date().toISOString(),
    inputSha256: await sha256(inputPath),
    songSha256: await sha256(songPath),
    songDurationSeconds: songDuration,
    songExcerptStart: input.songExcerptStart,
    renderer: "../mixamo-character-motion-v1/runtime/renderer/app.js",
  };
  if (receiptPath) await writeJson(receiptPath, receipt);
  return { input, receipt };
}

async function initialize() {
  if (!args.song) throw new Error("Pass --song=/absolute/path/to/song.mp3.");
  const source = path.resolve(args.song);
  if (!(await exists(source))) throw new Error(`Song not found: ${source}`);
  const directory = runDirectory(args.run);
  if (await exists(directory)) throw new Error(`Run already exists: ${args.run}`);
  await mkdir(directory, { recursive: true });
  const extension = path.extname(source).toLowerCase() || ".mp3";
  const songFile = `source${extension}`;
  const destination = path.join(directory, songFile);
  await copyFile(source, destination);
  const analysis = await analyzeAudio(destination);
  const input = await readJson(path.join(root, "fixtures/smoke/input.json"));
  input.songFile = songFile;
  input.songExcerptStart = analysis.suggestedExcerptStart;
  await writeJson(path.join(directory, "input.json"), input);
  await writeJson(path.join(directory, "analysis.json"), analysis);
  await writeJson(path.join(directory, "state.json"), { status: "initialized", attempts: 0, createdAt: new Date().toISOString() });
  console.log(JSON.stringify({ directory, analysis, input }, null, 2));
}

async function validateRun() {
  const directory = runDirectory(args.run);
  const result = await validateInput(path.join(directory, "input.json"), { receiptPath: path.join(directory, ".validation.json") });
  const state = await readJson(path.join(directory, "state.json"));
  await writeJson(path.join(directory, "state.json"), { ...state, status: "validated", validatedAt: new Date().toISOString() });
  console.log(JSON.stringify(result.receipt, null, 2));
}

async function renderRun() {
  const directory = runDirectory(args.run);
  const { input } = await validateInput(path.join(directory, "input.json"), { receiptPath: path.join(directory, ".validation.json") });
  const dialogueAssets = await generateDialogue(input, directory);
  const statePath = path.join(directory, "state.json");
  const state = await readJson(statePath);
  const maximumAttempts = (await readJson(path.join(root, "quality.json"))).automatic.maximumAttempts;
  if ((state.attempts || 0) >= maximumAttempts) throw new Error(`Run reached the ${maximumAttempts}-attempt limit.`);
  const attempts = (state.attempts || 0) + 1;
  await writeJson(statePath, { ...state, status: "rendering", attempts, renderStartedAt: new Date().toISOString() });
  await composeRun({ input, dialogueAssets, runDirectory: directory, outputPath: path.join(directory, "render.mp4") });
  await writeJson(statePath, { ...state, status: "rendered", attempts, renderedAt: new Date().toISOString() });
  console.log(path.join(directory, "render.mp4"));
}

async function inspectRun() {
  const directory = runDirectory(args.run);
  const report = await inspectVideo({
    videoPath: path.join(directory, "render.mp4"),
    runDirectory: directory,
    qualityContractPath: path.join(root, "quality.json"),
  });
  const state = await readJson(path.join(directory, "state.json"));
  await writeJson(path.join(directory, "state.json"), { ...state, status: report.status, inspectedAt: new Date().toISOString() });
  console.log(JSON.stringify(report, null, 2));
}

async function finalizeRun() {
  if (args["human-review"] !== "pass") throw new Error("Finalization requires --human-review=pass after a person watches the MP4.");
  const directory = runDirectory(args.run);
  const qualityPath = path.join(directory, "quality-report.json");
  const quality = await readJson(qualityPath);
  if (quality.status !== "automatic-pass-human-pending") throw new Error(`Automatic quality is not ready: ${quality.status}`);
  await copyFile(path.join(directory, "render.mp4"), path.join(directory, "final.mp4"));
  quality.status = "pass";
  quality.humanReview.status = "pass";
  quality.humanReview.approvedAt = new Date().toISOString();
  await writeJson(qualityPath, quality);
  const state = await readJson(path.join(directory, "state.json"));
  await writeJson(path.join(directory, "state.json"), { ...state, status: "finalized", finalizedAt: new Date().toISOString() });
  console.log(path.join(directory, "final.mp4"));
}

async function checkRepo() {
  for (const tool of ["node", "npm", "ffmpeg", "ffprobe"]) await execute(tool, tool === "node" || tool === "npm" ? ["--version"] : ["-version"], { capture: true });
  for (const file of ["format.json", "requirements.json", "input-contract.json", "composition-contract.json", "output-contract.json", "quality.json", "assets.json", "assets/voice-presets.json"]) await readJson(path.join(root, file));
  for (const file of ["runtime/compose.mjs", "runtime/timeline.mjs", "runtime/analyze-audio.mjs", "runtime/inspect.mjs", "../mixamo-character-motion-v1/runtime/renderer/app.js"]) await access(path.join(root, file));
  await execute("npm", ["test"]);
  console.log(JSON.stringify({ status: "pass", renderer: "mixamo-character-motion-v1/runtime/renderer/app.js" }, null, 2));
}

switch (command) {
  case "check": await checkRepo(); break;
  case "init": await initialize(); break;
  case "validate": await validateRun(); break;
  case "render": await renderRun(); break;
  case "inspect": await inspectRun(); break;
  case "finalize": await finalizeRun(); break;
  default: throw new Error("Use check, init, validate, render, inspect, or finalize.");
}
