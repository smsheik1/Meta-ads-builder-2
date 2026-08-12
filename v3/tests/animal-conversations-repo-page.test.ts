import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import JSZip from "jszip";
import {
  getPublishedDiscoveryEntries,
  groupDiscoveryEntriesByShelf,
} from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";
import { getAnimalConversationsTrustData } from "../features/discovery/animalConversationsTrust.server";

const repositoryRoot = "public/format-repositories/animal-conversations-v1";
const video = `${repositoryRoot}/goldens/we-listen-dont-judge.mp4`;
const poster = `${repositoryRoot}/goldens/we-listen-dont-judge-poster.jpg`;
const download = `${repositoryRoot}/downloads/wiggly-animal-conversations-format-kit.zip`;
const entries = getPublishedDiscoveryEntries().filter(
  (entry) => entry.format.slug === "animal-conversations",
);

assert.equal(
  entries.length,
  1,
  "Animal Conversations should be visible as one Discover card.",
);
assert.equal(entries[0]?.id, "animal-conversations-listen-dont-judge");
assert.equal(
  entries[0]?.media.src,
  "/format-repositories/animal-conversations-v1/goldens/we-listen-dont-judge.mp4",
);
assert.equal(
  entries[0]?.media.poster,
  "/format-repositories/animal-conversations-v1/goldens/we-listen-dont-judge-poster.jpg",
);
assert.equal(entries[0]?.media.aspectRatio, "9:16");
assert.ok(
  existsSync(video) && statSync(video).size > 1_000_000,
  "The public proof video must be committed.",
);
assert.ok(
  existsSync(poster) && statSync(poster).size > 50_000,
  "The public poster must be committed.",
);

const discoveryShelves = groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries());
const shelf = discoveryShelves.find(
  (candidate) => candidate.id === "character-conversations",
);
assert.equal(shelf?.entries[0]?.format.slug, "animal-conversations");
assert.equal(
  discoveryShelves[0],
  shelf,
  "Animal Conversations should be the first visible Discover shelf, not buried below older formats.",
);
assert.equal(shelf?.title, "Animal Conversations");

const profile = getDiscoveryFormatProfile("animal-conversations");
assert.ok(
  profile?.handoff,
  "Animal Conversations should offer a runnable agent handoff.",
);
assert.equal(profile.version, "0.7.0");
assert.equal(
  profile.repositoryHref,
  "/format-repositories/animal-conversations-v1/downloads/wiggly-animal-conversations-format-kit.zip",
);
assert.match(profile.handoff.firstQuestion, /Attach the conversation audio/);
assert.match(profile.handoff.instructions.join(" "), /one-to-three-word cards/);

assert.ok(existsSync(download), "The stable public Repo download must exist.");
assert.equal(
  createHash("sha256").update(readFileSync(download)).digest("hex"),
  "8b88e9de4bacd83ede6f6c3c7dde980c7f9f114b777df4401d353248efbe238b",
  "The Repo-page refactor must not mutate the exact published v0.7.0 kit.",
);
const archive = await JSZip.loadAsync(readFileSync(download));
const zipEntries = Object.keys(archive.files).join("\n");
for (const expected of [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/wiggly-format.mdc",
  "KIT-MANIFEST.json",
  "SKILL.md",
  "runtime/render.mjs",
  "fixtures/smoke/input.json",
]) {
  assert.match(
    zipEntries,
    new RegExp(`(^|\\n)${expected.replaceAll(".", "\\.")}($|\\n)`),
  );
}
assert.doesNotMatch(zipEntries, /(^|\n)agent-runs\//);
assert.doesNotMatch(zipEntries, /user-audio|speaker-review\//);
const archivedManifest = JSON.parse(
  await archive.file("KIT-MANIFEST.json")!.async("string"),
) as { formatVersion: string; canonicalSkill: string };
assert.deepEqual(archivedManifest, {
  ...archivedManifest,
  formatVersion: "0.7.0",
  canonicalSkill: "SKILL.md",
});

const prompt = buildDiscoveryHandoffPrompt(
  profile,
  "https://wiggly.agentenamel.com",
);
assert.match(
  prompt,
  /Runnable Repo: https:\/\/wiggly\.agentenamel\.com\/format-repositories\/animal-conversations-v1\/downloads/,
);
assert.match(prompt, /KIT-MANIFEST\.json/);
assert.match(prompt, /Use the packaged runtime; do not rebuild it/);

const formatPageSource = readFileSync("app/formats/[slug]/page.tsx", "utf8");
const connectionsSource = readFileSync(
  "features/discovery/AnimalConversationsConnections.tsx",
  "utf8",
);
const includedAssetsSource = readFileSync(
  "features/discovery/AnimalConversationsIncludedAssets.tsx",
  "utf8",
);
const trustSource = readFileSync(
  "features/discovery/FormatRepoTrust.tsx",
  "utf8",
);
const trustLoaderSource = readFileSync(
  "features/discovery/animalConversationsTrust.server.ts",
  "utf8",
);
const repoPageRegistrySource = readFileSync(
  "features/discovery/formatRepoPage.server.ts",
  "utf8",
);

assert.match(
  formatPageSource,
  /<FormatRepoConnections presentation=\{repoPage\} \/>/,
);
assert.match(
  formatPageSource,
  /<FormatRepoIncludedAssets presentation=\{repoPage\} \/>/,
);
assert.match(formatPageSource, /<FormatRepoRunSummary/);
assert.match(formatPageSource, /<FormatRepoTrust/);
assert.match(repoPageRegistrySource, /Make your Animal Conversation\./);
assert.match(repoPageRegistrySource, /One conversation audio file/);
assert.match(repoPageRegistrySource, /Finished Conversations\./);
assert.match(formatPageSource, /w-\[min\(100%-32px,980px\)\]/);
assert.match(formatPageSource, /md:grid-cols-\[1\.15fr_0\.85fr\]/);
assert.match(formatPageSource, /max-w-\[310px\]/);
assert.ok(
  formatPageSource.indexOf("<FormatRepoConnections") <
    formatPageSource.indexOf("<FormatRepoRunSummary"),
  "The zero-provider setup section should precede the run summary.",
);
assert.ok(
  formatPageSource.indexOf("<FormatRepoRunSummary") <
    formatPageSource.indexOf("<FormatRepoIncludedAssets"),
  "Included assets should follow the short run summary.",
);
assert.ok(
  formatPageSource.indexOf("<FormatRepoIncludedAssets") <
    formatPageSource.indexOf("<FormatRepoTrust"),
  "Included assets should appear before proof and technical details.",
);
assert.match(connectionsSource, /Services &amp; costs/);
assert.match(connectionsSource, /0 accounts · \$0 provider cost/);
assert.match(connectionsSource, /You provide the audio\./);
assert.match(connectionsSource, /No API key or paid service is required/);
assert.match(includedAssetsSource, /The cast, rooms, and camera grammar\./);
assert.match(includedAssetsSource, /Complete character poses/);
assert.match(includedAssetsSource, /Three camera angles included/);
assert.match(includedAssetsSource, /aria-pressed=\{isSelected\}/);
assert.match(
  trustSource,
  /videoRef\.current\.currentTime = annotation\.seconds/,
);
assert.match(trustSource, /Open any file to read its actual contents\./);
assert.doesNotMatch(
  trustLoaderSource,
  /agent-runs\//,
  "The public page adapter must use committed contracts and proof, not transient run output.",
);

const trustData = await getAnimalConversationsTrustData();
assert.equal(trustData.version, "0.7.0");
assert.deepEqual(trustData.stats, {
  backgrounds: 5,
  cameras: 3,
  characters: 2,
});
assert.equal(trustData.requirements.providers.length, 0);
assert.equal(trustData.requirements.environmentVariables.length, 0);
assert.deepEqual(
  trustData.includedAssets.characters.map(({ id, label, poseCount }) => ({
    id,
    label,
    poseCount,
  })),
  [
    { id: "cat", label: "Cat", poseCount: 3 },
    { id: "bunny", label: "Bunny", poseCount: 3 },
  ],
);
assert.equal(trustData.includedAssets.backgrounds.length, 5);
for (const character of trustData.includedAssets.characters) {
  assert.equal(existsSync(`public${character.posterSrc}`), true);
  assert.ok(statSync(`public${character.posterSrc}`).size > 100_000);
}
for (const background of trustData.includedAssets.backgrounds) {
  assert.equal(existsSync(`public${background.src}`), true);
}
assert.deepEqual(
  trustData.annotations.map(({ timeLabel }) => timeLabel),
  ["00:00", "00:07", "00:10", "00:28"],
);
assert.match(trustData.assembly.path, /Audio setup → Speaker review/);
assert.ok(
  trustData.assembly.commands.includes(
    "node runner.mjs init --run=<id> --audio=<file>",
  ),
);
assert.match(trustData.quality.note, /never claims automatic diarization/);
assert.equal(trustData.quality.criteria.length, 11);
assert.match(trustData.receipt.note, /Runtime audio remains user-supplied/);
assert.ok(
  trustData.files.some(
    (file) =>
      file.path === "PROOF-REPORT.md" &&
      file.content.includes("Bottom-third caption"),
  ),
);

console.log("Animal Conversations rich Repo page tests passed.");
