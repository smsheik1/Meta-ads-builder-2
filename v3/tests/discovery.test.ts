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
import { videoMemeDiscoveryEntries } from "../features/discovery/videoMemeArchive";

const published = getPublishedDiscoveryEntries();
const proofEntries = getPublishedDiscoveryProofEntries();
const discoveryStyles = readFileSync("app/discover/discovery.module.css", "utf8");
const discoveryClient = readFileSync("app/discover/DiscoveryClient.tsx", "utf8");

assert.doesNotMatch(
  discoveryClient,
  /Open Wiggly/,
  "Discover should not repeat a generic Open Wiggly CTA in its header.",
);
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
  /onMouseEnter|onMouseLeave|previewMedia|stopMediaPreview/,
  "Hover must never change Discover playback or sound.",
);
assert.doesNotMatch(
  discoveryClient,
  /wiggly-discovery-sound|soundStorageKey/,
  "Discover should not restore a stale sound preference on page load.",
);
assert.doesNotMatch(
  discoveryClient,
  /\bautoPlay\b/,
  "Discover media must start paused and silent.",
);
assert.match(
  discoveryClient,
  /const playWithSound[\s\S]*?media\.muted = false;[\s\S]*?media\.play\(\)/,
  "The Play control should start the selected media with sound in the click handler.",
);
assert.match(
  discoveryClient,
  /const syncPlayback[\s\S]*?playbackSynced/,
  "Native media events should reconcile the visible playback controls.",
);
assert.match(
  discoveryClient,
  /\{playing \? \([\s\S]*?Mute \$\{entry\.title\}[\s\S]*?Unmute \$\{entry\.title\}[\s\S]*?\) : null\}/,
  "Mute controls should only appear while the selected media is playing.",
);
assert.match(
  discoveryClient,
  /IntersectionObserver[\s\S]*?intersectionRatio >= 0\.2[\s\S]*?media\.pause\(\)/,
  "Active media should stop once its card leaves the viewport.",
);
assert.match(
  discoveryClient,
  /document\.hidden[\s\S]*?video\.pause\(\)[\s\S]*?audio\.pause\(\)/,
  "Hiding the page should stop every video and audio track.",
);
assert.match(
  discoveryClient,
  /onPlay=\{[\s\S]*?syncPlayback[\s\S]*?onPause=\{[\s\S]*?syncPlayback[\s\S]*?onError=\{[\s\S]*?stopErroredPlayback/,
  "Native play, pause, and error events should keep the controls truthful.",
);
assert.match(
  discoveryClient,
  /if \(!activePlayback\?\.id \|\| !activeEntryVisible\) return;[\s\S]*?const media = videoRefs\.current\.get\(activePlayback\.id\) \|\| audioRefs\.current\.get\(activePlayback\.id\);[\s\S]*?return \(\) => \{[\s\S]*?media\?\.pause\(\);[\s\S]*?media\.muted = true;/,
  "The active media node should be captured and stopped if its card unmounts.",
);
assert.doesNotMatch(
  discoveryClient,
  /ref=\{\([^)]*\) => \{[\s\S]{0,300}?\?\.pause\(\)/,
  "Inline ref callbacks must not pause media during ordinary React renders.",
);
assert.match(
  discoveryClient,
  /<Link[\s\S]*?href=\{formatHref\}[\s\S]*?className=\{styles\.mediaLink\}[\s\S]*?aria-label=\{`Open \$\{entry\.format\.name\} format`\}/,
  "Clicking visible Discovery media should open the same format page as the card action.",
);
assert.match(
  discoveryClient,
  /entry\.media\.kind === "image" \|\| entry\.format\.slug === "brainrot"[\s\S]*?\? styles\.mediaWellImage/,
  "Static creatives and the 4:5 Brainrot format should use the 4:5 media well.",
);
assert.match(
  discoveryStyles,
  /\.mediaWellImage\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5;[^}]*background:\s*white;/,
  "Static creative cards should use a 4:5 white canvas.",
);
assert.match(
  discoveryStyles,
  /\.mediaLink > img:not\(\[data-discovery-reference\]\)\s*\{[^}]*object-fit:\s*contain;/,
  "Discovery must preserve the complete text and composition of static creatives.",
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
    .filter((entry) => ["cool-tone-filter", "halo-effect"].includes(entry.format.slug))
    .every((entry) => entry.media.src.endsWith("-display.jpg")),
  "Proofs with creator-baked insets must use cleaned display images before Wiggly adds its top-right reference.",
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
assert.equal(videoMemes.length, 3, "Discover should show each canonical Video Meme clip once.");
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
  videoMemes.map((entry) => entry.id),
  canonicalVideoMemeIds,
  "Bear, Pingu Noot Noot, and Darwin should be three separate Discovery cards.",
);
const importedVideoMemes = videoMemeDiscoveryEntries.filter((entry) => !canonicalVideoMemeIds.includes(entry.id));
assert.equal(importedVideoMemes.length, 32, "Every completed Video Meme database import should remain available as proof.");
assert.ok(
  importedVideoMemes.every((entry) => (
    entry.showInDiscovery === false &&
    entry.media.kind === "video" &&
    entry.media.src.startsWith("https://wry-viper-639.convex.cloud/api/storage/") &&
    entry.media.poster?.startsWith("/discovery/video-memes/")
  )),
  "Imported Video Memes should stay off Discover while retaining completed renders and local loading posters.",
);
const memes = published.filter((entry) => entry.format.slug === "meme");
assert.deepEqual(
  memes.map((entry) => entry.id),
  ["davids-cookies-this-is-fine"],
  "Discovery should show one strong Meme example instead of repeating weaker archive proofs.",
);
assert.ok(
  databaseFormatDiscoveryEntries
    .filter((entry) => entry.format.slug === "meme")
    .every((entry) => entry.showInDiscovery === false),
  "Archived Meme proofs should stay available on the format page without cluttering Discover.",
);
assert.ok(
  databaseFormatDiscoveryEntries
    .filter((entry) => ["reviews", "were-sorry"].includes(entry.format.slug))
    .every((entry) => entry.showInDiscovery === false),
  "Customer Proof examples should stay available on format pages without cluttering Discover.",
);
assert.equal(
  published.some((entry) => ["reviews", "were-sorry"].includes(entry.format.slug)),
  false,
  "Reviews and We're Sorry should not appear on Discover.",
);
const generatedFormatSlugs = [
  "visualizer",
  "meme",
  "three-d-breakdown",
  "video-meme",
  "text-message",
  "brainrot",
  "fortnite-filter",
  "cinematic-photographer",
  "gta-vi",
  "selfie-nine-images",
  "rag-doll",
  "product-photoshoot",
  "mood-notes",
  "red-dead-redemption",
  "old-money-shot",
  "chrome-void",
  "ccd-jpeg-filter",
  "passport-click",
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
  "jingle",
  "newsletter-writer",
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
  "Fortnite Filter should use one Discovery card while all eight proofs stay inside the Format.",
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
  shelves.find((shelf) => shelf.id === "written-content")?.entries.map((entry) => entry.id),
  ["newsletter-writer-holden-history"],
  "Newsletter Writer should use one real finished email proof in its own shelf.",
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
    "old-money-shot",
    "chrome-void",
    "ccd-jpeg-filter",
      "passport-click",
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
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "old-money-shot").length,
  6,
  "All six Old Money Shot examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "chrome-void").length,
  6,
  "All six Chrome Void examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "ccd-jpeg-filter").length,
  5,
  "All five CCD JPEG Filter examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "passport-click").length,
  6,
  "All six Passport Click examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "fake-it-till-you-make-it").length,
  8,
  "All eight Fake It Till You Make It examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "dark-studio-portrait").length,
  6,
  "All six Dark Studio Portrait examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "blue-phosphor").length,
  7,
  "All seven Blue Phosphor examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "dusk-effect").length,
  3,
  "All three Dusk Effect examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "sparkling-effect").length,
  4,
  "All four Sparkling Effect examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "cool-tone-filter").length,
  6,
  "All six Cool Tone Filter examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "halo-effect").length,
  6,
  "All six Halo Effect examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "doodle-art").length,
  5,
  "All five Doodle Art examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "light-silhouette").length,
  7,
  "All seven Light Silhouette examples should remain available inside the Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "rim-portrait-filter").length,
  7,
  "The Wiggly proof and six SKAI Rim Portrait examples should remain inside one Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "lord-of-the-rings").length,
  7,
  "The native hero, Wiggly proof, and five SKAI examples should remain inside one Lord of the Rings Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "soft-glow-filter").length,
  7,
  "The native hero and six SKAI examples should remain inside one Soft Glow Filter Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "paper-outfit").length,
  7,
  "The native hero and six SKAI examples should remain inside one Paper Outfit Format page.",
);
assert.equal(
  proofEntries.filter((entry) => entry.format.slug === "moody-pink-effect").length,
  6,
  "The native hero and five SKAI examples should remain inside one Moody Pink Effect Format page.",
);

console.log("discovery tests passed");
