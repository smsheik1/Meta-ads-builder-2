import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function requireOwnerAccess(accessToken: string) {
  const expected = process.env.WIGGLY_MAKER_ACCESS_TOKEN;
  if (!expected || accessToken !== expected) throw new Error("Discovery curation is not authorized.");
}

export const listHidden = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("discoveryHiddenEntries").collect();
    return rows.map((row) => row.entryId);
  },
});

export const hide = mutation({
  args: {
    accessToken: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, { accessToken, entryId }) => {
    requireOwnerAccess(accessToken);
    const existing = await ctx.db
      .query("discoveryHiddenEntries")
      .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
      .unique();
    if (!existing) {
      await ctx.db.insert("discoveryHiddenEntries", {
        entryId,
        hiddenAt: Date.now(),
      });
    }
    return entryId;
  },
});
