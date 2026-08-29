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
const talkingShowcase = `${repository}/goldens/talking-scene-lipsync-v1`;
const video = `${talkingShowcase}/final.mp4`;
const contactSheet = `${talkingShowcase}/contact-sheet.jpg`;
const poster = `${talkingShowcase}/poster.jpg`;
const cueFile = `${talkingShowcase}/cherry-lipsync.tsv`;
const audio = `${talkingShowcase}/user-audio.wav`;
const input = `${talkingShowcase}/input.json`;
const validationReceipt = `${talkingShowcase}/validation-receipt.json`;
const renderReport = `${talkingShowcase}/render-report.json`;
const qualityReport = `${talkingShowcase}/quality-report.json`;
const humanReview = `${talkingShowcase}/human-review.json`;
const poseShowcase = `${repository}/goldens/five-authored-showcase`;
const poseVideo = `${poseShowcase}/final.mp4`;
const poseContactSheet = `${poseShowcase}/contact-sheet.jpg`;
const posePoster = `${poseShowcase}/poster.jpg`;
const includedAssetsSource = readFileSync(
  "features/discovery/ShazPuppetRuntimeIncludedAssets.tsx",
  "utf8",
);
const connectionsSource = readFileSync(
  "features/discovery/ShazPuppetRuntimeConnections.tsx",
  "utf8",
);
const formatProofSource = readFileSync("features/discovery/formatProof.server.ts", "utf8");
const repoPageSource = readFileSync("features/discovery/formatRepoPage.server.ts", "utf8");
const trustSource = readFileSync("features/discovery/shazPuppetRuntimeTrust.server.ts", "utf8");
const expectedVideoSha =
  "59cef6b0910a9d7f8dfe342c0602e8f1921ec6c837fe0fb26c8d5510fd1d2edf";
const expectedContactSheetSha =
  "1ad95d6dd67313f7d49f91e6f6a20a1694360f1cd95d64c2fd40943ff6db9874";
const expectedPosterSha =
  "4d494ead2293efcdf0d46c3a7a392d5b7674bac77dc4ef3b40d5a0dabb93afec";
const expectedCueSha =
  "6a6d5604461dfe9aadc40ab3bf5f7b5171c64e674c95384c58275294ee32820d";
const expectedAudioSha =
  "37648e2e0b4c37d22ec529b4301c8abd9435f92ce641c804e521e5b3bdd23f1b";
const expectedInputSha =
  "5d6428d1247cf0ba6a0392296d2df57312300172fee5465e3ad64b1f2b52dd06";
const expectedValidationReceiptSha =
  "80ef605e5bd40e3dddb4d89f3cd27d29fb1e688e2e3b0e7fe50d62c945e27623";
const expectedRenderReportSha =
  "8cef0c46cb131ba48e3835422b9691576b4f1d278c4034b6c7efaebb3beb9a40";
const expectedQualityReportSha =
  "a088e364c40c047c52a02f60c91d0fc59b9c65eb9720492e443c967c817f00e3";
const expectedHumanReviewSha =
  "cf1178d2dcbc0edc11e14c39d821d6705d60139330b5eb49f1dc27b435880829";
const expectedPoseVideoSha =
  "8a5183154aaefb9a844d3bd8be48170e7576986f0d0717de5243057c2ea435ae";
const expectedPoseContactSheetSha =
  "8cdc5ea13306953fa1617d5022a886f407e22d2f8bf706bf97e6c7d03cf08233";
const expectedPosePosterSha =
  "5a0a821a61ebf39719488db16e345db4b28c6e87d5cde9c8c282d07f613b4c22";
const trustedShowcasePoseIds = [
  "present",
  "think",
  "aha",
  "point",
  "confident",
];
const expectedBackgrounds = [
  {
    id: "sisters-room",
    label: "Sisters Room",
    path: "assets/backgrounds/sisters-room.png",
    sha256: "740f61cbd58581b3c944fc77038fd51756305083b22ae3e28df0f1f5190ec485",
  },
  {
    id: "living-room",
    label: "Living Room",
    path: "assets/backgrounds/living-room.png",
    sha256: "f5b6f3c78351028a1fd1d6b067337f2a99ed456647b5ce7608426f42088ece3e",
  },
  {
    id: "map-photo-zone",
    label: "Photo Zone",
    path: "assets/backgrounds/map-photo-zone.png",
    sha256: "2c5d6b6520b2bab37b74a3b46a32c01d266ca520e2fca5425192312c569cb937",
  },
  {
    id: "pure-white",
    label: "Pure White",
    path: "assets/backgrounds/pure-white.png",
    sha256: "f91cf55509a036596da76a95f07a4034459ff0c6b23aac48b4ff6c2661edb807",
  },
] as const;
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
assert.equal(existsSync(cueFile), true);
assert.equal(sha256(cueFile), expectedCueSha);
assert.equal(existsSync(audio), true);
assert.equal(sha256(audio), expectedAudioSha);
assert.equal(sha256(input), expectedInputSha);
assert.equal(sha256(validationReceipt), expectedValidationReceiptSha);
assert.equal(sha256(renderReport), expectedRenderReportSha);
assert.equal(sha256(qualityReport), expectedQualityReportSha);
assert.equal(sha256(humanReview), expectedHumanReviewSha);
assert.equal(existsSync(poseVideo), true);
assert.equal(sha256(poseVideo), expectedPoseVideoSha);
assert.equal(existsSync(poseContactSheet), true);
assert.equal(sha256(poseContactSheet), expectedPoseContactSheetSha);
assert.equal(existsSync(posePoster), true);
assert.equal(sha256(posePoster), expectedPosePosterSha);
const talkingInput = JSON.parse(readFileSync(input, "utf8")) as {
  sequence: Array<{ poseId: string }>;
};
assert.deepEqual(
  [...new Set(talkingInput.sequence.map(({ poseId }) => poseId))],
  ["neutral-listening", "present", "confident", "point", "shrug", "aha"],
);
const validation = JSON.parse(readFileSync(validationReceipt, "utf8")) as {
  status: string;
  inputSha256: string;
  audio: { sha256: string };
  lipSync: { cueSha256: string; cueCount: number; usedMouthDrawings: string[] };
};
const render = JSON.parse(readFileSync(renderReport, "utf8")) as {
  status: string;
  inputSha256: string;
  outputSha256: string;
  audioSha256: string;
  lipSync: { cueSha256: string; cueCount: number; usedMouthDrawings: string[] };
};
const quality = JSON.parse(readFileSync(qualityReport, "utf8")) as {
  status: string;
  inputSha256: string;
  outputSha256: string;
  measured: { audioCodec: string; frames: number; durationSeconds: number };
  failures: unknown[];
};
const review = JSON.parse(readFileSync(humanReview, "utf8")) as {
  status: string;
  reviewedOutputSha256: string;
  directVideoPerception: boolean;
  directAudioPerception: boolean;
};
assert.equal(validation.status, "pass");
assert.equal(validation.inputSha256, expectedInputSha);
assert.equal(validation.audio.sha256, expectedAudioSha);
assert.equal(validation.lipSync.cueSha256, expectedCueSha);
assert.equal(validation.lipSync.cueCount, 100);
assert.deepEqual(validation.lipSync.usedMouthDrawings, [
  "1",
  "2",
  "3",
  "4",
  "5",
]);
assert.equal(render.status, "rendered");
assert.equal(render.inputSha256, expectedInputSha);
assert.equal(render.outputSha256, expectedVideoSha);
assert.equal(render.audioSha256, expectedAudioSha);
assert.equal(render.lipSync.cueSha256, expectedCueSha);
assert.equal(render.lipSync.cueCount, 100);
assert.deepEqual(render.lipSync.usedMouthDrawings, ["1", "2", "3", "4", "5"]);
assert.equal(quality.status, "pass");
assert.equal(quality.inputSha256, expectedInputSha);
assert.equal(quality.outputSha256, expectedVideoSha);
assert.equal(quality.measured.audioCodec, "aac");
assert.equal(quality.measured.frames, 288);
assert.equal(quality.measured.durationSeconds, 12);
assert.deepEqual(quality.failures, []);
assert.equal(review.status, "pending");
assert.equal(review.reviewedOutputSha256, expectedVideoSha);
assert.equal(review.directVideoPerception, false);
assert.equal(review.directAudioPerception, false);
const poseShowcaseInput = JSON.parse(
  readFileSync(`${poseShowcase}/input.json`, "utf8"),
) as { sequence: Array<{ poseId: string }> };
assert.deepEqual(
  poseShowcaseInput.sequence.map(({ poseId }) => poseId),
  trustedShowcasePoseIds,
);
const goldens = JSON.parse(
  readFileSync(`${repository}/goldens.json`, "utf8"),
) as {
  talkingSceneShowcase: {
    inputSha256: string;
    videoSha256: string;
    posterSha256: string;
    contactSheetSha256: string;
    validationReceiptSha256: string;
    renderReportSha256: string;
    qualityReportSha256: string;
    humanReviewSha256: string;
    cueSha256: string;
    audioSha256: string;
  };
};
assert.equal(goldens.talkingSceneShowcase.inputSha256, expectedInputSha);
assert.equal(goldens.talkingSceneShowcase.videoSha256, expectedVideoSha);
assert.equal(goldens.talkingSceneShowcase.posterSha256, expectedPosterSha);
assert.equal(
  goldens.talkingSceneShowcase.contactSheetSha256,
  expectedContactSheetSha,
);
assert.equal(
  goldens.talkingSceneShowcase.validationReceiptSha256,
  expectedValidationReceiptSha,
);
assert.equal(
  goldens.talkingSceneShowcase.renderReportSha256,
  expectedRenderReportSha,
);
assert.equal(
  goldens.talkingSceneShowcase.qualityReportSha256,
  expectedQualityReportSha,
);
assert.equal(
  goldens.talkingSceneShowcase.humanReviewSha256,
  expectedHumanReviewSha,
);
assert.equal(goldens.talkingSceneShowcase.cueSha256, expectedCueSha);
assert.equal(goldens.talkingSceneShowcase.audioSha256, expectedAudioSha);

const profile = getDiscoveryFormatProfile("shaz-puppet-runtime");
assert.ok(profile);
assert.equal(profile.name, "Animate Shaz");
assert.equal(profile.version, "0.4.0");
assert.equal(profile.proofEntries.length, 1);
assert.equal(profile.proofEntries[0]?.id, "shaz-puppet-runtime-talking-scene");
assert.equal(profile.proofEntries[0]?.format.name, "Animate Shaz");
assert.equal(profile.proofEntries[0]?.format.version, "0.2.0");
assert.match(
  profile.proofEntries[0]?.title ?? "",
  /Shaz performs a real talking scene/,
);
assert.match(
  profile.proofEntries[0]?.curatorNote ?? "",
  /five hand-drawn mouth shapes/,
);
assert.match(profile.proofEntries[0]?.curatorNote ?? "", /creative review is still pending/);
assert.match(profile.promise, /Give Shaz a voice track/);
assert.match(profile.promise, /pick a room/);
assert.match(profile.promise, /reads the words locally/);
assert.match(profile.promise, /five artist-reviewed gestures/);
assert.equal(profile.proofEntries[0]?.media.aspectRatio, "16:9");
assert.equal(
  profile.proofEntries[0]?.media.src,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/talking-scene-lipsync-v1/final.mp4",
);
assert.equal(
  profile.proofEntries[0]?.media.poster,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/talking-scene-lipsync-v1/poster.jpg",
);
assert.equal(profile.proofEntries[0]?.media.durationLabel, "12 sec");
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
assert.match(
  profile.handoff.requiredInputs.join(" "),
  /five artist-reviewed gestures/,
);
assert.match(
  profile.handoff.instructions.join(" "),
  /no sequence, durationFrames, or frame math/,
);
assert.match(profile.handoff.instructions.join(" "), /present, think, aha, point, and confident/);
assert.match(profile.handoff.instructions.join(" "), /npm run transcribe/);
assert.match(profile.handoff.instructions.join(" "), /registered recipes are technically runnable reference material/);
assert.equal(profile.handoff.totalEstimate, "$0 in service fees, usually 2-8 min");
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
  "shaz-puppet-runtime-talking-scene",
);
assert.equal(presentation?.copy.runTitle, "Give Shaz a line.");
assert.match(presentation?.copy.runDescription ?? "", /reads what Shaz is saying/);
assert.match(presentation?.copy.runDescription ?? "", /artist-reviewed gesture/);
assert.match(presentation?.copy.runDescription ?? "", /lip-syncs the mouth/);
assert.equal(presentation?.copy.provided, "One voice track + room choice");
assert.equal(presentation?.copy.examplesTitle, "Hear Shaz perform it.");
assert.match(presentation?.copy.examplesDescription ?? "", /12-second first draft/);
assert.match(presentation?.copy.examplesDescription ?? "", /five hand-drawn mouth shapes/);
assert.match(presentation?.copy.examplesDescription ?? "", /creative review is still pending/);
const publicHeroCopy = [profile.name, profile.promise, presentation?.copy.runTitle, presentation?.copy.runDescription].join(" ");
assert.doesNotMatch(publicHeroCopy, /Download Format \d/i);
assert.doesNotMatch(publicHeroCopy, /checksum|WASI|registered actions|trusted actions|Puppet Runtime/i);
for (const staleCopy of [
  "Download Format 0.3.0 to turn local audio",
  "checksum-registered fixed backgrounds",
  "trusted artist-authored actions",
  "bundled WASI",
]) {
  assert.doesNotMatch(`${formatProofSource}\n${repoPageSource}`, new RegExp(staleCopy, "i"));
}
const trust = await getShazPuppetRuntimeTrustData();
assert.equal(trust.version, "0.4.0");
assert.equal(trust.includedAssets.poses.length, 14);
assert.equal(
  trust.includedAssets.poses.some(({ id }) => id === "talk-to-camera"),
  false,
  "Talk to Camera is a composition preset, not a fifteenth pose.",
);
assert.deepEqual(trust.includedAssets.defaultDialogue, {
  id: "talk-to-camera",
  label: "Talk to Camera",
  subtitle: "Default dialogue",
  internalPoseId: "neutral-listening",
  description:
    "Shaz faces the audience in a calm, grounded pose while the supplied audio changes only the mouth drawing.",
  rules: [
    "The audio decides the length",
    "No manual frame math",
    "The same body and renderer stay in place",
  ],
});
assert.deepEqual(
  trust.includedAssets.showcasePoses.map(({ id }) => id),
  trustedShowcasePoseIds,
);
assert.equal(trust.includedAssets.props.length, 2);
assert.equal(trust.includedAssets.defaultBackgroundId, "sisters-room");
assert.deepEqual(
  trust.includedAssets.backgrounds.map(({ id, label, path, sha256 }) => ({
    id,
    label,
    path,
    sha256,
  })),
  expectedBackgrounds,
);
for (const background of expectedBackgrounds) {
  const file = `${repository}/${background.path}`;
  assert.equal(existsSync(file), true);
  assert.equal(sha256(file), background.sha256);
}
assert.equal(
  trust.includedAssets.backgrounds.find(({ id }) => id === "map-photo-zone")
    ?.supportingMediaZone?.status,
  "reserved-not-active",
);
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
  {
    name: "whisper.cpp",
    version: "1.9.2",
    artifact: "checksum-pinned source archive plus base.en Q5_1 model",
    host: "locally compiled Apple Silicon helper using Apple Clang and Accelerate",
    nativeExecutableIncluded: false,
    nativeExecutableBuiltLocally: true,
    networkRequired: false,
    supportedPlatform: "darwin-arm64",
    purpose: "create an English transcript with word timestamps before body-language planning",
  },
]);
assert.equal(trust.quality.summary[0]?.value, "0.4.0");
assert.equal(trust.quality.summary[0]?.label, "kit version");
assert.ok(trust.commands.includes("npm run inspect:registry"));
assert.ok(
  trust.commands.some(
    (command) =>
      command.includes("npm run init") &&
      command.includes("--audio=/absolute/path/dialogue.wav"),
  ),
  "the copyable Talk to Camera init command must include its required audio input",
);
assert.ok(
  trust.commands.includes(
    "npm run lipsync -- --audio=/absolute/path/audio.wav --output=/absolute/path/cherry.tsv",
  ),
);
assert.ok(
  trust.commands.includes(
    "npm run transcribe -- --audio=/absolute/path/audio.wav --output=/absolute/path/transcript.json",
  ),
);
assert.equal(trust.quality.summary[2]?.value, "5");
assert.equal(trust.quality.summary[2]?.label, "artist-reviewed gestures");
assert.equal(trust.proof.durationTimeLabel, "00:12");
assert.match(trust.proofCopy.eyebrow, /First-draft talking scene/);
assert.equal(trust.proofCopy.title, "A real voice track, performed by Shaz.");
assert.match(trust.quality.noteTitle, /strong first draft/);
assert.match(trust.quality.note, /generated 100 mouth-timing cues locally/);
assert.match(trust.quality.note, /5 hand-drawn mouth shapes/);
assert.match(trust.quality.note, /earlier 0\.2\.0 kit/);
assert.match(trust.quality.note, /four built-in backgrounds/);
assert.match(trust.quality.note, /Creative review of this exact video is still pending/);
assert.doesNotMatch(
  trustSource,
  /blind proof generated|checksum-registered fixed backgrounds|final checksum-bound creative certification|Body motion and lip-sync stay inside one renderer/i,
);
assert.equal(
  trust.includedAssets.showcasePosterSrc,
  "/format-repositories/shaz-puppet-runtime-v1/goldens/five-authored-showcase/poster.jpg",
);
assert.match(includedAssetsSource, /data\.includedAssets\.poses\.length/);
assert.match(includedAssetsSource, /Five reviewed gestures/);
assert.match(includedAssetsSource, /Local transcription and lip-sync/);
assert.match(includedAssetsSource, /Four rooms/);
assert.match(includedAssetsSource, /runnable actions in all/);
assert.match(includedAssetsSource, /engineering reference material/);
assert.match(includedAssetsSource, /fresh creative review/);
assert.match(includedAssetsSource, /data\.includedAssets\.bundledEngines/);
assert.match(includedAssetsSource, /shaz-background-library/);
assert.match(includedAssetsSource, /Pick the room\. Keep the camera fixed\./);
assert.match(includedAssetsSource, /Four built-in backgrounds/);
assert.match(includedAssetsSource, /data\.includedAssets\.backgrounds\.map/);
assert.match(includedAssetsSource, /defaultBackgroundId/);
assert.match(includedAssetsSource, /Future media zone reserved/);
assert.match(includedAssetsSource, /formatAssetRoot/);
assert.match(includedAssetsSource, /background\.path/);
assert.match(includedAssetsSource, /shaz-talk-to-camera-option/);
assert.match(includedAssetsSource, /defaultDialogue\.subtitle/);
assert.match(includedAssetsSource, /ordinary speech/);
assert.match(includedAssetsSource, /Present, Think, Ah-ha, Point, or/);
assert.match(includedAssetsSource, /sequencePreset/);
assert.match(
  includedAssetsSource,
  /data\.includedAssets\.defaultDialogue\.internalPoseId/,
);
assert.match(includedAssetsSource, /Five artist-reviewed gestures/);
assert.match(includedAssetsSource, /data\.includedAssets\.showcasePoses\.map/);
assert.match(includedAssetsSource, /shaz-mouth-shape-kit/);
assert.match(
  includedAssetsSource,
  /Five hand-drawn mouths\. Every sound has somewhere to go\./,
);
for (const mouthAsset of [
  "mouth-01.png",
  "mouth-04.png",
  "mouth-05.png",
  "mouth-02.png",
  "mouth-03.png",
]) {
  assert.match(
    includedAssetsSource,
    new RegExp(mouthAsset.replace(".", "\\.")),
  );
}
for (const mapping of ["A · X", "B · G · I · J", "C · H", "D", "E · F · K"]) {
  assert.match(
    includedAssetsSource,
    new RegExp(mapping.replaceAll(" · ", " \\· ")),
  );
}
assert.match(includedAssetsSource, /swaps between five mouth drawings/);
assert.match(connectionsSource, /No subscriptions\. No API keys\. It runs on Apple silicon\./);
assert.match(connectionsSource, /Everything stays local/);
assert.match(connectionsSource, /It hears the words, too/);
assert.match(connectionsSource, /same Shaz rig/);
assert.match(includedAssetsSource, /Understands the dialogue/);
assert.match(includedAssetsSource, /Local English transcript/);
assert.doesNotMatch(includedAssetsSource, /Cherry Lip Sync \{engine\.version\}/);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Kit version")?.value,
  "0.4.0",
);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Demo made with")?.value,
  "0.2.0",
);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Video SHA")?.value,
  expectedVideoSha.slice(0, 16),
);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Audio")?.value,
  "AAC · -15.6 dB",
);
assert.equal(
  trust.receipt.rows.find(({ label }) => label === "Lip-sync")?.value,
  "100 cues · 5 mouths",
);
assert.match(trust.receipt.note, /exact video checksum is recorded above/);
assert.match(trust.receipt.note, /Human creative review is still pending/);

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
  "runtime/transcription.mjs",
  ...expectedBackgrounds.map(({ path }) => path),
  "vendor/cherry-lip-sync/v0.1.0/cherrylipsync.wasm",
  "vendor/whisper.cpp/v1.9.2/VENDOR-MANIFEST.json",
  "vendor/whisper.cpp/v1.9.2/BUILD-PLAN.json",
  "vendor/whisper.cpp/v1.9.2/whisper.cpp-v1.9.2.tar.gz",
  "vendor/whisper.cpp/v1.9.2/ggml-base.en-q5_1.bin",
  "vendor/whisper.cpp/v1.9.2/LICENSE-WHISPER.CPP",
  "vendor/whisper.cpp/v1.9.2/LICENSE-OPENAI-WHISPER",
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
    nativeExecutable?: boolean;
    nativeExecutableIncluded?: boolean;
    nativeExecutableBuiltLocally?: boolean;
    networkRequired: boolean;
    supportedPlatform?: string;
  }>;
};
assert.equal(packagedFormat.version, "0.4.0");
assert.match(packagedFormat.summary, /Give Shaz a voice track/);
assert.match(packagedFormat.summary, /four built-in backgrounds/);
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
  {
    name: "whisper.cpp",
    version: "1.9.2",
    artifact: "checksum-pinned source archive plus base.en Q5_1 model",
    host: "locally compiled Apple Silicon helper using Apple Clang and Accelerate",
    nativeExecutableIncluded: false,
    nativeExecutableBuiltLocally: true,
    networkRequired: false,
    supportedPlatform: "darwin-arm64",
    purpose: "create an English transcript with word timestamps before body-language planning",
  },
]);
assert.equal(
  entries.some((entry) => /(^|\/)cherrylipsync(?:\.exe)?$/.test(entry)),
  false,
  "The ZIP must not ship a native Cherry executable.",
);
assert.equal(
  entries.some((entry) => entry.includes(".runtime-cache/") || /(^|\/)whisper-cli$/.test(entry)),
  false,
  "The ZIP must contain source and model inputs, never the locally compiled Whisper helper.",
);
assert.doesNotMatch(
  joined,
  /node_modules|compile-tvg-assets\.mjs|goldens\/|\.(mp4|mov|wav|m4a|aac|mp3)$/,
);
assert.deepEqual(
  entries.filter((entry) => entry.includes("agent-runs/")),
  [`${root}/agent-runs/.gitkeep`],
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
