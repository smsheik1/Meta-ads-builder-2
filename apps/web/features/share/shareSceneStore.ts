import fs from 'node:fs/promises';
import path from 'node:path';
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

const getShareStoreDir = () => (
  path.join(process.cwd(), 'tmp', 'create-v2-shares')
);

const getShareRecordPath = (slug: string) => (
  path.join(getShareStoreDir(), `${slug}.json`)
);

const sanitizeSlug = (value: string) => (
  value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
);

export const saveShareSceneRecord = async (scene: AdScene, now = Date.now()) => {
  await fs.mkdir(getShareStoreDir(), { recursive: true });

  const baseSlug = sanitizeSlug(createSceneSlug(scene, now));
  let slug = baseSlug;
  let attempt = 0;

  while (attempt < 5) {
    try {
      await fs.access(getShareRecordPath(slug));
      attempt += 1;
      slug = `${baseSlug}-${attempt + 1}`;
    } catch {
      break;
    }
  }

  const record: ShareSceneRecord = {
    ...createRenderSnapshot(scene),
    slug,
    createdAt: now,
  };

  await fs.writeFile(getShareRecordPath(slug), JSON.stringify(record), 'utf8');

  return record;
};

export const readShareSceneRecord = async (slug: string) => {
  const safeSlug = sanitizeSlug(slug);
  if (!safeSlug || safeSlug !== slug) return null;

  try {
    const raw = await fs.readFile(getShareRecordPath(safeSlug), 'utf8');
    return JSON.parse(raw) as ShareSceneRecord;
  } catch {
    return null;
  }
};
