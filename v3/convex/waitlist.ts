import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation } from "./_generated/server";
import { isValidWaitlistEmail, normalizeWaitlistEmail } from "../features/waitlist/email";
import { syncWaitlistSignupToLoops } from "../features/waitlist/loops";

const signupArgs = {
  email: v.string(),
  source: v.optional(v.string()),
  referrer: v.optional(v.string()),
  utmSource: v.optional(v.string()),
  utmMedium: v.optional(v.string()),
  utmCampaign: v.optional(v.string()),
  utmContent: v.optional(v.string()),
  ref: v.optional(v.string()),
  userAgent: v.optional(v.string()),
};

export const join: ReturnType<typeof mutation> = mutation({
  args: signupArgs,
  handler: async (ctx, args) => {
    const email = normalizeWaitlistEmail(args.email);
    if (!isValidWaitlistEmail(email)) {
      throw new Error("Enter a real email address.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const metadata = {
      source: args.source,
      referrer: args.referrer,
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      utmContent: args.utmContent,
      ref: args.ref,
      userAgent: args.userAgent,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, metadata);
      return { status: "updated" as const };
    }

    await ctx.db.insert("waitlistSignups", {
      email,
      ...metadata,
      createdAt: now,
    });
    return { status: "created" as const };
  },
});

export const joinAndSync: ReturnType<typeof action> = action({
  args: signupArgs,
  handler: async (ctx, args) => {
    const email = normalizeWaitlistEmail(args.email);
    if (!isValidWaitlistEmail(email)) {
      throw new Error("Enter a real email address.");
    }

    const result = await ctx.runMutation(api.waitlist.join, args);
    await syncWaitlistSignupToLoops({
      email,
      source: args.source,
      referrer: args.referrer,
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      utmContent: args.utmContent,
      ref: args.ref,
    }, {
      apiKey: process.env.LOOPS_API_KEY,
    });

    return result;
  },
});
