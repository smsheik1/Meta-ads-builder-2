import { cloneAdScene, type AdScene } from './scene';
import { createSavedDesign, type SavedDesign } from './sceneAdapters';

export const SAVED_DESIGNS_STORAGE_KEY = 'wiggly_create_v2_saved_designs';
export const MAX_SAVED_DESIGNS = 8;

export type SavedDesignStorage = Pick<Storage, 'getItem' | 'setItem'>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object'
);

const normalizeSavedDesign = (value: unknown): SavedDesign | null => {
  if (!isRecord(value) || !isRecord(value.scene)) return null;
  if (typeof value.id !== 'string' || typeof value.title !== 'string') return null;
  if (typeof value.scene.id !== 'string' || !isRecord(value.scene.creative)) return null;

  const createdAt = Number(value.createdAt || value.scene.createdAt || Date.now());
  const updatedAt = Number(value.updatedAt || createdAt);

  return {
    id: value.id,
    title: value.title,
    scene: cloneAdScene(value.scene as AdScene),
    createdAt,
    updatedAt,
  };
};

export const parseSavedDesigns = (value: string | null): SavedDesign[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeSavedDesign)
      .filter((design): design is SavedDesign => Boolean(design))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_SAVED_DESIGNS);
  } catch {
    return [];
  }
};

export const readSavedDesigns = (storage: SavedDesignStorage): SavedDesign[] => (
  parseSavedDesigns(storage.getItem(SAVED_DESIGNS_STORAGE_KEY))
);

export const writeSavedDesigns = (
  storage: SavedDesignStorage,
  designs: SavedDesign[],
) => {
  storage.setItem(SAVED_DESIGNS_STORAGE_KEY, JSON.stringify(designs.slice(0, MAX_SAVED_DESIGNS)));
};

export const upsertSavedDesign = (
  currentDesigns: SavedDesign[],
  scene: AdScene,
  now = Date.now(),
): SavedDesign[] => {
  const existing = currentDesigns.find((design) => design.scene.id === scene.id);
  const nextDesign = createSavedDesign(
    scene,
    scene.creative.headline,
    now,
    existing?.id,
  );

  nextDesign.createdAt = existing?.createdAt ?? now;

  return [
    nextDesign,
    ...currentDesigns.filter((design) => design.id !== nextDesign.id),
  ].slice(0, MAX_SAVED_DESIGNS);
};

export const deleteSavedDesign = (
  currentDesigns: SavedDesign[],
  designId: string,
): SavedDesign[] => (
  currentDesigns.filter((design) => design.id !== designId)
);

export const sceneHasSavedSnapshot = (designs: SavedDesign[], scene: AdScene) => (
  designs.some((design) => (
    design.scene.id === scene.id &&
    design.scene.updatedAt === scene.updatedAt
  ))
);
