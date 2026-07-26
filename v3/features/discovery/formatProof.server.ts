import { readFileSync } from "node:fs";
import path from "node:path";
import { getDiscoveryEntriesByFormat } from "./catalog";
import type { DiscoveryFormatHandoff, DiscoveryFormatProfile } from "./types";

type FormatProfileConfig = {
  slug: string;
  promise: string;
  lastUpdated: string;
  technicalHref?: string;
  manifestPath?: string;
  whatStays: string[];
  whatChanges: string[];
  handoff?: DiscoveryFormatHandoff;
};

const formatConfigs: FormatProfileConfig[] = [
  {
    slug: "three-d-breakdown",
    promise: "Turn one evidence-backed product story into a fast, impossible-to-film 3D explanation.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/three-d-breakdown",
    manifestPath: "format-repositories/three-d-breakdown-v1/format.json",
    whatStays: [
      "One evidence-backed story",
      "Six visual beats",
      "One impossible mechanism reveal",
      "A product-first payoff",
    ],
    whatChanges: [
      "The brand and product",
      "The hidden customer problem",
      "The physical mechanism",
      "The final buyer action",
    ],
    handoff: {
      requiredInputs: [
        "A brand or product website",
        "Guide Me or Turbo mode",
        "What the video should focus on",
      ],
      deliverables: [
        "Five story directions",
        "One approved 20-second script",
        "Six-frame storyboard",
        "Four production endpoints",
        "Two video clips",
        "Narration and final MP4",
      ],
      instructions: [
        "Use website evidence and choose one story",
        "Review the storyboard before generating production images",
        "Ask again before paid video or voice calls",
        "Compare the final video with the packaged proof",
      ],
      estimates: [
        { label: "Story", cost: "Free", time: "about 1 min" },
        { label: "Storyboard + endpoints", cost: "~$0.05", time: "1-2 min" },
        { label: "Video", cost: "~$0.60", time: "3-6 min" },
        { label: "Voice + final", cost: "~$0.05", time: "under 2 min" },
      ],
      totalEstimate: "Usually about $0.70 and 5-12 min",
      output: "One vertical 1080 × 1920 MP4, about 20 seconds",
      firstQuestion: "What brand or website is this for?",
    },
  },
  {
    slug: "otaku-explainer",
    promise: "Teach a real idea through a familiar story world people already understand.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/cartoon-explainer",
    manifestPath: "format-repositories/otaku-explainer-v1/format.json",
    whatStays: [
      "A curious lead",
      "A clear expert",
      "One useful correction",
      "A simple final lesson",
    ],
    whatChanges: [
      "The topic being taught",
      "The story world",
      "The characters and voices",
      "The examples inside the lesson",
    ],
    handoff: {
      requiredInputs: [
        "The topic to explain",
        "A packaged story world",
      ],
      deliverables: [
        "A 12-18 scene lesson plan",
        "Character-matched narration",
        "One inspected explainer video",
      ],
      instructions: [
        "Run the packaged smoke test before planning",
        "Use only packaged roles, layouts, backgrounds, and assets",
        "Validate the scene plan before voice generation",
        "Inspect the full render before finalizing",
      ],
      estimates: [
        { label: "Plan + validation", cost: "Free", time: "2-5 min" },
        { label: "Voice + local render", cost: "$0 with the packaged free voice model", time: "3-10 min" },
      ],
      totalEstimate: "Usually $0 provider cost and 5-15 min with a packaged world",
      output: "One vertical explainer MP4, usually 60-75 seconds",
      firstQuestion: "What topic should the video explain?",
    },
  },
  {
    slug: "jingle",
    promise: "Turn one buyer truth into a 20-second hook people can remember and sing back.",
    lastUpdated: "July 2026",
    whatStays: [
      "One buyer problem",
      "One repeatable hook",
      "The brand name in the chorus",
      "A finished 20-second song",
    ],
    whatChanges: [
      "The brand and offer",
      "The music lane",
      "The lyrics",
      "The buyer action",
    ],
  },
  {
    slug: "video-meme",
    promise: "Turn one sharp buyer truth into a familiar reaction clip people understand instantly.",
    lastUpdated: "July 2026",
    whatStays: [
      "A recognizable reaction",
      "One brand-specific buyer truth",
      "A short caption-led payoff",
    ],
    whatChanges: [
      "The brand",
      "The buyer behavior",
      "The caption",
      "The meme template",
    ],
  },
  {
    slug: "meme",
    promise: "Turn a buyer's familiar frustration into an ad they understand in one glance.",
    lastUpdated: "July 2026",
    whatStays: ["A known visual setup", "One sharp buyer tension", "Fast recognition"],
    whatChanges: ["The meme", "The product truth", "The headline"],
  },
  {
    slug: "hybrid-news",
    promise: "Turn a real announcement into a bold, proof-led story people can scan quickly.",
    lastUpdated: "July 2026",
    whatStays: ["A real event", "One clear headline", "Visible source proof"],
    whatChanges: ["The subject", "The evidence", "The supporting image"],
  },
];

type FormatManifest = {
  id: string;
  version: string;
  title: string;
};

function readFormatManifest(manifestPath: string): FormatManifest {
  const absolutePath = path.join(process.cwd(), "public", manifestPath);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as FormatManifest;
}

export const discoveryFormatSlugs = formatConfigs.map((config) => config.slug);

export function getDiscoveryFormatProfile(slug: string): DiscoveryFormatProfile | null {
  const config = formatConfigs.find((candidate) => candidate.slug === slug);
  if (!config) return null;

  const proofEntries = getDiscoveryEntriesByFormat(slug);
  const identity = proofEntries[0]?.format;
  if (!identity) return null;

  const manifest = config.manifestPath ? readFormatManifest(config.manifestPath) : null;
  if (manifest && (manifest.id !== slug || manifest.version !== identity.version)) {
    throw new Error(`Discovery Format metadata does not match ${config.manifestPath}.`);
  }

  if (proofEntries.some((entry) => (
    entry.format.name !== identity.name ||
    entry.format.version !== identity.version ||
    entry.format.owner !== identity.owner
  ))) {
    throw new Error(`Discovery entries disagree about Format ${slug}.`);
  }

  return {
    slug,
    name: manifest?.title || identity.name,
    version: manifest?.version || identity.version,
    creator: identity.owner,
    promise: config.promise,
    lastUpdated: config.lastUpdated,
    technicalHref: config.technicalHref,
    proofEntries,
    whatStays: config.whatStays,
    whatChanges: config.whatChanges,
    handoff: config.handoff,
  };
}
