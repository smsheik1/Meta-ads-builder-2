// Synthetic integration proof, not a claim of genuine user approval or media perception.
import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execute, readJson, sha256, writeJson } from "../common.mjs";
import { collectRenderIdentity, currentRevision, qualityPolicyIdentity } from "../identity.mjs";
import { createScriptReview } from "../speaker-review.mjs";
import { loadQualityPolicy, recordPlaybackReview } from "../quality.mjs";
import { beginCycle, finishCycle, readWorkflowState, repairIdentity, saveWorkflowState } from "../workflow-state.mjs";
import { approveEpisode, importDraft, initializeEpisode, runWorkflow, startIntake, technicalCycle, upgradeRun, workflowStatus } from "../workflow.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mediaProfile = { skip: process.env.WIGGLY_WORKFLOW_MEDIA_TESTS !== "1" };

async function temporary(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "animal-workflow-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("status is read-only even before initialization", async (t) => {
  const root = await temporary(t);
  const before = await readdir(root);
  const status = await workflowStatus({ root, runId: "fresh-run" });
  assert.equal(status.phase, "not-initialized");
  assert.equal(status.nextAction.owner, "agent");
  assert.deepEqual(await readdir(root), before);
});

test("missing setup checkpoints intake without inventing a script; initialization collisions preserve it", async (t) => {
  const root = await temporary(t);
  await mkdir(path.join(root, "scripts"));
  await copyFile(path.join(sourceRoot, "scripts/intake-model.json"), path.join(root, "scripts/intake-model.json"));
  const source = path.join(root, "source.mp4");
  await writeFile(source, "Unopened synthetic media; setup must stop before decoding.");
  const args = { root, runId: "fresh-run", source };
  const started = await startIntake(args);
  assert.equal(started.status, "setup-required");
  const runDirectory = path.join(root, "agent-runs/fresh-run");
  const before = await readFile(path.join(runDirectory, "state.json"));
  await assert.rejects(startIntake(args), /already exists/);
  assert.deepEqual(await readFile(path.join(runDirectory, "state.json")), before);
  assert.equal((await runWorkflow(args)).status, "setup-required");
  assert.equal((await readdir(runDirectory)).includes("input.json"), false);
});

async function fixture(t) {
  const directory = await temporary(t);
  const root = path.join(directory, "kit");
  const assets = await readJson(path.join(sourceRoot, "assets.json"));
  const files = ["quality.json", "assets.json", "package-lock.json", "composition-contract.json", "KIT-MANIFEST.json", "scripts/intake-model.json",
    "runtime/render.mjs", "runtime/common.mjs", "runtime/validate.mjs", "runtime/identity.mjs",
    ...[...assets.backgrounds, ...assets.characters.flatMap((character) => character.poses)].map((asset) => asset.path)];
  for (const file of files) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await copyFile(path.join(sourceRoot, file), path.join(root, file));
  }
  const audio = path.join(directory, "source.wav");
  await execute("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-c:a", "pcm_s24le", audio], { capture: true });
  const input = path.join(directory, "draft.json");
  const content = { schemaVersion: 1, title: "Synthetic workflow proof", episodeLabel: "MECHANICS TEST", background: "living-room", audioFile: "ignored.wav", timeline: [
    { start: 0, end: 0.5, speaker: "cat", camera: "two-shot", caption: "A question?" },
    { start: 0.5, end: 1, speaker: "bunny", camera: "bunny-close", caption: "An answer." },
  ] };
  await writeJson(input, content);
  return { directory, root, audio, input, content, runId: "synthetic-workflow", runDirectory: path.join(root, "agent-runs/synthetic-workflow") };
}

test("prepared intake imports an agent draft into the existing run without reinitialization", mediaProfile, async (t) => {
  const args = await fixture(t);
  await startIntake({ ...args, source: args.audio });
  const audioFile = path.join(args.runDirectory, "user-audio.wav");
  await copyFile(args.audio, audioFile);
  await writeJson(path.join(args.runDirectory, "transcript.json"), { text: "Synthetic adapter evidence; not ASR acceptance" });
  await copyFile(args.audio, path.join(args.runDirectory, "asr-test.wav"));
  // Intake's genuine extraction/transcription has a separate profile; this tests its controller boundary.
  await writeJson(path.join(args.runDirectory, "intake.json"), {
    schemaVersion: 1, status: "needs-script-draft",
    audio: { file: "user-audio.wav", sha256: await sha256(audioFile) },
    asrAudio: { file: "asr-test.wav", sha256: await sha256(path.join(args.runDirectory, "asr-test.wav")) },
    transcript: { file: "transcript.json", sha256: await sha256(path.join(args.runDirectory, "transcript.json")) },
  });
  assert.equal((await workflowStatus(args)).phase, "needs-script-draft");
  await importDraft(args);
  assert.equal((await workflowStatus(args)).phase, "needs-script-approval");
  assert.equal((await readJson(path.join(args.runDirectory, "input.json"))).audioFile, "user-audio.wav");
  await assert.rejects(startIntake({ ...args, source: args.audio }), /already exists/);
});

async function syntheticApproval(args) {
  let review = await readJson(path.join(args.runDirectory, "script-review.json"));
  for (const beat of review.beats) {
    beat.confirmedSpeaker = beat.proposedSpeaker;
    beat.evidence = "user-provided-label";
    beat.evidenceNote = "Synthetic test labels only; no actual user or perceptual approval.";
  }
  await writeJson(path.join(args.runDirectory, "script-review.json"), review);
  review = await createScriptReview(args);
  return approveEpisode({ ...args, reviewId: review.reviewId, approvedBy: "Synthetic test fixture", note: "Mechanics-only mocked confirmation, not a real episode approval." });
}

async function syntheticPlayback(args) {
  const policy = await loadQualityPolicy(args.root);
  return recordPlaybackReview({ ...args, review: {
    schemaVersion: 2, reviewer: "Synthetic workflow test, not perceptual evidence",
    mp4Sha256: await sha256(path.join(args.runDirectory, "final.mp4")),
    renderIdentityHash: (await readJson(path.join(args.runDirectory, "quality-report.json"))).renderIdentityHash,
    qualityPolicyHash: await qualityPolicyIdentity(args.root), rubricVersion: policy.rubricVersion,
    perception: { visual: { mode: "direct", basis: "Synthetic validator claim only" }, audio: { mode: "unavailable", basis: "Synthetic test does not hear" } },
    passes: policy.blindReview.requiredPlayback.passIds.map((id) => ({ id, completed: true, note: "Synthetic assertion only, not actual playback review" })),
    criteria: policy.blindReview.criterionRules.map((rule) => ({ id: rule.id, status: rule.channel === "perceptual-audio" ? "unscored" : "pass", note: "Synthetic validator observation or limitation only" })),
    disclosures: ["Synthetic fixture; audio perception unavailable and not scored. This is not release acceptance."],
  } });
}

test("integrated gates, interrupted-cycle resume, idempotence, verified export, revisions and legacy preservation", mediaProfile, async (t) => {
  const args = await fixture(t);
  await initializeEpisode(args);
  const initialInput = await readFile(path.join(args.runDirectory, "input.json"));
  await assert.rejects(initializeEpisode(args), /already exists/);
  assert.deepEqual(await readFile(path.join(args.runDirectory, "input.json")), initialInput);
  assert.equal((await runWorkflow(args)).phase, "needs-script-approval");
  await assert.rejects(technicalCycle(args), /unapproved/);
  await syntheticApproval(args);
  assert.equal((await workflowStatus(args)).phase, "needs-technical-cycle");
  const first = await technicalCycle({ ...args, renderOnly: true });
  assert.equal(first.status, "rendered-needs-inspection");
  const revision = (await currentRevision(args.runDirectory)).revisionId;
  assert.equal((await readWorkflowState(args.runDirectory)).revisions[revision].attempts.length, 1);
  await technicalCycle(args);
  const finished = (await readWorkflowState(args.runDirectory)).revisions[revision].attempts;
  assert.equal(finished.length, 1);
  assert.equal(finished[0].id, first.attemptId);
  assert.equal(finished[0].status, "passed");
  assert.equal((await runWorkflow(args)).phase, "needs-playback-review");
  await syntheticPlayback(args);
  const complete = await runWorkflow(args);
  assert.equal(complete.phase, "complete");
  const receipt = await sha256(path.join(args.runDirectory, ".validation.json"));
  await technicalCycle(args);
  assert.equal(await sha256(path.join(args.runDirectory, ".validation.json")), receipt);
  const stateBefore = await readFile(path.join(args.runDirectory, "state.json"));
  assert.equal((await runWorkflow(args)).phase, "complete");
  assert.deepEqual(await readFile(path.join(args.runDirectory, "state.json")), stateBefore);
  await rm(path.join(complete.export, "final.mp4"));
  assert.equal((await workflowStatus(args)).phase, "export-invalid");
  assert.equal((await runWorkflow(args)).phase, "export-invalid");

  const draft = { ...args.content, title: "Changed title" };
  await writeJson(args.input, draft);
  await assert.rejects(importDraft(args), /--new-revision/);
  assert.deepEqual(await readFile(path.join(args.runDirectory, "input.json")), initialInput);
  const oldFinal = await sha256(path.join(args.runDirectory, "final.mp4"));
  const next = await importDraft({ ...args, newRevision: true });
  assert.equal(await sha256(path.join(next.history, "final.mp4")), oldFinal);
  assert.equal((await workflowStatus(args)).phase, "needs-script-approval");
  assert.equal((await readWorkflowState(args.runDirectory)).revisions[revision].attempts.length, 1);
  await writeJson(args.input, { ...draft, timeline: [] });
  await assert.rejects(importDraft({ ...args, newRevision: true }), /Invalid draft/);
  assert.equal((await readJson(path.join(args.runDirectory, "input.json"))).title, "Changed title");

  // Upgrade does not inherit old receipts, even if a historical state said complete.
  const oldState = path.join(args.runDirectory, "state.json");
  await writeJson(oldState, { schemaVersion: 1, status: "complete" });
  const historical = await sha256(oldState);
  const upgraded = await upgradeRun({ ...args, newRunId: "upgraded-run" });
  assert.equal(upgraded.requiresFreshApproval, true);
  assert.equal(await sha256(oldState), historical);
  assert.equal((await workflowStatus({ ...args, runId: "upgraded-run" })).phase, "needs-script-approval");
});

test("actual approval calls cannot reset failed attempts or turn notes into a repair", mediaProfile, async (t) => {
  const args = await fixture(t);
  await initializeEpisode(args);
  const approval = await syntheticApproval(args);
  const identity = await collectRenderIdentity(args);
  const fingerprint = repairIdentity({ renderIdentity: identity, policyHash: await qualityPolicyIdentity(args.root), outputSha256: null });
  const state = await readWorkflowState(args.runDirectory);
  finishCycle(beginCycle(state, identity.revisionId, fingerprint), Error("Synthetic observed failure"));
  await saveWorkflowState(args.runDirectory, state);
  assert.equal((await workflowStatus(args)).phase, "repair-required");
  await approveEpisode({ ...args, reviewId: approval.reviewId, approvedBy: "Synthetic fixture again", note: "Unchanged mock reapproval" });
  await assert.rejects(technicalCycle(args), /No relevant repair/);
  for (const repair of ["second-real-repair", "third-real-repair"]) finishCycle(beginCycle(state, identity.revisionId, repair), Error("Synthetic failure"));
  await saveWorkflowState(args.runDirectory, state);
  await approveEpisode({ ...args, reviewId: approval.reviewId, approvedBy: "Synthetic fixture again", note: "Another unchanged mock reapproval" });
  assert.equal((await workflowStatus(args)).phase, "attempt-limit");
  await assert.rejects(technicalCycle(args), /Attempt limit/);
  await assert.rejects(upgradeRun({ ...args, newRunId: "budget-reset" }), /cannot reset/);
  assert.equal((await readWorkflowState(args.runDirectory)).revisions[identity.revisionId].attempts.length, 3);
});
