import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_SAVED_DESIGNS = 8;

const savedDesignValidator = v.object({
  id: v.string(),
  title: v.string(),
  scene: v.any(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const toSavedDesign = (row: {
  designId: string;
  title: string;
  scene: unknown;
  createdAt: number;
  updatedAt: number;
}) => ({
  id: row.designId,
  title: row.title,
  scene: row.scene,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const list = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("savedDesigns")
      .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(MAX_SAVED_DESIGNS);

    return rows.map(toSavedDesign);
  },
});

export const upsert = mutation({
  args: {
    sessionId: v.string(),
    sceneId: v.string(),
    design: savedDesignValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedDesigns")
      .withIndex("by_sessionId_and_sceneId", (q) => (
        q.eq("sessionId", args.sessionId).eq("sceneId", args.sceneId)
      ))
      .unique();

    const designId = existing?.designId ?? args.design.id;
    const createdAt = existing?.createdAt ?? args.design.createdAt;

    const nextRow = {
      sessionId: args.sessionId,
      designId,
      sceneId: args.sceneId,
      title: args.design.title,
      scene: args.design.scene,
      createdAt,
      updatedAt: args.design.updatedAt,
    };

    if (existing) {
      await ctx.db.replace(existing._id, nextRow);
    } else {
      await ctx.db.insert("savedDesigns", nextRow);
    }

    const rows = await ctx.db
      .query("savedDesigns")
      .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(MAX_SAVED_DESIGNS + 16);

    for (const row of rows.slice(MAX_SAVED_DESIGNS)) {
      await ctx.db.delete(row._id);
    }

    return toSavedDesign(nextRow);
  },
});

export const remove = mutation({
  args: {
    sessionId: v.string(),
    designId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedDesigns")
      .withIndex("by_sessionId_and_designId", (q) => (
        q.eq("sessionId", args.sessionId).eq("designId", args.designId)
      ))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { deleted: Boolean(existing) };
  },
});
