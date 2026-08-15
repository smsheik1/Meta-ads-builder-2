import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const v3Root = path.resolve(scriptRoot, "..");
const workspaceRoot = path.resolve(v3Root, "..");
const repoRoot = path.join(
  v3Root,
  "public/format-repositories/bikini-bottom-dance-off-v1",
);
const motionRepoRoot = path.join(
  v3Root,
  "public/format-repositories/mixamo-character-motion-v1",
);
const manifestPath = path.join(
  repoRoot,
  "assets/voice-previews/manifest.json",
);
const presetPath = path.join(repoRoot, "assets/voice-presets.json");
const characterPath = path.join(
  motionRepoRoot,
  "assets/character-packs.json",
);
const approved = process.argv.includes("--approve-provider");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const sha256 = async (file) =>
  createHash("sha256").update(await readFile(file)).digest("hex");

const fileExists = async (file) =>
  stat(file).then(
    () => true,
    () => false,
  );
const fileMatchesHash = async (file, expectedHash) =>
  Boolean(expectedHash) &&
  (await fileExists(file)) &&
  (await sha256(file)) === expectedHash;

function fishContentHash(preview, preset, referenceId, model) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        text: preview.line,
        referenceId,
        speed: preset.speed,
        model,
      }),
    )
    .digest("hex");
}

async function readNamedEnvironmentValue(file, name) {
  const configured = process.env[name]?.trim();
  if (configured) return configured;
  if (!(await fileExists(file))) return "";

  const lines = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  const prefix = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`);
  for await (const line of lines) {
    if (!prefix.test(line)) continue;
    let value = line.slice(line.indexOf("=") + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    lines.close();
    return value.trim();
  }
  return "";
}

function execute(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${program} exited ${code}\n${output.slice(-4000)}`));
    });
  });
}

async function probeDuration(file) {
  const output = await execute("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const duration = Number(output.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid audio duration for ${file}`);
  }
  return Number(duration.toFixed(3));
}

function writePcmWav(samples, sampleRate) {
  const dataBytes = samples.length * 2;
  const bytes = Buffer.alloc(44 + dataBytes);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + dataBytes, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => {
    bytes.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, sample)) * 32767),
      44 + index * 2,
    );
  });
  return bytes;
}

async function createAgentPCue(output) {
  const sampleRate = 44_100;
  const durationSeconds = 1.85;
  const samples = new Float32Array(
    Math.round(sampleRate * durationSeconds),
  );
  let noiseState = 0x12345678;
  const nextNoise = () => {
    noiseState = (1664525 * noiseState + 1013904223) >>> 0;
    return noiseState / 0xffffffff - 0.5;
  };

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    let sample = 0;

    if (time < 0.68) {
      const envelope = Math.sin(Math.PI * (time / 0.68));
      const gate = Math.floor(time * 23) % 2 === 0 ? 1 : 0.22;
      const frequency = 185 + 54 * Math.sin(2 * Math.PI * 11 * time);
      sample =
        envelope *
        gate *
        (0.38 * Math.sin(2 * Math.PI * frequency * time) +
          0.16 * Math.sin(2 * Math.PI * frequency * 2.2 * time) +
          0.08 * nextNoise());
    } else if (time >= 0.82 && time < 1.72) {
      const stingTime = time - 0.82;
      const noteIndex = Math.min(3, Math.floor(stingTime / 0.225));
      const noteTime = stingTime - noteIndex * 0.225;
      const frequencies = [330, 415.3, 523.25, 783.99];
      const envelope = Math.sin(Math.PI * Math.min(1, noteTime / 0.225));
      const frequency = frequencies[noteIndex];
      sample =
        envelope *
        (0.3 * Math.sin(2 * Math.PI * frequency * noteTime) +
          0.1 * Math.sin(2 * Math.PI * frequency * 2 * noteTime));
    }

    samples[index] = sample;
  }

  const temporary = `${output}.wav`;
  await writeFile(temporary, writePcmWav(samples, sampleRate));
  await execute("ffmpeg", [
    "-y",
    "-i",
    temporary,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    output,
  ]);
  await rm(temporary, { force: true });
}

async function generateFishPreview({
  apiKey,
  model,
  output,
  referenceId,
  speed,
  text,
  temporaryDirectory,
}) {
  const response = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify({
      text,
      reference_id: referenceId,
      temperature: 0.35,
      top_p: 0.55,
      format: "wav",
      sample_rate: 44_100,
      normalize: true,
      latency: "normal",
      chunk_length: 100,
      min_chunk_length: 0,
      max_new_tokens: 1_024,
      repetition_penalty: 1.2,
      condition_on_previous_chunks: false,
      early_stop_threshold: 1,
      prosody: { speed, volume: 0, normalize_loudness: true },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Fish Audio failed with ${response.status}: ${body.slice(0, 300)}`,
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 5_000) {
    throw new Error("Fish Audio returned an unexpectedly small clip.");
  }
  const source = path.join(temporaryDirectory, `${path.basename(output)}.wav`);
  await writeFile(source, bytes);
  await execute("ffmpeg", [
    "-y",
    "-i",
    source,
    "-af",
    "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB,areverse,apad=pad_dur=0.08",
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "128k",
    output,
  ]);
}

const [manifest, presets, characters] = await Promise.all([
  readJson(manifestPath),
  readJson(presetPath),
  readJson(characterPath),
]);
const motionReadyIds = characters.packs
  .filter((character) => character.status === "motion-ready")
  .map((character) => character.id);
const previewIds = manifest.previews.map((preview) => preview.characterId);
if (
  new Set(previewIds).size !== previewIds.length ||
  JSON.stringify(previewIds.slice().sort()) !==
    JSON.stringify(motionReadyIds.slice().sort())
) {
  throw new Error(
    "Voice preview manifest must cover every motion-ready character exactly once.",
  );
}
const presetByCharacter = new Map(
  presets.voices.map((preset) => [preset.characterId, preset]),
);
const operatorReferences = new Map();
for (const preset of presets.voices) {
  if (!preset.operatorReferenceEnvironmentVariable) continue;
  const referenceId = await readNamedEnvironmentValue(
    path.join(workspaceRoot, "secrets.env"),
    preset.operatorReferenceEnvironmentVariable,
  );
  if (referenceId) {
    if (!/^[0-9a-f]{32}$/.test(referenceId)) {
      throw new Error(
        `${preset.operatorReferenceEnvironmentVariable} must contain a Fish Audio model ID.`,
      );
    }
    operatorReferences.set(preset.operatorReferenceEnvironmentVariable, referenceId);
  }
}
const resolveVoice = (preset) => {
  const operatorReferenceId = preset.operatorReferenceEnvironmentVariable
    ? operatorReferences.get(preset.operatorReferenceEnvironmentVariable)
    : null;
  return {
    referenceId: operatorReferenceId || preset.referenceId,
    model: preset.model || presets.model,
    referenceSource: operatorReferenceId
      ? "operator-private-override"
      : "packaged-public-reference",
  };
};
for (const preview of manifest.previews) {
  if (!preview.line?.trim()) {
    throw new Error(`Missing preview line for ${preview.characterId}.`);
  }
  if (preview.status === "ready" && !preview.path) {
    throw new Error(`Missing preview path for ${preview.characterId}.`);
  }
  if (preview.kind === "fish-tts" && preview.status === "ready") {
    if (!presetByCharacter.has(preview.characterId)) {
      throw new Error(`Missing approved Fish preset for ${preview.characterId}.`);
    }
  }
}

const staleFishPreviews = [];
for (const preview of manifest.previews) {
  if (preview.kind !== "fish-tts" || preview.status !== "ready") continue;
  const preset = presetByCharacter.get(preview.characterId);
  const voice = resolveVoice(preset);
  const output = path.join(repoRoot, preview.path);
  if (
    preview.contentHash !==
      fishContentHash(preview, preset, voice.referenceId, voice.model) ||
    !(await fileMatchesHash(output, preview.sha256))
  ) {
    staleFishPreviews.push(preview);
  }
}
if (staleFishPreviews.length > 0 && !approved) {
  throw new Error(
    `Fish Audio generation is required for ${staleFishPreviews.length} previews. Re-run with --approve-provider after reviewing the lines.`,
  );
}

let apiKey;
if (staleFishPreviews.length > 0) {
  apiKey = await readNamedEnvironmentValue(
    path.join(workspaceRoot, "secrets.env"),
    "FISH_STUDIO_APIKEY",
  );
  if (!apiKey) {
    throw new Error(
      "FISH_STUDIO_APIKEY is missing from the canonical repo-root secrets.env.",
    );
  }
}

const temporaryDirectory = await mkdtemp(
  path.join(tmpdir(), "wiggly-dance-off-voice-previews-"),
);
let generatedSomething = false;
try {
  for (const [index, preview] of manifest.previews.entries()) {
    if (preview.status !== "ready") continue;
    const output = path.join(repoRoot, preview.path);
    await mkdir(path.dirname(output), { recursive: true });

    if (preview.kind === "fish-tts") {
      const preset = presetByCharacter.get(preview.characterId);
      const voice = resolveVoice(preset);
      const contentHash = fishContentHash(
        preview,
        preset,
        voice.referenceId,
        voice.model,
      );
      if (staleFishPreviews.includes(preview)) {
        console.log(
          `[${index + 1}/${manifest.previews.length}] Generating ${preview.characterId}`,
        );
        await generateFishPreview({
          apiKey,
          model: voice.model,
          output,
          referenceId: voice.referenceId,
          speed: preset.speed,
          text: preview.line,
          temporaryDirectory,
        });
        generatedSomething = true;
        preview.contentHash = contentHash;
        preview.voiceReferenceFingerprint = createHash("sha256")
          .update(voice.referenceId)
          .digest("hex")
          .slice(0, 12);
        preview.referenceSource = voice.referenceSource;
        preview.model = voice.model;
      }
    } else if (preview.kind === "original-nonverbal-cue") {
      const contentHash = createHash("sha256")
        .update("agent-p-original-nonverbal-cue-v1")
        .digest("hex");
      if (
        preview.contentHash !== contentHash ||
        !(await fileMatchesHash(output, preview.sha256))
      ) {
        console.log(
          `[${index + 1}/${manifest.previews.length}] Synthesizing ${preview.characterId}`,
        );
        await createAgentPCue(output);
        generatedSomething = true;
        preview.contentHash = contentHash;
        preview.source = "Original deterministic local synthesis; no character voice clone.";
      }
    }

    preview.durationSeconds = await probeDuration(output);
    preview.bytes = (await stat(output)).size;
    preview.sha256 = await sha256(output);
    if (preview.durationSeconds < 0.5 || preview.durationSeconds > 8) {
      throw new Error(
        `${preview.characterId} preview duration ${preview.durationSeconds}s is outside 0.5–8s.`,
      );
    }
  }

  if (generatedSomething) manifest.generatedAt = new Date().toISOString();
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Wrote ${manifest.previews.filter((preview) => preview.status === "ready").length} ready previews; ${manifest.previews.filter((preview) => preview.status !== "ready").length} remain voice-pending.`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
