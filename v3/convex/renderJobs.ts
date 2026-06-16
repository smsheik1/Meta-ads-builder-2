import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { AdScene } from "../features/scene/types";

const workerStaleAfterMs = 15000;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
);

const assertRenderableAdScene = (value: unknown): AdScene => {
  if (!isRecord(value)) throw new Error("Render scene is missing.");

  const scene = value as AdScene;
  if (scene.version !== 1) throw new Error("Render scene version is not supported.");
  if (!scene.brand?.name?.trim()) throw new Error("Render scene brand name is missing.");
  if (!scene.creative?.headline?.trim()) throw new Error("Render scene headline is missing.");
  if (scene.format === "video-meme" && !scene.layout.videoSrc?.trim()) {
    throw new Error("Render scene video source is missing.");
  }
  return scene;
};

const ensureAnonymousSession = async (
  ctx: MutationCtx,
  anonymousId: string,
) => {
  const now = Date.now();
  const existing = await ctx.db
    .query("sessions")
    .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { updatedAt: now });
    return existing._id;
  }

  return ctx.db.insert("sessions", {
    anonymousId,
    createdAt: now,
    updatedAt: now,
  });
};

const cleanWorkerError = (error: string) => (
  error.replace(/\s+/g, " ").trim().slice(0, 500) || "Render failed."
);

const refreshSceneAudioUrl = async (
  ctx: MutationCtx,
  scene: AdScene,
) => {
  if (scene.audio.status !== "generated" || !scene.audio.storageId) return scene;

  const url = await ctx.storage.getUrl(scene.audio.storageId as Id<"_storage">);
  if (!url) return scene;

  return {
    ...scene,
    audio: {
      ...scene.audio,
      url,
    },
  };
};

export const createFromScene: ReturnType<typeof mutation> = mutation({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
    rendererVersion: v.string(),
  },
  handler: async (ctx, { anonymousId, rendererVersion, scene }) => {
    const renderScene = assertRenderableAdScene(scene);
    const now = Date.now();
    const sessionId = await ensureAnonymousSession(ctx, anonymousId);
    const sceneId = await ctx.db.insert("adScenes", {
      sessionId,
      format: renderScene.format,
      generationBatchId: renderScene.metadata.generationBatchId,
      candidateIndex: renderScene.metadata.candidateIndex,
      model: renderScene.metadata.model,
      provider: renderScene.metadata.provider,
      scene: renderScene,
      createdAt: now,
      updatedAt: now,
    });
    const renderJobId = await ctx.db.insert("renderJobs", {
      sessionId,
      sceneId,
      status: "queued",
      progress: 0,
      rendererVersion,
      createdAt: now,
      updatedAt: now,
    });

    return { renderJobId, sceneId };
  },
});

export const getStatus: ReturnType<typeof query> = query({
  args: {
    renderJobId: v.id("renderJobs"),
  },
  handler: async (ctx, { renderJobId }) => {
    const job = await ctx.db.get(renderJobId);
    if (!job) return null;

    const downloadUrl = job.outputStorageId
      ? await ctx.storage.getUrl(job.outputStorageId)
      : null;

    return {
      renderJobId,
      status: job.status,
      progress: job.progress,
      error: job.error,
      downloadUrl,
      updatedAt: job.updatedAt,
    };
  },
});

export const workerReadiness: ReturnType<typeof query> = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const queued = await ctx.db
      .query("renderJobs")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "queued"))
      .take(1);
    const claimed = await ctx.db
      .query("renderJobs")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "claimed"))
      .take(1);
    const rendering = await ctx.db
      .query("renderJobs")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "rendering"))
      .take(1);
    const workers = await ctx.db
      .query("renderWorkers")
      .collect();
    const freshWorkers = workers.filter((worker) => now - worker.lastSeenAt <= workerStaleAfterMs);

    return {
      queued: queued.length,
      active: claimed.length + rendering.length,
      workerHealthy: freshWorkers.length > 0,
      workerCount: freshWorkers.length,
      lastSeenAt: workers.reduce<number | null>((latest, worker) => (
        latest === null || worker.lastSeenAt > latest ? worker.lastSeenAt : latest
      ), null),
      staleAfterMs: workerStaleAfterMs,
    };
  },
});

export const workerHeartbeat: ReturnType<typeof mutation> = mutation({
  args: {
    workerId: v.string(),
    rendererVersion: v.string(),
  },
  handler: async (ctx, { workerId, rendererVersion }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("renderWorkers")
      .withIndex("by_workerId", (q) => q.eq("workerId", workerId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rendererVersion,
        lastSeenAt: now,
      });
      return { workerId, lastSeenAt: now };
    }

    await ctx.db.insert("renderWorkers", {
      workerId,
      rendererVersion,
      startedAt: now,
      lastSeenAt: now,
    });
    return { workerId, lastSeenAt: now };
  },
});

export const claimNext: ReturnType<typeof mutation> = mutation({
  args: {
    rendererVersion: v.string(),
  },
  handler: async (ctx, { rendererVersion }) => {
    const now = Date.now();
    const job = await ctx.db
      .query("renderJobs")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "queued"))
      .filter((q) => q.eq(q.field("rendererVersion"), rendererVersion))
      .order("asc")
      .first();

    if (!job) return null;

    const scene = await ctx.db.get(job.sceneId);
    if (!scene) {
      await ctx.db.patch(job._id, {
        status: "failed",
        progress: 0,
        error: "Render scene is missing.",
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.patch(job._id, {
      status: "claimed",
      progress: 5,
      updatedAt: now,
    });

    const renderScene = await refreshSceneAudioUrl(ctx, scene.scene as AdScene);

    return {
      renderJobId: job._id,
      sceneId: scene._id,
      scene: renderScene,
    };
  },
});

export const markRendering: ReturnType<typeof mutation> = mutation({
  args: {
    renderJobId: v.id("renderJobs"),
    progress: v.optional(v.number()),
  },
  handler: async (ctx, { renderJobId, progress }) => {
    await ctx.db.patch(renderJobId, {
      status: "rendering",
      progress: Math.max(5, Math.min(95, progress ?? 10)),
      updatedAt: Date.now(),
    });
  },
});

export const createUploadUrl: ReturnType<typeof mutation> = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const markReady: ReturnType<typeof mutation> = mutation({
  args: {
    renderJobId: v.id("renderJobs"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { renderJobId, storageId }) => {
    await ctx.db.patch(renderJobId, {
      status: "ready",
      progress: 100,
      outputStorageId: storageId,
      error: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const markFailed: ReturnType<typeof mutation> = mutation({
  args: {
    renderJobId: v.id("renderJobs"),
    error: v.string(),
  },
  handler: async (ctx, { renderJobId, error }) => {
    await ctx.db.patch(renderJobId, {
      status: "failed",
      progress: 0,
      error: cleanWorkerError(error),
      updatedAt: Date.now(),
    });
  },
});
