import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  assertShareableAdScene,
  createShareSlug,
  createShareSlugSuffix,
  sanitizeCtaUrl,
} from "../features/share/shareScene";

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

export const createFromScene: ReturnType<typeof mutation> = mutation({
  args: {
    anonymousId: v.string(),
    scene: v.any(),
    ctaUrl: v.optional(v.string()),
  },
  handler: async (ctx, { anonymousId, scene, ctaUrl }) => {
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

    return {
      slug: sharePage.slug,
      ctaUrl: sharePage.ctaUrl,
      createdAt: sharePage.createdAt,
      sceneId: sharePage.sceneId,
      scene: scene.scene,
    };
  },
});
