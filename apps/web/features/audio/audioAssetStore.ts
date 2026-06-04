import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { cloneAdScene, type AdScene } from '@/features/create/scene';

export type StoredAudioAsset = {
  storageId: string;
  url: string;
  mimeType: string;
  durationMs: number;
  size: number;
};

type UploadGeneratedAudioAssetInput = {
  audioBase64: string;
  mimeType: string;
  uploadUrl?: string;
  sessionId: string;
  sceneId: string;
  scriptId: string;
  durationMs: number;
  transcript: string;
  captionCount: number;
};

export const getConvexHttpClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

  if (!url) {
    throw new Error('Convex is not configured.');
  }

  return new ConvexHttpClient(url);
};

const toStorageId = (storageId: string) => storageId as Id<'_storage'>;

export const createAudioAssetUploadUrl = async () => (
  getConvexHttpClient().mutation(api.audioAssets.generateUploadUrl, {})
);

export const uploadGeneratedAudioAsset = async (
  input: UploadGeneratedAudioAssetInput,
): Promise<StoredAudioAsset> => {
  const client = getConvexHttpClient();
  const audioBuffer = Buffer.from(input.audioBase64, 'base64');

  if (!audioBuffer.length) {
    throw new Error('Generated audio was empty.');
  }

  const uploadUrl = input.uploadUrl || await createAudioAssetUploadUrl();
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'content-type': input.mimeType,
    },
    body: audioBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error('Could not store generated audio.');
  }

  const uploadPayload = await uploadResponse.json() as { storageId?: string };
  if (!uploadPayload.storageId) {
    throw new Error('Audio storage did not return a storage id.');
  }

  const asset = await client.mutation(api.audioAssets.saveGenerated, {
    storageId: toStorageId(uploadPayload.storageId),
    sessionId: input.sessionId,
    sceneId: input.sceneId,
    scriptId: input.scriptId,
    mimeType: input.mimeType,
    durationMs: input.durationMs,
    transcript: input.transcript,
    captionCount: input.captionCount,
  });

  return {
    ...asset,
    storageId: asset.storageId,
  };
};

export const getStoredAudioAssetUrl = async (storageId: string) => {
  const asset = await getConvexHttpClient().query(api.audioAssets.getUrl, {
    storageId: toStorageId(storageId),
  });

  return asset ? { ...asset, storageId: asset.storageId } : null;
};

export const refreshSceneAudioUrl = async (scene: AdScene): Promise<AdScene> => {
  if (
    (scene.audio.status !== 'generated' && scene.audio.status !== 'uploaded') ||
    scene.audio.sourceSceneId !== scene.id ||
    !scene.audio.storageId
  ) {
    return scene;
  }

  const asset = await getStoredAudioAssetUrl(scene.audio.storageId);
  if (!asset?.url) {
    return scene;
  }

  const nextScene = cloneAdScene(scene);
  nextScene.audio = {
    ...nextScene.audio,
    url: asset.url,
    mimeType: asset.mimeType,
    durationMs: nextScene.audio.durationMs || asset.durationMs || null,
  };

  return nextScene;
};
