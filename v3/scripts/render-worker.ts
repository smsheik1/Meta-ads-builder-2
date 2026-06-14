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
import type { AdScene } from "../features/scene/types";
import { adSceneCompositionId } from "../remotion-entry/Root";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const v3Root = path.resolve(dirname, "..");
const repoRoot = path.resolve(v3Root, "..");
const renderEntry = path.join(v3Root, "remotion-entry", "index.ts");
const outputDir = path.join(v3Root, "tmp", "renders");
const heartbeatIntervalMs = 5000;

type ClaimedRenderJob = {
  renderJobId: Id<"renderJobs">;
  scene: AdScene;
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

async function renderJob(client: ConvexHttpClient, serveUrl: string, job: ClaimedRenderJob) {
  const outputLocation = path.join(outputDir, `${job.renderJobId}.mp4`);
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
  const storageId = await uploadMp4(client, outputLocation);
  await client.mutation(api.renderJobs.markReady, {
    renderJobId: job.renderJobId,
    storageId,
  });
  await rm(outputLocation, { force: true });
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

async function main() {
  await loadLocalEnv();
  const watch = process.argv.includes("--watch");
  const rendererVersion = getWorkerRendererVersion();
  const workerId = `${hostname()}-${process.pid}`;
  const client = new ConvexHttpClient(getConvexUrl());
  const serveUrl = await bundle({
    entryPoint: renderEntry,
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
      const didWork = await runOnce(client, serveUrl);
      if (!watch) break;
      if (!didWork) await wait(3000);
    } while (watch);
  } finally {
    clearInterval(heartbeatTimer);
  }
}

void main().catch((error) => {
  console.error(serializeError(error));
  process.exitCode = 1;
});
