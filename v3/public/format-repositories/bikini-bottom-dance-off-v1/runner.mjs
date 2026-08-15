#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAudio } from "./runtime/analyze-audio.mjs";
import { resolveOuterBackground } from "./runtime/backgrounds.mjs";
import {
  CHOREOGRAPHY_ALGORITHM_VERSION,
  choreographySelectionSignature,
  createChoreographySeed,
  selectChoreography,
} from "./runtime/choreography.mjs";
import { composeRun } from "./runtime/compose.mjs";
import { inspectVideo } from "./runtime/inspect.mjs";
import { writeEvaluation } from "./runtime/evaluate.mjs";
import { compareBlindReviews, needsSecondReview, validateBlindReview, writeReviewPacket } from "./runtime/review.mjs";
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

async function loadMotionExclusions() {
  const exclusionPath = path.join(root, "assets/motion-exclusions.json");
  const config = await readJson(exclusionPath);
  if (config.schemaVersion !== 1 || !Array.isArray(config.exclusions)) {
    throw new Error("assets/motion-exclusions.json must use schemaVersion 1 with an exclusions array.");
  }
  const validRoles = new Set(["solo", "finale", "reaction"]);
  for (const exclusion of config.exclusions) {
    if (!exclusion.characterId || !exclusion.motionId || !exclusion.reason || !exclusion.evidencePath) {
      throw new Error("Every motion exclusion requires characterId, motionId, reason, and evidencePath.");
    }
    if (!Array.isArray(exclusion.roles) || !exclusion.roles.length || exclusion.roles.some((role) => !validRoles.has(role))) {
      throw new Error(`Motion exclusion ${exclusion.characterId}/${exclusion.motionId} has invalid roles.`);
    }
    if (!(await exists(path.resolve(root, exclusion.evidencePath)))) {
      throw new Error(`Motion exclusion evidence is missing: ${exclusion.evidencePath}`);
    }
  }
  return { config, exclusionPath };
}

async function recentChoreographyRuns(currentRunId) {
  const runsRoot = path.join(root, "agent-runs");
  if (!(await exists(runsRoot))) return [];
  const receipts = [];
  for (const entry of await readdir(runsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === currentRunId || entry.name.startsWith("_")) continue;
    const receiptPath = path.join(runsRoot, entry.name, "choreography-receipt.json");
    if (!(await exists(receiptPath))) continue;
    try {
      const receipt = await readJson(receiptPath);
      if (receipt.algorithmVersion === CHOREOGRAPHY_ALGORITHM_VERSION && Array.isArray(receipt.selections)) {
        receipts.push(receipt);
      }
    } catch {
      // A broken old receipt is ignored rather than making a new local run unusable.
    }
  }
  return receipts.sort((left, right) => (
    Date.parse(right.selectedAt || 0) - Date.parse(left.selectedAt || 0)
  ));
}

async function applyChoreography({ directory, runId, explicitSeed, recentRuns }) {
  const inputPath = path.join(directory, "input.json");
  const [input, format, catalog, exclusionResult] = await Promise.all([
    readJson(inputPath),
    readJson(path.join(root, "format.json")),
    loadMotionCatalog(),
    loadMotionExclusions(),
  ]);
  if (!Array.isArray(input.characters) || input.characters.length !== 4) {
    throw new Error("Set exactly four characters in input.json before running choreograph.");
  }
  const songPath = path.join(directory, input.songFile || "");
  if (!(await exists(songPath))) throw new Error(`Song file is missing: ${input.songFile}`);
  const songSha256 = await sha256(songPath);
  const seed = createChoreographySeed({
    formatVersion: format.version,
    runId,
    songSha256,
    characterIds: input.characters.map((character) => character.characterId),
    explicitSeed,
  });
  const history = recentRuns ?? await recentChoreographyRuns(runId);
  const choreography = selectChoreography({
    characters: input.characters,
    motions: catalog.motions,
    exclusions: exclusionResult.config.exclusions,
    recentRuns: history,
    seedUint32: seed.seedUint32,
  });
  const selectionByCharacter = new Map(choreography.selections.map((selection) => [selection.characterId, selection]));
  input.characters = input.characters.map((character) => {
    const selection = selectionByCharacter.get(character.characterId);
    return {
      ...character,
      motionId: selection.solo,
      finaleMotionId: selection.finale,
      reactionMotionId: selection.reaction,
    };
  });
  await writeJson(inputPath, input);
  const receipt = {
    schemaVersion: 1,
    algorithmVersion: choreography.algorithmVersion,
    selectedAt: new Date().toISOString(),
    runId,
    seed,
    songSha256,
    exclusionConfigSha256: await sha256(exclusionResult.exclusionPath),
    starterMotionCount: catalog.starter.motions.length,
    totalMotionCount: catalog.motions.length,
    finaleEligibleCount: catalog.motions.filter((motion) => motion.durationSeconds >= 9).length,
    cooldownRunIds: choreography.cooldownRunIds,
    relaxations: choreography.relaxations,
    selections: choreography.selections,
    selectionSignature: choreographySelectionSignature(choreography.selections),
  };
  await writeJson(path.join(directory, "choreography-receipt.json"), receipt);
  const statePath = path.join(directory, "state.json");
  if (await exists(statePath)) {
    const state = await readJson(statePath);
    await writeJson(statePath, { ...state, status: "choreographed", choreographedAt: receipt.selectedAt });
  }
  return { input, receipt };
}

async function verifyChoreographyReceipt(input, directory, songPath, errors) {
  const receiptPath = path.join(directory, "choreography-receipt.json");
  if (!(await exists(receiptPath))) {
    errors.push("Missing choreography-receipt.json. Run choreograph after choosing the four-character roster.");
    return null;
  }
  let receipt;
  try {
    receipt = await readJson(receiptPath);
  } catch {
    errors.push("choreography-receipt.json is not valid JSON. Run choreograph again.");
    return null;
  }
  const selections = input.characters.map((character) => ({
    characterId: character.characterId,
    solo: character.motionId,
    finale: character.finaleMotionId,
    reaction: character.reactionMotionId,
  }));
  if (receipt.algorithmVersion !== CHOREOGRAPHY_ALGORITHM_VERSION) {
    errors.push("The choreography receipt uses an old algorithm. Run choreograph again.");
  }
  if (receipt.selectionSignature !== choreographySelectionSignature(selections)) {
    errors.push("The roster or motion assignments changed after choreography selection. Run choreograph again.");
  }
  if (await exists(songPath) && receipt.songSha256 !== await sha256(songPath)) {
    errors.push("The song changed after choreography selection. Run choreograph again.");
  }
  const exclusionPath = path.join(root, "assets/motion-exclusions.json");
  if (receipt.exclusionConfigSha256 !== await sha256(exclusionPath)) {
    errors.push("The evidence-backed motion exclusions changed. Run choreograph again.");
  }
  return receipt;
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

function resolveVoicePreset(catalog, characterId) {
  const preset = catalog.voices.find((voice) => voice.characterId === characterId);
  if (!preset) throw new Error(`No Fish Audio preset for ${characterId}.`);
  const operatorReferenceId = preset.operatorReferenceEnvironmentVariable
    ? process.env[preset.operatorReferenceEnvironmentVariable]?.trim()
    : "";
  if (operatorReferenceId && !/^[0-9a-f]{32}$/.test(operatorReferenceId)) {
    throw new Error(
      `${preset.operatorReferenceEnvironmentVariable} must contain a Fish Audio model ID.`,
    );
  }
  return {
    referenceId: operatorReferenceId || preset.referenceId,
    speed: preset.speed,
    model: preset.model || catalog.model,
    referenceSource: operatorReferenceId
      ? "operator-private-override"
      : "packaged-public-reference",
    operatorReferenceEnvironmentVariable:
      preset.operatorReferenceEnvironmentVariable || null,
  };
}

function voiceContentHash(spec) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        text: spec.text,
        referenceId: spec.referenceId,
        speed: spec.speed,
        model: spec.model,
      }),
    )
    .digest("hex");
}

async function dialogueCacheStatus(input, directory, voiceCatalog) {
  const specs = dialogueSpecs(input);
  const catalog = voiceCatalog || await readJson(path.join(root, "assets/voice-presets.json"));
  const dialogueDirectory = path.join(directory, "dialogue");
  const manifestPath = path.join(dialogueDirectory, "manifest.json");
  const manifest = await exists(manifestPath) ? await readJson(manifestPath) : { assets: [] };
  const entries = [];
  for (const spec of specs) {
    const voice = resolveVoicePreset(catalog, spec.characterId);
    const contentHash = voiceContentHash({ ...spec, ...voice });
    const asset = manifest.assets?.find((candidate) => candidate.id === spec.id);
    const file = asset?.file ? path.join(directory, asset.file) : null;
    const receiptPath = path.join(dialogueDirectory, `${spec.id}.receipt.json`);
    const receipt = await exists(receiptPath) ? await readJson(receiptPath) : null;
    const cached = Boolean(asset && file && await exists(file) && receipt
      && asset.characterId === spec.characterId && asset.text === spec.text
      && (asset.timelineEventId || asset.id) === spec.timelineEventId
      && receipt.characterId === spec.characterId && receipt.text === spec.text
      && receipt.contentHash === contentHash);
    entries.push({ spec, voice, asset, file, cached });
  }
  return entries;
}

async function generateDialogue(input, directory) {
  const specs = dialogueSpecs(input);
  const dialogueDirectory = path.join(directory, "dialogue");
  const manifestPath = path.join(dialogueDirectory, "manifest.json");
  const catalog = await readJson(path.join(root, "assets/voice-presets.json"));
  const cache = await dialogueCacheStatus(input, directory, catalog);
  if (cache.every((entry) => entry.cached)) return Promise.all(cache.map(async ({ spec, file }) => ({
    ...spec,
    file,
    durationSeconds: await probeDuration(file),
    sha256: await sha256(file),
  })));

  const apiKey = process.env.FISH_STUDIO_APIKEY || process.env.FISH_AUDIO_API_KEY || process.env.FISH_API_KEY;
  if (!apiKey) throw new Error("Missing FISH_STUDIO_APIKEY. Export it locally; never paste it into chat or add an env file to the kit.");
  const resolved = specs.map((spec) => {
    const voice = resolveVoicePreset(catalog, spec.characterId);
    return { ...spec, ...voice };
  });
  await mkdir(dialogueDirectory, { recursive: true });
  const assets = [];

  for (const spec of resolved) {
    const output = path.join(dialogueDirectory, `${spec.id}.wav`);
    const raw = path.join(dialogueDirectory, `${spec.id}.source.wav`);
    const receiptPath = path.join(dialogueDirectory, `${spec.id}.receipt.json`);
    const contentHash = spec.referenceId ? voiceContentHash(spec) : null;
    let receipt = await exists(receiptPath) ? await readJson(receiptPath) : null;
    const cached = receipt && await exists(output)
      && receipt.characterId === spec.characterId && receipt.text === spec.text
      && (!contentHash || receipt.contentHash === contentHash);
    if (!cached) {
      if (!spec.referenceId) throw new Error(`Missing packaged Fish Audio reference for ${spec.characterId}.`);
      if (!args["approve-provider"]) throw new Error(`Fish Audio generation is required for ${spec.id}. Re-run render with --approve-provider after reviewing the script.`);
      const response = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", model: spec.model },
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
        model: spec.model,
        generatedAt: new Date().toISOString(),
        id: spec.id,
        characterId: spec.characterId,
        text: spec.text,
        contentHash,
        voiceReferenceFingerprint: createHash("sha256").update(spec.referenceId).digest("hex").slice(0, 12),
        referenceSource: spec.referenceSource,
        operatorReferenceEnvironmentVariable: spec.operatorReferenceEnvironmentVariable,
        durationSeconds,
        bytes: (await readFile(output)).length,
      };
      await writeJson(receiptPath, receipt);
    }
    assets.push({ id: spec.id, timelineEventId: spec.timelineEventId, characterId: spec.characterId, text: spec.text, model: spec.model, referenceSource: spec.referenceSource, file: output, durationSeconds: await probeDuration(output), sha256: await sha256(output) });
  }
  await writeJson(manifestPath, {
    provider: catalog.provider,
    models: [...new Set(assets.map((asset) => asset.model))],
    generatedAt: new Date().toISOString(),
    assets: assets.map(({ file, ...asset }) => ({ ...asset, file: path.relative(directory, file) })),
  });
  return assets;
}

async function validateInput(inputPath, { receiptPath, requireChoreographyReceipt = false } = {}) {
  const input = await readJson(inputPath);
  const directory = path.dirname(inputPath);
  const errors = [];
  const allowed = new Set(["title", "songTitle", "songFile", "songExcerptStart", "outerBackground", "openingLine", "closingLine", "characters"]);
  for (const field of Object.keys(input)) if (!allowed.has(field)) errors.push(`Unknown input field: ${field}`);
  for (const field of ["title", "songTitle", "songFile"]) if (typeof input[field] !== "string" || !input[field].trim()) errors.push(`${field} is required.`);
  for (const [field, maximum] of [["openingLine", 40], ["closingLine", 58]]) {
    if (typeof input[field] !== "string" || !input[field].trim() || input[field].length > maximum) errors.push(`${field} must be 1-${maximum} characters.`);
  }
  if (!Number.isFinite(input.songExcerptStart) || input.songExcerptStart < 0) errors.push("songExcerptStart must be non-negative.");
  if (!Array.isArray(input.characters) || input.characters.length !== 4) errors.push("Exactly four characters are required.");

  const [catalog, motionCatalog, exclusionResult] = await Promise.all([
    readJson(path.join(motionRoot, "assets/character-packs.json")),
    loadMotionCatalog(),
    loadMotionExclusions(),
  ]);
  let outerBackground = null;
  try {
    outerBackground = await resolveOuterBackground(input.outerBackground);
    input.outerBackground = outerBackground.id;
    if (!(await exists(outerBackground.file))) errors.push(`Outer background is missing: ${outerBackground.path}`);
    else if (await sha256(outerBackground.file) !== outerBackground.sha256) errors.push(`Outer background checksum mismatch: ${outerBackground.path}`);
  } catch (error) {
    errors.push(error.message);
  }
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
    for (const [role, motionId] of [["solo", character.motionId], ["finale", character.finaleMotionId], ["reaction", character.reactionMotionId]]) {
      if (exclusionResult.config.exclusions.some((exclusion) => (
        exclusion.characterId === character.characterId
        && exclusion.motionId === motionId
        && exclusion.roles.includes(role)
      ))) errors.push(`Evidence-backed exclusion blocks ${character.characterId}/${motionId} as ${role}.`);
    }
  }
  const selectedMotionIds = (input.characters || []).flatMap((character) => [
    character.motionId,
    character.finaleMotionId,
    character.reactionMotionId,
  ]);
  if (new Set(selectedMotionIds).size !== selectedMotionIds.length) {
    errors.push("All twelve solo, finale, and reaction assignments must be distinct within one video.");
  }
  const songPath = path.join(directory, input.songFile || "");
  if (!(await exists(songPath))) errors.push(`Song file is missing: ${input.songFile}`);
  let songDuration = 0;
  if (await exists(songPath)) {
    const probe = JSON.parse(await execute("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", songPath], { capture: true }));
    songDuration = Number(probe.format.duration);
    if (input.songExcerptStart + 30 > songDuration + 0.01) errors.push("The selected excerpt extends beyond the song.");
  }
  const choreographyReceipt = requireChoreographyReceipt
    ? await verifyChoreographyReceipt(input, directory, songPath, errors)
    : null;
  if (errors.length) throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);
  const dialogueCache = await dialogueCacheStatus(input, directory);
  const receipt = {
    status: "pass",
    validatedAt: new Date().toISOString(),
    inputSha256: await sha256(inputPath),
    songSha256: await sha256(songPath),
    songDurationSeconds: songDuration,
    songExcerptStart: input.songExcerptStart,
    outerBackground: outerBackground && { id: outerBackground.id, label: outerBackground.label, path: outerBackground.path },
    renderer: "../mixamo-character-motion-v1/runtime/renderer/app.js",
    motionSelections: input.characters.map(({ characterId, motionId, finaleMotionId, reactionMotionId }) => ({
      characterId,
      solo: motionId,
      finale: finaleMotionId,
      reaction: reactionMotionId,
    })),
    choreography: choreographyReceipt && {
      algorithmVersion: choreographyReceipt.algorithmVersion,
      seedSha256: choreographyReceipt.seed.seedSha256,
      cooldownRunIds: choreographyReceipt.cooldownRunIds,
      relaxations: choreographyReceipt.relaxations,
      receipt: "choreography-receipt.json",
    },
    providerPlan: {
      mixamoApiCalls: 0,
      fishAudioCallsRequired: dialogueCache.filter((entry) => !entry.cached).length,
      fishAudioApprovalRequired: dialogueCache.some((entry) => !entry.cached),
      localInputs: [input.songFile],
      fixedAssets: outerBackground ? [outerBackground.path] : [],
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
  const choreography = await applyChoreography({ directory, runId: args.run, explicitSeed: args.seed });
  console.log(JSON.stringify({ directory, analysis, input: choreography.input, choreography: choreography.receipt }, null, 2));
}

async function choreographRun() {
  const directory = runDirectory(args.run);
  const result = await applyChoreography({ directory, runId: args.run, explicitSeed: args.seed });
  console.log(JSON.stringify(result.receipt, null, 2));
}

async function validateRun() {
  const directory = runDirectory(args.run);
  const result = await validateInput(path.join(directory, "input.json"), {
    receiptPath: path.join(directory, ".validation.json"),
    requireChoreographyReceipt: true,
  });
  const state = await readJson(path.join(directory, "state.json"));
  await writeJson(path.join(directory, "state.json"), { ...state, status: "validated", validatedAt: new Date().toISOString() });
  console.log(JSON.stringify(result.receipt, null, 2));
}

async function renderRun() {
  const directory = runDirectory(args.run);
  const { input } = await validateInput(path.join(directory, "input.json"), {
    receiptPath: path.join(directory, ".validation.json"),
    requireChoreographyReceipt: true,
  });
  const dialogueAssets = await generateDialogue(input, directory);
  const statePath = path.join(directory, "state.json");
  const state = await readJson(statePath);
  const maximumAttempts = (await readJson(path.join(root, "quality.json"))).automatic.maximumAttempts;
  const completedAttempts = state.attempts || 0;
  if (completedAttempts >= maximumAttempts) throw new Error(`Run reached the ${maximumAttempts}-attempt limit.`);
  const attempts = completedAttempts + 1;
  await writeJson(statePath, { ...state, status: "rendering", attempts: completedAttempts, renderStartedAt: new Date().toISOString() });
  try {
    await composeRun({ input, dialogueAssets, runDirectory: directory, outputPath: path.join(directory, "render.mp4") });
  } catch (error) {
    await writeJson(statePath, {
      ...state,
      status: "render-failed",
      attempts: completedAttempts,
      renderFailedAt: new Date().toISOString(),
      renderFailure: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  await writeJson(statePath, { ...state, status: "rendered", attempts, renderedAt: new Date().toISOString() });
  console.log(path.join(directory, "render.mp4"));
}

async function inspectRun() {
  const directory = runDirectory(args.run);
  const [input, contract, format] = await Promise.all([
    readJson(path.join(directory, "input.json")),
    readJson(path.join(root, "quality.json")),
    readJson(path.join(root, "format.json")),
  ]);
  const videoPath = path.join(directory, "render.mp4");
  const report = await inspectVideo({
    videoPath,
    runDirectory: directory,
    qualityContractPath: path.join(root, "quality.json"),
  });
  const reviewPacket = await writeReviewPacket({
    runDirectory: directory,
    runId: args.run,
    videoPath,
    input,
    contract,
    formatVersion: format.version,
  });
  const state = await readJson(path.join(directory, "state.json"));
  await writeJson(path.join(directory, "state.json"), { ...state, status: report.status, inspectedAt: new Date().toISOString() });
  console.log(JSON.stringify({ ...report, reviewPacket: contract.blindReview.reviewPacketFile, packetId: reviewPacket.packetId }, null, 2));
}

async function finalizeRun() {
  if (!args.review || args.review === true) throw new Error("Finalization requires --review=/absolute/path/to/blind-review.json from an independent reviewer.");
  const directory = runDirectory(args.run);
  const qualityPath = path.join(directory, "quality-report.json");
  const quality = await readJson(qualityPath);
  if (quality.status !== "technical-pass-blind-review-pending") throw new Error(`Technical quality is not ready: ${quality.status}`);
  const [contract, packet, submission] = await Promise.all([
    readJson(path.join(root, "quality.json")),
    readJson(path.join(directory, "review-packet.json")),
    readJson(path.resolve(String(args.review))),
  ]);
  const renderPath = path.join(directory, "render.mp4");
  if (await sha256(renderPath) !== packet.video.sha256) throw new Error("The rendered MP4 changed after the blind review packet was created. Run inspect again.");
  const primaryReview = validateBlindReview({ submission, packet, contract });
  let blindReview = primaryReview;
  let reviewComparison = null;
  let secondarySubmission = null;
  let secondaryReview = null;
  if (needsSecondReview(primaryReview, contract)) {
    if (!args["second-review"] || args["second-review"] === true) {
      throw new Error("This passing score is inside the escalation band. Run finalize again with --second-review=/absolute/path/to/an-independent-review.json.");
    }
    secondarySubmission = await readJson(path.resolve(String(args["second-review"])));
    secondaryReview = validateBlindReview({ submission: secondarySubmission, packet, contract });
    reviewComparison = compareBlindReviews(primaryReview, secondaryReview, contract);
    if (reviewComparison.status !== "agreement" || secondaryReview.status !== "pass") {
      await writeJson(path.join(directory, "blind-review.submission.json"), submission);
      await writeJson(path.join(directory, "blind-review.secondary.submission.json"), secondarySubmission);
      await writeJson(path.join(directory, "blind-review.primary.json"), primaryReview);
      await writeJson(path.join(directory, "blind-review.secondary.json"), secondaryReview);
      await writeJson(path.join(directory, "blind-review-comparison.json"), reviewComparison);
      throw new Error("Independent reviews disagree. Delivery is blocked until a blind adjudicator resolves the recorded criterion disagreements.");
    }
    blindReview = primaryReview.score <= secondaryReview.score ? primaryReview : secondaryReview;
  }
  await writeJson(path.join(directory, "blind-review.submission.json"), submission);
  if (secondarySubmission) await writeJson(path.join(directory, "blind-review.secondary.submission.json"), secondarySubmission);
  if (secondaryReview) await writeJson(path.join(directory, "blind-review.secondary.json"), secondaryReview);
  if (reviewComparison) await writeJson(path.join(directory, "blind-review-comparison.json"), reviewComparison);
  await writeJson(path.join(directory, contract.blindReview.reviewFile), blindReview);
  quality.status = blindReview.status === "pass" ? "pass" : `blind-review-${blindReview.status}`;
  quality.blindReview = {
    status: blindReview.status,
    reviewedAt: blindReview.reviewedAt,
    reviewer: blindReview.reviewer,
    score: blindReview.score,
    reviewCount: secondaryReview ? 2 : 1,
    comparison: reviewComparison?.status ?? null,
  };
  await writeJson(qualityPath, quality);
  const evaluation = await writeEvaluation({
    runDirectory: directory,
    qualityReport: quality,
    contract,
    blindReview,
  });
  if (evaluation.overall.status !== "pass") {
    const state = await readJson(path.join(directory, "state.json"));
    await writeJson(path.join(directory, "state.json"), { ...state, status: `blind-review-${blindReview.status}`, reviewedAt: blindReview.reviewedAt });
    const reason = blindReview.status === "inconclusive"
      ? `${evaluation.reviewIssues.length} review limitation(s); replace the reviewer or playback environment`
      : `${evaluation.overall.score}/100 with ${evaluation.criticalFailures.length} critical failure(s)`;
    throw new Error(`Blind review blocked delivery: ${reason}. Read eval-report.md.`);
  }
  await copyFile(renderPath, path.join(directory, "final.mp4"));
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
    evidence: [
      "contact-sheet.png", "quality-report.json", "render-report.json", "choreography-receipt.json", ".validation.json", "review-packet.json",
      "blind-review.submission.json", "blind-review.json",
      ...(secondaryReview ? ["blind-review.secondary.submission.json", "blind-review.secondary.json", "blind-review-comparison.json"] : []),
    ],
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
  for (const file of ["format.json", "requirements.json", "input-contract.json", "composition-contract.json", "output-contract.json", "quality.json", "assets.json", "content-boundary.json", "assets/motion-exclusions.json", "assets/voice-presets.json", "assets/voice-previews/manifest.json"]) await readJson(path.join(root, file));
  await loadMotionExclusions();
  for (const file of ["runtime/choreography.mjs", "runtime/compose.mjs", "runtime/timeline.mjs", "runtime/analyze-audio.mjs", "runtime/inspect.mjs", "runtime/review.mjs", "prompts/blind-review.md", "../mixamo-character-motion-v1/runtime/renderer/app.js"]) await access(path.join(root, file));
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
  const choreography = await applyChoreography({
    directory,
    runId: "_smoke",
    explicitSeed: "packaged-smoke",
    recentRuns: [],
  });
  Object.assign(input, choreography.input);

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
  await validateInput(path.join(directory, "input.json"), {
    receiptPath: path.join(directory, ".validation.json"),
    requireChoreographyReceipt: true,
  });
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
  case "choreograph": await choreographRun(); break;
  case "validate": await validateRun(); break;
  case "render": await renderRun(); break;
  case "inspect": await inspectRun(); break;
  case "finalize": await finalizeRun(); break;
  case "list-motions": await listMotions(); break;
  case "import-motion": await importMotion(); break;
  default: throw new Error("Use check, init, choreograph, validate, render, inspect, finalize, list-motions, or import-motion.");
}
