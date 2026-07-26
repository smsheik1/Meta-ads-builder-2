import type { DiscoveryEntry, DiscoveryGoal } from "./types";
import { databaseFormatDiscoveryEntries } from "./databaseFormatArchive";
import { jingleDiscoveryEntries } from "./jingleArchive";
import { videoMemeDiscoveryEntries } from "./videoMemeArchive";

export const discoveryCatalog: DiscoveryEntry[] = [
  {
    id: "final-straw-pocket-problem",
    status: "published",
    order: 1,
    brand: "FinalStraw",
    title: "The straw that fits in your pocket",
    curatorNote: "A familiar object becomes surprising when the mechanism is made visible.",
    goal: "sell",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/finalstraw.mp4",
      poster: "/discovery/final-straw.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "gruns-daily-stack",
    status: "published",
    order: 2,
    brand: "Grüns",
    title: "The daily stack, compressed",
    curatorNote: "The ad turns an invisible product promise into a physical journey.",
    goal: "explain",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/gruns.mp4",
      poster: "/discovery/gruns.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "theragun-heat-and-motion",
    status: "published",
    order: 3,
    brand: "Therabody",
    title: "Why heat changes the massage",
    curatorNote: "Two product benefits become one visual mechanism instead of a feature list.",
    goal: "explain",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/theragun.mp4",
      poster: "/discovery/theragun.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "kiala-supplement-journey",
    status: "published",
    order: 4,
    brand: "Kiala Nutrition",
    title: "The supplement journey",
    curatorNote: "The hidden delivery problem gives the product claim a visible reason.",
    goal: "explain",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/goldens/kiala.mp4",
      poster: "/discovery/kiala.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "lego-origin-story",
    status: "published",
    order: 5,
    brand: "LEGO",
    title: "How a wooden toy became a world",
    curatorNote: "A brand origin becomes a physical transformation instead of a timeline lecture.",
    goal: "story",
    media: {
      kind: "video",
      src: "/format-repositories/three-d-breakdown-v1/agent-runs/lego-origin-world-arc-proof/final.mp4",
      poster: "/discovery/lego-origin.jpg",
      durationLabel: "20 sec",
    },
    format: {
      slug: "three-d-breakdown",
      name: "3D Breakdown",
      version: "1.5.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "naruto-compilers",
    status: "published",
    order: 6,
    brand: "Developer Education",
    title: "Compilers, explained by Naruto",
    curatorNote: "Familiar characters carry a technical idea before the jargon arrives.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/naruto-compilers.mp4",
      poster: "/discovery/naruto-compilers.jpg",
      durationLabel: "75 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "naruto-mcp",
    status: "published",
    order: 7,
    brand: "Developer Tools",
    title: "MCP, explained by Naruto",
    curatorNote: "The visible roles make an unfamiliar agent protocol easier to remember.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/naruto-mcp.mp4",
      poster: "/discovery/naruto-mcp.jpg",
      durationLabel: "63 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "yugioh-compilers",
    status: "published",
    order: 8,
    brand: "Developer Education",
    title: "Compilers, explained by Yu-Gi-Oh!",
    curatorNote: "A second story world proves the lesson structure travels without changing the Format.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/yugioh-compilers.mp4",
      poster: "/discovery/yugioh-compilers.jpg",
      durationLabel: "64 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "danny-phantom-apis",
    status: "published",
    order: 9,
    brand: "Developer Education",
    title: "APIs, explained by Danny Phantom",
    curatorNote: "A ghost portal turns an invisible software handoff into a story people can follow.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/danny-apis.mp4",
      poster: "/discovery/danny-apis.jpg",
      durationLabel: "70 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "naruto-apis",
    status: "published",
    order: 10,
    brand: "Developer Education",
    title: "APIs, explained by Naruto",
    curatorNote: "A familiar mission makes software requests and responses easy to remember.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/naruto-apis.mp4",
      poster: "/discovery/naruto-apis.jpg",
      durationLabel: "68 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "spongebob-evs",
    status: "published",
    order: 11,
    brand: "Consumer Education",
    title: "Electric vehicles, explained by SpongeBob",
    curatorNote: "A playful world carries the comparison without turning it into a lecture.",
    goal: "teach",
    media: {
      kind: "video",
      src: "/format-repositories/otaku-explainer-v1/outputs/spongebob-evs.mp4",
      poster: "/discovery/spongebob-evs.jpg",
      durationLabel: "62 sec",
    },
    format: {
      slug: "otaku-explainer",
      name: "Cartoon Explainer",
      version: "1.2.0-experiment",
      owner: "Shaz",
    },
  },
  {
    id: "this-is-fine-ad-fatigue",
    status: "published",
    order: 12,
    brand: "Wiggly",
    title: "When every ad looks the same",
    curatorNote: "A known meme makes the buyer's frustration clear before the copy is read.",
    goal: "entertain",
    media: {
      kind: "image",
      src: "/memes/this_is_fine_full.png",
      durationLabel: "Static",
    },
    format: {
      slug: "meme",
      name: "Meme",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  {
    id: "hybrid-news-founder-moment",
    status: "published",
    order: 13,
    brand: "Founder-led",
    title: "Turn the announcement into the ad",
    curatorNote: "One real event becomes a clear story with a strong visual hierarchy.",
    goal: "story",
    media: {
      kind: "image",
      src: "/maker-fixtures/hybrid-news/reference.png",
      durationLabel: "Static",
    },
    format: {
      slug: "hybrid-news",
      name: "Hybrid News",
      version: "1.0.0",
      owner: "Wiggly Studio",
    },
  },
  ...databaseFormatDiscoveryEntries,
  ...jingleDiscoveryEntries,
  ...videoMemeDiscoveryEntries,
];

export function getPublishedDiscoveryEntries(
  entries: DiscoveryEntry[] = discoveryCatalog,
): DiscoveryEntry[] {
  return entries
    .filter((entry) => entry.status === "published")
    .sort((left, right) => left.order - right.order);
}

export function filterDiscoveryEntries(
  entries: DiscoveryEntry[],
  query: string,
  goal: DiscoveryGoal,
): DiscoveryEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return entries.filter((entry) => {
    const matchesGoal = goal === "all" || entry.goal === goal;
    if (!matchesGoal) return false;
    if (!normalizedQuery) return true;

    return [
      entry.brand,
      entry.title,
      entry.format.name,
      entry.format.owner,
      entry.curatorNote,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

export function getDiscoveryEntryById(id: string): DiscoveryEntry | undefined {
  return getPublishedDiscoveryEntries().find((entry) => entry.id === id);
}

export function getDiscoveryEntriesByFormat(formatSlug: string): DiscoveryEntry[] {
  return getPublishedDiscoveryEntries().filter((entry) => entry.format.slug === formatSlug);
}

export function getRelatedDiscoveryEntries(entry: DiscoveryEntry, limit = 3): DiscoveryEntry[] {
  return getDiscoveryEntriesByFormat(entry.format.slug)
    .filter((candidate) => candidate.id !== entry.id)
    .slice(0, limit);
}
