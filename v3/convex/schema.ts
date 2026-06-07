import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    anonymousId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_anonymousId", ["anonymousId"]),

  researchRuns: defineTable({
    sessionId: v.string(),
    url: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    markdown: v.optional(v.string()),
    screenshotUrl: v.optional(v.string()),
    branding: v.optional(v.any()),
    receipts: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"]),

  brandSnapshots: defineTable({
    researchRunId: v.id("researchRuns"),
    sessionId: v.string(),
    name: v.string(),
    url: v.string(),
    logoUrl: v.optional(v.string()),
    colors: v.any(),
    fonts: v.any(),
    vibeTags: v.array(v.string()),
    screenshotUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_researchRunId", ["researchRunId"]),

  adScenes: defineTable({
    sessionId: v.string(),
    researchRunId: v.optional(v.id("researchRuns")),
    brandSnapshotId: v.optional(v.id("brandSnapshots")),
    format: v.string(),
    scene: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_researchRunId", ["researchRunId"]),

  renderJobs: defineTable({
    sessionId: v.string(),
    sceneId: v.id("adScenes"),
    status: v.union(
      v.literal("queued"),
      v.literal("claimed"),
      v.literal("rendering"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    progress: v.number(),
    outputStorageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),

  sharePages: defineTable({
    slug: v.string(),
    sessionId: v.string(),
    sceneId: v.id("adScenes"),
    renderJobId: v.optional(v.id("renderJobs")),
    ctaUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),
});
