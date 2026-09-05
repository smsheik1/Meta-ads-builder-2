import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { approvedRevisionId } from "../identity.mjs";
import { createScriptReview, createScriptReviewDocument, approveScriptReview, approveScriptReviewDocument, reviewedScriptHash, scriptApprovalHash, scriptReviewId } from "../speaker-review.mjs";
import { reviewPageHtml } from "../review-page.mjs";
import { validateEpisodeInput, validateRun, validateTimeline } from "../validate.mjs";
import { execute, probe, readJson, sha256, writeJson } from "../common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const example = () => ({ schemaVersion: 1, title: "A conversation", episodeLabel: "ANIMAL CONVERSATIONS", background: "living-room", audioFile: "audio.wav", timeline: [
  { start: 0, end: 0.5, speaker: "cat", camera: "two-shot", caption: "A question?" },
  { start: 0.5, end: 1, speaker: "bunny", camera: "bunny-close", caption: "An answer." },
] });
function confirm(review) {
  for (const beat of review.beats) {
    beat.confirmedSpeaker = beat.proposedSpeaker;
    beat.evidence = "local-audio-analysis";
    beat.evidenceNote = "ASR supplies words; this is an agent-proposed casting, awaiting explicit user approval.";
    beat.transcriptionEvidence = { method: "synthetic test", confidence: null };
    beat.timingEvidence = "fixture boundaries";
    beat.uncertainty = "Synthetic fixture only; no perceptual claim.";
  }
}
function pureApproval(input, review) {
  review.approval = { approved: true, basis: "user-confirmed-complete-script", approvedBy: "test user", approvalNote: "Explicit mechanics fixture approval", scriptHash: reviewedScriptHash(input, review) };
  return approveScriptReviewDocument({ input, review, audioSha256: "audio-hash" });
}

test("approval binds every creative choice, but not local audio filename or approval time", () => {
  const input = example();
  const base = scriptApprovalHash(input);
  for (const change of [
    (value) => value.title = "Changed", (value) => value.episodeLabel = "CHANGED", (value) => value.background = "pool",
    (value) => value.timeline[0].bounceAt = [0.1], (value) => value.timeline[0].camera = "cat-close",
    (value) => value.timeline[0].caption = "Changed words", (value) => value.timeline[0].speaker = "bunny",
  ]) {
    const edited = structuredClone(input); change(edited);
    assert.notEqual(scriptApprovalHash(edited), base);
  }
  assert.equal(scriptApprovalHash({ ...input, audioFile: "renamed.wav" }), base);
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" }); confirm(review);
  const first = pureApproval(input, review);
  review.approval.approvalNote = "Reapproved later";
  const second = approveScriptReviewDocument({ input, review, audioSha256: "audio-hash", appliedAt: "2030-01-01T00:00:00Z" });
  assert.equal(first.receipt.revisionId, second.receipt.revisionId);
  assert.equal(first.receipt.revisionId, approvedRevisionId(input, "audio-hash"));
});

test("ASR-only evidence does not demand invented diarization or casting certainty", () => {
  const input = example(); const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" }); confirm(review);
  const result = pureApproval(input, review);
  assert.equal(result.receipt.voiceBoundBeats, 0);
  assert.equal(result.receipt.diarizedBeats, 0);
  assert.equal(result.receipt.evidenceCounts["local-audio-analysis"], 2);
  review.diarization.performed = true;
  assert.throws(() => pureApproval(input, review), /detectedVoices/);
});

test("displayed evidence changes require a new review ID without a new render budget", () => {
  const input = example(); const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" }); confirm(review);
  const first = scriptReviewId(input, review, "audio-hash");
  review.beats[0].uncertainty = "First word is uncertain";
  assert.notEqual(scriptReviewId(input, review, "audio-hash"), first);
  const receipt = pureApproval(input, review).receipt;
  assert.equal(receipt.revisionId, approvedRevisionId(input, "audio-hash"));
});

test("file review escapes metadata, has native WAV controls, and needs no scripts or server", () => {
  const input = example(); input.title = '</script><script>alert("x")</script>';
  input.timeline[0].caption = '<img src=x onerror="alert(1)">'; input.timeline[0].bounceAt = [0.1];
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" }); confirm(review);
  review.beats[0].uncertainty = '<iframe src="https://example.com"></iframe>';
  const html = reviewPageHtml({ input, review });
  assert.doesNotMatch(html, /<script|<iframe|<img src=x|fetch\(/);
  assert.match(html, /&lt;\/script&gt;/);
  assert.match(html, /&lt;iframe/);
  assert.equal((html.match(/<audio /g) || []).length, 3);
  assert.doesNotMatch(html, /<details open/);
  assert.match(html, /<summary>How this was checked<\/summary>/);
  assert.match(html, /<p class="warning"><strong>Check before approving:<\/strong> &lt;iframe/);
  assert.match(html, /p\{overflow-wrap:anywhere\}/);
  for (const phrase of ["living-room", "ANIMAL CONVERSATIONS", "two-shot", "0.1s into this beat", "No speaker diarization supplied"]) assert.ok(html.includes(phrase));
  const exported = reviewPageHtml({ input, review, includeMedia: false });
  assert.doesNotMatch(exported, /<audio /);
});

test("schema-1 retains 20ms boundary compatibility and review exposes discrepancies", () => {
  const input = example(); input.timeline[1].start += 0.015;
  assert.deepEqual(validateTimeline(input.timeline, 1), []);
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" });
  assert.match(reviewPageHtml({ input, review }), /Boundary discrepancy: 15\.000 ms gap/);
  input.timeline[1].start += 0.01;
  assert.match(validateTimeline(input.timeline, 1).join(" "), /must begin/);
});

test("authoring preserves elongated delivery, separate reactions, delayed questions and exact handoffs", () => {
  const input = example();
  input.timeline = [
    { start: 0, end: 1.4, speaker: "cat", camera: "cat-close", caption: "I am sooooo ready." },
    { start: 1.4, end: 1.7, speaker: "bunny", camera: "bunny-close", caption: "", vocalization: "Surprised gasp" },
    { start: 1.7, end: 2.1, speaker: "none", camera: "two-shot", caption: "" },
    { start: 2.1, end: 3, speaker: "bunny", camera: "bunny-close", caption: "Ready for what?", bounceAt: [0.15] },
  ];
  assert.deepEqual(validateTimeline(input.timeline, 3), []);
  const review = createScriptReviewDocument({ input, audioSha256: "audio-hash" });
  const html = reviewPageHtml({ input, review });
  for (const text of ["I am sooooo ready.", "[Surprised gasp]", "[silence]", "2.100–3.000", "Ready for what?", "0.15s into this beat"]) assert.ok(html.includes(text));
});

test("candidate input validation is read-only and rejects invalid creative input", async () => {
  const input = example(); const assets = await readJson(path.join(root, "assets.json"));
  assert.deepEqual(validateEpisodeInput({ input, assets, durationSeconds: 1 }), []);
  assert.match(validateEpisodeInput({ input: { ...input, background: "invented" }, assets, durationSeconds: 1 }).join(" "), /Unknown packaged background/);
});

test("full-quality review, protected explicit approval, stale evidence and idempotent regeneration", { skip: process.env.WIGGLY_REVIEW_MEDIA_TESTS !== "1" }, async (t) => {
  const runDirectory = await mkdtemp(path.join(os.tmpdir(), "animal-review-test-"));
  t.after(() => rm(runDirectory, { recursive: true, force: true }));
  const input = example(); await writeJson(path.join(runDirectory, "input.json"), input);
  await execute("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "aevalsrc=0.1*sin(2*PI*440*t)|0.1*sin(2*PI*660*t):s=48000:d=1", "-c:a", "pcm_s24le", path.join(runDirectory, input.audioFile)], { capture: true });
  let review = await createScriptReview({ root, runDirectory });
  const clipProbe = await probe(path.join(runDirectory, "script-review/beat-00.wav"));
  assert.equal(clipProbe.streams[0].sample_rate, "48000"); assert.equal(clipProbe.streams[0].channels, 2);
  assert.equal(Number(clipProbe.format.duration), 0.5);
  const decodedHash = (file) => execute("ffmpeg", ["-v", "error", "-i", file, "-map", "0:a:0", "-c:a", "pcm_s24le", "-f", "hash", "-hash", "sha256", "-"], { capture: true });
  assert.equal(await decodedHash(path.join(runDirectory, input.audioFile)), await decodedHash(path.join(runDirectory, "script-review/source.wav")), "full review soundtrack preserves all source samples");
  confirm(review); await writeJson(path.join(runDirectory, "script-review.json"), review);
  await assert.rejects(approveScriptReview({ root, runDirectory, fixtureProof: "smoke" }), /restricted to the exact packaged smoke/);
  await assert.rejects(approveScriptReview({ root, runDirectory }), /Explicit user approval/);
  await assert.rejects(approveScriptReview({ root, runDirectory, reviewId: review.reviewId, approvedBy: "Test user", note: "Approved" }), /displayed review ID is stale/);
  review = await createScriptReview({ root, runDirectory });
  const receipt = await approveScriptReview({ root, runDirectory, reviewId: review.reviewId, approvedBy: "Test user", note: "I approve this exact synthetic fixture" });
  assert.equal(receipt.scope, "episode");
  const receiptFile = path.join(runDirectory, ".script-approval.json"); const receiptBefore = await readFile(receiptFile, "utf8");
  await createScriptReview({ root, runDirectory });
  assert.equal(await readFile(receiptFile, "utf8"), receiptBefore);
  await validateRun({ root, runDirectory, writeReceipt: false });
  await assert.rejects(readFile(path.join(runDirectory, ".validation.json")), /ENOENT/);
  await writeJson(receiptFile, { ...receipt, schemaVersion: 1 });
  await assert.rejects(validateRun({ root, runDirectory, writeReceipt: false }), /Legacy approval receipt.*upgrade-run/);
  await writeFile(receiptFile, receiptBefore);
  const reviewClip = path.join(runDirectory, "script-review/beat-00.wav");
  await writeFile(reviewClip, "modified audio");
  await assert.rejects(validateRun({ root, runDirectory, writeReceipt: false }), /Review audio is missing or modified/);
  await createScriptReview({ root, runDirectory });
  assert.equal(await readFile(receiptFile, "utf8"), receiptBefore, "regenerating an unchanged exact clip preserves semantic approval");
  await validateRun({ root, runDirectory, writeReceipt: false });
  await writeFile(path.join(runDirectory, "script-review.html"), "Cosmetic-only replacement for validation test");
  await validateRun({ root, runDirectory, writeReceipt: false });
  const changed = await readJson(path.join(runDirectory, "script-review.json")); changed.beats[0].uncertainty = "New uncertainty";
  await writeJson(path.join(runDirectory, "script-review.json"), changed);
  await assert.rejects(validateRun({ root, runDirectory, writeReceipt: false }), /displayed review or its evidence changed/);
  input.background = "pool"; await writeJson(path.join(runDirectory, "input.json"), input);
  await assert.rejects(createScriptReview({ root, runDirectory }), /--new-revision/);
});
