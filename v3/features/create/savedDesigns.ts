import type { AdFormatId, AdScene } from "../scene/types";

export const MAX_SAVED_DESIGNS = 8;

export type SavedAdSceneDesign = {
  id: string;
  title: string;
  format: AdFormatId;
  scene: AdScene;
  createdAt: number;
  updatedAt: number;
};

const cleanText = (value: unknown, maxLength = 80) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength)
  .trim();

export const createSavedDesignId = (scene: AdScene) => [
  scene.format,
  scene.metadata.generationBatchId,
  scene.metadata.candidateIndex,
  scene.creative.angleId,
].map((part) => cleanText(part, 48) || "scene").join(":");

export const createSavedDesignTitle = (scene: AdScene) => (
  cleanText(scene.creative.headline, 72) || `${cleanText(scene.brand.name, 40) || "Saved"} ad`
);

export const assertSavableAdScene = (value: unknown): AdScene => {
  const scene = value && typeof value === "object" ? value as Partial<AdScene> : null;

  if (!scene || typeof scene !== "object") throw new Error("Saved design scene is missing.");
  if (!scene.format) throw new Error("Saved design format is missing.");
  if (!scene.brand?.name?.trim()) throw new Error("Saved design brand is missing.");
  if (!scene.creative?.headline?.trim()) throw new Error("Saved design headline is missing.");

  return scene as AdScene;
};
