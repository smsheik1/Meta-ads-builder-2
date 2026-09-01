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

export const deleteExpiredUnsharedRenders: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    renderJobIds: v.array(v.id("renderJobs")),
    cutoffMs: v.number(),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, { renderJobIds, cutoffMs }) => {
    if (renderJobIds.length > 100) {
      throw new Error("Delete at most 100 render jobs per maintenance run.");
    }

    const sharePages = await ctx.db.query("sharePages").collect();
    const savedDesigns = await ctx.db.query("savedDesigns").collect();
    let deleted = 0;

    for (const renderJobId of renderJobIds) {
      const renderJob = await ctx.db.get(renderJobId);
      if (!renderJob) continue;
      if (renderJob.updatedAt >= cutoffMs) {
        throw new Error(`Render job ${renderJobId} is newer than the cleanup cutoff.`);
      }
      if (sharePages.some((page) => (
        page.renderJobId === renderJobId || page.sceneId === renderJob.sceneId
      ))) {
        throw new Error(`Render job ${renderJobId} belongs to a shared design.`);
      }
      if (renderJob.outputStorageId && savedDesigns.some((design) => (
        JSON.stringify(design.scene).includes(renderJob.outputStorageId as string)
      ))) {
        throw new Error(`Render job ${renderJobId} belongs to a saved design.`);
      }

      if (renderJob.outputStorageId) {
        const metadata = await ctx.db.system.get("_storage", renderJob.outputStorageId);
        if (metadata) await ctx.storage.delete(renderJob.outputStorageId);
      }
      await ctx.db.delete(renderJobId);
      deleted += 1;
    }

    return { deleted };
  },
});
