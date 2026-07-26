import { v } from "convex/values";
import {
  normalizeDiscoverySubmission,
  validateDiscoverySubmission,
} from "../features/discovery/submission";
import { internalQuery, mutation } from "./_generated/server";

const submissionArgs = {
  creatorName: v.string(),
  contactEmail: v.string(),
  formatUrl: v.string(),
  outputUrls: v.array(v.string()),
  promise: v.string(),
  sourceCredit: v.string(),
};

const submissionValidator = v.object({
  _id: v.id("discoverySubmissions"),
  _creationTime: v.number(),
  creatorName: v.string(),
  contactEmail: v.string(),
  formatUrl: v.string(),
  outputUrls: v.array(v.string()),
  promise: v.string(),
  sourceCredit: v.string(),
  status: v.literal("pending"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const submit: ReturnType<typeof mutation> = mutation({
  args: submissionArgs,
  returns: v.object({
    submissionId: v.id("discoverySubmissions"),
    status: v.union(v.literal("created"), v.literal("updated")),
  }),
  handler: async (ctx, args) => {
    const submission = normalizeDiscoverySubmission(args);
    const error = validateDiscoverySubmission(submission);
    if (error) throw new Error(error);

    const now = Date.now();
    const existing = await ctx.db
      .query("discoverySubmissions")
      .withIndex("by_contactEmail_and_formatUrl", (query) => (
        query
          .eq("contactEmail", submission.contactEmail)
          .eq("formatUrl", submission.formatUrl)
      ))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...submission,
        status: "pending",
        updatedAt: now,
      });
      return { submissionId: existing._id, status: "updated" as const };
    }

    const submissionId = await ctx.db.insert("discoverySubmissions", {
      ...submission,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { submissionId, status: "created" as const };
  },
});

export const listPending: ReturnType<typeof internalQuery> = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(submissionValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    return ctx.db
      .query("discoverySubmissions")
      .withIndex("by_status_and_createdAt", (query) => query.eq("status", "pending"))
      .order("desc")
      .take(limit);
  },
});
