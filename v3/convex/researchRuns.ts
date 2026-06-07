import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import {
  fetchWebsiteResearchWithFirecrawl,
  toWebsiteResearchErrorMessage,
} from "../features/research/firecrawl";

export const runWebsiteResearch: ReturnType<typeof action> = action({
  args: {
    anonymousId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { anonymousId, url }) => {
    const { sessionId, researchRunId } = await ctx.runMutation(internal.researchStorage.createPending, {
      anonymousId,
      url,
    });

    try {
      const result = await fetchWebsiteResearchWithFirecrawl(url);
      const { brandSnapshotId } = await ctx.runMutation(internal.researchStorage.saveReady, {
        researchRunId,
        sessionId,
        result,
      });

      return {
        ...result,
        sessionId,
        researchRunId,
        brandSnapshotId,
      };
    } catch (error) {
      const message = toWebsiteResearchErrorMessage(error);
      await ctx.runMutation(internal.researchStorage.saveFailed, {
        researchRunId,
        error: message,
      });

      return {
        status: "failed" as const,
        sessionId,
        researchRunId,
        error: message,
      };
    }
  },
});

export const getLatestForSession: ReturnType<typeof query> = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => ctx.db
    .query("researchRuns")
    .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", sessionId))
    .order("desc")
    .first(),
});
