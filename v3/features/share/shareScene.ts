import type { AdScene } from "../scene/types";

const fallbackSlug = "wiggly-ad";

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null
);

export function assertShareableAdScene(value: unknown): AdScene {
  if (!isRecord(value)) throw new Error("Share scene is missing.");

  const scene = value as AdScene;
  if (scene.version !== 1) throw new Error("Share scene version is not supported.");
  if (scene.format !== "visualizer") throw new Error("Share scene format is not supported yet.");
  if (!scene.brand?.name?.trim()) throw new Error("Share scene brand name is missing.");
  if (!scene.creative?.headline?.trim()) throw new Error("Share scene headline is missing.");
  if (!scene.creative?.subheadline?.trim()) throw new Error("Share scene subheadline is missing.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style?.visualizerColor || "")) {
    throw new Error("Share scene visualizer color is invalid.");
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
