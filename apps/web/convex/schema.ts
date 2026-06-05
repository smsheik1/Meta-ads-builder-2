import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  audioAssets: defineTable({
    storageId: v.id("_storage"),
    sessionId: v.string(),
    sceneId: v.string(),
    scriptId: v.string(),
    mimeType: v.string(),
    durationMs: v.number(),
    transcript: v.string(),
    captionCount: v.number(),
    size: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_sessionId_and_createdAt", ["sessionId", "createdAt"])
    .index("by_sceneId", ["sceneId"]),
  generationFeedback: defineTable({
    sessionId: v.string(),
    sceneId: v.string(),
    rating: v.union(v.literal("up"), v.literal("down")),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_sceneId", ["sessionId", "sceneId"])
    .index("by_sceneId", ["sceneId"])
    .index("by_rating_and_updatedAt", ["rating", "updatedAt"]),
  savedDesigns: defineTable({
    sessionId: v.string(),
    designId: v.string(),
    sceneId: v.string(),
    title: v.string(),
    scene: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sessionId_and_updatedAt", ["sessionId", "updatedAt"])
    .index("by_sessionId_and_sceneId", ["sessionId", "sceneId"])
    .index("by_sessionId_and_designId", ["sessionId", "designId"]),
  shareScenes: defineTable({
    slug: v.string(),
    scene: v.any(),
    durationMs: v.number(),
    spec: v.object({
      compositionId: v.string(),
      width: v.number(),
      height: v.number(),
      label: v.string(),
    }),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),
});
