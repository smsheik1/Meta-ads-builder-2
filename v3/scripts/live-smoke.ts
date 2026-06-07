import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { createDefaultSceneLocks, rerollScene } from "../features/create/reroll";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import type { AdScene } from "../features/scene/types";
import {
  getRuntimeConvexUrl,
  loadRuntimeEnv,
} from "./runtime-health";

const filename = fileURLToPath(import.meta.url);
const defaultPublicBaseUrl = "http://v3.163.192.206.128.nip.io";
const defaultWebsiteUrl = "ogtool.com";
const defaultAdCount = 50;
const defaultRenderTimeoutMs = 7 * 60 * 1000;
const defaultPollMs = 5000;

type RenderJobStatus = {
  renderJobId: Id<"renderJobs">;
  status: "queued" | "claimed" | "rendering" | "ready" | "failed";
  progress: number;
  error?: string;
  downloadUrl?: string | null;
};

type ShareRecord = {
  slug: string;
  scene: AdScene;
  ctaUrl?: string;
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
};

const sleep = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const uniqueAnonymousId = () => `live-smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

async function fetchReachable(url: string, label: string) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}.`);
  }
  return response;
}

async function fetchDownloadReachable(url: string) {
  const head = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);

  if (head?.ok) return;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Range: "bytes=0-15",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Download URL returned HTTP ${response.status}.`);
  }
}

async function waitForRenderJob(
  client: ConvexHttpClient,
  renderJobId: Id<"renderJobs">,
  timeoutMs: number,
  pollMs: number,
) {
  const startedAt = Date.now();
  let lastStatus = "";

  while (Date.now() - startedAt < timeoutMs) {
    const job = await client.query(api.renderJobs.getStatus, { renderJobId }) as RenderJobStatus | null;
    if (!job) throw new Error("Render job disappeared before completion.");

    const statusLine = `${job.status}:${job.progress}`;
    if (statusLine !== lastStatus) {
      console.log(`render ${job.status} ${job.progress}%`);
      lastStatus = statusLine;
    }

    if (job.status === "ready") {
      if (!job.downloadUrl) throw new Error("Render job is ready but has no download URL.");
      return job;
    }

    if (job.status === "failed") {
      throw new Error(job.error || "Render job failed.");
    }

    await sleep(pollMs);
  }

  throw new Error(`Render job did not finish within ${Math.round(timeoutMs / 1000)}s.`);
}

function assertSameFrozenScene(inputScene: AdScene, shareScene: AdScene) {
  const problems: string[] = [];

  if (shareScene.format !== inputScene.format) problems.push("format drifted");
  if (shareScene.brand.name !== inputScene.brand.name) problems.push("brand drifted");
  if (shareScene.creative.headline !== inputScene.creative.headline) problems.push("headline drifted");
  if (shareScene.creative.subheadline !== inputScene.creative.subheadline) problems.push("subheadline drifted");
  if (shareScene.style.visualizerColor !== inputScene.style.visualizerColor) problems.push("visualizer color drifted");
  if (shareScene.audio.status !== inputScene.audio.status) problems.push("audio status drifted");
  if (
    shareScene.audio.status === "generated" &&
    inputScene.audio.status === "generated" &&
    shareScene.audio.storageId !== inputScene.audio.storageId
  ) {
    problems.push("audio storage drifted");
  }

  if (problems.length) {
    throw new Error(`Share page did not preserve the frozen scene: ${problems.join(", ")}.`);
  }
}

export async function runLiveSmoke() {
  await loadRuntimeEnv();

  const publicBaseUrl = normalizeBaseUrl(
    process.env.V3_PUBLIC_BASE_URL ||
    (process.env.V3_PUBLIC_HOST ? `http://${process.env.V3_PUBLIC_HOST}` : defaultPublicBaseUrl),
  );
  const websiteUrl = process.env.LIVE_SMOKE_WEBSITE_URL || defaultWebsiteUrl;
  const adCount = parsePositiveInt(process.env.LIVE_SMOKE_AD_COUNT, defaultAdCount, 2, 50);
  const renderTimeoutMs = parsePositiveInt(
    process.env.LIVE_SMOKE_RENDER_TIMEOUT_MS,
    defaultRenderTimeoutMs,
    60_000,
    15 * 60 * 1000,
  );
  const pollMs = parsePositiveInt(process.env.LIVE_SMOKE_POLL_MS, defaultPollMs, 1000, 30_000);
  const convexUrl = getRuntimeConvexUrl();

  if (!convexUrl) throw new Error("Set V3_CONVEX_URL or NEXT_PUBLIC_V3_CONVEX_URL before live smoke.");

  console.log(`public ${publicBaseUrl}`);
  console.log(`website ${websiteUrl}`);
  console.log(`ad_count ${adCount}`);

  await fetchReachable(`${publicBaseUrl}/create`, "public /create");

  const client = new ConvexHttpClient(convexUrl);
  const anonymousId = uniqueAnonymousId();

  const research = await client.action(api.researchRuns.runWebsiteResearch, {
    anonymousId,
    url: websiteUrl,
  }) as StoredWebsiteResearchResult & {
    researchRunId: Id<"researchRuns">;
  };
  if (!research.researchRunId) throw new Error("Research did not return a researchRunId.");
  if (!research.brand.name) throw new Error("Research did not return a brand name.");
  console.log(`research ready ${research.brand.name}`);

  const generation = await client.action(api.adScenes.generateFromResearch, {
    researchRunId: research.researchRunId,
    count: adCount,
  }) as {
    scenes: AdScene[];
    providerStatus: { status: string; reason: string };
  };
  if (generation.scenes.length < adCount) {
    throw new Error(`Expected ${adCount} ad scenes, got ${generation.scenes.length}.`);
  }
  console.log(`ads ready ${generation.scenes.length}`);

  const rerolled = rerollScene(generation.scenes, generation.scenes[0] || null, 0, createDefaultSceneLocks());
  if (!rerolled.scene || rerolled.index !== 1) {
    throw new Error("Spacebar reroll did not select the next scene.");
  }
  console.log(`reroll ready index=${rerolled.index}`);

  const audio = await client.action(api.audioAssets.generateForScene, {
    anonymousId,
    scene: rerolled.scene,
  }) as { scene: AdScene };
  if (audio.scene.audio.status !== "generated" || !audio.scene.audio.storageId || !audio.scene.audio.url) {
    throw new Error("Audio generation did not return durable Convex audio.");
  }
  console.log(`audio ready ${Math.round(audio.scene.audio.durationMs)}ms`);

  const renderJob = await client.mutation(api.renderJobs.createFromScene, {
    anonymousId,
    scene: audio.scene,
  }) as { renderJobId: Id<"renderJobs"> };
  console.log(`render queued ${renderJob.renderJobId}`);

  const readyRender = await waitForRenderJob(client, renderJob.renderJobId, renderTimeoutMs, pollMs);
  await fetchDownloadReachable(readyRender.downloadUrl || "");
  console.log("download ready");

  const share = await client.mutation(api.sharePages.createFromScene, {
    anonymousId,
    scene: audio.scene,
    ctaUrl: audio.scene.brand.url,
  }) as { path: string; slug: string };
  if (!share.path || !share.slug) throw new Error("Share link did not return a slug.");

  await fetchReachable(`${publicBaseUrl}${share.path}`, "public share page");
  const shareRecord = await client.query(api.sharePages.getBySlug, {
    slug: share.slug,
  }) as ShareRecord | null;
  if (!shareRecord) throw new Error("Created share page could not be read from Convex.");
  assertSameFrozenScene(audio.scene, shareRecord.scene);
  console.log(`share ready ${publicBaseUrl}${share.path}`);

  return {
    publicBaseUrl,
    websiteUrl,
    brandName: research.brand.name,
    sceneCount: generation.scenes.length,
    renderJobId: renderJob.renderJobId,
    downloadUrl: readyRender.downloadUrl,
    shareUrl: `${publicBaseUrl}${share.path}`,
  };
}

if (process.argv[1] === filename) {
  runLiveSmoke()
    .then((result) => {
      console.log("LIVE_SMOKE_PASS");
      console.log(JSON.stringify({
        publicBaseUrl: result.publicBaseUrl,
        websiteUrl: result.websiteUrl,
        brandName: result.brandName,
        sceneCount: result.sceneCount,
        renderJobId: result.renderJobId,
        shareUrl: result.shareUrl,
      }, null, 2));
    })
    .catch((error) => {
      console.error("LIVE_SMOKE_FAIL");
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
