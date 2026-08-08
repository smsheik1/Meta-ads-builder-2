import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

function execute(program, args, { binary = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${program} exited ${code}\n${stderr.slice(-8000)}`));
      else resolve(binary ? Buffer.concat(stdout) : Buffer.concat(stdout).toString("utf8"));
    });
  });
}

function mean(values, start, end) {
  let total = 0;
  let count = 0;
  for (let index = Math.max(0, start); index < Math.min(values.length, end); index += 1) {
    total += values[index];
    count += 1;
  }
  return count ? total / count : 0;
}

export async function analyzeAudio(file, excerptSeconds = 30) {
  const sampleRate = 11_025;
  const hop = 512;
  const frameRate = sampleRate / hop;
  const [probeText, pcm, bytes] = await Promise.all([
    execute("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", file]),
    execute("ffmpeg", ["-v", "error", "-i", file, "-map", "0:a:0", "-ac", "1", "-ar", String(sampleRate), "-f", "s16le", "pipe:1"], { binary: true }),
    readFile(file),
  ]);
  const durationSeconds = Number(JSON.parse(probeText).format.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds < excerptSeconds) {
    throw new Error(`Song must be at least ${excerptSeconds} seconds.`);
  }

  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
  const energy = [];
  for (let offset = 0; offset + hop <= samples.length; offset += hop) {
    let squared = 0;
    for (let index = offset; index < offset + hop; index += 1) {
      const sample = samples[index] / 32_768;
      squared += sample * sample;
    }
    energy.push(Math.sqrt(squared / hop));
  }

  const novelty = energy.map((value, index) => {
    const local = mean(energy, index - 11, index + 12);
    const previous = index ? energy[index - 1] : value;
    return Math.max(0, value - previous) * (local > 1e-6 ? value / local : 0);
  });
  const maximumNovelty = Math.max(...novelty, 1e-9);
  const normalizedNovelty = novelty.map((value) => value / maximumNovelty);

  let tempo = { bpm: 0, score: -Infinity };
  for (let bpm = 70; bpm <= 180; bpm += 1) {
    const lag = Math.round(frameRate * 60 / bpm);
    let score = 0;
    for (let index = lag; index < normalizedNovelty.length; index += 1) {
      score += normalizedNovelty[index] * normalizedNovelty[index - lag];
    }
    if (score > tempo.score) tempo = { bpm, score };
  }

  const excerptFrames = Math.round(excerptSeconds * frameRate);
  const earliestFrame = Math.round(5 * frameRate);
  const latestFrame = Math.max(earliestFrame, normalizedNovelty.length - excerptFrames - 1);
  let best = { frame: earliestFrame, score: -Infinity };
  for (let frame = earliestFrame; frame <= latestFrame; frame += Math.round(frameRate / 2)) {
    const windowEnergy = mean(energy, frame, frame + excerptFrames);
    const windowNovelty = mean(normalizedNovelty, frame, frame + excerptFrames);
    const score = windowEnergy * 0.7 + windowNovelty * 0.3;
    if (score > best.score) best = { frame, score };
  }

  const intendedFirstSoloFrame = best.frame + Math.round(5 * frameRate);
  let nearestBeatFrame = intendedFirstSoloFrame;
  let nearestBeatScore = -Infinity;
  const searchRadius = Math.round(1.5 * frameRate);
  for (let frame = intendedFirstSoloFrame - searchRadius; frame <= intendedFirstSoloFrame + searchRadius; frame += 1) {
    if (frame <= 0 || frame >= normalizedNovelty.length - 1) continue;
    const localPeak = normalizedNovelty[frame] >= normalizedNovelty[frame - 1]
      && normalizedNovelty[frame] >= normalizedNovelty[frame + 1];
    if (localPeak && normalizedNovelty[frame] > nearestBeatScore) {
      nearestBeatFrame = frame;
      nearestBeatScore = normalizedNovelty[frame];
    }
  }
  const suggestedStart = Math.max(0, nearestBeatFrame / frameRate - 5);
  const excerptPeakTimes = [];
  const startFrame = Math.round(suggestedStart * frameRate);
  const endFrame = Math.min(normalizedNovelty.length - 1, startFrame + excerptFrames);
  for (let frame = startFrame + 1; frame < endFrame - 1; frame += 1) {
    if (normalizedNovelty[frame] > 0.22
      && normalizedNovelty[frame] >= normalizedNovelty[frame - 1]
      && normalizedNovelty[frame] >= normalizedNovelty[frame + 1]) {
      excerptPeakTimes.push(Number((frame / frameRate - suggestedStart).toFixed(3)));
    }
  }

  return {
    schemaVersion: 1,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    durationSeconds,
    analysisSampleRate: sampleRate,
    estimatedBpm: tempo.bpm,
    suggestedExcerptStart: Number(suggestedStart.toFixed(3)),
    firstSoloSongTime: Number((suggestedStart + 5).toFixed(3)),
    excerptPeakTimes: excerptPeakTimes.slice(0, 80),
    method: "mono RMS onset envelope, tempo autocorrelation, loud-window scan, first-solo peak alignment",
  };
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const file = process.argv[2];
  if (!file) throw new Error("Pass an audio file.");
  console.log(JSON.stringify(await analyzeAudio(file), null, 2));
}
