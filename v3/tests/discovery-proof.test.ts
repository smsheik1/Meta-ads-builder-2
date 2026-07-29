import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  discoveryCatalog,
  getDiscoveryEntryById,
  getRelatedDiscoveryEntries,
} from "../features/discovery/catalog";
import {
  discoveryFormatSlugs,
  getDiscoveryFormatProfile,
} from "../features/discovery/formatProof.server";

for (const entry of discoveryCatalog) {
  assert.equal(
    getDiscoveryEntryById(entry.id)?.id,
    entry.id,
    `Published Discovery ad ${entry.id} should resolve as its canonical /s slug.`,
  );
}

const threeD = getDiscoveryFormatProfile("three-d-breakdown");
assert.ok(threeD, "3D Breakdown should have a consumer Format proof.");
assert.equal(threeD.version, "1.5.0");
assert.ok(threeD.proofEntries.length >= 3, "3D Breakdown should show at least three real proof outputs.");
assert.equal(threeD.technicalHref, "/format-lab/three-d-breakdown");

const cartoon = getDiscoveryFormatProfile("otaku-explainer");
assert.ok(cartoon, "Cartoon Explainer should have a consumer Format proof.");
assert.equal(cartoon.version, "1.2.0-experiment");
assert.ok(cartoon.proofEntries.length >= 3, "Cartoon Explainer should show at least three real proof outputs.");
assert.equal(cartoon.technicalHref, "/format-lab/cartoon-explainer");

const jingle = getDiscoveryFormatProfile("jingle");
assert.ok(jingle, "Brand Jingle should have a consumer Format proof.");
assert.equal(jingle.version, "1.0.0");
assert.equal(jingle.proofEntries.length, 39, "Brand Jingle proof should include every distinct completed song.");

const videoMeme = getDiscoveryFormatProfile("video-meme");
assert.ok(videoMeme, "Video Meme should have a consumer Format proof.");
assert.equal(videoMeme.version, "1.0.0");
assert.equal(videoMeme.proofEntries.length, 32, "Video Meme proof should include every completed DB import.");

for (const slug of [
  "visualizer",
  "were-sorry",
  "text-message",
  "reviews",
  "brainrot",
  "fortnite-filter",
  "motion-story",
]) {
  const profile = getDiscoveryFormatProfile(slug);
  assert.ok(profile, `${slug} should have a consumer Format proof.`);
  assert.ok(profile.proofEntries.length >= 1, `${slug} should show real saved output.`);
}

assert.deepEqual(
  getRelatedDiscoveryEntries(threeD.proofEntries[0]).map((entry) => entry.format.slug),
  ["three-d-breakdown", "three-d-breakdown", "three-d-breakdown"],
  "Related proof should stay inside the exact Format.",
);

assert.ok(
  discoveryFormatSlugs.includes("jingle") &&
    discoveryFormatSlugs.includes("video-meme") &&
    discoveryFormatSlugs.includes("meme") &&
    discoveryFormatSlugs.includes("hybrid-news") &&
    discoveryFormatSlugs.includes("fortnite-filter") &&
    discoveryFormatSlugs.length === 13,
);
assert.equal(getDiscoveryFormatProfile("does-not-exist"), null);

const discoveryClientSource = readFileSync("app/discover/DiscoveryClient.tsx", "utf8");
const sharePageSource = readFileSync("app/s/[slug]/page.tsx", "utf8");
const formatPageSource = readFileSync("app/formats/[slug]/page.tsx", "utf8");

assert.ok(
  discoveryClientSource.includes("`/formats/${entry.format.slug}`"),
  "Discovery should open one Format page containing all of that Format's examples.",
);
assert.ok(
  sharePageSource.indexOf("const discoveryEntry") <
    sharePageSource.indexOf("const convexConfigured"),
  "Approved Discovery ads should resolve before the existing Convex share lookup.",
);
assert.ok(
  sharePageSource.includes("ConvexHttpClient") &&
    sharePageSource.includes("api.sharePages.getBySlug") &&
    sharePageSource.includes("<ShareSceneClient"),
  "Non-Discovery share playback must keep the existing Convex and AdScene path.",
);
assert.ok(
  sharePageSource.includes("generateMetadata") &&
    sharePageSource.includes("entry.title") &&
    sharePageSource.includes("entry.format.version"),
  "Approved Discovery share pages should identify the finished ad and exact Format in metadata.",
);
assert.ok(
  formatPageSource.includes("generateStaticParams") &&
    formatPageSource.includes("DiscoveryProofMedia") &&
    formatPageSource.includes("Technical proof"),
  "Format pages should be static consumer proof surfaces over existing media and technical pages.",
);
assert.equal(existsSync("app/ads"), false, "Discovery must not add a second /ads detail route.");

console.log("discovery proof tests passed");
