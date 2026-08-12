import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import JSZip from "jszip";
import {
  getPublishedDiscoveryEntries,
  groupDiscoveryEntriesByShelf,
} from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const repositoryRoot = "public/format-repositories/animal-conversations-v1";
const video = `${repositoryRoot}/goldens/we-listen-dont-judge.mp4`;
const poster = `${repositoryRoot}/goldens/we-listen-dont-judge-poster.jpg`;
const download = `${repositoryRoot}/downloads/wiggly-animal-conversations-format-kit.zip`;
const entries = getPublishedDiscoveryEntries().filter(
  (entry) => entry.format.slug === "animal-conversations",
);

assert.equal(entries.length, 1, "Animal Conversations should be visible as one Discover card.");
assert.equal(entries[0]?.id, "animal-conversations-listen-dont-judge");
assert.equal(entries[0]?.media.src, "/format-repositories/animal-conversations-v1/goldens/we-listen-dont-judge.mp4");
assert.equal(entries[0]?.media.poster, "/format-repositories/animal-conversations-v1/goldens/we-listen-dont-judge-poster.jpg");
assert.equal(entries[0]?.media.aspectRatio, "9:16");
assert.ok(existsSync(video) && statSync(video).size > 1_000_000, "The public proof video must be committed.");
assert.ok(existsSync(poster) && statSync(poster).size > 50_000, "The public poster must be committed.");

const shelf = groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries()).find(
  (candidate) => candidate.id === "character-conversations",
);
assert.equal(shelf?.entries[0]?.format.slug, "animal-conversations");

const profile = getDiscoveryFormatProfile("animal-conversations");
assert.ok(profile?.handoff, "Animal Conversations should offer a runnable agent handoff.");
assert.equal(profile.version, "0.5.0");
assert.equal(profile.repositoryHref, "/format-repositories/animal-conversations-v1/downloads/wiggly-animal-conversations-format-kit.zip");
assert.match(profile.handoff.firstQuestion, /Attach the conversation audio/);
assert.match(profile.handoff.instructions.join(" "), /one-to-three-word cards/);

assert.ok(existsSync(download), "The stable public Repo download must exist.");
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
  assert.match(zipEntries, new RegExp(`(^|\\n)${expected.replaceAll(".", "\\.")}($|\\n)`));
}
assert.doesNotMatch(zipEntries, /(^|\n)agent-runs\//);
assert.doesNotMatch(zipEntries, /user-audio|speaker-review\//);
const archivedManifest = JSON.parse(
  await archive.file("KIT-MANIFEST.json")!.async("string"),
) as { formatVersion: string; canonicalSkill: string };
assert.deepEqual(archivedManifest, {
  ...archivedManifest,
  formatVersion: "0.5.0",
  canonicalSkill: "SKILL.md",
});

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Runnable Repo: https:\/\/wiggly\.agentenamel\.com\/format-repositories\/animal-conversations-v1\/downloads/);
assert.match(prompt, /KIT-MANIFEST\.json/);
assert.match(prompt, /Use the packaged runtime; do not rebuild it/);

console.log("Animal Conversations Discover page tests passed.");
