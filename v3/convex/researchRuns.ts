import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import {
  fetchWebsiteResearchWithFirecrawl,
  toWebsiteResearchErrorMessage,
} from "../features/research/firecrawl";
import { extractAdAnglesFromResearch } from "../features/research/adAngles";
import { normalizePublicWebsiteUrl } from "../features/research/url";

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
