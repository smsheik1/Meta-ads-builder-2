import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import type { OtakuScene } from "../public/format-repositories/otaku-explainer-v1/renderer/OtakuFormatRenderer";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "otaku-explainer-v1");
const outputRoot = path.join(packageRoot, "outputs");
const sourceReference = "/Users/shaz/Downloads/aidnfenri__DY4un70q8I7.mp4";
const sourceMusic = "/Users/shaz/Downloads/videoplayback (4).mp4";
const fishUrl = "https://api.fish.audio/v1/tts";
const fishModel = "s2.1-pro-free";

type AssetManifest = {
  characters: Array<{ id: string; label: string; localPath: string; sourceUrl: string; postprocess?: "remove-white-and-trim" }>;
  backgrounds: Array<{ id: string; label: string; localPath: string; sourceUrl: string; postprocess?: "remove-white-and-trim" }>;
};

type AudioManifest = {
  provider: string;
  model: string;
  voices: Record<string, string>;
  dialogue: { speed: number };
  music: { localPath: string; volume: number };
};

type SceneSource = {
  id: string;
  title: string;
  input: { topic: string; storyWorld: string; cast: string[] };
  scenes: OtakuScene[];
};

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadEnvFile(filePath: string) {
  if (!await fileExists(filePath)) return;
  const contents = await readFile(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;
    const [, key, rawValue] = match;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} failed: ${stderr.slice(-1200)}`)));
  });
}

async function probeDurationMs(filePath: string) {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe failed: ${stderr.trim()}`));
      resolve(Math.round(Number(stdout.trim()) * 1000));
    });
  });
}

async function downloadTo({ label, sourceUrl, target }: { label: string; sourceUrl: string; target: string }) {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) WigglyFormatLab/1.0",
      "Accept": "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Could not download ${label}: ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error(`${label} returned ${contentType || "unknown content"}, not an image.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 8_000) throw new Error(`${label} image was unexpectedly small.`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  console.log(`Downloaded ${label} (${Math.round(bytes.length / 1024)} KB).`);
}

async function trimTransparentPng(sourcePath: string, outputPath: string) {
  const source = PNG.sync.read(await readFile(sourcePath));
  let minX = source.width;
  let minY = source.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (source.data[((y * source.width + x) * 4) + 3] < 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error(`No visible pixels remained in ${sourcePath}.`);
  const padding = 8;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(source.width - 1, maxX + padding);
  maxY = Math.min(source.height - 1, maxY + padding);
  const output = new PNG({ width: maxX - minX + 1, height: maxY - minY + 1 });
  PNG.bitblt(source, output, minX, minY, output.width, output.height, 0, 0);
  await writeFile(outputPath, PNG.sync.write(output));
}

async function downloadAsset(asset: { id: string; label: string; localPath: string; sourceUrl: string; postprocess?: "remove-white-and-trim" }) {
  const target = path.join(packageRoot, asset.localPath);
  if (await fileExists(target)) return;
  if (!asset.postprocess) {
    await downloadTo({ label: asset.label, sourceUrl: asset.sourceUrl, target });
    return;
  }

  const sourceTarget = path.join(packageRoot, "assets", "source", `${asset.id}.png`);
  const matteTarget = path.join(packageRoot, "assets", "source", `${asset.id}-matte.png`);
  if (!await fileExists(sourceTarget)) {
    await downloadTo({ label: `${asset.label} source`, sourceUrl: asset.sourceUrl, target: sourceTarget });
  }
  await mkdir(path.dirname(target), { recursive: true });
  await runCommand("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", sourceTarget,
    "-vf", "colorkey=0xFFFFFF:0.16:0.06,format=rgba",
    matteTarget,
  ]);
  await trimTransparentPng(matteTarget, target);
  await rm(matteTarget, { force: true });
}

async function prepareFixedAssets(assets: AssetManifest, audio: AudioManifest) {
  await mkdir(path.join(packageRoot, "assets", "reference"), { recursive: true });
  await mkdir(path.join(packageRoot, "assets", "audio"), { recursive: true });
  await mkdir(outputRoot, { recursive: true });

  const referenceTarget = path.join(packageRoot, "assets", "reference", "reference.mp4");
  if (!await fileExists(referenceTarget)) await copyFile(sourceReference, referenceTarget);

  const musicTarget = path.join(packageRoot, audio.music.localPath);
  if (!await fileExists(musicTarget)) {
    await runCommand("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", sourceMusic,
      "-vn", "-ac", "2", "-ar", "44100",
      "-codec:a", "libmp3lame", "-q:a", "5",
      musicTarget,
    ]);
  }

  for (const asset of [...assets.characters, ...assets.backgrounds]) {
    await downloadAsset(asset);
  }
}

async function generateFishClip({
  apiKey,
  outputPath,
  speed,
  text,
  voiceId,
}: {
  apiKey: string;
  outputPath: string;
  speed: number;
  text: string;
  voiceId: string;
}) {
  if (await fileExists(outputPath)) return;
  const response = await fetch(fishUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "model": fishModel,
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      temperature: 0.35,
      top_p: 0.55,
      format: "wav",
      sample_rate: 44_100,
      normalize: true,
      latency: "normal",
      chunk_length: 100,
      max_new_tokens: 1024,
      repetition_penalty: 1.2,
      condition_on_previous_chunks: false,
      prosody: { speed, volume: 0, normalize_loudness: true },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Fish Audio failed with ${response.status}: ${body.slice(0, 300)}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 10_000) throw new Error("Fish Audio returned an unexpectedly small clip.");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
}

async function prepareRun({
  audio,
  limit,
  runId,
}: {
  audio: AudioManifest;
  limit?: number;
  runId: string;
}) {
  const fishApiKey = process.env.FISH_STUDIO_APIKEY;
  if (!fishApiKey) throw new Error("FISH_STUDIO_APIKEY is required.");
  const sourcePath = path.join(packageRoot, "scenes", `${runId}.json`);
  const source = JSON.parse(await readFile(sourcePath, "utf8")) as SceneSource;
  const scenes = limit ? source.scenes.slice(0, limit) : source.scenes;
  const outputId = limit ? `${runId}-slice` : runId;
  const voiceDirectory = path.join(packageRoot, "assets", "audio", outputId);
  const filledScenes: OtakuScene[] = [];

  for (const [index, scene] of scenes.entries()) {
    const voiceId = audio.voices[scene.speaker];
    if (!voiceId) throw new Error(`No Fish Audio voice is configured for ${scene.speaker}.`);
    const audioFile = `${scene.id}.wav`;
    const audioTarget = path.join(voiceDirectory, audioFile);
    const sliceAudio = path.join(packageRoot, "assets", "audio", `${runId}-slice`, audioFile);
    if (!limit && !await fileExists(audioTarget) && await fileExists(sliceAudio)) {
      await mkdir(voiceDirectory, { recursive: true });
      await copyFile(sliceAudio, audioTarget);
    }
    console.log(`[${index + 1}/${scenes.length}] ${scene.speaker}: ${scene.dialogue}`);
    await generateFishClip({
      apiKey: fishApiKey,
      outputPath: audioTarget,
      speed: audio.dialogue.speed,
      text: scene.dialogue,
      voiceId,
    });
    const audioDurationMs = await probeDurationMs(audioTarget);
    filledScenes.push({
      ...scene,
      audioPath: `format-repositories/otaku-explainer-v1/assets/audio/${outputId}/${audioFile}`,
      durationMs: Math.max(2_400, audioDurationMs + 520),
    });
  }

  const runRecord = {
    id: outputId,
    title: source.title,
    createdAt: new Date().toISOString(),
    input: source.input,
    instructions: "README.md",
    scriptPrompt: "prompts/script-system.md",
    imagePrompt: "prompts/image-search.md",
    audioPrompt: "prompts/audio.md",
    assetsManifest: "assets.json",
    sceneContract: "scene-contract.json",
    renderer: "renderer/OtakuFormatRenderer.tsx",
    rendererVersion: "otaku-format-renderer@1.0.0-experiment",
    provider: "fish-audio",
    model: audio.model,
    voiceAssignments: Object.fromEntries(source.input.cast.map((character) => [character, audio.voices[character]])),
    musicPath: `format-repositories/otaku-explainer-v1/${audio.music.localPath}`,
    musicVolume: audio.music.volume,
    scenes: filledScenes,
    qualityChecks: "quality.json",
    output: `format-repositories/otaku-explainer-v1/outputs/${outputId}.mp4`,
    spend: {
      serperQueries: 12,
      fishCharacters: filledScenes.reduce((sum, scene) => sum + scene.dialogue.length, 0),
      estimatedUsd: 0,
      note: "Serper used the existing account. Fish used the free s2.1-pro-free developer model.",
    },
  };
  await writeFile(path.join(outputRoot, `${outputId}.run.json`), `${JSON.stringify(runRecord, null, 2)}\n`);
  console.log(`Prepared ${outputId} with ${filledScenes.length} scenes.`);
}

async function main() {
  await loadEnvFile(path.join(v3Root, ".env.local"));
  const assets = JSON.parse(await readFile(path.join(packageRoot, "assets.json"), "utf8")) as AssetManifest;
  const audio = JSON.parse(await readFile(path.join(packageRoot, "audio.json"), "utf8")) as AudioManifest;
  await prepareFixedAssets(assets, audio);

  const runArgument = process.argv.find((argument) => argument.startsWith("--run="));
  const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));
  const runId = runArgument?.split("=")[1] || "naruto-compilers";
  const limit = limitArgument ? Number(limitArgument.split("=")[1]) : undefined;
  await prepareRun({ audio, limit, runId });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
