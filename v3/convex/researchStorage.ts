import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import type { WebsiteResearchResult } from "../features/research/types";

export const createPending: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    anonymousId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { anonymousId, url }) => {
    const now = Date.now();
    const sessionId = await ctx.runMutation(internal.sessions.ensureAnonymousSession, {
      anonymousId,
    });
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

export const saveReady: ReturnType<typeof internalMutation> = internalMutation({
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
      brandBrief: research.brandBrief,
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

export const saveFailed: ReturnType<typeof internalMutation> = internalMutation({
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
