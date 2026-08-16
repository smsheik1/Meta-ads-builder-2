import type { Metadata } from "next";
import { getPublishedDiscoveryEntries } from "@/features/discovery/catalog";
import { DiscoveryClient } from "./DiscoveryClient";

export const metadata: Metadata = {
  title: "npm for Generative Video | Wiggly",
  description: "Browse runnable creative Formats for image, video, and audio—complete with prompts, references, assets, instructions, and quality checks.",
};

export default function DiscoverPage() {
  return <DiscoveryClient entries={getPublishedDiscoveryEntries()} />;
}
