#!/usr/bin/env node

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execute, exists, hashValue, parseArgs, readJson, requireEpisodeInputSource, resolveRunDirectory, sha256, writeJson } from "./runtime/common.mjs";
import { inspectRun } from "./runtime/inspect.mjs";
import { renderRun } from "./runtime/render.mjs";
import { applySpeakerReview, createSpeakerReview } from "./runtime/speaker-review.mjs";
import { validateRun } from "./runtime/validate.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

async function initializeRun({ runId, audio, input }) {
  if (!audio || !path.isAbsolute(audio)) throw new Error("Pass the user's audio as an absolute --audio=/path/file.");
  if (!(await exists(audio))) throw new Error(`Audio file does not exist: ${audio}`);
  const inputSource = requireEpisodeInputSource(input);
  if (!path.isAbsolute(inputSource) || !(await exists(inputSource))) throw new Error("Pass an absolute existing --input=/path/timing.json.");
  const runDirectory = resolveRunDirectory(root, runId);
  await mkdir(runDirectory, { recursive: true });
  const extension = path.extname(audio).toLowerCase() || ".audio";
  const audioName = `user-audio${extension}`;
  await copyFile(audio, path.join(runDirectory, audioName));
  const runInput = await readJson(inputSource);
  runInput.audioFile = audioName;
  await writeJson(path.join(runDirectory, "input.json"), runInput);
  await writeJson(path.join(runDirectory, "state.json"), {
    schemaVersion: 1,
    status: "initialized",
    initializedAt: new Date().toISOString(),
    userAudio: { file: audioName, sourceBasename: path.basename(audio), sha256: await sha256(path.join(runDirectory, audioName)) },
    inputTemplate: path.basename(inputSource),
  });
  await createSpeakerReview({ runDirectory });
  return runDirectory;
}

async function check() {
  const versions = {};
  for (const tool of ["node", "npm", "ffmpeg", "ffprobe"]) {
    const flag = tool.startsWith("ff") ? "-version" : "--version";
    versions[tool] = (await execute(tool, [flag], { capture: true })).split("\n")[0];
  }
  await import("sharp");
  const assets = await readJson(path.join(root, "assets.json"));
  const packagedAssets = [...assets.backgrounds, ...assets.characters.flatMap((character) => character.poses)];
  for (const asset of packagedAssets) {
    const file = path.join(root, asset.path);
    if (!(await exists(file))) throw new Error(`Missing packaged asset: ${asset.path}`);
    if (await sha256(file) !== asset.sha256) throw new Error(`Asset checksum mismatch: ${asset.path}`);
  }
  console.log(JSON.stringify({ status: "pass", versions, packagedAssets: packagedAssets.length }, null, 2));
}

async function smoke() {
  const runId = args.run || "smoke-proof";
  const runDirectory = resolveRunDirectory(root, runId);
  await mkdir(runDirectory, { recursive: true });
  const audio = path.join(runDirectory, "smoke-audio.wav");
  await execute("ffmpeg", ["-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4.5", "-c:a", "pcm_s16le", audio]);
  await copyFile(path.join(root, "fixtures", "smoke", "input.json"), path.join(runDirectory, "input.json"));
  const review = await createSpeakerReview({ runDirectory });
  review.beats.forEach((beat) => {
    beat.confirmedSpeaker = beat.proposedSpeaker;
    beat.evidence = beat.proposedSpeaker === "none" ? "silence" : "user-provided-label";
  });
  await writeJson(path.join(runDirectory, "speaker-review.json"), review);
  await applySpeakerReview({ runDirectory });
  await validateRun({ root, runDirectory });
  await renderRun({ root, runDirectory });
  const report = await inspectRun({ runDirectory });
  console.log(JSON.stringify({ run: runId, status: report.status, output: path.join(runDirectory, "final.mp4") }, null, 2));
}

async function finalize(runDirectory) {
  await validateRun({ root, runDirectory });
  const quality = await readJson(path.join(runDirectory, "quality-report.json"));
  if (quality.status !== "pass") throw new Error("The quality report must pass before finalization.");
  const input = await readJson(path.join(runDirectory, "input.json"));
  const output = path.join(runDirectory, "final.mp4");
  const outputSha256 = await sha256(output);
  if (quality.measured?.inputHash !== hashValue(input)) throw new Error("The quality report is stale because the episode input changed after inspection.");
  if (quality.measured?.outputSha256 !== outputSha256) throw new Error("The quality report is stale because the final video changed after inspection.");
  const delivery = {
    schemaVersion: 1,
    status: "ready",
    finalizedAt: new Date().toISOString(),
    finalVideo: "final.mp4",
    sha256: outputSha256,
    qualityReport: "quality-report.json",
    contactSheet: "contact-sheet.png",
    speakerAssignmentReceipt: ".speaker-assignment.json",
    audioPolicy: "user-supplied audio copied locally and muxed into the final AAC track; no voice provider calls",
  };
  await writeJson(path.join(runDirectory, "delivery.json"), delivery);
  console.log(JSON.stringify(delivery, null, 2));
}

async function main() {
  if (command === "check") return check();
  if (command === "smoke") return smoke();
  if (command === "init") {
    const runDirectory = await initializeRun({ runId: args.run, audio: args.audio, input: args.input });
    console.log(`Initialized ${runDirectory}\nReview every clip in speaker-review/, complete speaker-review.json, then run apply-speakers.`);
    return;
  }
  const runDirectory = resolveRunDirectory(root, args.run);
  if (command === "review-speakers") {
    const review = await createSpeakerReview({ runDirectory });
    console.log(JSON.stringify({ status: review.status, review: path.join(runDirectory, "speaker-review.json"), clips: review.beats.length }, null, 2));
    return;
  }
  if (command === "apply-speakers") {
    console.log(JSON.stringify(await applySpeakerReview({ runDirectory }), null, 2));
    return;
  }
  if (command === "validate") {
    const result = await validateRun({ root, runDirectory });
    console.log(JSON.stringify(result.receipt, null, 2));
    return;
  }
  if (command === "render") {
    const result = await renderRun({ root, runDirectory });
    console.log(JSON.stringify(result.report, null, 2));
    return;
  }
  if (command === "inspect") {
    await validateRun({ root, runDirectory });
    console.log(JSON.stringify(await inspectRun({ runDirectory }), null, 2));
    return;
  }
  if (command === "finalize") return finalize(runDirectory);
  throw new Error("Usage: node runner.mjs <check|smoke|init|review-speakers|apply-speakers|validate|render|inspect|finalize> [--run=id] [--audio=/abs/file] [--input=/abs/input.json]");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
