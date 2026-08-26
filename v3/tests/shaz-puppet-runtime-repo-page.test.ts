import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import JSZip from "jszip";
import {
  getPublishedDiscoveryEntries,
  getPublishedDiscoveryProofEntries,
} from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { getFormatRepoPagePresentation } from "../features/discovery/formatRepoPage.server";
import { getShazPuppetRuntimeTrustData } from "../features/discovery/shazPuppetRuntimeTrust.server";

const repository = "public/format-repositories/shaz-puppet-runtime-v1";
const download = `${repository}/downloads/wiggly-shaz-puppet-runtime-format-kit.zip`;
const video = `${repository}/goldens/anatomy-v8-release/final.mp4`;
const includedAssetsSource = readFileSync(
  "features/discovery/ShazPuppetRuntimeIncludedAssets.tsx",
  "utf8",
);
const expectedVideoSha =
  "bcf3556ffde53beb7e9efe989bd7e26655b0a2f3a23a5e80ed63f334d0edc9f9";
const sha256 = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

assert.equal(existsSync(download), true);
assert.ok(statSync(download).size < 100 * 1024 * 1024);
assert.equal(existsSync(video), true);
assert.equal(sha256(video), expectedVideoSha);
assert.equal(existsSync(`${repository}/goldens/anatomy-v8-release/contact-sheet.jpg`), true);

const profile = getDiscoveryFormatProfile("shaz-puppet-runtime");
assert.ok(profile);
assert.equal(profile.version, "0.1.2");
assert.equal(profile.proofEntries.length, 1);
assert.equal(profile.proofEntries[0]?.id, "shaz-puppet-runtime-anatomy-v8");
assert.equal(profile.proofEntries[0]?.media.aspectRatio, "16:9");
assert.equal(
  profile.proofEntries[0]?.media.src,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/anatomy-v8-release/final.mp4",
);
assert.equal(
  profile.proofEntries[0]?.media.poster,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/anatomy-v8-release/contact-sheet.jpg",
);
assert.equal(profile.proofEntries[0]?.media.durationLabel, "7 sec");
assert.equal(
  profile.repositoryHref,
  "/format-repositories/shaz-puppet-runtime-v1/downloads/wiggly-shaz-puppet-runtime-format-kit.zip",
);
assert.ok(profile.handoff);
assert.equal(profile.handoff.totalEstimate, "$0 provider cost, usually 2-8 min");
assert.equal(
  getPublishedDiscoveryEntries().some(
    (entry) => entry.format.slug === "shaz-puppet-runtime",
  ),
  false,
  "The proof stays off the Discovery shelf until the user visually approves it.",
);
assert.equal(
  getPublishedDiscoveryProofEntries().some(
    (entry) => entry.format.slug === "shaz-puppet-runtime",
  ),
  true,
  "The rich Format page can be browser-validated before shelf publication.",
);

const presentation = await getFormatRepoPagePresentation("shaz-puppet-runtime");
assert.equal(presentation?.kind, "shaz-puppet-runtime");
assert.equal(
  presentation?.detailedProofId,
  "shaz-puppet-runtime-anatomy-v8",
);
const trust = await getShazPuppetRuntimeTrustData();
assert.equal(trust.version, "0.1.2");
assert.equal(trust.includedAssets.poses.length, 12);
assert.equal(trust.includedAssets.props.length, 2);
assert.equal(trust.quality.summary[0]?.value, "74/74");
assert.ok(trust.commands.includes("npm run inspect:registry"));
assert.equal(trust.quality.summary[2]?.value, "173");
assert.equal(trust.proof.durationTimeLabel, "00:07");
assert.equal(
  trust.includedAssets.contactSheetSrc,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/anatomy-v8-release/contact-sheet.jpg",
);
assert.match(includedAssetsSource, /data\.includedAssets\.poses\.length/);
assert.doesNotMatch(includedAssetsSource, /Eleven reusable actions/);
assert.equal(trust.receipt.rows[1]?.value, expectedVideoSha.slice(0, 16));
assert.match(trust.receipt.note, /not-claimed/);

const archive = await JSZip.loadAsync(readFileSync(download));
const entries = Object.keys(archive.files);
const joined = entries.join("\n");
const root = "wiggly-shaz-puppet-runtime-format-kit";
for (const required of [
  "SKILL.md",
  "README.md",
  "KIT-MANIFEST.json",
  "runner.mjs",
  "format.json",
  "quality.json",
  "poses/index.json",
  "rig-v2/runtime.json",
  "rig-v2/assets/receipt.json",
]) {
  assert.ok(archive.file(`${root}/${required}`), `${required} must be packaged`);
}
assert.doesNotMatch(joined, /node_modules|compile-tvg-assets\.mjs|goldens\/|\.(mp4|mov|wav|m4a|aac|mp3)$/);
assert.deepEqual(
  entries.filter((entry) => entry.includes("agent-runs/")),
  [`${root}/agent-runs/`, `${root}/agent-runs/.gitkeep`],
);
assert.deepEqual(
  entries.filter((entry) => entry.includes("downloads/")),
  [],
);
const expectedZipSha = readFileSync(`${download}.sha256`, "utf8").split(/\s+/)[0];
assert.equal(sha256(download), expectedZipSha);

console.log("Shaz Puppet Runtime rich Repo page tests passed");
