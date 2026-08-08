#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAudio } from "./runtime/analyze-audio.mjs";
import { composeRun } from "./runtime/compose.mjs";
import { inspectVideo } from "./runtime/inspect.mjs";
import { writeEvaluation } from "./runtime/evaluate.mjs";
import { loadMotionCatalog } from "../mixamo-character-motion-v1/runtime/motion-catalog.mjs";

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
  const closingCharacterId = input.characters.at(-1).characterId;
  return [
    { id: "opening", timelineEventId: "opening", characterId: input.characters[0].characterId, text: input.openingLine },
    ...input.characters.slice(1).map((character) => ({ id: `taunt-${character.characterId}`, timelineEventId: `taunt-${character.characterId}`, characterId: character.characterId, text: character.taunt })),
    ...input.characters.map((character) => ({
      id: character.characterId === closingCharacterId ? "closing" : `closing-${character.characterId}`,
      timelineEventId: "closing",
      characterId: character.characterId,
      text: input.closingLine,
    })),
  ];
}

async function dialogueCacheStatus(input, directory) {
  const specs = dialogueSpecs(input);
  const dialogueDirectory = path.join(directory, "dialogue");
  const manifestPath = path.join(dialogueDirectory, "manifest.json");
  const manifest = await exists(manifestPath) ? await readJson(manifestPath) : { assets: [] };
  const entries = [];
  for (const spec of specs) {
    const asset = manifest.assets?.find((candidate) => candidate.id === spec.id);
    const file = asset?.file ? path.join(directory, asset.file) : null;
    const receiptPath = path.join(dialogueDirectory, `${spec.id}.receipt.json`);
    const receipt = await exists(receiptPath) ? await readJson(receiptPath) : null;
    const cached = Boolean(asset && file && await exists(file) && receipt
      && asset.characterId === spec.characterId && asset.text === spec.text
      && (asset.timelineEventId || asset.id) === spec.timelineEventId
      && receipt.characterId === spec.characterId && receipt.text === spec.text);
    entries.push({ spec, asset, file, cached });
  }
  return entries;
}

async function generateDialogue(input, directory) {
  const specs = dialogueSpecs(input);
  const dialogueDirectory = path.join(directory, "dialogue");
  const manifestPath = path.join(dialogueDirectory, "manifest.json");
  const cache = await dialogueCacheStatus(input, directory);
  if (cache.every((entry) => entry.cached)) return Promise.all(cache.map(async ({ spec, file }) => ({
    ...spec,
    file,
    durationSeconds: await probeDuration(file),
    sha256: await sha256(file),
  })));

  await loadLocalEnv();
  const apiKey = process.env.FISH_STUDIO_APIKEY || process.env.FISH_AUDIO_API_KEY || process.env.FISH_API_KEY;
  if (!apiKey) throw new Error("Missing FISH_STUDIO_APIKEY. Add it locally; never paste it into chat.");
  const catalog = await readJson(path.join(root, "assets/voice-presets.json"));
  const presets = new Map(catalog.voices.map((voice) => [voice.characterId, voice]));
  const resolved = specs.map((spec) => {
    const preset = presets.get(spec.characterId);
    if (!preset) throw new Error(`No Fish Audio preset for ${spec.characterId}.`);
    const referenceId = preset.referenceId || (spec.characterId === "squilliam" ? process.env.SQUILLIAM_VOICE_ID : null);
    return { ...spec, referenceId, speed: preset.speed };
  });
  await mkdir(dialogueDirectory, { recursive: true });
  const assets = [];

  for (const spec of resolved) {
    const output = path.join(dialogueDirectory, `${spec.id}.wav`);
    const raw = path.join(dialogueDirectory, `${spec.id}.source.wav`);
    const receiptPath = path.join(dialogueDirectory, `${spec.id}.receipt.json`);
    const contentHash = spec.referenceId
      ? createHash("sha256").update(JSON.stringify({ text: spec.text, referenceId: spec.referenceId, speed: spec.speed, model: catalog.model })).digest("hex")
      : null;
    let receipt = await exists(receiptPath) ? await readJson(receiptPath) : null;
    const cached = receipt && await exists(output)
      && receipt.characterId === spec.characterId && receipt.text === spec.text
      && (!contentHash || receipt.contentHash === contentHash);
    if (!cached) {
      if (!spec.referenceId) throw new Error(`Missing ${catalog.privateReferenceEnvironmentVariable} for uncached ${spec.id} audio.`);
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
    assets.push({ id: spec.id, timelineEventId: spec.timelineEventId, characterId: spec.characterId, text: spec.text, file: output, durationSeconds: await probeDuration(output), sha256: await sha256(output) });
  }
  await writeJson(manifestPath, {
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

  const [catalog, motionCatalog] = await Promise.all([
    readJson(path.join(motionRoot, "assets/character-packs.json")),
    loadMotionCatalog(),
  ]);
  const manifest = { motions: motionCatalog.motions };
  const seen = new Set();
  for (const [index, character] of (input.characters || []).entries()) {
    if (seen.has(character.characterId)) errors.push(`Duplicate character: ${character.characterId}`);
    seen.add(character.characterId);
    if (!catalog.packs.some((candidate) => candidate.id === character.characterId && candidate.status === "motion-ready")) errors.push(`Character is not motion-ready: ${character.characterId}`);
    if (!manifest.motions.some((candidate) => candidate.id === character.motionId)) errors.push(`Unknown motion: ${character.motionId}`);
    if (!manifest.motions.some((candidate) => candidate.id === character.reactionMotionId)) errors.push(`Unknown reaction motion: ${character.reactionMotionId}`);
    const finaleMotion = manifest.motions.find((candidate) => candidate.id === character.finaleMotionId);
    if (!finaleMotion) errors.push(`Unknown finale motion: ${character.finaleMotionId}`);
    else if (finaleMotion.durationSeconds < 9) errors.push(`Finale motion must cover nine uninterrupted seconds: ${character.finaleMotionId}`);
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
  const dialogueCache = await dialogueCacheStatus(input, directory);
  const receipt = {
    status: "pass",
    validatedAt: new Date().toISOString(),
    inputSha256: await sha256(inputPath),
    songSha256: await sha256(songPath),
    songDurationSeconds: songDuration,
    songExcerptStart: input.songExcerptStart,
    renderer: "../mixamo-character-motion-v1/runtime/renderer/app.js",
    motionSelections: input.characters.map(({ characterId, motionId, finaleMotionId, reactionMotionId }) => ({
      characterId,
      solo: motionId,
      finale: finaleMotionId,
      reaction: reactionMotionId,
    })),
    providerPlan: {
      mixamoApiCalls: 0,
      fishAudioCallsRequired: dialogueCache.filter((entry) => !entry.cached).length,
      fishAudioApprovalRequired: dialogueCache.some((entry) => !entry.cached),
      localInputs: [input.songFile],
    },
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
  const evaluation = await writeEvaluation({
    runDirectory: directory,
    qualityReport: quality,
    contract: await readJson(path.join(root, "quality.json")),
  });
  const finalPath = path.join(directory, "final.mp4");
  const delivery = {
    schemaVersion: 1,
    status: "ready",
    deliveredAt: new Date().toISOString(),
    format: "bikini-bottom-dance-off-v1",
    runId: args.run,
    finalVideo: { path: "final.mp4", sha256: await sha256(finalPath) },
    eval: {
      grade: evaluation.overall.grade,
      score: evaluation.overall.score,
      status: evaluation.overall.status,
      machineReadable: "eval-report.json",
      friendly: "eval-report.md",
    },
    evidence: ["contact-sheet.png", "quality-report.json", "render-report.json", ".validation.json"],
  };
  await writeJson(path.join(directory, "delivery.json"), delivery);
  const state = await readJson(path.join(directory, "state.json"));
  await writeJson(path.join(directory, "state.json"), { ...state, status: "finalized", finalizedAt: new Date().toISOString() });
  console.log(JSON.stringify({
    status: "ready",
    video: finalPath,
    evalReport: path.join(directory, "eval-report.md"),
    delivery: path.join(directory, "delivery.json"),
    grade: evaluation.overall.grade,
    score: evaluation.overall.score,
  }, null, 2));
}

async function checkRepo() {
  for (const tool of ["node", "npm", "ffmpeg", "ffprobe"]) await execute(tool, tool === "node" || tool === "npm" ? ["--version"] : ["-version"], { capture: true });
  for (const file of ["format.json", "requirements.json", "input-contract.json", "composition-contract.json", "output-contract.json", "quality.json", "assets.json", "content-boundary.json", "assets/voice-presets.json"]) await readJson(path.join(root, file));
  for (const file of ["runtime/compose.mjs", "runtime/timeline.mjs", "runtime/analyze-audio.mjs", "runtime/inspect.mjs", "../mixamo-character-motion-v1/runtime/renderer/app.js"]) await access(path.join(root, file));
  await execute("npm", ["test"]);
  await execute("npm", ["test"], { cwd: motionRoot });
  console.log(JSON.stringify({ status: "pass", renderer: "mixamo-character-motion-v1/runtime/renderer/app.js" }, null, 2));
}

async function listMotions() {
  const catalog = await loadMotionCatalog();
  console.log(JSON.stringify({
    source: "local-normalized-catalog",
    mixamoApiCalls: 0,
    starterCount: catalog.starter.motions.length,
    userCount: catalog.user.motions.length,
    motions: catalog.motions.map(({ id, label, durationSeconds, library }) => ({
      id,
      label,
      durationSeconds,
      library,
      soloEligible: true,
      finaleEligible: durationSeconds >= 9,
    })),
  }, null, 2));
}

async function importMotion() {
  for (const required of ["source", "id", "label"]) if (!args[required]) throw new Error(`Missing --${required}`);
  await execute("node", [
    path.join(motionRoot, "runner.mjs"),
    "import-motion",
    `--source=${path.resolve(args.source)}`,
    `--id=${args.id}`,
    `--label=${args.label}`,
  ], { cwd: motionRoot });
}

async function generateSmokeTone(file, durationSeconds, frequency) {
  await execute("ffmpeg", [
    "-y", "-v", "error", "-f", "lavfi", "-i", `sine=frequency=${frequency}:sample_rate=48000:duration=${durationSeconds}`,
    "-ar", "48000", "-ac", "1", file,
  ]);
}

async function smoke() {
  const directory = path.join(root, "agent-runs", "_smoke");
  const dialogueDirectory = path.join(directory, "dialogue");
  await mkdir(dialogueDirectory, { recursive: true });
  const input = await readJson(path.join(root, "fixtures/alternate/input.json"));
  input.songFile = "source.wav";
  await writeJson(path.join(directory, "input.json"), input);
  await generateSmokeTone(path.join(directory, input.songFile), 60, 220);

  const specs = dialogueSpecs(input);
  const assets = [];
  for (const [index, spec] of specs.entries()) {
    const durationSeconds = spec.timelineEventId === "closing" ? 2.2 : 0.9 + index * 0.18;
    const file = path.join(dialogueDirectory, `${spec.id}.wav`);
    await generateSmokeTone(file, durationSeconds, 330 + index * 55);
    await writeJson(path.join(dialogueDirectory, `${spec.id}.receipt.json`), {
      provider: "synthetic-smoke",
      characterId: spec.characterId,
      text: spec.text,
    });
    assets.push({
      ...spec,
      file,
      durationSeconds: await probeDuration(file),
      sha256: await sha256(file),
    });
  }
  await writeJson(path.join(dialogueDirectory, "manifest.json"), {
    provider: "synthetic-smoke",
    assets: assets.map(({ file, ...asset }) => ({ ...asset, file: path.relative(directory, file) })),
  });
  await validateInput(path.join(directory, "input.json"), { receiptPath: path.join(directory, ".validation.json") });
  await composeRun({ input, dialogueAssets: assets, runDirectory: directory, outputPath: path.join(directory, "smoke.mp4") });
  const report = await inspectVideo({
    videoPath: path.join(directory, "smoke.mp4"),
    runDirectory: directory,
    qualityContractPath: path.join(root, "quality.json"),
  });
  console.log(JSON.stringify({ status: report.status, video: path.join(directory, "smoke.mp4") }, null, 2));
}

switch (command) {
  case "check": await checkRepo(); break;
  case "smoke": await smoke(); break;
  case "init": await initialize(); break;
  case "validate": await validateRun(); break;
  case "render": await renderRun(); break;
  case "inspect": await inspectRun(); break;
  case "finalize": await finalizeRun(); break;
  case "list-motions": await listMotions(); break;
  case "import-motion": await importMotion(); break;
  default: throw new Error("Use check, init, validate, render, inspect, finalize, list-motions, or import-motion.");
}
