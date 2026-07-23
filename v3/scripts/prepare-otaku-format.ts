import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PNG } from "pngjs";
import { generateFishClip, probeDurationMs, sceneDurationFromAudioMs } from "./otaku-media";
import type { OtakuScene } from "../public/format-repositories/otaku-explainer-v1/renderer/OtakuFormatRenderer";
import {
  materializeScenePlan,
  type OtakuLayoutManifest,
  type OtakuScenePlan,
  type OtakuWorldPack,
} from "../features/experiments/otaku-format/agentRunner";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "otaku-explainer-v1");
const outputRoot = path.join(packageRoot, "outputs");
const sourceReference = "/Users/shaz/Downloads/aidnfenri__DY4un70q8I7.mp4";
const sourceMusic = "/Users/shaz/Downloads/videoplayback (4).mp4";

type AssetManifest = {
  characters: Array<{ id: string; label: string; localPath: string; sourceUrl: string; postprocess?: "remove-white-and-trim" | "remove-checkerboard-and-trim" }>;
  backgrounds: Array<{ id: string; label: string; localPath: string; sourceUrl: string; postprocess?: "remove-white-and-trim" | "remove-checkerboard-and-trim" }>;
};

type AudioManifest = {
  provider: string;
  model: string;
  dialogue: { speed: number };
  music: { localPath: string; volume: number };
};

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
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

async function removeBrightBorderBackground(sourcePath: string, outputPath: string) {
  const image = PNG.sync.read(await readFile(sourcePath));
  const visited = new Uint8Array(image.width * image.height);
  const queue: number[] = [];
  const isBackground = (offset: number) => {
    const red = image.data[offset];
    const green = image.data[offset + 1];
    const blue = image.data[offset + 2];
    return image.data[offset + 3] < 16 || (Math.min(red, green, blue) >= 220 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 14);
  };
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
    const index = (y * image.width) + x;
    if (visited[index] || !isBackground(index * 4)) return;
    visited[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < image.width; x += 1) {
    add(x, 0);
    add(x, image.height - 1);
  }
  for (let y = 0; y < image.height; y += 1) {
    add(0, y);
    add(image.width - 1, y);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    image.data[(index * 4) + 3] = 0;
    add(x - 1, y);
    add(x + 1, y);
    add(x, y - 1);
    add(x, y + 1);
  }
  const mattePath = `${outputPath}.matte.png`;
  await writeFile(mattePath, PNG.sync.write(image));
  await trimTransparentPng(mattePath, outputPath);
  await rm(mattePath, { force: true });
}

async function downloadAsset(asset: { id: string; label: string; localPath: string; sourceUrl: string; postprocess?: "remove-white-and-trim" | "remove-checkerboard-and-trim" }) {
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
  if (asset.postprocess === "remove-checkerboard-and-trim") {
    await removeBrightBorderBackground(sourceTarget, target);
    return;
  }
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

async function prepareRun({
  audio,
  runId,
}: {
  audio: AudioManifest;
  runId: string;
}) {
  const fishApiKey = process.env.FISH_STUDIO_APIKEY;
  if (!fishApiKey) throw new Error("FISH_STUDIO_APIKEY is required.");
  const sourcePath = path.join(packageRoot, "scenes", `${runId}.json`);
  const source = JSON.parse(await readFile(sourcePath, "utf8")) as OtakuScenePlan;
  const world = JSON.parse(await readFile(path.join(packageRoot, "worlds", `${source.input.storyWorld}.json`), "utf8")) as OtakuWorldPack;
  const layouts = JSON.parse(await readFile(path.join(packageRoot, "layouts.json"), "utf8")) as OtakuLayoutManifest;
  const scenes = materializeScenePlan(source, world, layouts);
  const voices = Object.fromEntries(Object.values(world.roles).map((role) => [role.character, role.voice]));
  const outputId = runId;
  const voiceDirectory = path.join(packageRoot, "assets", "audio", outputId);
  const filledScenes: OtakuScene[] = [];

  for (const [index, scene] of scenes.entries()) {
    const voiceId = voices[scene.speaker];
    if (!voiceId) throw new Error(`No Fish Audio voice is configured for ${scene.speaker}.`);
    const audioFile = `${scene.id}.wav`;
    const audioTarget = path.join(voiceDirectory, audioFile);
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
      durationMs: sceneDurationFromAudioMs(audioDurationMs),
    });
  }

  const runRecord = {
    id: outputId,
    title: source.title,
    createdAt: new Date().toISOString(),
    input: { ...source.input, cast: Object.values(world.roles).map((role) => role.character) },
    instructions: "README.md",
    scriptPrompt: "prompts/script-system.md",
    imagePrompt: "prompts/image-search.md",
    audioPrompt: "prompts/audio.md",
    assetsManifest: "assets.json",
    sceneContract: "scene-contract.json",
    renderer: "renderer/OtakuFormatRenderer.tsx",
    rendererVersion: "otaku-format-renderer@1.1.0-experiment",
    provider: "fish-audio",
    model: audio.model,
    voiceAssignments: Object.fromEntries(Object.values(world.roles).map((role) => [role.character, role.voice])),
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
  const envPath = path.join(v3Root, ".env.local");
  if (await fileExists(envPath)) process.loadEnvFile(envPath);
  const assets = JSON.parse(await readFile(path.join(packageRoot, "assets.json"), "utf8")) as AssetManifest;
  const audio = JSON.parse(await readFile(path.join(packageRoot, "audio.json"), "utf8")) as AudioManifest;
  await prepareFixedAssets(assets, audio);

  const runArgument = process.argv.find((argument) => argument.startsWith("--run="));
  const runId = runArgument?.split("=")[1] || "naruto-compilers";
  await prepareRun({ audio, runId });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
