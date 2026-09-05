#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execute, exists, parseArgs, readJson, resolveRunDirectory, sha256, writeJson } from "./runtime/common.mjs";
import { checkDependencies } from "./runtime/doctor.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));
const commands = ["doctor", "check", "setup-intake", "intake", "init", "review-script", "approve-script", "status", "run", "validate", "render", "inspect", "record-playback-review", "finalize", "export", "upgrade-run", "smoke"];

function flag(name) {
  const value = args[name];
  if (value === undefined || value === false || value === "false") return false;
  if (value === true || value === "true") return true;
  throw new Error(`--${name} must be a flag or true/false.`);
}

async function smoke({ runId, workflow, stateApi }) {
  const runDirectory = resolveRunDirectory(root, runId);
  const { createScriptReview, approveScriptReview } = await import("./runtime/speaker-review.mjs");
  const { canonicalHash, semanticContent } = await import("./runtime/identity.mjs");
  const fixture = await readJson(path.join(root, "fixtures", "smoke", "input.json"));
  if (!await exists(runDirectory)) {
    await mkdir(runDirectory);
    const state = stateApi.newWorkflowState(runId, "mechanics-smoke");
    await stateApi.saveWorkflowState(runDirectory, state);
    await writeJson(path.join(runDirectory, "input.json"), fixture);
    const audio = path.join(runDirectory, fixture.audioFile);
    await execute("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${fixture.timeline.at(-1).end}`, "-c:a", "pcm_s16le", audio], { capture: true });
    state.sourceAudioSha256 = await sha256(audio);
    await stateApi.saveWorkflowState(runDirectory, state);
  }
  const state = await stateApi.readWorkflowState(runDirectory);
  if (state.kind !== "mechanics-smoke") throw new Error("Smoke refuses an existing episode run. Use a separate new run ID; no episode was overwritten.");
  const input = await readJson(path.join(runDirectory, "input.json"));
  if (input.audioFile !== fixture.audioFile || state.sourceAudioSha256 !== await sha256(path.join(runDirectory, fixture.audioFile))) throw new Error("Smoke audio is missing or changed. Preserve this run and choose a fresh smoke ID.");
  const approvalFile = path.join(runDirectory, ".script-approval.json");
  if (await exists(approvalFile)) {
    if ((await readJson(approvalFile)).scope !== "fixture") throw new Error("Smoke only resumes mechanics-only fixture approval.");
  } else {
    if (canonicalHash(semanticContent(input)) !== canonicalHash(semanticContent(fixture))) throw new Error("The unapproved smoke input differs from the packaged fixture; use a fresh smoke ID.");
    let review = await createScriptReview({ root, runDirectory });
    for (const beat of review.beats) {
      beat.confirmedSpeaker = beat.proposedSpeaker;
      beat.evidence = beat.proposedSpeaker === "none" ? "silence" : "user-provided-label";
      beat.evidenceNote = "Fixed synthetic mechanics fixture only; not user approval or perceptual review of an episode.";
      if (beat.proposedSpeaker === "both") {
        beat.overlapConfirmed = true;
        beat.evidenceNote = "The packaged smoke fixture explicitly labels this mechanics-only beat as simultaneous dialogue.";
      }
    }
    await writeJson(path.join(runDirectory, "script-review.json"), review);
    review = await createScriptReview({ root, runDirectory });
    await approveScriptReview({ root, runDirectory, reviewId: review.reviewId, fixtureProof: "smoke" });
  }
  const report = await workflow.technicalCycle({ root, runId });
  return {
    schemaVersion: 2, status: report.status, scope: "mechanics-only", run: runId,
    output: path.join(runDirectory, "final.mp4"),
    limitation: "This is a synthetic runtime/asset proof, not episode approval or playback review. It does not finalize or export an episode.",
  };
}

async function main() {
  if (command === "--help" || command === "help") return { status: "help", commands, usage: "node runner.mjs <command> --run=<id> [--source=<URL-or-file>] [--input=/absolute/draft.json]" };
  if (!commands.includes(command)) throw new Error(`Usage: node runner.mjs <${commands.join("|")}> [--run=id].`);
  // Bootstrap must not import the rendering graph or depend on node_modules.
  if (command === "check" || command === "doctor") return checkDependencies({ root });
  if (command === "setup-intake") {
    const { setupIntake } = await import("./runtime/intake.mjs");
    return setupIntake({ root }); // The dedicated setup lock protects the kit-local environment/cache.
  }
  const workflow = await import("./runtime/workflow.mjs");
  const stateApi = await import("./runtime/workflow-state.mjs");
  const runId = command === "smoke" ? args.run || "smoke-proof" : args.run;
  const runDirectory = resolveRunDirectory(root, runId);
  if (command === "status") return workflow.workflowStatus({ root, runId });
  if (command === "upgrade-run") {
    const newRunId = args["new-run"];
    resolveRunDirectory(root, newRunId);
    if (runId === newRunId) throw new Error("Upgrade requires a different --new-run ID.");
    const [first, second] = [runId, newRunId].sort();
    return stateApi.withRunLock({ root, runId: first }, () => stateApi.withRunLock({ root, runId: second }, () => workflow.upgradeRun({ root, runId, newRunId })));
  }
  return stateApi.withRunLock({ root, runId }, async () => {
    if (command === "smoke") return smoke({ runId, workflow, stateApi });
    if (command === "intake") return workflow.startIntake({ root, runId, source: args.source });
    if (command === "init") return workflow.initializeEpisode({ root, runId, audio: args.audio, input: args.input });
    if (command === "review-script") return workflow.importDraft({ root, runId, input: args.input, newRevision: flag("new-revision") });
    if (command === "approve-script") return workflow.approveEpisode({ root, runId, reviewId: args["review-id"], approvedBy: args["approved-by"], note: args.note });
    if (command === "run") return workflow.runWorkflow({ root, runId, source: args.source, output: args.output, includeReviewMedia: flag("include-review-media") });
    if (command === "render" || command === "inspect") return workflow.technicalCycle({ root, runId, renderOnly: command === "render" });
    if (command === "validate") {
      const { validateRun } = await import("./runtime/validate.mjs");
      return (await validateRun({ root, runDirectory })).receipt;
    }
    if (command === "record-playback-review") {
      if (typeof args.input !== "string" || !args.input) throw new Error("Pass --input=/path/playback-review-record.json containing the current review observations.");
      const { recordPlaybackReview } = await import("./runtime/quality.mjs");
      return recordPlaybackReview({ root, runDirectory, review: await readJson(path.resolve(args.input)) });
    }
    if (command === "finalize") {
      const { finalizeRun } = await import("./runtime/quality.mjs");
      return finalizeRun({ root, runDirectory });
    }
    if (command === "export") return workflow.exportEpisode({ root, runId, output: args.output, includeReviewMedia: flag("include-review-media") });
  });
}

main().then((result) => {
  console.log(JSON.stringify(result, null, 2));
  const failureStates = new Set(["blocked", "fail", "setup-required", "invalid-source", "source-inaccessible", "login-required", "network-error", "missing-audio", "transcription-failed", "attempt-limit", "repair-required", "export-invalid", "input-or-setup-invalid", "intake-evidence-invalid"]);
  if (failureStates.has(result?.status) || failureStates.has(result?.phase)) process.exitCode = 1;
}).catch(async (error) => {
  let checkpoint = null;
  try {
    const runDirectory = resolveRunDirectory(root, args.run || (command === "smoke" ? "smoke-proof" : undefined));
    if (await exists(runDirectory)) checkpoint = { runDirectory, state: path.join(runDirectory, "state.json"), resume: `node runner.mjs status --run=${path.basename(runDirectory)}` };
  } catch { /* A malformed/new run may not have any resumable checkpoint. */ }
  console.error(JSON.stringify({
    schemaVersion: 2, status: "blocked", command: command || null,
    blocker: { code: error.code || "action-required", message: error.message || String(error) },
    checkpoint, nextAction: { owner: /lock|setup|install|attempt limit|No relevant repair/i.test(error.message || "") ? "operator" : "agent", action: checkpoint ? "inspect-status-and-resolve-blocker" : "resolve-blocker-before-starting" },
    completionClaimed: false,
  }, null, 2));
  process.exitCode = 1;
});
