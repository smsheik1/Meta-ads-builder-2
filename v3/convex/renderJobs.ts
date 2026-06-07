import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { assertShareableAdScene } from "../features/share/shareScene";

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

export const createFromScene: ReturnType<typeof mutation> = mutation({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
  },
  handler: async (ctx, { anonymousId, scene }) => {
    const renderScene = assertShareableAdScene(scene);
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

export const claimNext: ReturnType<typeof mutation> = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const job = await ctx.db
      .query("renderJobs")
      .withIndex("by_status_and_updatedAt", (q) => q.eq("status", "queued"))
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

    return {
      renderJobId: job._id,
      sceneId: scene._id,
      scene: scene.scene,
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
