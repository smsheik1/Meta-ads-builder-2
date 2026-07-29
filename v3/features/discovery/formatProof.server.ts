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
    technicalHref: "/format-lab/brand-jingle",
    manifestPath: "format-repositories/brand-jingle-v1/format.json",
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
    handoff: {
      requiredInputs: [
        "A website or one-sentence no-website brief",
      ],
      deliverables: [
        "One evidence-backed song angle",
        "One validated lyric and timing plan",
        "One branded cover",
        "One inspected MP3",
      ],
      instructions: [
        "Research one useful buyer truth",
        "Use the default 20-second lane unless asked otherwise",
        "Show the lyrics, cover, and estimate before music generation",
        "Ask again before a replacement song",
      ],
      estimates: [
        { label: "Research + lyrics", cost: "$0 provider cost", time: "about 1-3 min" },
        { label: "Cover art", cost: "$0", time: "under 10 sec" },
        { label: "20-second music", cost: "about $0.05", time: "about 1-3 min" },
      ],
      totalEstimate: "Usually about $0.05 and 2-6 min",
      output: "One MP3 plus branded SVG cover art",
      firstQuestion: "What website is this for? If you do not have one, just say so.",
    },
  },
  {
    slug: "video-meme",
    promise: "Turn one sharp buyer truth into a familiar reaction clip people understand instantly.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/video-meme",
    manifestPath: "format-repositories/video-meme-v1/format.json",
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
    handoff: {
      requiredInputs: [
        "A brand website or one-sentence brief",
      ],
      deliverables: [
        "Three brand-specific caption options",
        "One selected reaction pattern",
        "One inspected MP4",
      ],
      instructions: [
        "Research one useful buyer truth",
        "Pick Bear, Pingu, or Darwin by pattern fit",
        "Validate the caption before rendering",
        "Watch the whole MP4 before final approval",
      ],
      estimates: [
        { label: "Research + caption", cost: "$0 Wiggly provider cost", time: "about 1-3 min" },
        { label: "Local MP4 render", cost: "$0 provider cost", time: "about 1-3 min" },
      ],
      totalEstimate: "$0 Wiggly provider cost and usually 2-6 min",
      output: "One 1080 × 1350 MP4 using a bundled reaction clip",
      firstQuestion: "What website or brand should this meme be for?",
    },
  },
  {
    slug: "visualizer",
    promise: "Turn a voice-led pitch into a branded visual people can follow with sound on or off.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/visualizer",
    manifestPath: "format-repositories/visualizer-v1/format.json",
    whatStays: ["One clear spoken idea", "Animated audio bars", "Readable captions"],
    whatChanges: ["The brand", "The script", "The colors", "The buyer action"],
    handoff: {
      requiredInputs: [
        "A brand or product website",
      ],
      deliverables: [
        "Five evidence-backed dialogue options",
        "One selected six-line conversation",
        "One two-speaker voice track",
        "One captioned 1080x1350 MP4",
      ],
      instructions: [
        "Research one specific buyer moment and one supported proof point",
        "Write five distinct Ava and Sam conversations",
        "Show the selected conversation and estimate before voice generation",
        "Inspect the audio stream and six matching captions before final approval",
      ],
      estimates: [
        { label: "Research + dialogue", cost: "$0 Wiggly provider cost", time: "about 2-5 min" },
        { label: "Two-speaker voice", cost: "usually about $0.01-$0.02; free tier may be $0", time: "under 2 min" },
        { label: "Local MP4 render", cost: "$0 provider cost", time: "about 1-3 min" },
      ],
      totalEstimate: "Usually about $0.01-$0.02 and 4-10 min",
      output: "One 1080x1350 MP4 with two voices, audio-driven bars, and six captions",
      firstQuestion: "What website is this conversation ad for?",
    },
  },
  {
    slug: "were-sorry",
    promise: "Turn product proof into an official apology that confidently regrets nothing.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/were-sorry",
    manifestPath: "format-repositories/were-sorry-v1/format.json",
    whatStays: ["An official statement", "Three proof-backed confessions", "A regret-nothing signoff"],
    whatChanges: ["The brand", "The evidence", "The apology", "The punchline"],
    handoff: {
      requiredInputs: [
        "A brand website",
      ],
      deliverables: [
        "Eight distinct official-apology concepts",
        "Eight static 1080 x 1350 PNGs",
        "Scene and research data",
      ],
      instructions: [
        "Research real buyer moments and supported product proof",
        "Stop when the joke would enter trust-sensitive territory",
        "Use the packaged prompt for all eight apologies",
        "Inspect all eight local PNGs before delivery",
      ],
      estimates: [
        { label: "Research", cost: "$0 Wiggly provider cost", time: "about 1-3 min" },
        { label: "Eight apologies", cost: "$0 separate provider cost", time: "about 1-2 min" },
        { label: "Eight PNGs", cost: "$0 provider cost", time: "about 1-2 min" },
      ],
      totalEstimate: "$0 Wiggly provider cost, usually 3-6 min",
      output: "Eight static 1080 x 1350 PNGs plus scene and research data",
      firstQuestion: "What website should I use?",
    },
  },
  {
    slug: "text-message",
    promise: "Put the product inside a believable conversation at the moment it becomes useful.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/text-message",
    manifestPath: "format-repositories/text-message-v1/format.json",
    whatStays: ["A familiar chat screen", "One buyer problem", "A natural product reveal"],
    whatChanges: ["The speakers", "The problem", "The proof", "The product"],
    handoff: {
      requiredInputs: [
        "A brand website",
      ],
      deliverables: [
        "Six distinct buyer conversations",
        "Six static iMessage-style PNGs",
        "Scene and research data",
      ],
      instructions: [
        "Research real buyer moments and proof from the website",
        "Use the packaged prompt for all six conversations",
        "Keep each thread casual, short, and inside the fixed text budgets",
        "Inspect all six local PNGs before delivery",
      ],
      estimates: [
        { label: "Research", cost: "$0 Wiggly provider cost", time: "about 1-3 min" },
        { label: "Six conversations", cost: "$0 separate provider cost", time: "about 1-2 min" },
        { label: "Six PNGs", cost: "$0 provider cost", time: "about 1-2 min" },
      ],
      totalEstimate: "$0 Wiggly provider cost, usually 3-6 min",
      output: "Six static 1080 x 1350 PNGs plus scene and research data",
      firstQuestion: "What website should I use?",
    },
  },
  {
    slug: "reviews",
    promise: "Turn real customer language into a proof-first ad people can trust at a glance.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/reviews",
    manifestPath: "format-repositories/reviews-v1/format.json",
    whatStays: ["A real review", "Clear attribution", "A proof-first layout"],
    whatChanges: ["The customer quote", "The product", "The brand treatment"],
    handoff: {
      requiredInputs: [
        "A website with real customer reviews",
      ],
      deliverables: [
        "Four proof framings",
        "Four product proof cards",
        "Four minimal quote cards",
        "Exact quote source URLs",
      ],
      instructions: [
        "Find at least two real reviews and save their source URLs",
        "Keep every customer quote verbatim",
        "Use the packaged prompt for four headline and CTA framings",
        "Inspect all eight local PNGs before delivery",
      ],
      estimates: [
        { label: "Research", cost: "$0 Wiggly provider cost", time: "about 1-3 min" },
        { label: "Four framings", cost: "$0 separate provider cost", time: "under 1 min" },
        { label: "Eight PNGs", cost: "$0 provider cost", time: "about 1-2 min" },
      ],
      totalEstimate: "$0 Wiggly provider cost, usually 2-5 min",
      output: "Eight static 1080 x 1350 PNGs plus scene and source data",
      firstQuestion: "What website has the customer reviews you want to turn into ads?",
    },
  },
  {
    slug: "brainrot",
    promise: "Turn one buyer truth into a fast character exchange over familiar gameplay.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/brainrot",
    manifestPath: "format-repositories/brainrot-v1/format.json",
    whatStays: ["Two alternating speakers", "Fast captions", "Looping gameplay", "A sharp reveal"],
    whatChanges: ["The dialogue", "The buyer tension", "The brand", "The CTA"],
    handoff: {
      requiredInputs: [
        "A brand or product website",
      ],
      deliverables: [
        "Three evidence-backed dialogue options",
        "One selected 6-10 beat script",
        "One two-character Fish voice track",
        "One captioned 1080x1350 MP4",
      ],
      instructions: [
        "Research one specific buyer problem and one supported product truth",
        "Write three distinct fake-podcast dialogue options",
        "Show the selected script and estimate before voice generation",
        "Inspect the audio stream, captions, dimensions, and duration before final approval",
      ],
      estimates: [
        { label: "Research + scripts", cost: "$0 Wiggly provider cost", time: "about 2-5 min" },
        { label: "Two-character Fish voice", cost: "$0 provider cost", time: "usually under 2 min" },
        { label: "Local MP4 render", cost: "$0 provider cost", time: "about 1-3 min" },
      ],
      totalEstimate: "$0 Wiggly provider cost, usually 4-10 min",
      output: "One 1080x1350 MP4 with two voices, fast captions, gameplay, and character reactions",
      firstQuestion: "What website should I use for this Brainrot ad?",
    },
  },
  {
    slug: "fortnite-filter",
    promise: "Turn one portrait into a recognizable, cinematic Fortnite-style 3D character.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/fortnite-filter",
    manifestPath: "format-repositories/fortnite-filter-v1/format.json",
    whatStays: [
      "The same person",
      "The original pose and expression",
      "A clean game-character silhouette",
      "Warm cinematic 3D lighting",
    ],
    whatChanges: [
      "The person and wardrobe",
      "The setting",
      "The model cost lane",
      "The character details",
    ],
    handoff: {
      requiredInputs: [
        "One JPEG, PNG, or WebP portrait at least 512px on both axes",
        "A Replicate API token for the paid transform",
      ],
      deliverables: [
        "One inspected 3:4 JPG",
        "A persisted Replicate prediction ID",
        "Automatic checks and visual-review notes",
      ],
      instructions: [
        "Open the technical instructions and download the runnable kit before generation",
        "Use Nano Banana 2 by default, Lite for economy, or Pro only when requested",
        "Validate the portrait locally before the single paid prediction",
        "Resume the saved prediction ID instead of starting duplicate work",
        "View the actual output and record review notes before finalizing",
      ],
      estimates: [
        { label: "Prepare + validate", cost: "Free", time: "under 1 min" },
        { label: "One image transform", cost: "Current Replicate model rate", time: "usually under 2 min" },
        { label: "Inspect + finalize", cost: "Free", time: "about 1 min" },
      ],
      totalEstimate: "One Replicate image charge and usually 2-4 min",
      output: "One inspected 3:4 JPG plus prediction and quality provenance",
      firstQuestion: "Which photo should I turn into a Fortnite-style character?",
    },
  },
  {
    slug: "meme",
    promise: "Turn a buyer's familiar frustration into an ad they understand in one glance.",
    lastUpdated: "July 2026",
    technicalHref: "/format-lab/meme",
    manifestPath: "format-repositories/meme-v1/format.json",
    whatStays: ["A known visual setup", "One sharp buyer tension", "Fast recognition"],
    whatChanges: ["The meme", "The product truth", "The headline"],
    handoff: {
      requiredInputs: [
        "A brand website",
      ],
      deliverables: [
        "Three Drake variants",
        "Three Woman Yelling at Cat variants",
        "Three This Is Fine variants",
        "Three Expanding Brain variants",
      ],
      instructions: [
        "Research real buyer moments and proof from the website",
        "Use the packaged prompt for all twelve captions",
        "Keep every slot within the fixed template limits",
        "Inspect all twelve local PNGs before delivery",
      ],
      estimates: [
        { label: "Research", cost: "$0 Wiggly provider cost", time: "about 1-3 min" },
        { label: "Twelve captions", cost: "$0 separate provider cost", time: "about 1-2 min" },
        { label: "Twelve PNGs", cost: "$0 provider cost", time: "about 1-2 min" },
      ],
      totalEstimate: "$0 Wiggly provider cost, usually 3-7 min",
      output: "Twelve static 1080 x 1350 PNGs plus scene and research data",
      firstQuestion: "What website should I use?",
    },
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
