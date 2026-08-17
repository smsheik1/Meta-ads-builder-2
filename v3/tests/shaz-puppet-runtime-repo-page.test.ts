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
const video = `${repository}/goldens/ten-action-proof.mp4`;
const expectedVideoSha =
  "1d8dbe67347548f21239ae0fd5eb15bcca538d0fa0eadc6247b27fd2d5a0d950";
const sha256 = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

assert.equal(existsSync(download), true);
assert.ok(statSync(download).size < 100 * 1024 * 1024);
assert.equal(existsSync(video), true);
assert.equal(sha256(video), expectedVideoSha);
assert.equal(existsSync(`${repository}/goldens/ten-action-poster.jpg`), true);
assert.equal(existsSync(`${repository}/goldens/ten-action-contact-sheet.jpg`), true);

const profile = getDiscoveryFormatProfile("shaz-puppet-runtime");
assert.ok(profile);
assert.equal(profile.version, "0.1.0");
assert.equal(profile.proofEntries.length, 1);
assert.equal(profile.proofEntries[0]?.media.aspectRatio, "16:9");
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
const trust = await getShazPuppetRuntimeTrustData();
assert.equal(trust.version, "0.1.0");
assert.equal(trust.includedAssets.poses.length, 11);
assert.equal(trust.includedAssets.props.length, 3);
assert.equal(trust.quality.summary[0]?.value, "20/20");
assert.equal(trust.receipt.rows[1]?.value, expectedVideoSha.slice(0, 16));
assert.match(trust.receipt.note, /pending/);

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
  [`${root}/downloads/`],
);
const expectedZipSha = readFileSync(`${download}.sha256`, "utf8").split(/\s+/)[0];
assert.equal(sha256(download), expectedZipSha);

console.log("Shaz Puppet Runtime rich Repo page tests passed");
