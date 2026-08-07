import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  getPublishedDiscoveryEntries,
  groupDiscoveryEntriesByShelf,
} from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const repositoryRoot = "public/format-repositories/bikini-bottom-dance-off-v1";
const evidenceRoot = `${repositoryRoot}/examples/wiggle-proof/evidence`;
const download = `${repositoryRoot}/downloads/wiggly-bikini-bottom-dance-off-format-kit.zip`;
const finalVideo = `${evidenceRoot}/final.mp4`;
const profile = getDiscoveryFormatProfile("bikini-bottom-dance-off");
const entries = getPublishedDiscoveryEntries().filter((entry) => entry.format.slug === "bikini-bottom-dance-off");

assert.deepEqual(entries.map((entry) => entry.id), ["bikini-bottom-dance-off-wiggle"]);
assert.equal(entries[0]?.media.src, `/${finalVideo.replace(/^public\//, "")}`);
assert.equal(entries[0]?.media.poster, `/${evidenceRoot.replace(/^public\//, "")}/poster.png`);
assert.equal(entries[0]?.media.aspectRatio, "9:16");
assert.equal(statSync(finalVideo).size > 5_000_000, true);
assert.equal(existsSync(`${evidenceRoot}/poster.png`), true);
assert.equal(existsSync(`${evidenceRoot}/contact-sheet.png`), true);
assert.equal(existsSync(`${evidenceRoot}/delivery.json`), true);

const evalReport = JSON.parse(readFileSync(`${evidenceRoot}/eval-report.json`, "utf8")) as {
  overall: Record<string, string | number>;
  criteria: Array<{ status: string; explanation: string }>;
};
assert.deepEqual(evalReport.overall, {
  status: "pass",
  score: 100,
  grade: "A+",
  passingScore: 85,
  provisionalPercent: 100,
  automaticScore: 70,
  automaticMaximum: 70,
  humanScore: 30,
  humanMaximum: 30,
});
assert.ok(evalReport.criteria.length > 20);
assert.ok(evalReport.criteria.every((criterion) => criterion.status === "pass" && criterion.explanation));
const delivery = JSON.parse(readFileSync(`${evidenceRoot}/delivery.json`, "utf8")) as {
  status: string;
  finalVideo: { path: string; sha256: string };
  eval: { grade: string; score: number; status: string };
};
assert.equal(delivery.status, "ready");
assert.equal(delivery.eval.grade, "A+");
assert.equal(delivery.eval.score, 100);
assert.equal(delivery.eval.status, "pass");
assert.equal(delivery.finalVideo.path, "final.mp4");
assert.match(delivery.finalVideo.sha256, /^[0-9a-f]{64}$/);

assert.ok(profile?.handoff);
assert.equal(profile.version, "0.7.1");
assert.equal(profile.technicalHref, "/format-lab/character-dance-lab");
assert.equal(profile.repositoryHref, "/format-repositories/bikini-bottom-dance-off-v1/downloads/wiggly-bikini-bottom-dance-off-format-kit.zip");
assert.equal(profile.proofEntries.length, 1);
assert.equal(existsSync(download), true);
const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /Runnable Repo: https:\/\/wiggly\.agentenamel\.com\/format-repositories\/bikini-bottom-dance-off-v1\/downloads/);
assert.match(prompt, /Return final\.mp4 together with eval-report\.md and delivery\.json/);
assert.match(prompt, /What song should the four characters dance to\?/);

const shelf = groupDiscoveryEntriesByShelf(getPublishedDiscoveryEntries())
  .find((candidate) => candidate.id === "character-explainers");
assert.ok(shelf?.entries.some((entry) => entry.format.slug === "bikini-bottom-dance-off"));

const consumerRoute = readFileSync("app/formats/[slug]/page.tsx", "utf8");
assert.match(consumerRoute, /Download runnable Repo/);
assert.match(consumerRoute, /format\.repositoryHref/);

const starterManifest = JSON.parse(readFileSync(`${repositoryRoot}/../mixamo-character-motion-v1/assets/motions/manifest.json`, "utf8")) as { motions: unknown[] };
assert.equal(starterManifest.motions.length, 25);
const motionRunner = readFileSync(`${repositoryRoot}/../mixamo-character-motion-v1/runner.mjs`, "utf8");
assert.match(motionRunner, /user-motions/);
assert.match(motionRunner, /loadMotionCatalog/);

console.log("Bikini Bottom Dance Off Discover page tests passed.");
