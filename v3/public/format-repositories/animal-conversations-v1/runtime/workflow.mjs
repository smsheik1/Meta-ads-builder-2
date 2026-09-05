import { copyFile, cp, lstat, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { audioDuration, exists, probe, readJson, resolveRunDirectory, sha256, writeJson } from "./common.mjs";
import { approvedRevisionId, canonicalHash, collectRenderIdentity, currentRevision, qualityPolicyIdentity, runAudioPath, semanticContent } from "./identity.mjs";
import { createScriptReview, approveScriptReview } from "./speaker-review.mjs";
import { validateEpisodeInput, validateRun } from "./validate.mjs";
import { assertRenderFresh, finalizeRun, loadQualityPolicy, verifyFinalization, verifyPlaybackEvidence, verifyTechnicalEvidence } from "./quality.mjs";
import { exportRun, verifyExport } from "./export.mjs";
import { intakeMedia } from "./intake.mjs";
import { beginCycle, cycleBucket, finishCycle, newWorkflowState, readWorkflowState, repairIdentity, saveWorkflowState } from "./workflow-state.mjs";

const ARTIFACTS = [
  "input.json", "state.json", "script-review.json", "script-review.html", "timed-role-sheet.md",
  ".script-approval.json", ".validation.json", "render-report.json", "quality-report.json",
  "playback-review.json", "contact-sheet.png", "delivery.json", "final.mp4",
];

function result(phase, owner, action, message, extra = {}) {
  return { schemaVersion: 2, status: phase === "complete" ? "complete" : "action-required", phase,
    nextAction: { owner, action, message }, ...extra };
}

async function attemptRead(file) {
  try { return await readJson(file); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function createRun({ root, runId, kind = "episode" }) {
  const runDirectory = resolveRunDirectory(root, runId);
  await mkdir(path.dirname(runDirectory), { recursive: true });
  try { await mkdir(runDirectory); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("Run already exists. Use status/run to resume it, or choose a new run ID; initialization never overwrites a run.");
    throw error;
  }
  const state = newWorkflowState(runId, kind);
  await saveWorkflowState(runDirectory, state);
  return { runDirectory, state };
}

export async function startIntake({ root, runId, source }) {
  if (typeof source !== "string" || !source) throw new Error("Pass --source=<supported-accessible-URL-or-local-file>.");
  const { runDirectory, state } = await createRun({ root, runId });
  state.intakeSource = source; // Private state, never copied into the public export.
  await saveWorkflowState(runDirectory, state);
  const intake = await intakeMedia({ root, runDirectory, source });
  return { ...intake, run: runId, runDirectory };
}

export async function initializeEpisode({ root, runId, audio, input: inputSource }) {
  if (typeof audio !== "string" || !path.isAbsolute(audio) || !await exists(audio)) throw new Error("Pass an absolute existing --audio=/path/media.");
  if (typeof inputSource !== "string" || !path.isAbsolute(inputSource) || !await exists(inputSource)) throw new Error("Pass an absolute existing --input=/path/draft.json for advanced initialization; normal users can start with intake instead.");
  const input = await readJson(inputSource);
  const extension = /^\.[a-z0-9]{1,8}$/i.test(path.extname(audio)) ? path.extname(audio).toLowerCase() : ".media";
  input.audioFile = `user-audio${extension}`;
  const durationSeconds = audioDuration(await probe(audio));
  const errors = validateEpisodeInput({ input, assets: await readJson(path.join(root, "assets.json")), durationSeconds });
  if (errors.length) throw new Error(`Invalid draft; no run was created:\n- ${errors.join("\n- ")}`);
  const { runDirectory, state } = await createRun({ root, runId });
  await copyFile(audio, path.join(runDirectory, input.audioFile));
  state.sourceAudioSha256 = await sha256(path.join(runDirectory, input.audioFile));
  await writeJson(path.join(runDirectory, "input.json"), input);
  await saveWorkflowState(runDirectory, state);
  const review = await createScriptReview({ root, runDirectory });
  return result("needs-script-approval", "user", "review-and-approve", "Show the complete playable review and obtain explicit approval. No approval was assumed.", {
    run: runId, reviewId: review.reviewId, reviewPage: path.join(runDirectory, "script-review.html"),
  });
}

async function archiveCurrent(runDirectory, revisionId) {
  const history = path.join(runDirectory, "history");
  await mkdir(history, { recursive: true });
  const destination = await mkdtemp(path.join(history, `${revisionId.slice(0, 16)}-`));
  const input = await readJson(path.join(runDirectory, "input.json"));
  const files = [...new Set([...ARTIFACTS, input.audioFile])];
  for (const name of files) {
    const source = path.join(runDirectory, name);
    if (!await exists(source)) continue;
    if (!(await lstat(source)).isFile()) throw new Error("Revision history refuses non-file evidence.");
    await copyFile(source, path.join(destination, name));
  }
  if (await exists(path.join(runDirectory, "script-review"))) {
    for (const entry of await readdir(path.join(runDirectory, "script-review"), { withFileTypes: true })) {
      if (!entry.isFile()) throw new Error("Review history refuses symbolic links or nested entries.");
    }
    await cp(path.join(runDirectory, "script-review"), path.join(destination, "script-review"), { recursive: true, dereference: false, errorOnExist: true, force: false });
  }
  const hashes = [];
  for (const name of files) if (await exists(path.join(destination, name))) hashes.push({ path: name, sha256: await sha256(path.join(destination, name)) });
  await writeJson(path.join(destination, "history.json"), { schemaVersion: 1, revisionId, preservedAt: new Date().toISOString(), files: hashes });
  // Only clear generated current evidence after its recoverable copy exists.
  for (const name of ARTIFACTS.filter((name) => !["input.json", "state.json", "final.mp4", "contact-sheet.png"].includes(name))) {
    await rm(path.join(runDirectory, name), { force: true });
  }
  return destination;
}

export async function importDraft({ root, runId, input: source, newRevision = false }) {
  const runDirectory = resolveRunDirectory(root, runId);
  const state = await readWorkflowState(runDirectory);
  if (!source) {
    const review = await createScriptReview({ root, runDirectory });
    return { status: review.status, reviewId: review.reviewId, reviewPage: path.join(runDirectory, "script-review.html") };
  }
  if (typeof source !== "string" || !path.isAbsolute(source) || !await exists(source)) throw new Error("Pass an absolute existing --input=/path/draft.json.");
  const previous = await attemptRead(path.join(runDirectory, "input.json"));
  const intake = await attemptRead(path.join(runDirectory, "intake.json"));
  const audioFile = previous?.audioFile || intake?.audio?.file;
  if (!audioFile) throw new Error("Complete media intake before importing the agent's draft.");
  if (!previous && intake?.status !== "needs-script-draft") throw new Error("Media intake is not ready for a draft.");
  const candidate = await readJson(source);
  candidate.audioFile = audioFile;
  const audio = runAudioPath(runDirectory, candidate);
  const audioSha256 = await sha256(audio);
  if (intake?.audio?.sha256 && intake.audio.sha256 !== audioSha256) throw new Error("Prepared source audio changed. Preserve this run and create a fresh intake.");
  const errors = validateEpisodeInput({ input: candidate, assets: await readJson(path.join(root, "assets.json")), durationSeconds: audioDuration(await probe(audio)) });
  if (errors.length) throw new Error(`Invalid draft; current input remains unchanged:\n- ${errors.join("\n- ")}`);
  const changed = previous && canonicalHash(semanticContent(previous)) !== canonicalHash(semanticContent(candidate));
  const progressed = previous && (await exists(path.join(runDirectory, ".script-approval.json")) || await exists(path.join(runDirectory, "render-report.json")) || Object.keys(state.revisions).length);
  if (changed && progressed && !newRevision) throw new Error("Use --new-revision to preserve previous outputs before changing a progressed run.");
  let history = null;
  if (changed && progressed) {
    const oldApproval = await attemptRead(path.join(runDirectory, ".script-approval.json"));
    history = await archiveCurrent(runDirectory, oldApproval?.revisionId || approvedRevisionId(previous, audioSha256));
    state.export = null;
    state.history = [...(state.history || []), path.relative(runDirectory, history)];
  }
  if (!previous || changed) await writeJson(path.join(runDirectory, "input.json"), candidate);
  await saveWorkflowState(runDirectory, state);
  const review = await createScriptReview({ root, runDirectory });
  return result("needs-script-approval", "user", "review-and-approve", "Show the complete playable review; the agent drafted it, but has not approved it.", {
    reviewId: review.reviewId, reviewPage: path.join(runDirectory, "script-review.html"), history,
  });
}

export async function approveEpisode({ root, runId, reviewId, approvedBy, note }) {
  const runDirectory = resolveRunDirectory(root, runId);
  await readWorkflowState(runDirectory);
  // No attempt history is cleared here: approval time cannot create a new budget.
  return approveScriptReview({ root, runDirectory, reviewId, approvedBy, note });
}

async function verifyIntakeFiles(runDirectory, intake) {
  for (const artifact of [intake.audio, intake.transcript, intake.asrAudio]) {
    if (!artifact?.file || !artifact.sha256) throw new Error("Intake evidence is incomplete.");
    const file = path.resolve(runDirectory, artifact.file);
    if (!file.startsWith(path.resolve(runDirectory) + path.sep) || !await exists(file) || await sha256(file) !== artifact.sha256) throw new Error("Intake media or transcript is missing or modified; preserve this run and start a new intake.");
  }
}

export async function workflowStatus({ root, runId }) {
  const runDirectory = resolveRunDirectory(root, runId);
  const paths = { runDirectory, reviewPage: path.join(runDirectory, "script-review.html"), preview: path.join(runDirectory, "final.mp4") };
  if (!await exists(runDirectory)) return result("not-initialized", "agent", "intake", "Start intake with a supported accessible link or local video.", { run: runId });
  let state;
  try { state = await readWorkflowState(runDirectory); }
  catch (error) { return result("needs-upgrade", "agent", "upgrade-run", error.message, paths); }
  if (!await exists(path.join(runDirectory, "input.json"))) {
    const intake = await attemptRead(path.join(runDirectory, "intake.json"));
    if (!intake) return result("needs-intake", "agent", "run", "Resume the saved media intake; do not invent a sample episode.", paths);
    if (intake.status !== "needs-script-draft") return { ...intake, ...paths };
    try { await verifyIntakeFiles(runDirectory, intake); }
    catch (error) { return result("intake-evidence-invalid", "agent", "new-run-required", error.message, paths); }
    return result("needs-script-draft", "agent", "draft-and-import", "Use the uncertain transcript and original source to draft the full episode, then review-script --input. Do not ask the user to supply timestamps.", {
      ...paths, evidence: [path.join(runDirectory, "transcript.json"), path.join(runDirectory, intake.audio.file)],
    });
  }
  try { await validateRun({ root, runDirectory, writeReceipt: false, requireApproval: false }); }
  catch (error) { return result("input-or-setup-invalid", "agent", "diagnose", error.message, paths); }
  try { await validateRun({ root, runDirectory, writeReceipt: false }); }
  catch (error) {
    const approval = await attemptRead(path.join(runDirectory, ".script-approval.json"));
    const review = await attemptRead(path.join(runDirectory, "script-review.json"));
    return result(approval ? "approval-or-review-stale" : "needs-script-approval", approval || !review ? "agent" : "user",
      approval || !review ? "regenerate-review" : "review-and-approve", error.message, { ...paths, reviewId: review?.reviewId });
  }
  const current = await currentRevision(runDirectory);
  const attempts = cycleBucket(state, current.revisionId).attempts;
  const info = { ...paths, revisionId: current.revisionId, attemptsUsed: attempts.length, attempt: attempts.at(-1) || null };
  try { await verifyTechnicalEvidence({ root, runDirectory }); }
  catch (error) {
    const last = attempts.at(-1);
    if (last?.status !== "running" && attempts.length >= 3) return result("attempt-limit", "operator", "resolve-blocker", "Three technical cycles are exhausted for this content-and-audio revision; unchanged reapproval cannot reset them.", { ...info, unmet: [error.message] });
    if (last?.status === "failed") {
      const identity = await collectRenderIdentity({ root, runDirectory });
      if (last.repairIdentity === await currentRepairIdentity({ root, runDirectory, renderIdentity: identity })) {
        return result("repair-required", "agent", "diagnose-and-repair", "The last cycle failed and no relevant repair is evidenced. Diagnose the recorded failure before retrying; notes or unchanged reapproval do not count.", { ...info, unmet: [error.message] });
      }
    }
    return result("needs-technical-cycle", "agent", "run", error.message, info);
  }
  try { await verifyPlaybackEvidence({ root, runDirectory }); }
  catch (error) { return result("needs-playback-review", "agent", "review-and-record-playback", error.message, info); }
  try { await verifyFinalization({ root, runDirectory }); }
  catch (error) { return result("needs-finalization", "agent", "run", error.message, info); }
  const output = state.export?.output || path.join(root, "outputs", runId);
  try {
    const verified = await verifyExport({ root, runDirectory, output });
    if (state.export && state.export.manifestHash !== verified.manifestHash) throw new Error("Export manifest differs from the saved verified export.");
    return result("complete", "agent", "show-video", "The finalized export verifies. Show the actual video and disclose review limitations; this does not claim the user watched it.", {
      ...info, export: verified.output, video: verified.video, manifestHash: verified.manifestHash,
    });
  } catch (error) {
    return result(await exists(output) ? "export-invalid" : "needs-export", "agent", await exists(output) ? "choose-new-export-destination" : "run",
      error.message, { ...info, output });
  }
}

async function currentRepairIdentity({ root, runDirectory, renderIdentity }) {
  return repairIdentity({
    renderIdentity,
    policyHash: await qualityPolicyIdentity(root),
    outputSha256: await exists(path.join(runDirectory, "final.mp4")) ? await sha256(path.join(runDirectory, "final.mp4")) : null,
  });
}

export async function technicalCycle({ root, runId, renderOnly = false }) {
  const runDirectory = resolveRunDirectory(root, runId);
  const state = await readWorkflowState(runDirectory);
  await validateRun({ root, runDirectory });
  const identity = await collectRenderIdentity({ root, runDirectory });
  // Repeating a successful command is idempotent, not another paid/technical attempt.
  try {
    const current = await verifyTechnicalEvidence({ root, runDirectory });
    const pending = cycleBucket(state, identity.revisionId).attempts.at(-1);
    if (pending?.status === "running") { finishCycle(pending); await saveWorkflowState(runDirectory, state); }
    return current.technical;
  } catch { /* Missing/stale technical evidence needs a bounded cycle. */ }
  const policy = await loadQualityPolicy(root);
  const attempt = beginCycle(state, identity.revisionId, await currentRepairIdentity({ root, runDirectory, renderIdentity: identity }), policy.automatic.maximumAttempts);
  await saveWorkflowState(runDirectory, state); // Persist the attempt before expensive work.
  try {
    let fresh = false;
    try { await assertRenderFresh({ root, runDirectory }); fresh = true; } catch { /* Render is required. */ }
    if (!fresh) {
      attempt.stage = "render";
      await saveWorkflowState(runDirectory, state);
      const { renderRun } = await import("./render.mjs");
      await renderRun({ root, runDirectory });
    }
    attempt.stage = "inspect";
    await saveWorkflowState(runDirectory, state);
    if (renderOnly) return { status: "rendered-needs-inspection", attemptId: attempt.id, output: path.join(runDirectory, "final.mp4") };
    const { inspectRun } = await import("./inspect.mjs");
    const report = await inspectRun({ root, runDirectory });
    finishCycle(attempt);
    await saveWorkflowState(runDirectory, state);
    return report;
  } catch (error) {
    // Compare future repairs with the actual failed output, not the pre-render file.
    attempt.repairIdentity = await currentRepairIdentity({ root, runDirectory, renderIdentity: identity }).catch(() => attempt.repairIdentity);
    finishCycle(attempt, error);
    await saveWorkflowState(runDirectory, state);
    throw error;
  }
}

export async function runWorkflow({ root, runId, source, output, includeReviewMedia = false }) {
  const runDirectory = resolveRunDirectory(root, runId);
  let state = await readWorkflowState(runDirectory);
  if (!await exists(path.join(runDirectory, "input.json")) && (source || state.intakeSource)) {
    const intake = await intakeMedia({ root, runDirectory, source: source || state.intakeSource });
    if (source && intake.status !== "invalid-source") {
      state.intakeSource = source;
      await saveWorkflowState(runDirectory, state);
    }
    if (intake.status !== "needs-script-draft") return { ...intake, runDirectory };
  }
  let status = await workflowStatus({ root, runId });
  if (status.phase === "needs-technical-cycle") {
    await technicalCycle({ root, runId });
    status = await workflowStatus({ root, runId });
  }
  if (status.phase === "needs-finalization") {
    await finalizeRun({ root, runDirectory });
    status = await workflowStatus({ root, runId });
  }
  if (status.phase === "needs-export" || output && ["export-invalid", "complete"].includes(status.phase)) {
    const exported = await exportRun({ root, runDirectory, output, includeReviewMedia });
    state = await readWorkflowState(runDirectory);
    state.export = { output: exported.output, manifestHash: exported.manifestHash };
    await saveWorkflowState(runDirectory, state);
    status = await workflowStatus({ root, runId });
  }
  return status;
}

export async function exportEpisode({ root, runId, output, includeReviewMedia = false }) {
  const runDirectory = resolveRunDirectory(root, runId);
  const state = await readWorkflowState(runDirectory);
  const exported = await exportRun({ root, runDirectory, output, includeReviewMedia });
  state.export = { output: exported.output, manifestHash: exported.manifestHash };
  await saveWorkflowState(runDirectory, state);
  return exported;
}

export async function upgradeRun({ root, runId, newRunId }) {
  const oldRun = resolveRunDirectory(root, runId);
  const nextRun = resolveRunDirectory(root, newRunId);
  if (nextRun === oldRun) throw new Error("Upgrade requires a different new run ID.");
  const oldState = await attemptRead(path.join(oldRun, "state.json"));
  if (oldState?.schemaVersion === 2) throw new Error("This run already uses the current workflow. Resume it or import a genuine new revision; upgrade cannot reset its attempt history.");
  const input = await readJson(path.join(oldRun, "input.json"));
  const audio = runAudioPath(oldRun, input);
  // A new run is initialized with preserved input/audio, never old approval or review receipts.
  const created = await initializeEpisode({ root, runId: newRunId, audio, input: path.join(oldRun, "input.json") });
  const state = await readWorkflowState(nextRun);
  state.upgradedFrom = { runId, inputSha256: await sha256(path.join(oldRun, "input.json")), audioSha256: await sha256(audio) };
  await saveWorkflowState(nextRun, state);
  return { ...created, preservedRun: oldRun, requiresFreshApproval: true };
}
