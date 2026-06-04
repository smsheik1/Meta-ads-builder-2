import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import type { AdScene } from '@/features/create/scene';
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

const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

  if (!url) {
    throw new Error('Convex is not configured for share links.');
  }

  return new ConvexHttpClient(url);
};

export const createShareSceneRecord = (
  scene: AdScene,
  now = Date.now(),
  slug = sanitizeSlug(createSceneSlug(scene, now)),
): ShareSceneRecord => ({
    ...createRenderSnapshot(scene),
    slug,
    createdAt: now,
  });

export const saveShareSceneRecord = async (scene: AdScene, now = Date.now()) => {
  const record = createShareSceneRecord(scene, now);
  const saved = await getConvexClient().mutation(api.shareScenes.save, { record });

  return saved as ShareSceneRecord;
};

export const readShareSceneRecord = async (slug: string) => {
  const safeSlug = sanitizeSlug(slug);
  if (!safeSlug || safeSlug !== slug) return null;

  const record = await getConvexClient().query(api.shareScenes.getBySlug, { slug: safeSlug });
  return record as ShareSceneRecord | null;
};
