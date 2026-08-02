import path from "node:path";

export type ShowcaseAsset = {
  name: string;
  path: string;
  sourceUrl?: string;
};

export type LinkedInShowcaseInput = {
  version: 1;
  approvedVideo: ShowcaseAsset & {
    approved: true;
    approvalNote: string;
    sourceFormat?: string;
    sourceRun?: string;
  };
  brand: {
    name: string;
    logo: ShowcaseAsset;
  };
  featuredProduct?: ShowcaseAsset;
  heroProduct?: ShowcaseAsset;
  outputName?: string;
};

export type ShowcaseIngredient = ShowcaseAsset & {
  role: "featured-product" | "hero-product";
};

const supportedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);
const supportedVideoExtensions = new Set([".mp4", ".mov", ".webm"]);

export function resolveShowcaseIngredient(input: LinkedInShowcaseInput): ShowcaseIngredient | null {
  if (input.featuredProduct) return { ...input.featuredProduct, role: "featured-product" };
  if (input.heroProduct) return { ...input.heroProduct, role: "hero-product" };
  return null;
}

export function validateShowcaseInput(input: LinkedInShowcaseInput): string[] {
  const errors: string[] = [];
  if (input.version !== 1) errors.push("Input version must be 1.");
  if (!input.approvedVideo?.approved) errors.push("The source video must be explicitly approved before wrapping.");
  if (!input.approvedVideo?.approvalNote?.trim()) errors.push("The approved video needs an approval note.");
  if (!input.approvedVideo?.path?.trim()) errors.push("The approved video path is required.");
  if (!supportedVideoExtensions.has(path.extname(input.approvedVideo?.path || "").toLowerCase())) {
    errors.push("The approved video must be MP4, MOV, or WebM.");
  }
  if (!input.brand?.name?.trim()) errors.push("The brand name is required.");
  if (!input.brand?.logo?.path?.trim()) errors.push("The brand logo path is required.");
  if (!supportedImageExtensions.has(path.extname(input.brand?.logo?.path || "").toLowerCase())) {
    errors.push("The brand logo must be JPG, PNG, WebP, or SVG.");
  }
  const ingredient = resolveShowcaseIngredient(input);
  if (!ingredient) errors.push("Provide the featured product, or the business hero product when no product appears in the video.");
  if (ingredient && !supportedImageExtensions.has(path.extname(ingredient.path).toLowerCase())) {
    errors.push("The product or hero-offering image must be JPG, PNG, WebP, or SVG.");
  }
  if (input.outputName && !/^[a-z0-9][a-z0-9-]*$/.test(input.outputName)) {
    errors.push("outputName must use lowercase letters, numbers, and hyphens.");
  }
  return errors;
}

export function resolveInputAssetPath(inputPath: string, assetPath: string) {
  return path.resolve(path.dirname(inputPath), assetPath);
}
