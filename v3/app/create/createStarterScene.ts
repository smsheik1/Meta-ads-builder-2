import type { VisualizerAdScene } from "@/features/scene/types";
import { getVisualizerVariantForCandidate } from "@/features/scene/visualizerVariants";

const placeholderVariants = [
  {
    headline: "Drop in your website and watch the magic happen.",
    color: "#00d6b8",
    background: "#fbfaf5",
  },
  {
    headline: "Turn your homepage into a ready-to-test ad.",
    color: "#82dfff",
    background: "#f2fbff",
  },
  {
    headline: "Your next ad starts with one URL.",
    color: "#f9a8d4",
    background: "#fff7fb",
  },
  {
    headline: "Make the first draft less painful.",
    color: "#8b5cf6",
    background: "#f7f3ff",
  },
  {
    headline: "See the angle hiding on your website.",
    color: "#22c55e",
    background: "#f3fff7",
  },
  {
    headline: "From brand page to video ad in minutes.",
    color: "#f59e0b",
    background: "#fff8ed",
  },
];

export const placeholderAdSurfaceVariantCount = placeholderVariants.length;

export const createStarterPlaceholderScene = (variantIndex: number): VisualizerAdScene => {
  const variant = placeholderVariants[Math.abs(variantIndex) % placeholderVariants.length] || placeholderVariants[0]!;
  const visualizerVariant = getVisualizerVariantForCandidate(variantIndex).visualizer;

  return {
    version: 1,
    format: "visualizer",
    brand: {
      name: "Your brand",
      url: "https://yourbrand.com",
      host: "yourbrand.com",
      title: "Your brand",
      description: "Your generated ad appears on the canvas.",
      faviconUrl: null,
      logoUrl: "/wiggly-logo.svg",
      ogImageUrl: null,
      screenshotUrl: null,
      colors: [variant.color],
      fonts: {
        feel: "sans",
      },
      vibeTags: ["starter"],
      receipts: {
        specificClaims: [],
        buyerMoments: [],
        exactSiteLanguage: [],
        namedProof: [],
      },
    },
    creative: {
      angleId: `starter-${variantIndex}`,
      headline: variant.headline,
      subheadline: "Add audio for this ad",
      ctaText: "Add audio",
      headlineType: "callout",
      selectedPain: "",
      selectedProof: "",
    },
    style: {
      backgroundColor: variant.background,
      textColor: "#0f172a",
      accentColor: "#52627A",
      fontFeel: "sans",
      visualizerColor: variant.color,
      visualizer: visualizerVariant,
    },
    audio: {
      status: "none",
      transcript: "",
      captions: [],
    },
    layout: {
      preset: "centered-hero",
    },
    metadata: {
      candidateIndex: variantIndex,
      generationBatchId: "starter-placeholder",
      researchRunId: "starter-placeholder",
      brandSnapshotId: "starter-placeholder",
      model: "starter",
      provider: "deterministic",
      generatedAt: 0,
    },
  };
};
