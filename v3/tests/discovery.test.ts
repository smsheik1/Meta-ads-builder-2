import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  discoveryCatalog,
  filterDiscoveryEntries,
  getPublishedDiscoveryEntries,
  getPublishedDiscoveryProofEntries,
  groupDiscoveryEntriesByShelf,
} from "../features/discovery/catalog";
import { databaseFormatDiscoveryEntries } from "../features/discovery/databaseFormatArchive";
import type { DiscoveryEntry } from "../features/discovery/types";

const published = getPublishedDiscoveryEntries();
const proofEntries = getPublishedDiscoveryProofEntries();
const discoveryStyles = readFileSync("app/discover/discovery.module.css", "utf8");
const discoveryClient = readFileSync("app/discover/DiscoveryClient.tsx", "utf8");

assert.match(
  discoveryStyles,
  /\.formatTag,\s*\.runtime\s*\{[\s\S]*?opacity:\s*0;/,
  "Card format and runtime labels should stay hidden until the card is engaged.",
);
assert.match(
  discoveryStyles,
  /\.card:hover \.formatTag,[\s\S]*\.card:focus-within \.runtime\s*\{[^}]*opacity:\s*1;/,
  "Card format and runtime labels should reveal on hover or keyboard focus.",
);
assert.doesNotMatch(
  discoveryClient,
  /IntersectionObserver|visibleVideoIds\[0\]/,
  "Discovery media must never resume a background video after the user leaves another card.",
);
assert.doesNotMatch(
  discoveryClient,
  /const previewMedia[\s\S]*?setSoundOn\(false\)/,
  "Hover previews must preserve the sound choice the user made.",
);
assert.match(
  discoveryClient,
  /error instanceof DOMException && error\.name === "AbortError"\) return/,
  "Intentionally pausing the previous preview must not turn sound off.",
);
assert.match(
  discoveryClient,
  /<Link[\s\S]*?href=\{formatHref\}[\s\S]*?className=\{styles\.mediaLink\}[\s\S]*?aria-label=\{`Open \$\{entry\.format\.name\} format`\}/,
  "Clicking visible Discovery media should open the same format page as the card action.",
);

assert.ok(published.length >= 6, "Discovery should launch with enough real finished work to browse.");
assert.deepEqual(
  published.map((entry) => entry.order),
  [...published].map((entry) => entry.order).sort((left, right) => left - right),
  "Published entries should keep manual editorial order.",
);
assert.ok(
  proofEntries.every((entry) => entry.format.version && entry.format.owner),
  "Every Discovery entry should keep its exact Format version and owner.",
);
assert.ok(
  proofEntries.every((entry) => (
    entry.media.src.startsWith("/")
      ? existsSync(`public${entry.media.src}`)
      : entry.media.src.startsWith("https://")
  )),
  "Discovery entries should reference an existing public asset or a secure stored-media URL.",
);
assert.ok(
  proofEntries.every((entry) => !entry.media.referenceSrc || existsSync(`public${entry.media.referenceSrc}`)),
  "Every before-and-after proof should reference an existing original image.",
);
assert.ok(
  proofEntries
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
assert.equal(videoMemes.length, 35, "Canonical templates and every completed Video Meme import should be discoverable.");
assert.equal(
  new Set(videoMemes.map((entry) => entry.media.src)).size,
  videoMemes.length,
  "The Video Meme archive should not repeat the same final render.",
);
const canonicalVideoMemeIds = [
  "video-meme-bear-secret",
  "video-meme-pingu-reversal",
  "video-meme-darwin-pain-stack",
];
assert.deepEqual(
  videoMemes.filter((entry) => canonicalVideoMemeIds.includes(entry.id)).map((entry) => entry.id),
  canonicalVideoMemeIds,
  "Bear, Pingu Noot Noot, and Darwin should be three separate Discovery cards.",
);
const importedVideoMemes = videoMemes.filter((entry) => !canonicalVideoMemeIds.includes(entry.id));
assert.equal(importedVideoMemes.length, 32, "Every completed Video Meme database import should remain discoverable.");
assert.ok(
  importedVideoMemes.every((entry) => (
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
  "fortnite-filter",
  "cinematic-photographer",
  "gta-vi",
  "selfie-nine-images",
  "rag-doll",
  "product-photoshoot",
  "mood-notes",
  "red-dead-redemption",
  "jingle",
];
assert.ok(
  generatedFormatSlugs.every((slug) => published.some((entry) => entry.format.slug === slug)),
  "Discovery should include real proof from every currently public generated Wiggly format.",
);
assert.equal(
  published.some((entry) => entry.format.slug === "motion-story"),
  false,
  "Motion Story should stay out of Discovery until the format is ready.",
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
assert.deepEqual(
  published.filter((entry) => entry.format.slug === "three-d-breakdown").map((entry) => entry.id),
  [
    "final-straw-pocket-problem",
    "gruns-daily-stack",
    "theragun-heat-and-motion",
    "kiala-supplement-journey",
    "lego-origin-story",
  ],
  "All five 3D Breakdown videos should remain separate Discovery cards.",
);

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
assert.equal(shelves.length, 10, "Current Discovery proof should organize into ten useful shelves.");
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
assert.equal(
  shelves
    .flatMap((shelf) => shelf.entries)
    .filter((entry) => entry.format.slug === "fortnite-filter").length,
  1,
  "Fortnite Filter should use one Discovery card while its second proof stays inside the Format.",
);
assert.deepEqual(
  shelves.find((shelf) => shelf.id === "brand-jingles")?.entries.map((entry) => entry.id),
  jingles.map((entry) => entry.id),
  "Every Brand Jingle should stay together in one horizontal shelf.",
);
assert.ok(
  shelves
    .find((shelf) => shelf.id === "product-stories")
    ?.entries.every((entry) => entry.format.slug === "three-d-breakdown"),
  "Product stories should contain only the ready 3D Breakdown format.",
);
assert.equal(
  shelves
    .find((shelf) => shelf.id === "product-photoshoots")
    ?.entries.filter((entry) => entry.format.slug === "product-photoshoot").length,
  6,
  "Product Photoshoot should show one complete six-image campaign set.",
);
assert.ok(
  shelves
    .find((shelf) => shelf.id === "video-memes")
    ?.entries.every((entry) => entry.format.slug === "video-meme"),
  "Video Memes should have their own shelf.",
);
assert.ok(
  shelves
    .find((shelf) => shelf.id === "brainrot")
    ?.entries.every((entry) => entry.format.slug === "brainrot"),
  "Brainrot should not be merged into the Video Meme shelf.",
);
assert.deepEqual(
  shelves.find((shelf) => shelf.id === "skai-generated")?.entries.map((entry) => entry.format.slug),
  [
    "fortnite-filter",
    "cinematic-photographer",
    "gta-vi",
    "selfie-nine-images",
    "rag-doll",
    "mood-notes",
    "red-dead-redemption",
  ],
  "Every packaged SKAI image format should appear exactly once in its own shelf.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "selfie-nine-images").length,
  9,
  "All nine selfie scenes should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "rag-doll").length,
  7,
  "All seven Rag Doll examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "mood-notes").length,
  7,
  "All seven Mood Notes examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "red-dead-redemption").length,
  6,
  "All six Red Dead Redemption examples should remain available inside the Format page.",
);

console.log("discovery tests passed");
