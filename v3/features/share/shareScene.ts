import type { AdScene } from "../scene/types";

const fallbackSlug = "wiggly-ad";

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
);

export function assertShareableAdScene(value: unknown): AdScene {
  if (!isRecord(value)) throw new Error("Share scene is missing.");

  const scene = value as AdScene;
  if (scene.version !== 1) throw new Error("Share scene version is not supported.");
  if (scene.format !== "visualizer" && scene.format !== "meme" && scene.format !== "were-sorry" && scene.format !== "jingle" && scene.format !== "text-message" && scene.format !== "brainrot" && scene.format !== "reviews" && scene.format !== "motion-story" && scene.format !== "three-d-breakdown") throw new Error("Share scene format is not supported yet.");
  if (!scene.brand?.name?.trim()) throw new Error("Share scene brand name is missing.");
  if (!scene.creative?.headline?.trim()) throw new Error("Share scene headline is missing.");
  if (!scene.creative?.subheadline?.trim()) throw new Error("Share scene subheadline is missing.");
  if (scene.format === "visualizer" && !/^#[0-9A-F]{6}$/i.test(scene.style?.visualizerColor || "")) {
    throw new Error("Share scene visualizer color is invalid.");
  }
  if (scene.format === "jingle" && scene.audio.status !== "generated") {
    throw new Error("Generate music before sharing this jingle.");
  }
  if (scene.format === "brainrot" && scene.audio.status !== "generated") {
    throw new Error("Generate audio before sharing this brainrot video.");
  }
  if (scene.format === "motion-story" && !scene.layout.musicBed.src.trim()) {
    throw new Error("Motion Story music is missing.");
  }
  if (scene.audio.status === "generated") {
    if (!scene.audio.storageId?.trim()) throw new Error("Share scene audio storage is missing.");
    if (!scene.audio.url?.trim()) throw new Error("Share scene audio URL is missing.");
    if (!scene.audio.mimeType?.trim()) throw new Error("Share scene audio type is missing.");
    if (!Number.isFinite(scene.audio.durationMs) || scene.audio.durationMs <= 0) {
      throw new Error("Share scene audio duration is invalid.");
    }
    if (!scene.audio.transcript?.trim()) throw new Error("Share scene audio transcript is missing.");
  }
  if (scene.backgroundMusic) {
    if (!scene.backgroundMusic.storageId?.trim()) throw new Error("Share scene background music storage is missing.");
    if (!scene.backgroundMusic.url?.trim()) throw new Error("Share scene background music URL is missing.");
    if (!scene.backgroundMusic.mimeType?.trim()) throw new Error("Share scene background music type is missing.");
    if (!Number.isFinite(scene.backgroundMusic.durationMs) || scene.backgroundMusic.durationMs <= 0) {
      throw new Error("Share scene background music duration is invalid.");
    }
  }

  return scene;
}

export function slugifyShareTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54)
    .replace(/-+$/g, "");

  return slug || fallbackSlug;
}

export function createShareSlug(scene: AdScene, suffix: string): string {
  const cleanSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6);

  return `${slugifyShareTitle(scene.creative.headline)}-${cleanSuffix || "share"}`;
}

export function createShareSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function sanitizeCtaUrl(value: string | undefined, fallback: string | undefined): string | undefined {
  const candidate = value || fallback;
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
