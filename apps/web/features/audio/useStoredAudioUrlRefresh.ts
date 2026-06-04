'use client';

import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { AdScene } from '@/features/create/scene';
import type { AdSceneAction } from '@/features/create/sceneReducer';

type AdSceneDispatch = (action: AdSceneAction) => void;

export const useStoredAudioUrlRefresh = (scene: AdScene, dispatch: AdSceneDispatch) => {
  const refreshedAudioAsset = useQuery(
    api.audioAssets.getUrl,
    (scene.audio.status === 'generated' || scene.audio.status === 'uploaded') &&
      scene.audio.sourceSceneId === scene.id &&
      scene.audio.storageId
      ? { storageId: scene.audio.storageId as Id<'_storage'> }
      : 'skip',
  );

  useEffect(() => {
    if (
      !refreshedAudioAsset?.url ||
      (scene.audio.status !== 'generated' && scene.audio.status !== 'uploaded') ||
      scene.audio.sourceSceneId !== scene.id ||
      !scene.audio.storageId ||
      refreshedAudioAsset.storageId !== scene.audio.storageId ||
      refreshedAudioAsset.url === scene.audio.url
    ) {
      return;
    }

    dispatch({
      type: 'updateAudio',
      audio: {
        url: refreshedAudioAsset.url,
        mimeType: refreshedAudioAsset.mimeType,
        durationMs: scene.audio.durationMs || refreshedAudioAsset.durationMs || null,
      },
    });
  }, [
    dispatch,
    refreshedAudioAsset?.durationMs,
    refreshedAudioAsset?.mimeType,
    refreshedAudioAsset?.storageId,
    refreshedAudioAsset?.url,
    scene.audio.durationMs,
    scene.audio.status,
    scene.audio.storageId,
    scene.audio.url,
  ]);
};
