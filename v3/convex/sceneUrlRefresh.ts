import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";
import type { AdScene } from "../features/scene/types";

type StorageCtx = Pick<GenericMutationCtx<DataModel> | GenericQueryCtx<DataModel>, "storage">;

export async function refreshJingleMusicVideoUrls(
  ctx: StorageCtx,
  scene: AdScene,
) {
  if (scene.format !== "jingle" || !scene.layout.musicVideo) return scene;

  return {
    ...scene,
    layout: {
      ...scene.layout,
      musicVideo: {
        ...scene.layout.musicVideo,
        clips: await Promise.all(scene.layout.musicVideo.clips.map(async (clip) => ({
          ...clip,
          url: await ctx.storage.getUrl(clip.storageId as Id<"_storage">),
        }))),
        stitchedVideo: scene.layout.musicVideo.stitchedVideo
          ? {
            ...scene.layout.musicVideo.stitchedVideo,
            url: await ctx.storage.getUrl(scene.layout.musicVideo.stitchedVideo.storageId as Id<"_storage">),
          }
          : undefined,
      },
    },
  };
}
