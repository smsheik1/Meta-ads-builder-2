import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  assertFormatDraft,
  assertFormatVersion,
  createFormatVersion,
} from "../features/builder/model";

function requireMakerAccess(accessToken: string) {
  const expected = process.env.WIGGLY_MAKER_ACCESS_TOKEN;
  if (!expected || accessToken !== expected) throw new Error("Maker access is not authorized.");
}

export const saveDraft = mutation({
  args: { accessToken: v.string(), draft: v.any() },
  handler: async (ctx, { accessToken, draft: value }) => {
    requireMakerAccess(accessToken);
    const draft = assertFormatDraft(value);
    const existing = await ctx.db
      .query("formatDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", draft.id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { draft });
    } else {
      await ctx.db.insert("formatDrafts", { draftId: draft.id, draft });
    }
    return draft;
  },
});

export const getDraft = query({
  args: { accessToken: v.string(), draftId: v.string() },
  handler: async (ctx, { accessToken, draftId }) => {
    requireMakerAccess(accessToken);
    const row = await ctx.db
      .query("formatDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", draftId))
      .unique();
    return row ? assertFormatDraft(row.draft) : null;
  },
});

export const publishDraft = mutation({
  args: { accessToken: v.string(), draftId: v.string() },
  handler: async (ctx, { accessToken, draftId }) => {
    requireMakerAccess(accessToken);
    const row = await ctx.db
      .query("formatDrafts")
      .withIndex("by_draftId", (q) => q.eq("draftId", draftId))
      .unique();
    if (!row) throw new Error("Format draft was not found.");
    const draft = assertFormatDraft(row.draft);
    const latest = await ctx.db
      .query("formatVersions")
      .withIndex("by_draftId_and_version", (q) => q.eq("draftId", draftId))
      .order("desc")
      .first();
    const version = createFormatVersion(draft, (latest?.version || 0) + 1);
    await ctx.db.insert("formatVersions", {
      versionId: version.id,
      draftId,
      version: version.version,
      snapshot: version,
    });
    const publishedDraft = {
      ...draft,
      status: "published" as const,
      publishedVersionId: version.id,
      updatedAt: version.publishedAt,
    };
    await ctx.db.patch(row._id, { draft: publishedDraft });
    return { draft: publishedDraft, version };
  },
});

export const getVersion = query({
  args: { accessToken: v.string(), versionId: v.string() },
  handler: async (ctx, { accessToken, versionId }) => {
    requireMakerAccess(accessToken);
    const row = await ctx.db
      .query("formatVersions")
      .withIndex("by_versionId", (q) => q.eq("versionId", versionId))
      .unique();
    return row ? assertFormatVersion(row.snapshot) : null;
  },
});
