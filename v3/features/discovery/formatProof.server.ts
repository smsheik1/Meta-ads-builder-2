import { readFileSync } from "node:fs";
import path from "node:path";
import { getDiscoveryEntriesByFormat } from "./catalog";
import type { DiscoveryFormatProfile } from "./types";

type FormatProfileConfig = {
  slug: string;
  promise: string;
  lastUpdated: string;
  technicalHref?: string;
  manifestPath?: string;
  whatStays: string[];
  whatChanges: string[];
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
  };
}
