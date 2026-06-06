import { api } from '@/convex/_generated/api';
import { getConvexHttpClient, refreshSceneAudioUrl } from '@/features/audio/audioAssetStore';
import type { AdScene } from '@/features/engine/scene';
import { stripInlineAudioForPersistence } from '@/features/engine/sceneAdapters';
import {
  createRenderSnapshot,
  createSceneSlug,
  type AdSceneRenderSnapshot,
} from '@/features/render/adSceneRender';

export type ShareSceneRecord = AdSceneRenderSnapshot & {
  slug: string;
  createdAt: number;
};

const sanitizeSlug = (value: string) => (
  value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
);

export const createShareSceneRecord = (
  scene: AdScene,
  now = Date.now(),
  slug = sanitizeSlug(createSceneSlug(scene, now)),
): ShareSceneRecord => ({
    ...createRenderSnapshot(stripInlineAudioForPersistence(scene)),
    slug,
    createdAt: now,
  });

export const saveShareSceneRecord = async (scene: AdScene, now = Date.now()) => {
  const record = createShareSceneRecord(await refreshSceneAudioUrl(scene), now);
  const saved = await getConvexHttpClient().mutation(api.shareScenes.save, { record });

  return saved as ShareSceneRecord;
};

export const readShareSceneRecord = async (slug: string) => {
  const safeSlug = sanitizeSlug(slug);
  if (!safeSlug || safeSlug !== slug) return null;

  const record = await getConvexHttpClient().query(api.shareScenes.getBySlug, { slug: safeSlug });
  if (!record) return null;

  return {
    ...record,
    scene: await refreshSceneAudioUrl(record.scene as AdScene),
  } as ShareSceneRecord;
};
