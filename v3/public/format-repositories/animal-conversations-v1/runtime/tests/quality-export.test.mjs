// These tests exercise receipt mechanics with synthetic media and attestations.
// They are never evidence that CI perceived or approved an actual episode.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { execute, hashValue, readJson, sha256, writeJson } from "../common.mjs";
import { canonicalHash, collectRenderIdentity, qualityPolicyIdentity } from "../identity.mjs";
import { approveScriptReview, createScriptReview } from "../speaker-review.mjs";
import { validateRun } from "../validate.mjs";
import { assessPlaybackReview, assertRenderFresh, finalizeRun, loadQualityPolicy, recordPlaybackReview, verifyFinalization, verifyPlaybackEvidence, verifyTechnicalEvidence } from "../quality.mjs";
import { exportRun, verifyExport } from "../export.mjs";
import { inspectRun } from "../inspect.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const policy = await loadQualityPolicy(sourceRoot);
const example = () => ({ schemaVersion: 1, title: "A synthetic conversation", episodeLabel: "ANIMAL CONVERSATIONS", background: "living-room", audioFile: "audio.wav", timeline: [
  { start: 0, end: 0.5, speaker: "cat", camera: "two-shot", caption: "A question?" },
  { start: 0.5, end: 1, speaker: "bunny", camera: "bunny-close", caption: "An answer." },
] });

function playback({ outputSha256 = "mp4-hash", qualityPolicyHash = "policy-hash", renderIdentityHash = "render-hash", audio = "direct" } = {}) {
  return {
    schemaVersion: 2, reviewer: "Synthetic receipt validator test; not a perceptual review", mp4Sha256: outputSha256,
    qualityPolicyHash, renderIdentityHash, rubricVersion: policy.rubricVersion,
    perception: { visual: { mode: "direct", basis: "Synthetic claim for validator mechanics only" }, audio: { mode: audio, basis: "Synthetic capability fixture; no hearing claim" } },
    passes: policy.blindReview.requiredPlayback.passIds.map((id) => ({ id, completed: true, note: "Synthetic pass record only" })),
    criteria: policy.blindReview.criterionRules.map((rule) => ({ id: rule.id, status: rule.channel === "perceptual-audio" && audio !== "direct" ? "unscored" : "pass", note: "Synthetic observation or unavailable-perception reason only" })),
    disclosures: audio === "direct" ? [] : ["Synthetic test: direct auditory perception is unavailable; audio intelligibility and synchronization are not scored."],
  };
}

const assess = (review) => assessPlaybackReview({ policy, review, outputSha256: "mp4-hash", qualityPolicyHash: "policy-hash", renderIdentityHash: "render-hash" });

test("playback needs the two named passes and every known criterion, not counters or empty records", () => {
  assert.equal(assess(playback()).status, "pass");
  for (const change of [
    (value) => value.passes = [],
    (value) => value.criteria = [],
    (value) => value.criteria[0].id = "invented-check",
    (value) => value.passes[1].id = value.passes[0].id,
    (value) => value.criteria[0].note = "",
    (value) => value.mp4Sha256 = "older-video",
    (value) => value.qualityPolicyHash = "older-rubric",
    (value) => value.renderIdentityHash = "older-renderer",
    (value) => delete value.renderIdentityHash,
  ]) {
    const value = playback(); change(value); assert.throws(() => assess(value));
  }
  const incomplete = playback(); incomplete.passes[0].completed = false;
  assert.equal(assess(incomplete).status, "fail");
});

test("only permitted auditory limitations may be unscored; disclosure cannot bypass required review", () => {
  assert.equal(assess(playback({ audio: "unavailable" })).status, "pass");
  const unsupported = playback({ audio: "unavailable" }); unsupported.criteria.at(-1).status = "pass";
  assert.equal(assess(unsupported).status, "fail");
  const missingDisclosure = playback({ audio: "unavailable" }); missingDisclosure.disclosures = [];
  assert.equal(assess(missingDisclosure).status, "fail");
  for (const channel of ["visual", "technical-audio", "evidence"]) {
    const value = playback({ audio: "unavailable" });
    for (const rule of policy.blindReview.criterionRules.filter((rule) => rule.channel === channel)) value.criteria.find((result) => result.id === rule.id).status = "unscored";
    assert.equal(assess(value).status, "fail", channel);
  }
  const indirect = playback(); indirect.perception.visual.mode = "indirect";
  assert.equal(assess(indirect).status, "fail");
  const failedAudio = playback(); failedAudio.criteria.at(-1).status = "fail";
  assert.equal(assess(failedAudio).status, "fail");
});

async function fixture(t, { media = false, title } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), "animal-quality-export-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, "kit"); const runDirectory = path.join(root, "agent-runs", "synthetic-proof");
  await mkdir(runDirectory, { recursive: true });
  const assets = await readJson(path.join(sourceRoot, "assets.json"));
  const files = ["quality.json", "assets.json", "package-lock.json", "composition-contract.json", "KIT-MANIFEST.json", "runtime/render.mjs", "runtime/common.mjs", "runtime/validate.mjs", "runtime/identity.mjs", ...[...assets.backgrounds, ...assets.characters.flatMap((character) => character.poses)].map((asset) => asset.path)];
  for (const file of files) { await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await copyFile(path.join(sourceRoot, file), path.join(root, file)); }
  const input = example(); if (title) input.title = title;
  await writeJson(path.join(runDirectory, "input.json"), input);
  if (media) {
    await execute("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-c:a", "pcm_s24le", path.join(runDirectory, input.audioFile)], { capture: true });
    let review = await createScriptReview({ runDirectory });
    for (const beat of review.beats) {
      beat.confirmedSpeaker = beat.proposedSpeaker; beat.evidence = "user-provided-label";
      beat.evidenceNote = "Synthetic validator fixture only; not real user/perceptual approval";
    }
    await writeJson(path.join(runDirectory, "script-review.json"), review);
    review = await createScriptReview({ runDirectory });
    await approveScriptReview({ root, runDirectory, reviewId: review.reviewId, approvedBy: "Synthetic mechanics fixture", note: "Mock approval for validator testing only; no actual episode approval is claimed" });
    await validateRun({ root, runDirectory });
  } else await writeFile(path.join(runDirectory, input.audioFile), "synthetic audio bytes");
  await writeFile(path.join(runDirectory, "final.mp4"), "synthetic MP4 bytes; this fixture tests hashes, not playback");
  await writeFile(path.join(runDirectory, "contact-sheet.png"), "synthetic contact sheet bytes");
  const identity = await collectRenderIdentity({ root, runDirectory });
  const outputSha256 = await sha256(path.join(runDirectory, "final.mp4"));
  const qualityPolicyHash = await qualityPolicyIdentity(root);
  const renderIdentityHash = canonicalHash(identity);
  await writeJson(path.join(runDirectory, "render-report.json"), { schemaVersion: 2, status: "pass", identity, outputSha256 });
  await writeJson(path.join(runDirectory, "quality-report.json"), {
    schemaVersion: 2, status: "pass", renderIdentityHash, qualityPolicyHash,
    contactSheetSha256: await sha256(path.join(runDirectory, "contact-sheet.png")),
    measured: { outputSha256 }, gates: Object.fromEntries(policy.requiredTechnicalGates.map((id) => [id, true])),
  });
  return { directory, root, runDirectory, outputSha256, qualityPolicyHash, renderIdentityHash, input };
}

test("technical freshness rejects missing gates, changed same-name audio, MP4, renderer and policy", async (t) => {
  const args = await fixture(t);
  const { root, runDirectory } = args;
  await verifyTechnicalEvidence(args);
  const qualityFile = path.join(runDirectory, "quality-report.json");
  const technical = await readJson(qualityFile);
  await writeJson(qualityFile, { ...technical, gates: {} });
  await assert.rejects(verifyTechnicalEvidence(args), /Required technical checks/);
  await writeJson(qualityFile, technical);
  for (const file of [path.join(runDirectory, "audio.wav"), path.join(runDirectory, "final.mp4"), path.join(root, "runtime/render.mjs"), path.join(root, "assets/backgrounds/bg7and8.png")]) {
    const bytes = await readFile(file); const changed = Buffer.from(bytes); changed[0] ^= 1;
    await writeFile(file, changed);
    await assert.rejects(assertRenderFresh(args), /Stale/);
    await writeFile(file, bytes);
  }
  const previous = await readFile(path.join(root, "quality.json"));
  await writeJson(path.join(root, "quality.json"), { ...policy, rubricVersion: "changed" });
  await assert.rejects(verifyTechnicalEvidence(args), /Stale technical review/);
  await writeFile(path.join(root, "quality.json"), previous);
  await verifyTechnicalEvidence(args);
});

test("playback receipt persists failures, requires current video and cannot pass all-unscored visuals", async (t) => {
  const args = await fixture(t);
  const review = playback(args);
  const receipt = await recordPlaybackReview({ ...args, review });
  assert.equal(receipt.status, "pass");
  await verifyPlaybackEvidence(args);
  const failed = playback({ ...args, audio: "unavailable" });
  failed.criteria.find((result) => result.id === "character-framing").status = "unscored";
  assert.equal((await recordPlaybackReview({ ...args, review: failed })).status, "fail");
  await assert.rejects(verifyPlaybackEvidence(args), /Required playback review/);
  await assert.rejects(recordPlaybackReview({ ...args, review: { ...review, mp4Sha256: "stale" } }), /stale/);
});

test("remapping unchanged pose images invalidates render identity and downstream evidence", async (t) => {
  const args = await fixture(t);
  await recordPlaybackReview({ ...args, review: playback(args) });
  const manifestPath = path.join(args.root, "assets.json");
  const original = await readJson(manifestPath);
  const changed = structuredClone(original);
  const poses = changed.characters[0].poses;
  const idle = poses.find((pose) => pose.id === "idle");
  const speaking = poses.find((pose) => pose.id === "mouth-open");
  [idle.id, speaking.id] = [speaking.id, idle.id];
  const before = await collectRenderIdentity(args);
  await writeJson(manifestPath, changed);
  const after = await collectRenderIdentity(args);
  assert.deepEqual(after.assets, before.assets, "the paths and every image byte stay unchanged");
  assert.notEqual(after.assetMappingHash, before.assetMappingHash);
  await assert.rejects(assertRenderFresh(args), /Stale render evidence/);
  await assert.rejects(verifyPlaybackEvidence(args), /Stale render evidence/);
  await writeJson(manifestPath, original);
  await verifyPlaybackEvidence(args);
});

test("technical and playback freshness reject missing, changed, or unbound contact sheets", async (t) => {
  const args = await fixture(t);
  await recordPlaybackReview({ ...args, review: playback(args) });
  const sheetPath = path.join(args.runDirectory, "contact-sheet.png");
  const originalSheet = await readFile(sheetPath);
  const qualityPath = path.join(args.runDirectory, "quality-report.json");
  const originalQuality = await readJson(qualityPath);
  await rm(sheetPath);
  await assert.rejects(verifyTechnicalEvidence(args), /missing contact sheet/);
  await assert.rejects(verifyPlaybackEvidence(args), /missing contact sheet/);
  await writeFile(sheetPath, "an old revision's sheet");
  await assert.rejects(verifyTechnicalEvidence(args), /contact sheet/);
  await writeFile(sheetPath, originalSheet);
  const unbound = { ...originalQuality }; delete unbound.contactSheetSha256;
  await writeJson(qualityPath, unbound);
  await assert.rejects(verifyTechnicalEvidence(args), /contact sheet/);
  await writeJson(qualityPath, originalQuality);
  await verifyTechnicalEvidence(args);
  await verifyPlaybackEvidence(args);
});

test("identical MP4 cannot rebind old playback evidence after a renderer change", async (t) => {
  const args = await fixture(t);
  const review = playback(args);
  await recordPlaybackReview({ ...args, review });
  const receiptPath = path.join(args.runDirectory, "playback-review.json");
  const originalReceipt = await readFile(receiptPath);
  const rendererPath = path.join(args.root, "runtime/render.mjs");
  await writeFile(rendererPath, `${await readFile(rendererPath, "utf8")}\n// Synthetic renderer identity change; fixture MP4 bytes stay identical.\n`);
  await assert.rejects(verifyPlaybackEvidence(args), /Stale render evidence/);
  // Synthetic replacement receipts represent a new technical cycle, never actual media review.
  const identity = await collectRenderIdentity(args);
  const renderIdentityHash = canonicalHash(identity);
  const reportPath = path.join(args.runDirectory, "render-report.json");
  const qualityPath = path.join(args.runDirectory, "quality-report.json");
  await writeJson(reportPath, { ...await readJson(reportPath), identity });
  await writeJson(qualityPath, { ...await readJson(qualityPath), renderIdentityHash });
  assert.equal(await sha256(path.join(args.runDirectory, "final.mp4")), args.outputSha256);
  await verifyTechnicalEvidence(args);
  await assert.rejects(verifyPlaybackEvidence(args), /render identity/);
  await assert.rejects(recordPlaybackReview({ ...args, review }), /render identity/);
  assert.deepEqual(await readFile(receiptPath), originalReceipt, "a rejected old submission must not be stamped with the new renderer identity");
  const newlyBoundSyntheticReview = { ...review, renderIdentityHash };
  assert.equal((await recordPlaybackReview({ ...args, review: newlyBoundSyntheticReview })).status, "pass");
});

const releaseMedia = { skip: process.env.WIGGLY_QUALITY_MEDIA_TESTS !== "1" };
test("failed contact-sheet publication preserves the previous receipt; success binds the completed sheet", releaseMedia, async (t) => {
  const args = await fixture(t, { media: true });
  const { runDirectory, input } = args;
  const output = path.join(runDirectory, "final.mp4");
  // Real media, synthetic render/approval evidence: this tests inspector mechanics,
  // not perception, the animation renderer, or a real episode's acceptance.
  await execute("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=24:d=1", "-i", path.join(runDirectory, input.audioFile), "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", output], { capture: true });
  const renderPath = path.join(runDirectory, "render-report.json");
  await writeJson(renderPath, { ...await readJson(renderPath), outputSha256: await sha256(output), inputHash: hashValue(input), frameCount: 24,
    speechActivity: { thresholdDb: -42, inactiveSpeakingFrameRanges: [] }, mouthAnimation: { method: "audio-envelope-hysteresis", openFrames: 24 } });
  const qualityPath = path.join(runDirectory, "quality-report.json");
  const previousReceipt = await readFile(qualityPath);
  const sheetPath = path.join(runDirectory, "contact-sheet.png");
  await rm(sheetPath);
  await mkdir(sheetPath); // Force the final atomic publication to fail after FFmpeg succeeds.
  await assert.rejects(inspectRun(args), /EISDIR|ENOTDIR|EEXIST/);
  assert.deepEqual(await readFile(qualityPath), previousReceipt, "failure must not publish a passing receipt ahead of the sheet");
  assert.equal((await readdir(runDirectory)).some((name) => name.startsWith(".contact-sheet-")), false);
  await assert.rejects(verifyTechnicalEvidence(args));
  await rm(sheetPath, { recursive: true });
  const inspected = await inspectRun(args);
  assert.equal(inspected.status, "pass");
  assert.equal(inspected.contactSheetSha256, await sha256(sheetPath));
  await verifyTechnicalEvidence(args);
});

test("finalize and export fail closed, remain idempotent, preserve private evidence and verify optional WAVs", releaseMedia, async (t) => {
  const args = await fixture(t, { media: true, title: '</script><b>https://example.test/?token=private</b>' });
  const { runDirectory, root, directory } = args;
  const output = path.join(directory, "delivery");
  await assert.rejects(exportRun({ ...args, output }));
  await assert.rejects(finalizeRun(args));
  await recordPlaybackReview({ ...args, review: playback({ ...args, audio: "unavailable" }) });
  const approvalFile = path.join(runDirectory, ".script-approval.json"); const approval = await readJson(approvalFile);
  await writeJson(approvalFile, { ...approval, scope: "fixture" });
  await assert.rejects(finalizeRun(args), /fixture approval/);
  await writeJson(approvalFile, approval);
  const delivery = await finalizeRun(args);
  assert.deepEqual(await finalizeRun(args), delivery);
  await verifyFinalization(args);
  const before = await readFile(path.join(runDirectory, "script-review.json"));
  const exported = await exportRun({ ...args, output });
  assert.equal(exported.status, "pass");
  assert.equal((await exportRun({ ...args, output })).manifestHash, exported.manifestHash);
  assert.deepEqual(await readFile(path.join(runDirectory, "script-review.json")), before);
  const html = await readFile(path.join(output, "index.html"), "utf8");
  assert.match(html, /h1\{[^}]*overflow-wrap:anywhere/);
  assert.match(html, /<a href="final\.mp4">Open video file<\/a>/);
  assert.match(html, /The MP4 is already included in this folder/);
  assert.equal(html.includes("Download the finished video"), false);
  assert.equal(html.includes("<audio"), false);
  assert.equal(html.includes("<script"), false);
  assert.equal(html.includes("token=private"), false);
  assert.equal(html.includes("example.test"), false);
  assert.equal(html.includes(runDirectory), false);
  const summary = await readJson(path.join(output, "evidence/review-summary.json"));
  assert.match(summary.kind, /not-canonical/);
  assert.ok(summary.omissions.length);
  assert.ok(summary.review.limitations.length);
  assert.equal(summary.canonicalEvidence.some((entry) => entry.path === "script-review.json"), true);
  assert.equal((await readdir(output)).includes("script-review.json"), false);
  const optional = path.join(directory, "with-review");
  await exportRun({ ...args, output: optional, includeReviewMedia: true });
  assert.equal(await sha256(path.join(optional, "review-media/source.wav")), await sha256(path.join(runDirectory, "script-review/source.wav")));
  assert.match(await readFile(path.join(optional, "index.html"), "utf8"), /<audio/);
  await verifyExport({ ...args, output: optional });
  await assert.rejects(exportRun({ ...args, output, includeReviewMedia: true }), /missing required files|options differ/);
  await mkdir(path.join(directory, "unrelated")); await writeFile(path.join(directory, "unrelated", "keep.txt"), "keep");
  await assert.rejects(exportRun({ ...args, output: path.join(directory, "unrelated") }));
  assert.equal(await readFile(path.join(directory, "unrelated", "keep.txt"), "utf8"), "keep");
  await writeFile(path.join(output, "final.mp4"), "changed");
  await assert.rejects(verifyExport({ ...args, output }), /checksum mismatch/);
  await assert.rejects(exportRun({ ...args, output }), /checksum mismatch/);
  await rm(path.join(optional, "checksums.json"));
  await assert.rejects(verifyExport({ ...args, output: optional }));
  const wav = path.join(runDirectory, "script-review/source.wav"); await writeFile(wav, "changed review audio");
  await assert.rejects(verifyFinalization({ root, runDirectory }), /review media|review audio/i);
});
