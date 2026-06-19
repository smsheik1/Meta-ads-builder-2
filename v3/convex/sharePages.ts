import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { AdScene } from "../features/scene/types";
import {
  assertShareableAdScene,
  createShareSlug,
  createShareSlugSuffix,
  sanitizeCtaUrl,
} from "../features/share/shareScene";

const previewPlatformValidator = v.union(
  v.literal("facebook-feed"),
  v.literal("instagram-feed"),
  v.literal("reels"),
  v.literal("stories"),
  v.literal("youtube"),
);

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

const refreshSceneAudioUrl = async (
  ctx: QueryCtx,
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

const refreshJingleMusicVideoUrls = async (
  ctx: QueryCtx,
  scene: AdScene,
) => {
  if (scene.format !== "jingle" || !scene.layout.musicVideo) return scene;

  return {
    ...scene,
    layout: {
      ...scene.layout,
      musicVideo: {
        ...scene.layout.musicVideo,
        clips: await Promise.all(scene.layout.musicVideo.clips.map(async (clip) => ({
          ...clip,
          url: await ctx.storage.getUrl(clip.storageId as Id<"_storage">),
        }))),
        stitchedVideo: scene.layout.musicVideo.stitchedVideo
          ? {
            ...scene.layout.musicVideo.stitchedVideo,
            url: await ctx.storage.getUrl(scene.layout.musicVideo.stitchedVideo.storageId as Id<"_storage">),
          }
          : undefined,
      },
    },
  };
};

export const createFromScene: ReturnType<typeof mutation> = mutation({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
    ctaUrl: v.optional(v.string()),
    previewPlatform: v.optional(previewPlatformValidator),
  },
  handler: async (ctx, { anonymousId, scene, ctaUrl, previewPlatform }) => {
    const shareScene = assertShareableAdScene(scene);
    const now = Date.now();
    const sessionId = await ensureAnonymousSession(ctx, anonymousId);
    let slug: string | null = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidateSlug = createShareSlug(shareScene, createShareSlugSuffix());
      const existing = await ctx.db
        .query("sharePages")
        .withIndex("by_slug", (q) => q.eq("slug", candidateSlug))
        .first();
      if (!existing) {
        slug = candidateSlug;
        break;
      }
    }

    if (!slug) throw new Error("Could not create a unique share link.");

    const sceneId = await ctx.db.insert("adScenes", {
      sessionId,
      format: shareScene.format,
      generationBatchId: shareScene.metadata.generationBatchId,
      candidateIndex: shareScene.metadata.candidateIndex,
      model: shareScene.metadata.model,
      provider: shareScene.metadata.provider,
      scene: shareScene,
      createdAt: now,
      updatedAt: now,
    });
    const sharePageId = await ctx.db.insert("sharePages", {
      slug,
      sessionId,
      sceneId,
      ctaUrl: sanitizeCtaUrl(ctaUrl, shareScene.brand.url),
      previewPlatform,
      createdAt: now,
      updatedAt: now,
    });

    return {
      sharePageId,
      sceneId,
      slug,
      path: `/s/${slug}`,
    };
  },
});

export const getBySlug: ReturnType<typeof query> = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const sharePage = await ctx.db
      .query("sharePages")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!sharePage) return null;

    const scene = await ctx.db.get(sharePage.sceneId);
    if (!scene) return null;
    const shareScene = await refreshJingleMusicVideoUrls(ctx, await refreshSceneAudioUrl(ctx, scene.scene as AdScene));

    return {
      slug: sharePage.slug,
      ctaUrl: sharePage.ctaUrl,
      createdAt: sharePage.createdAt,
      previewPlatform: sharePage.previewPlatform,
      sceneId: sharePage.sceneId,
      scene: shareScene,
    };
  },
});
