import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeAudioSignal,
  audioDoesNotClip,
  prepareMusicBed,
  probeDurationMs,
} from "./otaku-media";

const filename = fileURLToPath(import.meta.url);
const v3Root = path.resolve(path.dirname(filename), "..");
const packageRoot = path.join(v3Root, "public", "format-repositories", "otaku-explainer-v1");
const smokeName = `.smoke-runtime-${process.pid}`;
const smokeRoot = path.join(packageRoot, smokeName);
const voicePath = path.join(smokeRoot, "voice.wav");
const musicPath = path.join(smokeRoot, "music.mp3");
const runPath = path.join(smokeRoot, "run.json");
const outputPath = path.join(smokeRoot, "video.mp4");
const contactSheetPath = path.join(smokeRoot, "contact-sheet.jpg");
const publicPrefix = `format-repositories/otaku-explainer-v1/${smokeName}`;

async function run(command: string, args: string[], capture = false) {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: v3Root,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stdout)
      : reject(new Error(`${command} failed${stderr ? `: ${stderr.slice(-1_200)}` : ""}`)));
  });
}

async function main() {
  await mkdir(smokeRoot, { recursive: true });
  try {
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=440:sample_rate=44100:duration=1.2",
      "-af", "volume=0.25,afade=t=in:st=0:d=0.05,afade=t=out:st=1.1:d=0.1",
      "-c:a", "pcm_s16le",
      voicePath,
    ]);
    const voiceDurationMs = await probeDurationMs(voicePath);
    await prepareMusicBed({
      outputPath: musicPath,
      sourcePath: path.join(packageRoot, "assets", "audio", "background-music.mp3"),
      targetDurationMs: voiceDurationMs,
    });
    await writeFile(runPath, `${JSON.stringify({
      id: "local-smoke",
      title: "Local Format Kit smoke test",
      input: { topic: "Smoke test", storyWorld: "naruto", cast: ["naruto", "kakashi"] },
      rendererVersion: "otaku-format-renderer@1.1.0-experiment",
      musicPath: `${publicPrefix}/music.mp3`,
      musicLoop: false,
      musicVolume: 0.08,
      scenes: [{
        id: "smoke-01",
        speaker: "naruto",
        dialogue: "The official Wiggly runner works.",
        background: "konoha",
        estimatedDurationMs: voiceDurationMs,
        durationMs: voiceDurationMs,
        audioPath: `${publicPrefix}/voice.wav`,
        characters: [
          { asset: "naruto", x: 6, bottom: 2, width: 42, rotate: -1 },
          { asset: "kakashi", x: 53, bottom: 2, width: 41, rotate: 1 },
        ],
        callout: { label: "READY", theme: "cool" },
      }],
    }, null, 2)}\n`);
    await run("npm", [
      "run", "prototype:otaku:render", "--",
      `--run-record=${runPath}`,
      `--output=${outputPath}`,
      `--contact-sheet=${contactSheetPath}`,
    ]);

    const technical = JSON.parse(await run("ffprobe", [
      "-v", "error",
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json",
      outputPath,
    ], true)) as { streams?: Array<{ width?: number; height?: number }>; format?: { duration?: string } };
    const stream = technical.streams?.find((candidate) => candidate.width && candidate.height);
    const outputDurationMs = Math.round(Number(technical.format?.duration || 0) * 1_000);
    const outputAudio = await analyzeAudioSignal(outputPath);
    const contactSheetSize = existsSync(contactSheetPath) ? (await stat(contactSheetPath)).size : 0;

    if (stream?.width !== 720 || stream.height !== 1280) throw new Error("Smoke video dimensions are not 720x1280.");
    if (Math.abs(outputDurationMs - voiceDurationMs) > 150) throw new Error("Smoke video timing does not match its voice track.");
    if (contactSheetSize < 1_000) throw new Error("Smoke contact sheet was not created.");
    if (!audioDoesNotClip(outputAudio)) throw new Error("Smoke audio clips at full scale.");
    if (outputAudio.meanVolumeDb < -40) throw new Error("Smoke audio mix is unexpectedly quiet.");
    console.log("Smoke passed: official renderer, assets, FFmpeg, Remotion, and audio mixing work locally.");
    console.log("No provider or paid media calls were made.");
  } finally {
    await rm(smokeRoot, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
