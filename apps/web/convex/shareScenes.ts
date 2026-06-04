import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const shareSceneRecordValidator = v.object({
  slug: v.string(),
  scene: v.any(),
  durationMs: v.number(),
  spec: v.object({
    compositionId: v.string(),
    width: v.number(),
    height: v.number(),
    label: v.string(),
  }),
  createdAt: v.number(),
});

const toShareSceneRecord = (row: {
  slug: string;
  scene: unknown;
  durationMs: number;
  spec: {
    compositionId: string;
    width: number;
    height: number;
    label: string;
  };
  createdAt: number;
}) => ({
  slug: row.slug,
  scene: row.scene,
  durationMs: row.durationMs,
  spec: row.spec,
  createdAt: row.createdAt,
});

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("shareScenes")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    return row ? toShareSceneRecord(row) : null;
  },
});

export const save = mutation({
  args: {
    record: shareSceneRecordValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shareScenes")
      .withIndex("by_slug", (q) => q.eq("slug", args.record.slug))
      .unique();

    if (existing) {
      await ctx.db.replace(existing._id, args.record);
    } else {
      await ctx.db.insert("shareScenes", args.record);
    }

    return args.record;
  },
});
