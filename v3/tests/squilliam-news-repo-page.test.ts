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
const voicePresets = JSON.parse(readFileSync(`${repositoryRoot}/assets/voice-presets.json`, "utf8")) as {
  presets: Array<{
    characterId: string;
    referenceId: string | null;
    characterStatus: string;
  }>;
};

assert.match(route, /Wiggly \/ Format Lab/);
assert.match(route, /squilliam-news-v1/);
assert.match(route, /squilliam-final-video/);
assert.match(route, /Download final MP4/);
assert.match(route, /Download runnable kit/);
assert.match(route, /View the promoted event/);
assert.match(route, /Choose your anchor/);
assert.match(route, /Four characters are presenter-ready now/);
assert.match(route, /Fish voice ready/);
assert.match(route, /model QA still in progress/);
assert.match(route, /\$\{pack\.id\}-contact-sheet\.png/);
for (const characterId of ["squilliam", "squidward", "spongebob", "mr-krabs"]) {
  assert.equal(existsSync(`${repositoryRoot}/evidence/character-packs/${characterId}-contact-sheet.png`), true);
}
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

assert.deepEqual(
  Object.fromEntries(voicePresets.presets.filter((preset) => preset.referenceId).map((preset) => [preset.characterId, preset.referenceId])),
  {
    squidward: "1b28ff723a204fe08c26d8695f796b84",
    spongebob: "9845e056f37b470d9a1005e41c864e25",
    "mr-krabs": "394d3112f0da41049c42177f3ca31c5a",
    patrick: "d1520b60870b4e9aa01eab5bfefb1c45",
    sandy: "783d32b03d0c4ff28dd66455364d8665",
  },
);
assert.deepEqual(
  voicePresets.presets.filter((preset) => preset.characterStatus === "presenter-ready").map((preset) => preset.characterId),
  ["squilliam", "squidward", "spongebob", "mr-krabs"],
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
assert.match(discoveryEntries[0]?.curatorNote ?? "", /Squilliam, Squidward, SpongeBob, or Mr\. Krabs/);
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
assert.match(handoffPrompt, /SpongeBob, Squidward, and Mr\. Krabs presets are packaged/);
assert.match(handoffPrompt, /Patrick and Sandy voices are registered but their models remain unavailable pending QA/);

console.log("Squilliam News repo page tests passed.");
