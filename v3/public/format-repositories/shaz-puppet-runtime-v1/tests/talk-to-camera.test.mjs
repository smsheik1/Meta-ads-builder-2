import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { inspectRun } from "../runtime/inspect-run.mjs";
import { renderSequence } from "../runtime/render-sequence.mjs";
import {
  readJson,
  sha256,
  validateInput,
  validateRun,
  writeJson,
} from "../runtime/run-common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "fixtures", "talk-to-camera", "input.json");
const hello = path.join(
  root,
  "vendor",
  "cherry-lip-sync",
  "v0.1.0",
  "fixtures",
  "hello.ogg",
);

function runId(label) {
  return `${label}-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
}

test("talk-to-camera derives its complete neutral-body timeline from the supplied audio", async (t) => {
  const id = runId("talk-camera");
  const runDirectory = path.join(root, "agent-runs", id);
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));

  execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    `--run=${id}`,
    `--input=${fixture}`,
    `--audio=${hello}`,
  ], { cwd: root, stdio: "pipe" });

  const staged = await readJson(path.join(runDirectory, "input.json"));
  assert.equal(staged.sequencePreset, "talk-to-camera");
  assert.equal(staged.durationFrames, 68);
  assert.equal(staged.sequence, undefined, "the preset must not invent a second authored sequence");
  assert.equal(staged.lipSync.cueSource, "bundled-wasi-engine");

  const validated = await validateRun({ root, runDirectory });
  assert.equal(validated.timeline.sequencePreset, "talk-to-camera");
  assert.equal(validated.timeline.totalFrames, 68);
  assert.deepEqual(
    validated.receipt.poses.map(({ poseId, recipeFrames, holdFrames, gapFrames }) => ({
      poseId,
      recipeFrames,
      holdFrames,
      gapFrames,
    })),
    [{ poseId: "neutral-listening", recipeFrames: 1, holdFrames: 67, gapFrames: 0 }],
  );
  assert.equal(validated.receipt.sequencePreset, "talk-to-camera");
  assert.ok(validated.receipt.lipSync.usedMouthDrawings.length > 1);

  const rendered = await renderSequence({ root, runDirectory });
  assert.equal(rendered.report.sequencePreset, "talk-to-camera");
  assert.equal(rendered.report.segments.length, 1);
  assert.equal(rendered.report.segments[0].poseId, "neutral-listening");
  assert.equal(rendered.report.totalFrames, 68);

  const quality = await inspectRun({ root, runDirectory });
  assert.equal(quality.status, "pass", JSON.stringify(quality.failures, null, 2));
  assert.equal(quality.sequencePreset, "talk-to-camera");
  assert.equal(quality.measured.frames, 68);
  assert.equal(quality.measured.audioCodec, "aac");
  assert.ok(
    quality.contactSheetSampleFrames.length > 1,
    "the contact sheet must show multiple mouth states, not one neutral midpoint",
  );
  assert.equal(quality.contactSheetSampleFrames[0], 0);
  assert.equal(quality.contactSheetSampleFrames.at(-1), 67);

  const outputSha256 = await sha256(path.join(runDirectory, "final.mp4"));
  await writeJson(path.join(runDirectory, "human-review.json"), {
    schemaVersion: 1,
    status: "approved",
    reviewedOutputSha256: outputSha256,
    reviewer: "talk-to-camera-contract-fixture",
    directVideoPerception: true,
    directAudioPerception: true,
    completePasses: 1,
    notes: "Mechanical finalization fixture; real creative outputs still require direct user review.",
  });
  execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "finalize",
    `--run=${id}`,
  ], { cwd: root, stdio: "pipe" });
  const delivery = await readJson(path.join(runDirectory, "delivery.json"));
  assert.equal(delivery.sequencePreset, "talk-to-camera");
  assert.equal(delivery.poses.length, 1);
  assert.equal(delivery.poses[0].poseId, "neutral-listening");
  assert.equal(delivery.outputSha256, outputSha256);
});

test("talk-to-camera rejects manual choreography and lip-sync opt-out", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-talk-camera-invalid-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const conflictingInput = path.join(scratch, "conflicting.json");
  await fs.writeFile(conflictingInput, `${JSON.stringify({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Conflicting talking preset",
    backgroundId: "sisters-room",
    sequencePreset: "talk-to-camera",
    sequence: [{ poseId: "present", holdFrames: 0, gapFrames: 0 }],
  }, null, 2)}\n`);

  assert.throws(() => execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    `--run=${runId("talk-conflict")}`,
    `--input=${conflictingInput}`,
    `--audio=${hello}`,
  ], { cwd: root, stdio: "pipe" }), /talk-to-camera source input must omit sequence/);

  assert.throws(() => execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    `--run=${runId("talk-no-lips")}`,
    `--input=${fixture}`,
    `--audio=${hello}`,
    "--lipsync=off",
  ], { cwd: root, stdio: "pipe" }), /talk-to-camera requires lip-sync/);
});

test("talk-to-camera cannot be downgraded by null preset or lip-sync values", () => {
  const neutral = {
    id: "neutral-listening",
    recipe: { durationFrames: 1 },
  };
  const registry = { byId: new Map([[neutral.id, neutral]]) };
  const staged = {
    schemaVersion: "shaz-sequence-input-v1",
    title: "Tampered talking preset",
    backgroundId: "sisters-room",
    sequencePreset: "talk-to-camera",
    durationFrames: 24,
    audioFile: "user-audio.wav",
  };

  for (const lipSync of [null, false, 0, ""]) {
    assert.throws(
      () => validateInput({ ...staged, lipSync }, registry),
      /requires a validated lip-sync cue track/,
    );
  }
  assert.throws(
    () => validateInput({
      schemaVersion: "shaz-sequence-input-v1",
      title: "Null preset bypass",
      sequencePreset: null,
      sequence: [{ poseId: "neutral-listening", holdFrames: 0, gapFrames: 0 }],
    }, registry),
    /unsupported input\.sequencePreset null/,
  );
});

test("talk-to-camera rejects audio beyond the package duration ceiling before cue generation", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-talk-camera-long-"));
  const audio = path.join(scratch, "too-long.wav");
  const id = runId("talk-too-long");
  const runDirectory = path.join(root, "agent-runs", id);
  t.after(async () => {
    await fs.rm(scratch, { recursive: true, force: true });
    await fs.rm(runDirectory, { recursive: true, force: true });
  });
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono:d=76",
    "-c:a", "pcm_s16le", audio,
  ]);

  assert.throws(() => execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    `--run=${id}`,
    `--input=${fixture}`,
    `--audio=${audio}`,
  ], { cwd: root, stdio: "pipe" }), /audio requires 1824 frames; maximum is 1800/);
  await assert.rejects(fs.access(runDirectory));
});
