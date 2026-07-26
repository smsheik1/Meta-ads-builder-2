import type { Metadata } from "next";
import { getPublishedDiscoveryEntries } from "@/features/discovery/catalog";
import { DiscoveryClient } from "./DiscoveryClient";

export const metadata: Metadata = {
  title: "Discover Ads Worth Making | Wiggly",
  description: "Watch finished ads and discover the repeatable Wiggly Formats behind them.",
};

export default function DiscoverPage() {
  return <DiscoveryClient entries={getPublishedDiscoveryEntries()} />;
}
