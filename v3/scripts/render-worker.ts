import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { getWorkerRendererVersion } from "../features/render/rendererVersion";
import type { AdScene, JingleMusicVideoClip } from "../features/scene/types";
import { adSceneCompositionId, adSceneFps, getAdSceneDurationInFrames } from "../remotion-entry/Root";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const v3Root = path.resolve(dirname, "..");
const repoRoot = path.resolve(v3Root, "..");
const renderEntry = path.join(v3Root, "remotion-entry", "index.ts");
const outputDir = path.join(v3Root, "tmp", "renders");
const bundleDir = path.join(v3Root, "tmp", "remotion-bundle");
const heartbeatIntervalMs = 10_000;
const idlePollIntervalMs = 30_000;

type ClaimedRenderJob = {
  renderJobId: Id<"renderJobs">;
  scene: AdScene;
};

type ClaimedStitchJob = {
  storyboardId: Id<"jingleStoryboards">;
  clips: JingleMusicVideoClip[];
  durationMs: number;
};

async function loadEnvFile(filePath: string, options: { override?: boolean } = {}) {
  try {
    const content = await readFile(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] && !options.override) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Missing local env files are fine in CI and production workers.
  }
}

async function loadLocalEnv() {
  await loadEnvFile(path.join(repoRoot, ".env"));
  await loadEnvFile(path.join(repoRoot, ".env.local"), { override: true });
  await loadEnvFile(path.join(v3Root, ".env"), { override: true });
  await loadEnvFile(path.join(v3Root, ".env.local"), { override: true });
}

function getConvexUrl() {
  const convexUrl = process.env.V3_CONVEX_URL ||
    process.env.NEXT_PUBLIC_V3_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Set V3_CONVEX_URL or NEXT_PUBLIC_V3_CONVEX_URL before running the render worker.");
  }
  return convexUrl;
}

function serializeError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Render failed.");
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function heartbeat(
  client: ConvexHttpClient,
  workerId: string,
  rendererVersion: string,
) {
  try {
    await client.mutation(api.renderJobs.workerHeartbeat, {
      workerId,
      rendererVersion,
    });
  } catch (error) {
    console.warn(`Render worker heartbeat failed: ${serializeError(error)}`);
  }
}

async function uploadMp4(client: ConvexHttpClient, filePath: string) {
  const uploadUrl = await client.mutation(api.renderJobs.createUploadUrl, {});
  const bytes = await readFile(filePath);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "video/mp4",
    },
    body: new Blob([bytes], { type: "video/mp4" }),
  });

  if (!response.ok) {
    throw new Error(`Convex upload failed with ${response.status}.`);
  }

  const payload = await response.json() as { storageId?: Id<"_storage"> };
  if (!payload.storageId) throw new Error("Convex upload did not return a storageId.");
  return payload.storageId;
}

async function runProcess(command: string, args: string[], label: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    child.on("error", (error) => {
      reject(new Error(`${label} could not start: ${serializeError(error)}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with code ${code}: ${stderr.trim() || "no stderr"}`));
    });
  });
}

async function downloadFile(url: string, filePath: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download render source ${response.status}.`);
  await writeFile(filePath, new Uint8Array(await response.arrayBuffer()));
}

async function stitchVideoJob(client: ConvexHttpClient, job: ClaimedStitchJob) {
  const stitchDir = path.join(outputDir, `stitch-${job.storyboardId}`);
  const outputLocation = path.join(stitchDir, "stitched.mp4");
  await mkdir(stitchDir, { recursive: true });
  try {
    await client.mutation(api.jingleStoryboards.markStitchRendering, {
      storyboardId: job.storyboardId,
      progress: 10,
    });

    const sortedClips = job.clips.slice().sort((a, b) => a.startMs - b.startMs);
    if (!sortedClips.length) throw new Error("Music video stitch has no source clips.");
    for (const clip of sortedClips) {
      if (!clip.url) throw new Error(`Music video stitch source ${clip.shotIndex + 1} has no URL.`);
    }

    const inputArgs: string[] = [];
    for (const [index, clip] of sortedClips.entries()) {
      const inputPath = path.join(stitchDir, `clip-${index}.mp4`);
      await downloadFile(clip.url!, inputPath);
      inputArgs.push("-i", inputPath);
    }

    await client.mutation(api.jingleStoryboards.markStitchRendering, {
      storyboardId: job.storyboardId,
      progress: 35,
    });

    const filterParts = sortedClips.map((clip, index) => {
      const durationSeconds = Math.max(0.1, (clip.endMs - clip.startMs) / 1000).toFixed(3);
      return `[${index}:v]fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,tpad=stop_mode=clone:stop_duration=${durationSeconds},trim=duration=${durationSeconds},setpts=PTS-STARTPTS[v${index}]`;
    });
    const concatInputs = sortedClips.map((_, index) => `[v${index}]`).join("");
    const filterComplex = `${filterParts.join(";")};${concatInputs}concat=n=${sortedClips.length}:v=1:a=0[outv]`;
    await runProcess("ffmpeg", [
      "-y",
      ...inputArgs,
      "-filter_complex",
      filterComplex,
      "-map",
      "[outv]",
      "-an",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputLocation,
    ], "ffmpeg music video stitch");

    await client.mutation(api.jingleStoryboards.markStitchRendering, {
      storyboardId: job.storyboardId,
      progress: 85,
    });
    const storageId = await uploadMp4(client, outputLocation);
    await client.mutation(api.jingleStoryboards.markStitchReady, {
      storyboardId: job.storyboardId,
      storageId,
      durationMs: job.durationMs,
      mimeType: "video/mp4",
    });
  } finally {
    await rm(stitchDir, { recursive: true, force: true });
  }
}

async function renderJob(client: ConvexHttpClient, serveUrl: string, job: ClaimedRenderJob) {
  const outputLocation = path.join(outputDir, `${job.renderJobId}.mp4`);
  const mixedOutputLocation = path.join(outputDir, `${job.renderJobId}-mixed.mp4`);
  await mkdir(outputDir, { recursive: true });
  await client.mutation(api.renderJobs.markRendering, {
    renderJobId: job.renderJobId,
    progress: 10,
  });

  const compositions = await getCompositions(serveUrl, {
    inputProps: { scene: job.scene },
  });
  const composition = compositions.find((item) => item.id === adSceneCompositionId);
  if (!composition) throw new Error(`Could not find Remotion composition ${adSceneCompositionId}.`);

  let latestRenderProgress = 10;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: { scene: job.scene },
    overwrite: true,
    logLevel: "warn",
    onProgress: ({ progress }) => {
      latestRenderProgress = Math.round(10 + progress * 85);
    },
  });

  await client.mutation(api.renderJobs.markRendering, {
    renderJobId: job.renderJobId,
    progress: Math.max(90, latestRenderProgress),
  });

  let uploadLocation = outputLocation;
  const backgroundMusic = job.scene.backgroundMusic;
  if (backgroundMusic) {
    if (job.scene.audio.status !== "generated") {
      throw new Error("Background music export requires generated voice audio.");
    }
    if (!backgroundMusic.url) {
      throw new Error("Background music URL is missing.");
    }

    const musicExtension = backgroundMusic.mimeType.includes("wav")
      ? "wav"
      : backgroundMusic.mimeType.includes("mp4")
        ? "m4a"
        : "mp3";
    const musicPath = path.join(outputDir, `${job.renderJobId}-music.${musicExtension}`);
    const durationSeconds = (getAdSceneDurationInFrames(job.scene, adSceneFps) / adSceneFps).toFixed(3);
    await downloadFile(backgroundMusic.url, musicPath);
    await runProcess("ffmpeg", [
      "-y",
      "-i",
      outputLocation,
      "-stream_loop",
      "-1",
      "-i",
      musicPath,
      "-filter_complex",
      `[1:a]volume=${backgroundMusic.volume ?? 0.18},atrim=0:${durationSeconds},asetpts=PTS-STARTPTS[bed];[0:a][bed]amix=inputs=2:duration=longest:dropout_transition=0[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      mixedOutputLocation,
    ], "ffmpeg background music mix");
    uploadLocation = mixedOutputLocation;
    await rm(musicPath, { force: true });
  }

  const storageId = await uploadMp4(client, uploadLocation);
  await client.mutation(api.renderJobs.markReady, {
    renderJobId: job.renderJobId,
    storageId,
  });
  await rm(outputLocation, { force: true });
  await rm(mixedOutputLocation, { force: true });
}

async function runOnce(client: ConvexHttpClient, serveUrl: string) {
  let job = null;
  try {
    job = await client.mutation(api.renderJobs.claimNext, {
      rendererVersion: getWorkerRendererVersion(),
    });
  } catch (error) {
    console.warn(`Render worker could not claim a job: ${serializeError(error)}`);
    return false;
  }

  if (!job) return false;

  try {
    await renderJob(client, serveUrl, job as ClaimedRenderJob);
    console.log(`Rendered ${job.renderJobId}`);
  } catch (error) {
    await client.mutation(api.renderJobs.markFailed, {
      renderJobId: job.renderJobId,
      error: serializeError(error),
    });
    console.error(`Failed ${job.renderJobId}: ${serializeError(error)}`);
  }

  return true;
}

async function runStitchOnce(client: ConvexHttpClient) {
  let job = null;
  try {
    job = await client.mutation(api.jingleStoryboards.claimNextStitch, {});
  } catch (error) {
    console.warn(`Render worker could not claim a stitch job: ${serializeError(error)}`);
    return false;
  }

  if (!job) return false;

  try {
    await stitchVideoJob(client, job as ClaimedStitchJob);
    console.log(`Stitched music video ${job.storyboardId}`);
  } catch (error) {
    await client.mutation(api.jingleStoryboards.markStitchFailed, {
      storyboardId: (job as ClaimedStitchJob).storyboardId,
      error: serializeError(error),
    });
    console.error(`Failed stitch ${(job as ClaimedStitchJob).storyboardId}: ${serializeError(error)}`);
  }

  return true;
}

async function main() {
  await loadLocalEnv();
  const watch = process.argv.includes("--watch");
  const rendererVersion = getWorkerRendererVersion();
  const workerId = `${hostname()}-${process.pid}`;
  const client = new ConvexHttpClient(getConvexUrl());
  await rm(bundleDir, { recursive: true, force: true });
  const serveUrl = await bundle({
    entryPoint: renderEntry,
    outDir: bundleDir,
    webpackOverride: (config) => config,
  });
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, ".gitkeep"), "", { flag: "a" });
  console.log(`Render worker ready for renderer ${rendererVersion}.`);
  await heartbeat(client, workerId, rendererVersion);
  const heartbeatTimer = setInterval(() => {
    void heartbeat(client, workerId, rendererVersion);
  }, heartbeatIntervalMs);

  try {
    do {
      const didWork = await runOnce(client, serveUrl) || await runStitchOnce(client);
      if (!watch) break;
      if (!didWork) await wait(idlePollIntervalMs);
    } while (watch);
  } finally {
    clearInterval(heartbeatTimer);
    await rm(bundleDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(serializeError(error));
  process.exitCode = 1;
});
