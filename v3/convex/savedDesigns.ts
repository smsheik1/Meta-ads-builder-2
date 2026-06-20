import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { AdScene } from "../features/scene/types";
import { refreshSceneAudioUrls } from "./sceneUrlRefresh";
import {
  assertSavableAdScene,
  createSavedDesignId,
  createSavedDesignTitle,
  MAX_SAVED_DESIGNS,
  type SavedAdSceneDesign,
} from "../features/create/savedDesigns";

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

const getAnonymousSessionId = async (
  ctx: QueryCtx,
  anonymousId: string,
) => {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
    .first();

  return session?._id || null;
};

const toSavedDesign = async (
  ctx: QueryCtx,
  row: {
    designId: string;
    title: string;
    format: string;
    scene: unknown;
    createdAt: number;
    updatedAt: number;
  },
): Promise<SavedAdSceneDesign> => {
  const scene = assertSavableAdScene(row.scene);

  return {
    id: row.designId,
    title: row.title,
    format: scene.format,
    scene: await refreshSceneAudioUrls(ctx, scene),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export const list: ReturnType<typeof query> = query({
  args: {
    anonymousId: v.string(),
  },
  handler: async (ctx, { anonymousId }) => {
    const sessionId = await getAnonymousSessionId(ctx, anonymousId);
    if (!sessionId) return [];

    const rows = await ctx.db
      .query("savedDesigns")
      .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .take(MAX_SAVED_DESIGNS);

    return Promise.all(rows.map((row) => toSavedDesign(ctx, row)));
  },
});

export const saveFromScene: ReturnType<typeof mutation> = mutation({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
  },
  handler: async (ctx, { anonymousId, scene }) => {
    const savedScene = assertSavableAdScene(scene);
    const now = Date.now();
    const sessionId = await ensureAnonymousSession(ctx, anonymousId);
    const designId = createSavedDesignId(savedScene);
    const title = createSavedDesignTitle(savedScene);
    const existing = await ctx.db
      .query("savedDesigns")
      .withIndex("by_sessionId_and_designId", (q) => (
        q.eq("sessionId", sessionId).eq("designId", designId)
      ))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title,
        format: savedScene.format,
        scene: savedScene,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("savedDesigns", {
        sessionId,
        designId,
        title,
        format: savedScene.format,
        scene: savedScene,
        createdAt: now,
        updatedAt: now,
      });
    }

    const rows = await ctx.db
      .query("savedDesigns")
      .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .take(MAX_SAVED_DESIGNS + 16);

    for (const row of rows.slice(MAX_SAVED_DESIGNS)) {
      await ctx.db.delete(row._id);
    }

    return {
      id: designId,
      title,
      format: savedScene.format,
      scene: savedScene,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    } satisfies SavedAdSceneDesign;
  },
});
