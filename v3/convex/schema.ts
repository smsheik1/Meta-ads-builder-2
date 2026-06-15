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
    finalUrl: v.optional(v.string()),
    host: v.optional(v.string()),
    brandName: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    markdown: v.optional(v.string()),
    screenshotUrl: v.optional(v.string()),
    branding: v.optional(v.any()),
    brandBrief: v.optional(v.any()),
    receipts: v.optional(v.any()),
    evidence: v.optional(v.any()),
    metadata: v.optional(v.any()),
    providerStatus: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"]),

  brandSnapshots: defineTable({
    researchRunId: v.id("researchRuns"),
    sessionId: v.string(),
    name: v.string(),
    url: v.string(),
    host: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    ogImageUrl: v.optional(v.string()),
    colors: v.any(),
    fonts: v.any(),
    vibeTags: v.array(v.string()),
    screenshotUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_researchRunId", ["researchRunId"])
    .index("by_host_and_updatedAt", ["host", "updatedAt"]),

  adScenes: defineTable({
    sessionId: v.string(),
    researchRunId: v.optional(v.id("researchRuns")),
    brandSnapshotId: v.optional(v.id("brandSnapshots")),
    format: v.string(),
    generationBatchId: v.optional(v.string()),
    candidateIndex: v.optional(v.number()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
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
    rendererVersion: v.optional(v.string()),
    outputStorageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),

  renderWorkers: defineTable({
    workerId: v.string(),
    rendererVersion: v.string(),
    startedAt: v.number(),
    lastSeenAt: v.number(),
  }).index("by_workerId", ["workerId"]),

  audioAssets: defineTable({
    sessionId: v.string(),
    sceneKey: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    durationMs: v.number(),
    transcript: v.string(),
    provider: v.string(),
    model: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_storageId", ["storageId"]),

  savedDesigns: defineTable({
    sessionId: v.string(),
    designId: v.string(),
    title: v.string(),
    format: v.string(),
    scene: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_sessionId_and_designId", ["sessionId", "designId"]),

  sharePages: defineTable({
    slug: v.string(),
    sessionId: v.string(),
    sceneId: v.id("adScenes"),
    renderJobId: v.optional(v.id("renderJobs")),
    ctaUrl: v.optional(v.string()),
    previewPlatform: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),
});
