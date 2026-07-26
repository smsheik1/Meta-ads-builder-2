import type { Metadata } from "next";
import { DiscoveryClient } from "@/app/discover/DiscoveryClient";
import { getPublishedDiscoveryEntries } from "@/features/discovery/catalog";

export const metadata: Metadata = {
  title: "Saved Ads | Wiggly",
  description: "The finished ads you saved while exploring Wiggly Formats.",
};

export default function SavedAdsPage() {
  return <DiscoveryClient entries={getPublishedDiscoveryEntries()} savedOnly />;
}
