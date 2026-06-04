import type { Id } from '@/convex/_generated/dataModel';
import { getAdSceneBrandKey, type AdScene, type AdSceneAudio } from '@/features/create/scene';
import type { StoredAudioAsset } from './audioAssetStore';

type SaveAudioAssetInput = {
  storageId: Id<'_storage'>;
  sessionId: string;
  sceneId: string;
  scriptId: string;
  mimeType: string;
  durationMs: number;
  transcript: string;
  captionCount: number;
};

type UploadAudioFileInput = {
  file: File;
  scene: AdScene;
  sessionId: string;
  createUploadUrl: () => Promise<string>;
  saveAudioAsset: (input: SaveAudioAssetInput) => Promise<StoredAudioAsset>;
};

const getAudioFileDurationMs = (file: File): Promise<number | null> => (
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute('src');
      audio.load();
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const durationMs = Number.isFinite(audio.duration)
        ? Math.round(audio.duration * 1000)
        : null;
      cleanup();
      resolve(durationMs);
    };
    audio.onerror = () => {
      cleanup();
      resolve(null);
    };
    audio.src = objectUrl;
  })
);

export const createUploadedAudioScenePatch = async ({
  file,
  scene,
  sessionId,
  createUploadUrl,
  saveAudioAsset,
}: UploadAudioFileInput): Promise<Partial<AdSceneAudio>> => {
  if (file.type && !file.type.startsWith('audio/')) {
    throw new Error('Choose an audio file to upload.');
  }

  const uploadSceneId = scene.id;
  const uploadScriptId = `uploaded-${Date.now()}`;
  const [uploadUrl, durationMs] = await Promise.all([
    createUploadUrl(),
    getAudioFileDurationMs(file),
  ]);

  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Could not store uploaded audio.');
  }

  const uploadPayload = await uploadResponse.json() as { storageId?: string };
  if (!uploadPayload.storageId) {
    throw new Error('Audio storage did not return a storage id.');
  }

  const asset = await saveAudioAsset({
    storageId: uploadPayload.storageId as Id<'_storage'>,
    sessionId,
    sceneId: uploadSceneId,
    scriptId: uploadScriptId,
    mimeType: file.type || 'audio/mpeg',
    durationMs: durationMs ?? 0,
    transcript: '',
    captionCount: 0,
  });

  return {
    status: 'uploaded',
    url: asset.url,
    storageId: asset.storageId,
    mimeType: asset.mimeType,
    transcript: '',
    captions: [],
    sourceSceneId: uploadSceneId,
    scriptId: uploadScriptId,
    durationMs: durationMs ?? asset.durationMs ?? null,
    brandKey: getAdSceneBrandKey(scene),
  };
};
