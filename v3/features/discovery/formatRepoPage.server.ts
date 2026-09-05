import { discoveryShelfDefinitions } from "./catalog";
import type { AnimalConversationsTrustData } from "./animalConversationsTrust.server";
import { getAnimalConversationsTrustData } from "./animalConversationsTrust.server";
import type { BikiniBottomDanceOffTrustData } from "./bikiniBottomDanceOffTrust.server";
import { getBikiniBottomDanceOffTrustData } from "./bikiniBottomDanceOffTrust.server";
import type { ShazPuppetRuntimeTrustData } from "./shazPuppetRuntimeTrust.server";
import { getShazPuppetRuntimeTrustData } from "./shazPuppetRuntimeTrust.server";

type RepoPageCopy = {
  runDescription: string;
  examplesTitle: string;
  examplesDescription?: string;
};

export type FormatRepoPagePresentation =
  | {
      kind: "bikini-bottom-dance-off";
      trust: BikiniBottomDanceOffTrustData;
      copy: RepoPageCopy;
      detailedProofId: string;
    }
  | {
      kind: "animal-conversations";
      trust: AnimalConversationsTrustData;
      copy: RepoPageCopy;
      detailedProofId?: undefined;
    }
  | {
      kind: "shaz-puppet-runtime";
      trust: ShazPuppetRuntimeTrustData;
      copy: RepoPageCopy;
      detailedProofId: "shaz-puppet-runtime-talking-scene";
    };

export const richFormatRepoSlugs = [
  "bikini-bottom-dance-off",
  "animal-conversations",
  "shaz-puppet-runtime",
] as const;

export function getFormatRepoFamily(slug: string) {
  const family = discoveryShelfDefinitions.find(
    (candidate) => candidate.id === "skai-generated",
  );
  if (!family?.formats.some((candidate) => candidate === slug)) {
    return null;
  }

  return {
    name: family.title,
    formatCount: family.formats.length,
    discoveryHref: "/discover#shelf-skai-generated",
  };
}

// These formats use the shared baseline sections without a custom trust module.
// Keep the list frozen so newly published work cannot bypass a deliberate page review.
const baselineFormatRepoSlugs = new Set([
  "talking-fish-news",
  "mugsy-explains",
  "three-d-breakdown",
  "product-photoshoot",
  "otaku-explainer",
  "squilliam-news",
  "jingle",
  "video-meme",
  "visualizer",
  "were-sorry",
  "text-message",
  "reviews",
  "brainrot",
  "fortnite-filter",
  "cinematic-photographer",
  "gta-vi",
  "selfie-nine-images",
  "fake-it-till-you-make-it",
  "dark-studio-portrait",
  "blue-phosphor",
  "dusk-effect",
  "sparkling-effect",
  "cool-tone-filter",
  "halo-effect",
  "doodle-art",
  "light-silhouette",
  "rim-portrait-filter",
  "cyanotype",
  "lord-of-the-rings",
  "soft-glow-filter",
  "paper-outfit",
  "moody-pink-effect",
  "cinematic-portrait-pack",
  "dreamcore-angel",
  "dark-aesthetic-filter",
  "2000s-effect",
  "80s-toon",
  "rag-doll",
  "mood-notes",
  "red-dead-redemption",
  "old-money-shot",
  "chrome-void",
  "ccd-jpeg-filter",
  "passport-click",
  "meme",
  "newsletter-writer",
  "hybrid-news",
]);

export async function getFormatRepoPagePresentation(
  slug: string,
): Promise<FormatRepoPagePresentation | null> {
  if (slug === "bikini-bottom-dance-off") {
    return {
      kind: slug,
      trust: await getBikiniBottomDanceOffTrustData(),
      copy: {
        runDescription:
          "Add one song and optionally choose the dances or dialogue. The agent handles everything else.",
        examplesTitle: "Finished Dance Offs.",
      },
      detailedProofId: "bikini-bottom-dance-off-wiggle",
    };
  }

  if (slug === "animal-conversations") {
    return {
      kind: slug,
      trust: await getAnimalConversationsTrustData(),
      copy: {
        runDescription:
          "Send a supported video link or local clip. Your coding agent extracts the audio, prepares the dialogue for your approval, and makes the video. No timestamps to write.",
        examplesTitle: "Finished Conversations.",
        examplesDescription:
          "These examples were made with v0.15.1. The current download is v0.16.2, with easier setup and a guided approval-to-export workflow.",
      },
    };
  }

  if (slug === "shaz-puppet-runtime") {
    return {
      kind: slug,
      trust: await getShazPuppetRuntimeTrustData(),
      copy: {
        runDescription:
          "Add a voice track and pick a room. The kit reads what Shaz is saying on your Mac, lip-syncs the mouth, and helps place an artist-reviewed gesture on the words that deserve one.",
        examplesTitle: "Examples",
        examplesDescription:
          "The first video proved Shaz could talk and gesture. In the new 30-second story, a fresh agent uses the transcript to land Think on “idea,” Point on “least,” and Confident on “best.” Play both with sound.",
      },
      detailedProofId: "shaz-puppet-runtime-talking-scene",
    };
  }

  if (baselineFormatRepoSlugs.has(slug)) return null;

  throw new Error(
    `Format "${slug}" requires the shared rich Repo-page presentation before it can be published.`,
  );
}
