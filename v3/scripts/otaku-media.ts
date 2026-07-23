import { spawn } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const fishUrl = "https://api.fish.audio/v1/tts";
const fishModel = "s2.1-pro-free";

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve()
      : reject(new Error(`${command} failed: ${stderr.slice(-1_200)}`)));
  });
}

export async function probeDurationMs(filePath: string) {
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
      resolve(Math.round(Number(stdout.trim()) * 1_000));
    });
  });
}

export function sceneDurationFromAudioMs(audioDurationMs: number) {
  if (!Number.isFinite(audioDurationMs) || audioDurationMs <= 0) {
    throw new Error("Voice duration must be a positive number.");
  }
  return Math.round(audioDurationMs);
}

export async function generateFishClip({
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
      max_new_tokens: 1_024,
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

export async function prepareMusicBed({
  outputPath,
  sourcePath,
  targetDurationMs,
}: {
  outputPath: string;
  sourcePath: string;
  targetDurationMs: number;
}) {
  const sourceDurationMs = await probeDurationMs(sourcePath);
  const targetSeconds = targetDurationMs / 1_000;
  await mkdir(path.dirname(outputPath), { recursive: true });

  if (sourceDurationMs >= targetDurationMs) {
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", sourcePath,
      "-t", targetSeconds.toFixed(3),
      "-codec:a", "libmp3lame", "-q:a", "4",
      outputPath,
    ]);
    return;
  }

  const crossfadeSeconds = Math.min(1, Math.max(0.1, (sourceDurationMs / 1_000) / 4));
  const usefulSecondsPerCopy = (sourceDurationMs / 1_000) - crossfadeSeconds;
  const copies = Math.max(2, Math.ceil((targetSeconds - crossfadeSeconds) / usefulSecondsPerCopy));
  const inputs = Array.from({ length: copies }, () => ["-i", sourcePath]).flat();
  const filters: string[] = [];
  let previous = "0:a";
  for (let index = 1; index < copies; index += 1) {
    const output = `mix${index}`;
    filters.push(`[${previous}][${index}:a]acrossfade=d=${crossfadeSeconds}:c1=tri:c2=tri[${output}]`);
    previous = output;
  }
  filters.push(`[${previous}]atrim=0:${targetSeconds.toFixed(3)},asetpts=N/SR/TB[out]`);
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[out]",
    "-codec:a", "libmp3lame", "-q:a", "4",
    outputPath,
  ]);
}
