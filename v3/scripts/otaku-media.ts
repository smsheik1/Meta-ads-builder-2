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

async function captureStderr(command: string, args: string[]) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stderr)
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

export type AudioSignalReport = {
  durationMs: number;
  leadingSilenceMs: number;
  trailingSilenceMs: number;
  meanVolumeDb: number;
  maxVolumeDb: number;
  tailPeakDb: number;
  peakCount: number;
  sampleCount: number;
};

export const audioDoesNotClip = (report: AudioSignalReport) => (
  report.maxVolumeDb < -0.1 || (report.peakCount / report.sampleCount) < 0.001
);

export function evaluateVoiceSignal(report: AudioSignalReport) {
  return {
    audible: report.meanVolumeDb >= -35 && report.maxVolumeDb >= -25,
    edgesAreClean: report.leadingSilenceMs <= 250 && report.trailingSilenceMs <= 250,
    endingIsNotAbrupt: report.tailPeakDb <= -12,
    doesNotClip: audioDoesNotClip(report),
  };
}

export function musicDialogueMarginDb(
  voiceReports: AudioSignalReport[],
  musicReport: AudioSignalReport,
  musicVolume: number,
) {
  if (!voiceReports.length || musicVolume <= 0) return Number.NEGATIVE_INFINITY;
  const averageVoiceDb = voiceReports.reduce((total, report) => total + report.meanVolumeDb, 0) / voiceReports.length;
  const audibleMusicDb = musicReport.meanVolumeDb + (20 * Math.log10(musicVolume));
  return averageVoiceDb - audibleMusicDb;
}

const metric = (output: string, name: "mean_volume" | "max_volume") => {
  const match = output.match(new RegExp(`${name}: (-?(?:\\d+(?:\\.\\d+)?|inf)) dB`));
  if (!match) throw new Error(`FFmpeg did not report ${name}.`);
  return match[1] === "-inf" ? Number.NEGATIVE_INFINITY : Number(match[1]);
};

const lastMetric = (output: string, name: "Peak count" | "Number of samples") => {
  const matches = [...output.matchAll(new RegExp(`${name}: ([0-9.]+)`, "g"))];
  if (!matches.length) throw new Error(`FFmpeg did not report ${name}.`);
  return Number(matches.at(-1)![1]);
};

export async function analyzeAudioSignal(filePath: string): Promise<AudioSignalReport> {
  const durationMs = await probeDurationMs(filePath);
  const stderr = await captureStderr("ffmpeg", [
    "-hide_banner", "-nostats",
    "-i", filePath,
    "-af", "silencedetect=noise=-45dB:d=0.12,volumedetect,astats=metadata=1:reset=0",
    "-f", "null", "-",
  ]);

  const silenceRanges: Array<{ startMs: number; endMs: number }> = [];
  let openSilenceMs: number | undefined;
  for (const match of stderr.matchAll(/silence_(start|end): ([0-9.]+)/g)) {
    const positionMs = Number(match[2]) * 1_000;
    if (match[1] === "start") openSilenceMs = positionMs;
    else if (openSilenceMs !== undefined) {
      silenceRanges.push({ startMs: openSilenceMs, endMs: positionMs });
      openSilenceMs = undefined;
    }
  }
  if (openSilenceMs !== undefined) silenceRanges.push({ startMs: openSilenceMs, endMs: durationMs });

  const firstSilence = silenceRanges[0];
  const lastSilence = silenceRanges.at(-1);
  const leadingSilenceMs = firstSilence && firstSilence.startMs <= 20 ? firstSilence.endMs : 0;
  const trailingSilenceMs = lastSilence && lastSilence.endMs >= durationMs - 50
    ? Math.max(0, durationMs - lastSilence.startMs)
    : 0;
  const tailSeconds = Math.min(0.08, durationMs / 1_000);
  const tailStartSeconds = Math.max(0, (durationMs / 1_000) - tailSeconds);
  const tailStderr = await captureStderr("ffmpeg", [
    "-hide_banner", "-nostats",
    "-ss", tailStartSeconds.toFixed(3),
    "-i", filePath,
    "-t", tailSeconds.toFixed(3),
    "-af", "volumedetect",
    "-f", "null", "-",
  ]);

  return {
    durationMs,
    leadingSilenceMs: Math.round(leadingSilenceMs),
    trailingSilenceMs: Math.round(trailingSilenceMs),
    meanVolumeDb: metric(stderr, "mean_volume"),
    maxVolumeDb: metric(stderr, "max_volume"),
    tailPeakDb: metric(tailStderr, "max_volume"),
    peakCount: lastMetric(stderr, "Peak count"),
    sampleCount: lastMetric(stderr, "Number of samples"),
  };
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
