import { internalMutationGeneric as internalMutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const ensureAnonymousSession = internalMutation({
  args: {
    anonymousId: v.string(),
  },
  handler: async (ctx, { anonymousId }) => {
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
  },
});

export const getByAnonymousId = query({
  args: {
    anonymousId: v.string(),
  },
  handler: async (ctx, { anonymousId }) => ctx.db
    .query("sessions")
    .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
    .first(),
});
