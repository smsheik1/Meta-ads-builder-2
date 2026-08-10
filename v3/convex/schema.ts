import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    anonymousId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_anonymousId", ["anonymousId"]),

  waitlistSignups: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    referrer: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    ref: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  discoverySubmissions: defineTable({
    creatorName: v.string(),
    contactEmail: v.string(),
    formatUrl: v.string(),
    outputUrls: v.array(v.string()),
    promise: v.string(),
    sourceCredit: v.string(),
    sourceType: v.optional(v.union(v.literal("github"), v.literal("zip"))),
    sourceKey: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    archiveStorageId: v.optional(v.id("_storage")),
    archiveName: v.optional(v.string()),
    archiveSize: v.optional(v.number()),
    repoName: v.optional(v.string()),
    formatName: v.optional(v.string()),
    scanReport: v.optional(v.object({
      schemaVersion: v.literal(1),
      fileCount: v.number(),
      requiredFound: v.number(),
      requiredTotal: v.number(),
      readyForRuntimeTest: v.boolean(),
      checks: v.array(v.object({
        id: v.union(
          v.literal("instructions"),
          v.literal("manifest"),
          v.literal("runtime"),
          v.literal("requirements"),
          v.literal("inputs"),
          v.literal("outputs"),
          v.literal("quality"),
          v.literal("proof"),
          v.literal("assets"),
        ),
        label: v.string(),
        description: v.string(),
        required: v.boolean(),
        found: v.boolean(),
        evidence: v.array(v.string()),
      })),
    })),
    status: v.literal("pending"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_contactEmail_and_sourceKey", ["contactEmail", "sourceKey"]),

  discoveryHiddenEntries: defineTable({
    entryId: v.string(),
    hiddenAt: v.number(),
  }).index("by_entryId", ["entryId"]),

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
	    adAngles: v.optional(v.any()),
	    productCatalog: v.optional(v.any()),
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

  brandAdAngles: defineTable({
    host: v.string(),
    angles: v.any(),
    providerStatus: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_host_and_updatedAt", ["host", "updatedAt"]),

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

  jingleStoryboards: defineTable({
    sessionId: v.string(),
    sceneId: v.id("adScenes"),
    visualStyle: v.string(),
    imageModel: v.string(),
    shotCount: v.number(),
    storyboard: v.any(),
    stitchStatus: v.optional(v.union(
      v.literal("queued"),
      v.literal("claimed"),
      v.literal("rendering"),
      v.literal("ready"),
      v.literal("failed"),
    )),
    stitchProgress: v.optional(v.number()),
    stitchError: v.optional(v.string()),
    stitchOutputStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_sceneId_and_updatedAt", ["sceneId", "updatedAt"])
    .index("by_stitchStatus_and_updatedAt", ["stitchStatus", "updatedAt"]),

  productPhotoshoots: defineTable({
    sessionId: v.string(),
    researchRunId: v.id("researchRuns"),
    productHandle: v.string(),
    imageModel: v.string(),
    aspectRatio: v.string(),
    board: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_researchRunId_and_updatedAt", ["researchRunId", "updatedAt"]),

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

  formatDrafts: defineTable({
    draftId: v.string(),
    draft: v.any(),
  }).index("by_draftId", ["draftId"]),

  formatVersions: defineTable({
    versionId: v.string(),
    draftId: v.string(),
    version: v.number(),
    snapshot: v.any(),
  })
    .index("by_versionId", ["versionId"])
    .index("by_draftId_and_version", ["draftId", "version"]),

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
