import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const audioAssetResponseValidator = v.object({
  storageId: v.id("_storage"),
  url: v.string(),
  mimeType: v.string(),
  durationMs: v.number(),
  size: v.number(),
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const saveGenerated = mutation({
  args: {
    storageId: v.id("_storage"),
    sessionId: v.string(),
    sceneId: v.string(),
    scriptId: v.string(),
    mimeType: v.string(),
    durationMs: v.number(),
    transcript: v.string(),
    captionCount: v.number(),
  },
  returns: audioAssetResponseValidator,
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new Error("Uploaded audio file was not found.");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Uploaded audio file could not be opened.");
    }

    const existing = await ctx.db
      .query("audioAssets")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    const now = Date.now();
    const row = {
      ...args,
      size: metadata.size,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.replace(existing._id, row);
    } else {
      await ctx.db.insert("audioAssets", row);
    }

    return {
      storageId: args.storageId,
      url,
      mimeType: args.mimeType,
      durationMs: args.durationMs,
      size: metadata.size,
    };
  },
});

export const getUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(audioAssetResponseValidator, v.null()),
  handler: async (ctx, args) => {
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) return null;

    const asset = await ctx.db
      .query("audioAssets")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) return null;

    return {
      storageId: args.storageId,
      url,
      mimeType: asset?.mimeType ?? metadata.contentType ?? "audio/wav",
      durationMs: asset?.durationMs ?? 0,
      size: metadata.size,
    };
  },
});
