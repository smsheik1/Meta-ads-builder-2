import type { ProductCatalogItem, StoredWebsiteResearchResult } from "../research/types";

export const PRODUCT_PHOTOSHOOT_IMAGE_MODEL = "google/nano-banana-2-lite";
export const PRODUCT_PHOTOSHOOT_SHOT_COUNT = 6;
export const PRODUCT_PHOTOSHOOT_ASPECT_RATIO = "4:5" as const;
export const PRODUCT_PHOTOSHOOT_FULL_GENERATION_LIMIT = 3;

export type ProductPhotoshootImage = {
  storageId: string;
  url: string | null;
  mimeType: string;
};

export type ProductPhotoshootShot = {
  shotIndex: number;
  family: "studio" | "surface" | "lifestyle" | "gift" | "seasonal" | "social";
  label: string;
  prompt: string;
  image?: ProductPhotoshootImage;
  status: "pending" | "ok" | "failed";
  error?: string;
};

export type ProductPhotoshootBoard = {
  researchRunId: string;
  brandName: string;
  imageModel: typeof PRODUCT_PHOTOSHOOT_IMAGE_MODEL;
  aspectRatio: typeof PRODUCT_PHOTOSHOOT_ASPECT_RATIO;
  product: Pick<ProductCatalogItem, "title" | "handle" | "url" | "imageUrl" | "imageAlt" | "badges">;
  shots: ProductPhotoshootShot[];
  createdAt: number;
};

export function hasUsableProductPhotoshootBoard(board: ProductPhotoshootBoard | null | undefined) {
  return Boolean(board?.shots.some((shot) => shot.status === "ok" && shot.image?.url));
}

export function findLatestUsableProductPhotoshoot<T extends { board: ProductPhotoshootBoard }>(boards: T[]): T | null {
  return boards.find((item) => hasUsableProductPhotoshootBoard(item.board)) || null;
}

export function getProductPhotoshootPartialStopMessage(message: string) {
  if (!/quota|rate-limit|rate limit|credit|billing|Replicate/i.test(message)) return message;
  if (/saved below/i.test(message)) return message;
  return `${message} Shots that finished before the stop were saved below.`;
}

const sharedProductLock = (productTitle: string, brandName: string) => [
  `Keep the product identical to the reference image, unchanged: ${productTitle} by ${brandName}.`,
  "Do not alter the product package, logo, label, typography, colors, shape, size, flavor text, or visible product pieces.",
  "Only change the environment, lighting, surface, props, and camera framing.",
  "Photorealistic commercial product photography, clean ad-ready composition, no extra text, no captions, no watermarks.",
].join(" ");

export function createProductPhotoshootPromptPlan(
  research: StoredWebsiteResearchResult,
  product: ProductCatalogItem,
) {
  const brandName = research.brand.name || research.brandBrief.brandName || "the brand";
  const colors = (research.brand.colors || []).slice(0, 3).join(", ");
  const productTitle = product.title;
  const base = sharedProductLock(productTitle, brandName);
  const colorContext = colors ? `Use a background palette inspired by these brand colors: ${colors}.` : "Use a premium neutral background palette that complements the product.";
  const productType = product.productType ? ` Product category: ${product.productType}.` : "";

  const shots: Omit<ProductPhotoshootShot, "image" | "status" | "error">[] = [
    {
      shotIndex: 0,
      family: "studio",
      label: "Hero studio",
      prompt: `${base} ${colorContext}${productType} Center the unchanged product as the hero on a seamless studio set with softbox lighting, gentle shadow, and generous negative space.`,
    },
    {
      shotIndex: 1,
      family: "surface",
      label: "Premium surface",
      prompt: `${base} Place the unchanged product on a premium tabletop surface with subtle brand-color accents, soft morning light from the left, and tasteful props that do not cover the product label.`,
    },
    {
      shotIndex: 2,
      family: "lifestyle",
      label: "In use moment",
      prompt: `${base} Create a lifestyle scene that shows the unchanged product ready to be enjoyed or gifted, with human context implied by hands or setting, but the product packaging remains fully readable.`,
    },
    {
      shotIndex: 3,
      family: "gift",
      label: "Giftable detail",
      prompt: `${base} Build a gift-ready scene around the unchanged product with ribbon, note card, or celebratory props, keeping the product logo and label unobstructed and sharp.`,
    },
    {
      shotIndex: 4,
      family: "seasonal",
      label: "Seasonal campaign",
      prompt: `${base} Stage the unchanged product in a tasteful campaign environment with warm highlights, clean foreground, and background props that reinforce gifting without adding readable text. Use specific seasonal or holiday cues only when the source product or brand evidence clearly supports them; otherwise use a neutral giftable campaign setting.`,
    },
    {
      shotIndex: 5,
      family: "social",
      label: "Scroll-stopper",
      prompt: `${base} Compose a bold social ad still with dynamic diagonal framing, crisp product detail, brand-color backdrop, and the unchanged product large enough to inspect clearly.`,
    },
  ];

  return shots.map((shot) => ({
    ...shot,
    status: "pending" as const,
  }));
}

export function findPhotoshootProduct(
  research: StoredWebsiteResearchResult,
  productHandle: string,
) {
  const handle = productHandle.trim();
  return (research.productCatalog?.products || []).find((product) => product.handle === handle);
}
