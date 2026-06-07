import { v } from "convex/values";
import {
  actionGeneric as action,
  internalMutationGeneric as internalMutation,
  queryGeneric as query,
} from "convex/server";
import { fetchWebsiteResearchWithFirecrawl } from "../features/research/firecrawl";
import type { WebsiteResearchResult } from "../features/research/types";

const ensureAnonymousSession = "sessions:ensureAnonymousSession" as any;
const createPendingRun = "researchRuns:createPending" as any;
const saveReadyRun = "researchRuns:saveReady" as any;
const saveFailedRun = "researchRuns:saveFailed" as any;

export const createPending = internalMutation({
  args: {
    anonymousId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { anonymousId, url }) => {
    const now = Date.now();
    const sessionId = await ctx.runMutation(ensureAnonymousSession, {
      anonymousId,
    }) as string;
    const researchRunId = await ctx.db.insert("researchRuns", {
      sessionId,
      url,
      status: "running",
      createdAt: now,
      updatedAt: now,
    });

    return { sessionId, researchRunId };
  },
});

export const saveReady = internalMutation({
  args: {
    researchRunId: v.id("researchRuns"),
    sessionId: v.string(),
    result: v.any(),
  },
  handler: async (ctx, { researchRunId, sessionId, result }) => {
    const now = Date.now();
    const research = result as WebsiteResearchResult;
    const brandSnapshotId = await ctx.db.insert("brandSnapshots", {
      researchRunId,
      sessionId,
      name: research.brand.name,
      url: research.brand.url,
      host: research.brand.host,
      title: research.brand.title,
      description: research.brand.description,
      faviconUrl: research.brand.faviconUrl || undefined,
      logoUrl: research.brand.logoUrl || undefined,
      ogImageUrl: research.brand.ogImageUrl || undefined,
      colors: research.brand.colors,
      fonts: research.brand.fonts,
      vibeTags: research.brand.vibeTags,
      screenshotUrl: research.brand.screenshotUrl || undefined,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(researchRunId, {
      finalUrl: research.finalUrl,
      host: research.host,
      brandName: research.brand.name,
      title: research.brand.title,
      description: research.brand.description,
      status: "ready",
      markdown: research.evidence.rawMarkdown,
      screenshotUrl: research.brand.screenshotUrl || undefined,
      branding: research.branding,
      receipts: research.evidence.receipts,
      evidence: research.evidence,
      metadata: research.metadata,
      providerStatus: research.providerStatus,
      error: undefined,
      updatedAt: now,
    });

    return { brandSnapshotId };
  },
});

export const saveFailed = internalMutation({
  args: {
    researchRunId: v.id("researchRuns"),
    error: v.string(),
  },
  handler: async (ctx, { researchRunId, error }) => {
    await ctx.db.patch(researchRunId, {
      status: "failed",
      error,
      updatedAt: Date.now(),
    });
  },
});

export const runWebsiteResearch = action({
  args: {
    anonymousId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { anonymousId, url }) => {
    const { sessionId, researchRunId } = await ctx.runMutation(createPendingRun, {
      anonymousId,
      url,
    }) as { sessionId: string; researchRunId: string };

    try {
      const result = await fetchWebsiteResearchWithFirecrawl(url);
      const { brandSnapshotId } = await ctx.runMutation(saveReadyRun, {
        researchRunId,
        sessionId,
        result,
      }) as { brandSnapshotId: string };

      return {
        ...result,
        sessionId,
        researchRunId,
        brandSnapshotId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Website research failed.";
      await ctx.runMutation(saveFailedRun, {
        researchRunId,
        error: message,
      });
      throw new Error(message);
    }
  },
});

export const getLatestForSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => ctx.db
    .query("researchRuns")
    .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", sessionId))
    .order("desc")
    .first(),
});
