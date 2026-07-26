import { getPublishedDiscoveryEntries } from "./catalog";
import type { DiscoveryCreator } from "./types";

export const discoveryCreators: DiscoveryCreator[] = [
  {
    handle: "wiggly-studio",
    name: "Wiggly Studio",
    bio: "Turns strong ad ideas into repeatable Formats an agent can run with you.",
    avatar: {
      kind: "image",
      value: "/wiggly-wordmark-3d-crop.png",
    },
  },
  {
    handle: "shaz",
    name: "Shaz",
    bio: "Builds clear, repeatable ad and explainer Formats for Wiggly.",
    avatar: {
      kind: "initials",
      value: "SS",
    },
  },
];

export function getDiscoveryCreatorByHandle(handle: string): DiscoveryCreator | null {
  return discoveryCreators.find((creator) => creator.handle === handle) || null;
}

export function getDiscoveryCreatorByName(name: string): DiscoveryCreator | null {
  return discoveryCreators.find((creator) => creator.name === name) || null;
}

export function getDiscoveryEntriesByCreator(name: string) {
  return getPublishedDiscoveryEntries().filter((entry) => entry.format.owner === name);
}
