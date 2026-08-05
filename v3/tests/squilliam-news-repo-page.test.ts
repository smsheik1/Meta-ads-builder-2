import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  getPublishedDiscoveryEntries,
  groupDiscoveryEntriesByShelf,
} from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/squilliam-news/page.tsx", "utf8");
const repositoryRoot = "public/format-repositories/squilliam-news-v1";
const evidenceRoot = `${repositoryRoot}/examples/we-the-artists/evidence`;
const finalization = JSON.parse(readFileSync(`${evidenceRoot}/finalization.json`, "utf8")) as {
  automaticReview: string;
  humanReview: string;
  videoHash: string;
  finalVideo: string;
};

assert.match(route, /Wiggly \/ Format Lab/);
assert.match(route, /squilliam-news-v1/);
assert.match(route, /squilliam-final-video/);
assert.match(route, /Download final MP4/);
assert.match(route, /View the promoted event/);
assert.match(route, /poster\.png/);
assert.match(route, /blind-handoff\/v0\.2\.1/);
assert.doesNotMatch(route, /AdRenderSurface|canvas|getContext\(/);

const finalVideoPath = `${evidenceRoot}/${finalization.finalVideo}`;
assert.equal(existsSync(finalVideoPath), true);
assert.equal(existsSync(`${evidenceRoot}/poster.png`), true);
assert.equal(finalization.automaticReview, "pass");
assert.equal(finalization.humanReview, "pass");
assert.equal(
  createHash("sha256").update(readFileSync(finalVideoPath)).digest("hex"),
  finalization.videoHash,
);

const discoveryEntries = getPublishedDiscoveryEntries().filter(
  (entry) => entry.format.slug === "squilliam-news",
);
assert.deepEqual(
  discoveryEntries.map((entry) => entry.id),
  ["squilliam-news-artistic-emergency"],
  "The approved Squilliam final should appear as one card on Discover.",
);
assert.equal(discoveryEntries[0]?.media.src, `/${finalVideoPath.replace(/^public\//, "")}`);
assert.equal(discoveryEntries[0]?.media.poster, `/${evidenceRoot.replace(/^public\//, "")}/poster.png`);
const characterShelf = groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries())
  .find((shelf) => shelf.id === "character-explainers");
assert.equal(
  characterShelf?.entries[0]?.format.slug,
  "squilliam-news",
  "Squilliam News should be the first visible card on the character-led Discover shelf.",
);

const profile = getDiscoveryFormatProfile("squilliam-news");
assert.ok(profile?.handoff, "Squilliam News should have a consumer Format page and runnable handoff.");
assert.equal(profile.version, "0.2.1-proof");
assert.equal(profile.technicalHref, "/format-lab/squilliam-news");
assert.equal(profile.proofEntries.length, 1);
const handoffPrompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(handoffPrompt, /Format: Squilliam News/);
assert.match(handoffPrompt, /formats\/squilliam-news/);
assert.match(handoffPrompt, /packaged runner, renderer, gestures, lip sync/);

console.log("Squilliam News repo page tests passed.");
