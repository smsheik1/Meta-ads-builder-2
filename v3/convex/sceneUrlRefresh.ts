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

export async function refreshThreeDBreakdownFinalVideoUrls(
  ctx: StorageCtx,
  scene: AdScene,
) {
  if (scene.format !== "three-d-breakdown" || !scene.layout.finalVideo?.storageId) return scene;
  const url = await ctx.storage.getUrl(scene.layout.finalVideo.storageId as Id<"_storage">);
  return {
    ...scene,
    layout: {
      ...scene.layout,
      finalVideo: {
        ...scene.layout.finalVideo,
        url: url || scene.layout.finalVideo.url,
      },
    },
  };
}

export async function refreshSceneAudioUrls(
  ctx: StorageCtx,
  scene: AdScene,
) {
  const audioUrl = scene.audio.status === "generated" && scene.audio.storageId
    ? await ctx.storage.getUrl(scene.audio.storageId as Id<"_storage">)
    : null;
  const musicUrl = scene.backgroundMusic?.storageId
    ? await ctx.storage.getUrl(scene.backgroundMusic.storageId as Id<"_storage">)
    : null;

  return {
    ...scene,
    audio: audioUrl && scene.audio.status === "generated"
      ? { ...scene.audio, url: audioUrl }
      : scene.audio,
    backgroundMusic: musicUrl && scene.backgroundMusic
      ? { ...scene.backgroundMusic, url: musicUrl }
      : scene.backgroundMusic,
  };
}
