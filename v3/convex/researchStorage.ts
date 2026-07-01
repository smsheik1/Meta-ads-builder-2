import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  buildFallbackBrandBrief,
  isBrandResearchNoiseText,
  normalizeBrandBriefPayload,
} from "../features/research/brandCurator";
import type { ResearchEvidence, StoredWebsiteResearchResult, WebsiteResearchResult } from "../features/research/types";

const titleizeHost = (host: string) => (
  host
    .replace(/^www\./, "")
    .split(".")[0]
    ?.split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ") || "Brand"
);

const storedTextOrFallback = (value: unknown, fallback: string) => (
  isBrandResearchNoiseText(value) ? fallback : String(value || fallback)
);

const filterStoredEvidence = (evidence: ResearchEvidence): ResearchEvidence => {
  const cleanList = (items: string[]) => items.filter((item) => !isBrandResearchNoiseText(item));
  const rawLines = evidence.rawMarkdown
    .split(/\n+/)
    .filter((line) => !isBrandResearchNoiseText(line));

  return {
    headings: cleanList(evidence.headings),
    paragraphs: cleanList(evidence.paragraphs),
    receipts: {
      specificClaims: cleanList(evidence.receipts.specificClaims),
      buyerMoments: cleanList(evidence.receipts.buyerMoments),
      exactSiteLanguage: cleanList(evidence.receipts.exactSiteLanguage),
      namedProof: cleanList(evidence.receipts.namedProof),
    },
    rawMarkdown: rawLines.join("\n"),
  };
};

export function toStoredResearchResult(
  researchRun: Doc<"researchRuns">,
  brandSnapshot: Doc<"brandSnapshots">,
  researchRunId: Id<"researchRuns"> = researchRun._id,
) {
  const host = researchRun.host || brandSnapshot.host || "";
  const fallbackBrandName = titleizeHost(host || brandSnapshot.url);
  const evidence = filterStoredEvidence(researchRun.evidence);
  const research = {
    sessionId: researchRun.sessionId,
    researchRunId,
    brandSnapshotId: brandSnapshot._id,
    websiteUrl: researchRun.url,
    finalUrl: researchRun.finalUrl || brandSnapshot.url,
    host,
    brand: {
      name: storedTextOrFallback(brandSnapshot.name, fallbackBrandName),
      url: brandSnapshot.url,
      host: brandSnapshot.host || "",
      title: storedTextOrFallback(brandSnapshot.title, fallbackBrandName),
      description: storedTextOrFallback(brandSnapshot.description, ""),
      faviconUrl: brandSnapshot.faviconUrl || null,
      logoUrl: brandSnapshot.logoUrl || null,
      ogImageUrl: brandSnapshot.ogImageUrl || null,
      screenshotUrl: brandSnapshot.screenshotUrl || null,
      colors: brandSnapshot.colors,
      fonts: brandSnapshot.fonts,
      vibeTags: brandSnapshot.vibeTags,
    },
    evidence,
    metadata: researchRun.metadata || {},
    branding: researchRun.branding || {},
	    adAngles: researchRun.adAngles || [],
	    productCatalog: researchRun.productCatalog || null,
	    providerStatus: researchRun.providerStatus || [],
  };

  return {
    ...research,
    brandBrief: normalizeBrandBriefPayload(researchRun.brandBrief || {}, buildFallbackBrandBrief(research)),
  } satisfies StoredWebsiteResearchResult;
}

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
	      adAngles: research.adAngles || [],
	      productCatalog: research.productCatalog || undefined,
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

export const latestAdAnglesForHost: ReturnType<typeof internalQuery> = internalQuery({
  args: {
    host: v.string(),
  },
  handler: async (ctx, { host }) => {
    const row = await ctx.db
      .query("brandAdAngles")
      .withIndex("by_host_and_updatedAt", (q) => q.eq("host", host))
      .order("desc")
      .first();

    return row?.angles || null;
  },
});

export const saveAdAnglesForHost: ReturnType<typeof internalMutation> = internalMutation({
  args: {
    host: v.string(),
    angles: v.any(),
    providerStatus: v.any(),
  },
  handler: async (ctx, { host, angles, providerStatus }) => {
    const now = Date.now();
    await ctx.db.insert("brandAdAngles", {
      host,
      angles,
      providerStatus,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const latestBrandSnapshotForHost: ReturnType<typeof internalQuery> = internalQuery({
  args: {
    host: v.string(),
  },
  handler: async (ctx, { host }) => {
    const snapshot = await ctx.db
      .query("brandSnapshots")
      .withIndex("by_host_and_updatedAt", (q) => q.eq("host", host))
      .order("desc")
      .first();

    if (!snapshot) return null;

    return {
      name: snapshot.name,
      url: snapshot.url,
      host: snapshot.host || host,
      title: snapshot.title || "",
      description: snapshot.description || "",
      faviconUrl: snapshot.faviconUrl || null,
      logoUrl: snapshot.logoUrl || null,
      ogImageUrl: snapshot.ogImageUrl || null,
      screenshotUrl: snapshot.screenshotUrl || null,
      colors: snapshot.colors || [],
      fonts: snapshot.fonts || { feel: "unknown" },
      vibeTags: snapshot.vibeTags || [],
    };
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
