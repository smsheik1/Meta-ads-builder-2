import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import {
  fetchWebsiteResearchWithFirecrawl,
  toWebsiteResearchErrorMessage,
} from "../features/research/firecrawl";
import { extractAdAnglesFromResearch } from "../features/research/adAngles";
import {
  buildDirectProductPageCatalog,
  fetchEcommerceProductCatalog,
} from "../features/research/productCatalog";
import { normalizePublicWebsiteUrl } from "../features/research/url";
import { toStoredResearchResult } from "./researchStorage";

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
      const websiteUrl = normalizePublicWebsiteUrl(url);
      const cachedBrand = await ctx.runQuery(internal.researchStorage.latestBrandSnapshotForHost, {
        host: websiteUrl.hostname,
      });
      let result = await fetchWebsiteResearchWithFirecrawl(url, {
        brandAssets: { cachedBrand },
      });
      const productCatalog = await fetchEcommerceProductCatalog(result.finalUrl || url);
      const directProductCatalog = productCatalog.catalog
        ? null
        : buildDirectProductPageCatalog(result);
      result = {
        ...result,
        productCatalog: productCatalog.catalog || directProductCatalog?.catalog || null,
        providerStatus: [
          ...result.providerStatus,
          productCatalog.providerStatus,
          ...(directProductCatalog ? [directProductCatalog.providerStatus] : []),
        ],
      };
      const cachedAdAngles = await ctx.runQuery(internal.researchStorage.latestAdAnglesForHost, {
        host: result.host,
      });
      if (cachedAdAngles?.length) {
        result = {
          ...result,
          adAngles: cachedAdAngles,
          providerStatus: [
            ...result.providerStatus,
            {
              provider: "ad-angles",
              status: "used",
              reason: `Reused cached ad angles for ${result.host}.`,
            },
          ],
        };
      } else {
        const angles = await extractAdAnglesFromResearch(result);
        result = {
          ...result,
          adAngles: angles.adAngles,
          providerStatus: [...result.providerStatus, angles.providerStatus],
        };
        if (angles.adAngles.length) {
          await ctx.runMutation(internal.researchStorage.saveAdAnglesForHost, {
            host: result.host,
            angles: angles.adAngles,
            providerStatus: angles.providerStatus,
          });
        }
      }
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
      try {
        await ctx.runMutation(internal.researchStorage.saveFailed, {
          researchRunId,
          error: message,
        });
      } catch (saveError) {
        console.warn("Could not save failed research run.", {
          researchRunId,
          originalError: message,
          saveError: toWebsiteResearchErrorMessage(saveError),
        });
      }

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

export const latestReadyForAnonymousIdAndUrl: ReturnType<typeof query> = query({
  args: {
    anonymousId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { anonymousId, url }) => {
    let targetUrl: URL;
    try {
      targetUrl = normalizePublicWebsiteUrl(url);
    } catch {
      return null;
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_anonymousId", (q) => q.eq("anonymousId", anonymousId))
      .first();
    if (!session) return null;

    const targetKey = targetUrl.href;
    const rows = await ctx.db
      .query("researchRuns")
      .withIndex("by_sessionId_and_updatedAt", (q) => q.eq("sessionId", session._id))
      .order("desc")
      .take(50);
    const researchRun = rows.find((row) => {
      if (row.status !== "ready") return false;
      return [row.url, row.finalUrl]
        .filter(Boolean)
        .some((value) => {
          try {
            return normalizePublicWebsiteUrl(value!).href === targetKey;
          } catch {
            return false;
          }
        });
    });
    if (!researchRun || !researchRun.evidence) return null;

    const brandSnapshot = await ctx.db
      .query("brandSnapshots")
      .withIndex("by_researchRunId", (q) => q.eq("researchRunId", researchRun._id))
      .first();
    if (!brandSnapshot) return null;

    return toStoredResearchResult(researchRun, brandSnapshot);
  },
});
