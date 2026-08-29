import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { inspectRun } from "../runtime/inspect-run.mjs";
import { PERFORMANCE_STAGE_VIEW, renderSequence } from "../runtime/render-sequence.mjs";
import { execute, sha256, validateRun, writeJson } from "../runtime/run-common.mjs";
import { generateTranscript } from "../runtime/transcription.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hello = path.join(root, "vendor", "cherry-lip-sync", "v0.1.0", "fixtures", "hello.ogg");

async function stageTranscript(runDirectory, audioFile) {
  const transcriptFile = "transcript.json";
  const receiptFile = "transcription-receipt.json";
  const generated = await generateTranscript({
    root,
    audioPath: path.join(runDirectory, audioFile),
    outputPath: path.join(runDirectory, transcriptFile),
    receiptPath: path.join(runDirectory, receiptFile),
  });
  return {
    transcript: generated.transcript,
    durationFrames: Math.max(1, Math.round((generated.transcript.audio.durationMs / 1000) * 24)),
    config: {
      file: transcriptFile,
      sha256: generated.transcriptSha256,
      receiptFile,
      receiptSha256: generated.receiptSha256,
      sourceAudioSha256: generated.receipt.audio.sourceSha256,
      language: generated.transcript.language,
      segmentCount: generated.transcript.segments.length,
      wordCount: generated.transcript.words.length,
    },
  };
}

function transcriptWordAnchor(transcript, wordIndex = 0) {
  const word = transcript.words[wordIndex];
  assert.ok(word, `transcript must contain word ${wordIndex + 1}`);
  return {
    wordId: word.id,
    label: `Gesture on ${word.text}`,
    frame: Math.round((word.startMs / 1000) * 24),
  };
}

test("official performance path stages an all-neutral fixed-background video with audible AAC", async (t) => {
  const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-performance-runtime-"));
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
  const audioName = "user-audio.ogg";
  await fs.copyFile(hello, path.join(runDirectory, audioName));
  const stagedTranscript = await stageTranscript(runDirectory, audioName);
  await writeJson(path.join(runDirectory, "input.json"), {
    schemaVersion: "shaz-body-language-performance-v1",
    title: "Neutral performance mechanics proof",
    fps: 24,
    audioFile: audioName,
    durationFrames: stagedTranscript.durationFrames,
    events: [],
    transcript: stagedTranscript.config,
    planningTranscriptSha256: stagedTranscript.config.sha256,
  });

  const validated = await validateRun({ root, runDirectory });
  assert.equal(validated.mode, "performance");
  assert.equal(validated.timeline.durationFrames, stagedTranscript.durationFrames);
  assert.equal(validated.receipt.background.id, "sisters-room");
  assert.equal(validated.receipt.background.cameraMotion, false);

  const rendered = await renderSequence({ root, runDirectory });
  assert.equal(rendered.report.renderer, "runtime/rig-v2-renderer.mjs#renderRigFrame");
  assert.equal(rendered.report.cameraMotion, false);
  assert.deepEqual(rendered.report.stageView, PERFORMANCE_STAGE_VIEW);
  assert.equal(rendered.report.uniqueRigStates, 1);

  await writeJson(path.join(runDirectory, "human-review.json"), {
    schemaVersion: 1,
    status: "pending",
    reviewedOutputSha256: "0".repeat(64),
    reviewer: null,
    directVideoPerception: false,
    directAudioPerception: false,
    completePasses: 0,
    notes: "Stale pending review fixture.",
  });

  const quality = await inspectRun({ root, runDirectory });
  assert.equal(quality.status, "pass", JSON.stringify(quality.failures, null, 2));
  assert.equal(quality.measured.frames, stagedTranscript.durationFrames);
  assert.equal(quality.measured.audioCodec, "aac");
  assert.ok(quality.measured.meanVolumeDb > -55);
  await Promise.all([
    fs.access(path.join(runDirectory, "final.mp4")),
    fs.access(path.join(runDirectory, "review-slow.mp4")),
    fs.access(path.join(runDirectory, "contact-sheet.jpg")),
  ]);

  const firstFrame = path.join(runDirectory, "first-frame.png");
  execute("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", path.join(runDirectory, "final.mp4"),
    "-frames:v", "1",
    firstFrame,
  ]);
  const pixel = await sharp(firstFrame).extract({ left: 8, top: 8, width: 1, height: 1 }).raw().toBuffer();
  assert.ok(pixel[0] > 220 && pixel[1] > 175 && pixel[2] > 175, "Sisters Room pink wall must replace the legacy white canvas");

  const review = JSON.parse(await fs.readFile(path.join(runDirectory, "human-review.json"), "utf8"));
  assert.equal(review.status, "pending");
  assert.equal(review.reviewedOutputSha256, rendered.report.outputSha256);
  assert.equal(review.directVideoPerception, false);
  assert.equal(review.directAudioPerception, false);
  assert.equal(review.completePasses, 0);
});

test("performance validation rejects audio paths outside the run folder", async (t) => {
  const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-performance-traversal-"));
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
  await writeJson(path.join(runDirectory, "input.json"), {
    schemaVersion: "shaz-body-language-performance-v1",
    title: "Traversal must fail",
    fps: 24,
    audioFile: "../outside.wav",
    durationFrames: 24,
    events: [],
  });
  await assert.rejects(
    validateRun({ root, runDirectory }),
    /must name a file directly inside the run folder/,
  );
});

test("performance validation resolves an explicit registered background and rejects an unknown id", async (t) => {
  const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-performance-background-"));
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
  const audioName = "user-audio.ogg";
  await fs.copyFile(hello, path.join(runDirectory, audioName));
  const stagedTranscript = await stageTranscript(runDirectory, audioName);
  const inputPath = path.join(runDirectory, "input.json");
  const input = {
    schemaVersion: "shaz-body-language-performance-v1",
    title: "Selectable background mechanics proof",
    fps: 24,
    audioFile: audioName,
    backgroundId: "pure-white",
    durationFrames: stagedTranscript.durationFrames,
    events: [],
    transcript: stagedTranscript.config,
    planningTranscriptSha256: stagedTranscript.config.sha256,
  };
  await writeJson(inputPath, input);

  const selected = await validateRun({ root, runDirectory });
  assert.equal(selected.timeline.backgroundId, "pure-white");
  assert.equal(selected.receipt.background.id, "pure-white");
  assert.equal(
    selected.receipt.background.sha256,
    "f91cf55509a036596da76a95f07a4034459ff0c6b23aac48b4ff6c2661edb807",
  );

  await writeJson(inputPath, { ...input, backgroundId: "not-registered" });
  await assert.rejects(
    validateRun({ root, runDirectory }),
    /unknown registered background not-registered/,
  );
});

test("official sequence path stacks complete registered poses over fixed background and audio", async (t) => {
  const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-audio-sequence-"));
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
  const audioName = "user-audio.ogg";
  const audioFile = path.join(runDirectory, audioName);
  await fs.copyFile(hello, audioFile);
  const stagedTranscript = await stageTranscript(runDirectory, audioName);
  const presentAnchor = transcriptWordAnchor(stagedTranscript.transcript);
  const presentHoldFrames = 4;
  const presentRecipeFrames = 19;
  const firstNeutralHoldFrames = presentAnchor.frame - 1;
  const finalNeutralHoldFrames = stagedTranscript.durationFrames
    - presentAnchor.frame
    - presentRecipeFrames
    - presentHoldFrames
    - 1;
  assert.ok(firstNeutralHoldFrames >= 0 && finalNeutralHoldFrames >= 0);
  await fs.writeFile(
    path.join(runDirectory, "cherry-lipsync.tsv"),
    "0.000 X\n0.125 D\n0.250 X\n0.750 D\n1.250 C\n1.750 X\n",
  );
  const stagedAudioSha256 = await sha256(audioFile);
  const stagedCueSha256 = await sha256(path.join(runDirectory, "cherry-lipsync.tsv"));
  await writeJson(path.join(runDirectory, "input.json"), {
    schemaVersion: "shaz-sequence-input-v1",
    title: "Whole-pose Lego proof",
    audioFile: audioName,
    backgroundId: "sisters-room",
    lipSync: {
      engine: "cherry-lip-sync",
      engineVersion: "0.1.0",
      execution: "external",
      cueSource: "supplied-tsv",
      cueFile: "cherry-lipsync.tsv",
      cueSha256: stagedCueSha256,
      sourceAudioSha256: stagedAudioSha256,
      fps: 24,
      filterSingleFrames: null,
    },
    transcript: stagedTranscript.config,
    planningTranscriptSha256: stagedTranscript.config.sha256,
    sequence: [
      { poseId: "neutral-listening", holdFrames: firstNeutralHoldFrames, gapFrames: 0 },
      { poseId: "present", holdFrames: presentHoldFrames, gapFrames: 0, anchor: presentAnchor },
      { poseId: "neutral-listening", holdFrames: finalNeutralHoldFrames, gapFrames: 0 },
    ],
  });

  const validated = await validateRun({ root, runDirectory });
  assert.equal(validated.mode, "audio-sequence");
  assert.equal(validated.timeline.totalFrames, stagedTranscript.durationFrames);
  assert.equal(validated.receipt.lipSync.mappingId, "shaz-five-mouth-v1");
  assert.deepEqual(validated.receipt.lipSync.usedMouthDrawings, ["1", "2", "5"]);
  assert.deepEqual(
    validated.receipt.poses.map(({ poseId, recipeFrames }) => ({ poseId, recipeFrames })),
    [
      { poseId: "neutral-listening", recipeFrames: 1 },
      { poseId: "present", recipeFrames: 19 },
      { poseId: "neutral-listening", recipeFrames: 1 },
    ],
  );

  const rendered = await renderSequence({ root, runDirectory });
  assert.equal(rendered.report.mode, "audio-backed-sequence");
  assert.equal(rendered.report.totalFrames, stagedTranscript.durationFrames);
  assert.equal(rendered.report.segments[1].recipeFrames, 19);
  assert.equal(rendered.report.segments[1].outputStartFrame, presentAnchor.frame + 1);
  assert.equal(rendered.report.segments[1].outputEndFrame, presentAnchor.frame + 23);
  assert.equal(rendered.report.cameraMotion, false);
  assert.equal(rendered.report.mouthMode, "cherry-tsv-shaz-five-mouth-v1");
  assert.equal(rendered.report.lipSync.cueSha256, validated.receipt.lipSync.cueSha256);

  const quality = await inspectRun({ root, runDirectory });
  assert.equal(quality.status, "pass", JSON.stringify(quality.failures, null, 2));
  assert.equal(quality.measured.frames, stagedTranscript.durationFrames);
  assert.equal(quality.measured.audioCodec, "aac");
  assert.ok(quality.measured.meanVolumeDb > -55);

  const neutralRestFrame = path.join(runDirectory, "neutral-rest.png");
  const neutralTalkingFrame = path.join(runDirectory, "neutral-talking.png");
  for (const [frame, output] of [[1, neutralRestFrame], [4, neutralTalkingFrame]]) {
    execute("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", path.join(runDirectory, "final.mp4"),
      "-vf", `select=eq(n\\,${frame})`,
      "-frames:v", "1",
      output,
    ]);
  }
  const [restPixels, talkingPixels] = await Promise.all([
    sharp(neutralRestFrame).raw().toBuffer(),
    sharp(neutralTalkingFrame).raw().toBuffer(),
  ]);
  assert.notDeepEqual(
    restPixels,
    talkingPixels,
    "a Cherry cue change during the same neutral hold must reach the encoded final video",
  );
});

test("fixed audiovisual stage view hides the waist cutoff and preserves horizontal framing", async (t) => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, "rig-v2", "runtime.json"), "utf8"));
  const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-stage-view-point-"));
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
  const audioName = "user-audio.wav";
  const audioFile = path.join(runDirectory, audioName);
  execute("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", hello,
    "-af", "apad",
    "-t", "4",
    "-c:a", "pcm_s16le",
    audioFile,
  ]);
  const stagedTranscript = await stageTranscript(runDirectory, audioName);
  const pointAnchor = transcriptWordAnchor(stagedTranscript.transcript);
  assert.equal(
    pointAnchor.frame + 76,
    stagedTranscript.durationFrames,
    "padded speech fixture must leave exactly one point recipe after its first word",
  );
  await writeJson(path.join(runDirectory, "input.json"), {
    schemaVersion: "shaz-sequence-input-v1",
    title: "Point stage-view regression fixture",
    audioFile: audioName,
    backgroundId: "sisters-room",
    transcript: stagedTranscript.config,
    planningTranscriptSha256: stagedTranscript.config.sha256,
    sequence: [
      { poseId: "neutral-listening", holdFrames: pointAnchor.frame - 1, gapFrames: 0 },
      { poseId: "point", holdFrames: 0, gapFrames: 0, anchor: pointAnchor },
    ],
  });
  const validated = await validateRun({ root, runDirectory });
  const { renderRigFrame } = await import("../runtime/rig-v2-renderer.mjs");
  const assetCache = new Map();
  const propCache = new Map();
  for (const poseId of ["neutral-listening", "present", "confident", "point", "shrug", "aha"]) {
    const pose = validated.registry.byId.get(poseId);
    for (let frame = 1; frame <= pose.recipe.durationFrames; frame += 1) {
      const rendered = await renderRigFrame({
        manifest,
        frame,
        assetRoot: path.join(root, "rig-v2", "assets"),
        propRoot: path.join(root, "assets", "props"),
        poseRuntime: pose.poseRuntime,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        stageView: PERFORMANCE_STAGE_VIEW,
        assetCache,
        propCache,
        includeLayerBuffers: true,
      });
      const { data, info } = await sharp(rendered.buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const edgeAlpha = (x) => Array.from({ length: info.height }, (_, y) => (
        data[((y * info.width + x) * 4) + 3]
      )).reduce((sum, value) => sum + value, 0);
      assert.equal(edgeAlpha(0), 0, `${poseId} frame ${frame} must not touch the left edge`);
      assert.equal(edgeAlpha(info.width - 1), 0, `${poseId} frame ${frame} must not touch the right edge`);

      const bodyLayer = rendered.analysisLayers.find(({ nodePath, variant }) => (
        nodePath.endsWith("/Body") && variant === "main"
      ));
      assert.ok(bodyLayer, `${poseId} frame ${frame} must retain its Body layer`);
      const body = await sharp(bodyLayer.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let longestBottomBodyRun = 0;
      let currentBottomBodyRun = 0;
      const bottomY = body.info.height - 1;
      for (let x = 0; x < body.info.width; x += 1) {
        const alpha = body.data[((bottomY * body.info.width + x) * 4) + 3];
        currentBottomBodyRun = alpha > 8 ? currentBottomBodyRun + 1 : 0;
        longestBottomBodyRun = Math.max(longestBottomBodyRun, currentBottomBodyRun);
      }
      assert.ok(
        longestBottomBodyRun >= 275,
        `${poseId} frame ${frame} must continue the waist-up hoodie below the frame edge`,
      );

      for (const headLayer of rendered.analysisLayers.filter(({ nodePath }) => (
        nodePath.includes("/Head_Group/")
      ))) {
        const head = await sharp(headLayer.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let topAlpha = 0;
        for (let x = 0; x < head.info.width; x += 1) topAlpha += head.data[(x * 4) + 3];
        assert.equal(topAlpha, 0, `${poseId} frame ${frame} must not clip a head layer`);
      }
    }
  }
});
