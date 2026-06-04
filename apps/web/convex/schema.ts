import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
