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
const showcase = `${repository}/goldens/five-authored-showcase`;
const video = `${showcase}/final.mp4`;
const contactSheet = `${showcase}/contact-sheet.jpg`;
const poster = `${showcase}/poster.jpg`;
const includedAssetsSource = readFileSync(
  "features/discovery/ShazPuppetRuntimeIncludedAssets.tsx",
  "utf8",
);
const connectionsSource = readFileSync(
  "features/discovery/ShazPuppetRuntimeConnections.tsx",
  "utf8",
);
const expectedVideoSha =
  "8a5183154aaefb9a844d3bd8be48170e7576986f0d0717de5243057c2ea435ae";
const expectedContactSheetSha =
  "8cdc5ea13306953fa1617d5022a886f407e22d2f8bf706bf97e6c7d03cf08233";
const expectedPosterSha =
  "5a0a821a61ebf39719488db16e345db4b28c6e87d5cde9c8c282d07f613b4c22";
const trustedShowcasePoseIds = [
  "present",
  "think",
  "aha",
  "point",
  "confident",
];
const rejectedShowcasePoseIds = [
  "facepalm-frustrated",
  "arms-crossed-skeptical",
  "excited-celebration",
];
const sha256 = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

assert.equal(existsSync(download), true);
assert.ok(statSync(download).size < 100 * 1024 * 1024);
assert.equal(existsSync(video), true);
assert.equal(sha256(video), expectedVideoSha);
assert.equal(existsSync(contactSheet), true);
assert.equal(sha256(contactSheet), expectedContactSheetSha);
assert.equal(existsSync(poster), true);
assert.equal(sha256(poster), expectedPosterSha);
const showcaseInput = JSON.parse(
  readFileSync(`${showcase}/input.json`, "utf8"),
) as { sequence: Array<{ poseId: string }> };
assert.deepEqual(
  showcaseInput.sequence.map(({ poseId }) => poseId),
  trustedShowcasePoseIds,
);

const profile = getDiscoveryFormatProfile("shaz-puppet-runtime");
assert.ok(profile);
assert.equal(profile.version, "0.2.0");
assert.equal(profile.proofEntries.length, 1);
assert.equal(profile.proofEntries[0]?.id, "shaz-puppet-runtime-five-authored");
assert.equal(profile.proofEntries[0]?.format.version, "0.1.0");
assert.match(
  profile.proofEntries[0]?.title ?? "",
  /Five recreated artist-authored actions/,
);
assert.match(
  profile.proofEntries[0]?.curatorNote ?? "",
  /Generated experimental poses are excluded/,
);
assert.match(profile.promise, /Format 0\.2\.0/);
assert.match(profile.promise, /bundled Cherry WASI cue engine/);
assert.match(profile.promise, /five trusted artist-authored actions/);
assert.equal(profile.proofEntries[0]?.media.aspectRatio, "16:9");
assert.equal(
  profile.proofEntries[0]?.media.src,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/five-authored-showcase/final.mp4",
);
assert.equal(
  profile.proofEntries[0]?.media.poster,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/five-authored-showcase/poster.jpg",
);
assert.equal(profile.proofEntries[0]?.media.durationLabel, "10 sec");
for (const rejectedPoseId of rejectedShowcasePoseIds) {
  assert.doesNotMatch(
    JSON.stringify(profile.proofEntries[0]),
    new RegExp(rejectedPoseId),
  );
}
assert.equal(
  profile.repositoryHref,
  "/format-repositories/shaz-puppet-runtime-v1/downloads/wiggly-shaz-puppet-runtime-format-kit.zip",
);
assert.ok(profile.handoff);
assert.equal(
  profile.handoff.totalEstimate,
  "$0 provider cost, usually 2-8 min",
);
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
assert.equal(presentation?.detailedProofId, "shaz-puppet-runtime-five-authored");
assert.match(presentation?.copy.runDescription ?? "", /Format 0\.2\.0/);
assert.match(presentation?.copy.runDescription ?? "", /bundled WASI/);
assert.match(
  presentation?.copy.examplesDescription ?? "",
  /Present, Think, Ah-ha, Point, and Confident/,
);
assert.match(
  presentation?.copy.examplesDescription ?? "",
  /not a Format 0\.2\.0 lip-sync certification/,
);
const trust = await getShazPuppetRuntimeTrustData();
assert.equal(trust.version, "0.2.0");
assert.equal(trust.includedAssets.poses.length, 14);
assert.deepEqual(
  trust.includedAssets.showcasePoses.map(({ id }) => id),
  trustedShowcasePoseIds,
);
assert.equal(trust.includedAssets.props.length, 2);
assert.equal(trust.includedAssets.backgrounds.length, 1);
assert.deepEqual(trust.includedAssets.bundledEngines, [
  {
    name: "cherry-lip-sync",
    version: "0.1.0",
    artifact: "WebAssembly/WASI module",
    host: "node",
    nativeExecutable: false,
    networkRequired: false,
    purpose:
      "generate A-K/X speech cues for audio-backed shaz-sequence-input-v1 runs",
  },
]);
assert.equal(trust.quality.summary[0]?.value, "0.2.0");
assert.equal(trust.quality.summary[0]?.label, "downloadable Format");
assert.ok(trust.commands.includes("npm run inspect:registry"));
assert.ok(
  trust.commands.includes(
    "npm run lipsync -- --audio=/absolute/path/audio.wav --output=/absolute/path/cherry.tsv",
  ),
);
assert.equal(trust.quality.summary[2]?.value, "5");
assert.equal(trust.quality.summary[2]?.label, "showcase-approved actions");
assert.equal(trust.proof.durationTimeLabel, "00:10");
assert.match(trust.proofCopy.eyebrow, /Trusted artist-authored actions/);
assert.match(trust.quality.note, /download is Format 0\.2\.0/);
assert.match(trust.quality.note, /Present, Think, Ah-ha, Point, and Confident/);
assert.match(trust.quality.note, /experimental poses are excluded/);
assert.equal(
  trust.includedAssets.showcasePosterSrc,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/five-authored-showcase/poster.jpg",
);
assert.match(includedAssetsSource, /data\.includedAssets\.poses\.length/);
assert.match(includedAssetsSource, /Local lip-sync included/);
assert.match(includedAssetsSource, /data\.includedAssets\.bundledEngines/);
assert.match(includedAssetsSource, /generated experimental poses\s+excluded/);
assert.match(includedAssetsSource, /data\.includedAssets\.showcasePoses\.map/);
assert.match(includedAssetsSource, /shaz-mouth-shape-kit/);
assert.match(
  includedAssetsSource,
  /Five authored mouths\. Every sound has somewhere to go\./,
);
for (const mouthAsset of [
  "mouth-01.png",
  "mouth-04.png",
  "mouth-05.png",
  "mouth-02.png",
  "mouth-03.png",
]) {
  assert.match(includedAssetsSource, new RegExp(mouthAsset.replace(".", "\\.")));
}
for (const mapping of [
  "A · X",
  "B · G · I · J",
  "C · H",
  "D",
  "E · F · K",
]) {
  assert.match(includedAssetsSource, new RegExp(mapping.replaceAll(" · ", " \\· ")));
}
assert.match(includedAssetsSource, /swaps only the Mouth drawing/);
assert.match(connectionsSource, /Bundled local lip-sync/);
assert.match(connectionsSource, /same Shaz/);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Download Format")?.value,
  "0.2.0",
);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Proof Format")?.value,
  "0.1.0",
);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Video SHA")?.value,
  expectedVideoSha.slice(0, 16),
);
assert.match(trust.receipt.note, /does not certify Format 0\.2\.0/);
assert.match(trust.receipt.note, /present-think-aha-point-direct/);
assert.match(trust.receipt.note, /confident-delegated/);

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
  "requirements.json",
  "quality.json",
  "poses/index.json",
  "rig-v2/runtime.json",
  "rig-v2/assets/receipt.json",
  "runtime/cherry-wasi-runner.mjs",
  "runtime/lipsync.mjs",
  "vendor/cherry-lip-sync/v0.1.0/cherrylipsync.wasm",
]) {
  assert.ok(
    archive.file(`${root}/${required}`),
    `${required} must be packaged`,
  );
}
const packagedFormatFile = archive.file(`${root}/format.json`);
const packagedRequirementsFile = archive.file(`${root}/requirements.json`);
assert.ok(packagedFormatFile);
assert.ok(packagedRequirementsFile);
const packagedFormat = JSON.parse(await packagedFormatFile.async("string")) as {
  version: string;
  summary: string;
};
const packagedRequirements = JSON.parse(
  await packagedRequirementsFile.async("string"),
) as {
  bundledEngines: Array<{
    name: string;
    artifact: string;
    nativeExecutable: boolean;
    networkRequired: boolean;
  }>;
};
assert.equal(packagedFormat.version, "0.2.0");
assert.match(packagedFormat.summary, /bundled Cherry WASI cue engine/);
assert.deepEqual(packagedRequirements.bundledEngines, [
  {
    name: "cherry-lip-sync",
    version: "0.1.0",
    artifact: "WebAssembly/WASI module",
    host: "node",
    nativeExecutable: false,
    networkRequired: false,
    purpose:
      "generate A-K/X speech cues for audio-backed shaz-sequence-input-v1 runs",
  },
]);
assert.equal(
  entries.some((entry) => /(^|\/)cherrylipsync(?:\.exe)?$/.test(entry)),
  false,
  "The ZIP must not ship a native Cherry executable.",
);
assert.doesNotMatch(
  joined,
  /node_modules|compile-tvg-assets\.mjs|goldens\/|\.(mp4|mov|wav|m4a|aac|mp3)$/,
);
assert.deepEqual(
  entries.filter((entry) => entry.includes("agent-runs/")),
  [`${root}/agent-runs/`, `${root}/agent-runs/.gitkeep`],
);
assert.deepEqual(
  entries.filter((entry) => entry.includes("downloads/")),
  [],
);
const expectedZipSha = readFileSync(`${download}.sha256`, "utf8").split(
  /\s+/,
)[0];
assert.equal(sha256(download), expectedZipSha);

console.log("Shaz Puppet Runtime rich Repo page tests passed");
