import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const deleteFiles: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { storageIds }) => {
    if (storageIds.length > 100) {
      throw new Error("Delete at most 100 storage files per maintenance run.");
    }

    for (const storageId of storageIds) {
      await ctx.storage.delete(storageId);
    }

    return { deleted: storageIds.length };
  },
});
