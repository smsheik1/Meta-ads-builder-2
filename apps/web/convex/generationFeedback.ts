import { v } from "convex/values";
import { mutation } from "./_generated/server";

const feedbackRatingValidator = v.union(v.literal("up"), v.literal("down"));

const generationFeedbackFields = {
  sessionId: v.string(),
  sceneId: v.string(),
  rating: feedbackRatingValidator,
  websiteUrl: v.string(),
  brandName: v.string(),
  platform: v.string(),
  headline: v.string(),
  subheadline: v.string(),
  ctaText: v.string(),
  styleId: v.union(v.string(), v.null()),
  headlineColor: v.union(v.string(), v.null()),
  backgroundColor: v.string(),
  accentColor: v.string(),
  visualizerColor: v.string(),
  adModel: v.string(),
  hasAudio: v.boolean(),
  audioStatus: v.string(),
  audioDurationMs: v.union(v.number(), v.null()),
  sceneCreatedAt: v.number(),
  sceneUpdatedAt: v.number(),
};

const storedGenerationFeedbackValidator = v.object({
  ...generationFeedbackFields,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const submit = mutation({
  args: {
    feedback: v.object(generationFeedbackFields),
  },
  returns: storedGenerationFeedbackValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("generationFeedback")
      .withIndex("by_sessionId_and_sceneId", (q) => (
        q.eq("sessionId", args.feedback.sessionId).eq("sceneId", args.feedback.sceneId)
      ))
      .unique();
    const now = Date.now();
    const row = {
      ...args.feedback,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.replace(existing._id, row);
    } else {
      await ctx.db.insert("generationFeedback", row);
    }

    return row;
  },
});
