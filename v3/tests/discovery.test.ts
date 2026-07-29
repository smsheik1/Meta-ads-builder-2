import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  discoveryCatalog,
  filterDiscoveryEntries,
  getPublishedDiscoveryEntries,
  groupDiscoveryEntriesByShelf,
} from "../features/discovery/catalog";
import { databaseFormatDiscoveryEntries } from "../features/discovery/databaseFormatArchive";
import type { DiscoveryEntry } from "../features/discovery/types";

const published = getPublishedDiscoveryEntries();

assert.ok(published.length >= 6, "Discovery should launch with enough real finished work to browse.");
assert.deepEqual(
  published.map((entry) => entry.order),
  [...published].map((entry) => entry.order).sort((left, right) => left - right),
  "Published entries should keep manual editorial order.",
);
assert.ok(
  published.every((entry) => entry.format.version && entry.format.owner),
  "Every Discovery entry should keep its exact Format version and owner.",
);
assert.ok(
  published.every((entry) => (
    entry.media.src.startsWith("/")
      ? existsSync(`public${entry.media.src}`)
      : entry.media.src.startsWith("https://")
  )),
  "Discovery entries should reference an existing public asset or a secure stored-media URL.",
);
assert.ok(
  published
    .filter((entry) => entry.media.kind === "video")
    .every((entry) => entry.media.poster && existsSync(`public${entry.media.poster}`)),
  "Every video should have a local poster for slow connections.",
);
const jingles = published.filter((entry) => entry.format.slug === "jingle");
assert.equal(jingles.length, 39, "Every distinct completed jingle with valid brand metadata should be discoverable.");
assert.equal(
  new Set(jingles.map((entry) => entry.media.src)).size,
  jingles.length,
  "The jingle archive should not repeat the same stored song.",
);
assert.ok(
  jingles.every((entry) => entry.media.kind === "audio"),
  "Jingles should use native audio playback instead of fake video wrappers.",
);
assert.ok(
  jingles
    .filter((entry) => entry.media.src.startsWith("/homepage/jingles/"))
    .every((entry) => entry.order < 20),
  "The three proven jingles should be spread through the opening feed.",
);
const videoMemes = published.filter((entry) => entry.format.slug === "video-meme");
assert.equal(videoMemes.length, 32, "Every completed Video Meme import should be discoverable.");
assert.equal(
  new Set(videoMemes.map((entry) => entry.media.src)).size,
  videoMemes.length,
  "The Video Meme archive should not repeat the same final render.",
);
assert.ok(
  videoMemes.every((entry) => (
    entry.media.kind === "video" &&
    entry.media.src.startsWith("https://wry-viper-639.convex.cloud/api/storage/") &&
    entry.media.poster?.startsWith("/discovery/video-memes/")
  )),
  "Video Memes should use completed Convex renders with local loading posters.",
);
const generatedFormatSlugs = [
  "visualizer",
  "meme",
  "three-d-breakdown",
  "video-meme",
  "were-sorry",
  "text-message",
  "reviews",
  "brainrot",
  "jingle",
  "motion-story",
];
assert.ok(
  generatedFormatSlugs.every((slug) => published.some((entry) => entry.format.slug === slug)),
  "Discovery should include real proof from all 10 generated Wiggly formats.",
);
assert.equal(
  databaseFormatDiscoveryEntries.length,
  20,
  "The curated database import should keep only the reviewed cross-format proof set.",
);
assert.ok(
  databaseFormatDiscoveryEntries.every((entry) => entry.media.src.startsWith("/discovery/db-formats/")),
  "Curated database proof should use inspected local archive assets.",
);
assert.equal(
  published.some((entry) => entry.brand === "Something went wrong"),
  false,
  "Failed source metadata should never become public proof.",
);
for (const id of ["lego-origin-story", "danny-phantom-apis", "naruto-apis", "spongebob-evs"]) {
  assert.ok(published.some((entry) => entry.id === id), `${id} should be included in the finished-output archive.`);
}

const draftEntry: DiscoveryEntry = {
  ...discoveryCatalog[0],
  id: "draft-entry",
  status: "draft",
  order: 0,
};
assert.equal(
  getPublishedDiscoveryEntries([draftEntry, ...discoveryCatalog]).some((entry) => entry.id === draftEntry.id),
  false,
  "Draft entries should never appear in the public feed.",
);

assert.deepEqual(
  filterDiscoveryEntries(published, "therabody", "all").map((entry) => entry.id),
  ["theragun-heat-and-motion"],
  "Search should match brand names.",
);
assert.ok(
  filterDiscoveryEntries(published, "wiggly studio", "all").length >= 4,
  "Search should match Format owners.",
);
assert.ok(
  filterDiscoveryEntries(published, "", "teach").every((entry) => entry.goal === "teach"),
  "Goal filters should return only matching entries.",
);

const shelves = groupDiscoveryEntriesByShelf(published);
const shelvedEntries = shelves.flatMap((shelf) => shelf.entries);
assert.equal(shelves.length, 7, "Current Discovery proof should organize into seven useful shelves.");
assert.equal(
  shelvedEntries.length,
  published.length,
  "Every published ad should appear on exactly one Discovery shelf.",
);
assert.equal(
  new Set(shelvedEntries.map((entry) => entry.id)).size,
  published.length,
  "Discovery shelves must not repeat finished ads.",
);
assert.deepEqual(
  shelves.find((shelf) => shelf.id === "brand-jingles")?.entries.map((entry) => entry.id),
  jingles.map((entry) => entry.id),
  "Every Brand Jingle should stay together in one horizontal shelf.",
);
assert.ok(
  shelves
    .find((shelf) => shelf.id === "product-stories")
    ?.entries.every((entry) => ["three-d-breakdown", "motion-story"].includes(entry.format.slug)),
  "Product stories should contain only motion-led product formats.",
);

console.log("discovery tests passed");
