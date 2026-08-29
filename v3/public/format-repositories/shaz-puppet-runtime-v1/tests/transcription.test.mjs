import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ensureWhisperEngine,
  generateTranscript,
  loadWhisperVendor,
  validateTranscriptEvidence,
} from "../runtime/transcription.mjs";
import { sha256 } from "../runtime/run-common.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hello = path.join(root, "vendor", "cherry-lip-sync", "v0.1.0", "fixtures", "hello.ogg");

test("bundled Whisper source, model, build plan, and licenses are checksum-pinned without a native executable", async () => {
  const vendor = await loadWhisperVendor(root);
  assert.equal(vendor.manifest.engine, "whisper.cpp");
  assert.equal(vendor.manifest.version, "1.9.2");
  assert.equal(vendor.manifest.nativeExecutableIncluded, false);
  assert.equal(vendor.manifest.supportedPlatform, "darwin");
  assert.equal(vendor.manifest.supportedArchitecture, "arm64");
  assert.equal(vendor.manifest.model.bytes, 59_721_011);
  assert.equal(vendor.manifest.model.repositoryCommit, "5359861c739e955e79d9a303bcbc70fb988958b1");
  assert.equal(
    vendor.manifest.model.sha256,
    "4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f",
  );
  for (const entry of await fs.readdir(vendor.vendorDirectory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const bytes = await fs.readFile(path.join(vendor.vendorDirectory, entry.name));
    assert.notEqual(bytes.subarray(0, 4).toString("hex"), "cffaedfe", `${entry.name} must not be arm64 Mach-O`);
    assert.notEqual(bytes.subarray(0, 4).toString("hex"), "feedfacf", `${entry.name} must not be Mach-O`);
  }
});

test("Apple Clang builds and caches the pinned helper without quarantine", async () => {
  const engine = await ensureWhisperEngine({ root });
  assert.equal(engine.receipt.execution, "locally-compiled-darwin-arm64");
  assert.match(engine.receipt.compilerVersion, /^Apple clang version /);
  assert.match(engine.receipt.binarySha256, /^[a-f0-9]{64}$/);
  const version = execFileSync(engine.binaryPath, ["--version"], { encoding: "utf8" });
  assert.match(version, /1\.9\.2/);
  assert.throws(
    () => execFileSync("/usr/bin/xattr", ["-p", "com.apple.quarantine", engine.binaryPath], { stdio: "pipe" }),
    /Command failed/,
  );
});

test("Whisper refuses a linked cache root without touching its target", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-whisper-cache-link-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const target = path.join(scratch, "external-cache");
  const linkedCache = path.join(scratch, "linked-cache");
  const marker = path.join(target, "keep.txt");
  await fs.mkdir(target);
  await fs.writeFile(marker, "keep\n");
  await fs.symlink(target, linkedCache, "dir");
  await assert.rejects(
    ensureWhisperEngine({ root, cacheRoot: linkedCache }),
    /cache root must be a real directory, not a symbolic link/,
  );
  assert.equal(await fs.readFile(marker, "utf8"), "keep\n");
});

test("Whisper rejects a linked cached-helper directory before executing it", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-whisper-cache-leaf-link-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const engine = await ensureWhisperEngine({ root });
  const externalCache = path.join(scratch, "external-helper-cache");
  const cacheRoot = path.join(scratch, "cache-root");
  await fs.cp(path.dirname(engine.binaryPath), externalCache, { recursive: true });
  await fs.mkdir(cacheRoot);
  await fs.symlink(
    externalCache,
    path.join(cacheRoot, "whisper.cpp-1.9.2-darwin-arm64"),
    "dir",
  );
  await assert.rejects(
    ensureWhisperEngine({ root, cacheRoot }),
    /cache directory must be a real directory, not a symbolic link/,
  );
});

test("local transcription is deterministic, word-timed, and bound to the exact source audio", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-transcription-test-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const first = await generateTranscript({
    root,
    audioPath: hello,
    outputPath: path.join(scratch, "first.json"),
  });
  const second = await generateTranscript({
    root,
    audioPath: hello,
    outputPath: path.join(scratch, "second.json"),
  });
  assert.equal(first.transcriptSha256, second.transcriptSha256);
  assert.equal(first.transcript.text, "Hello, Cherry.");
  assert.deepEqual(first.transcript.words.map(({ normalized }) => normalized), ["hello", "cherry"]);
  assert.ok(first.transcript.words.every(({ startMs, endMs }) => (
    Number.isInteger(startMs) && Number.isInteger(endMs) && endMs >= startMs
  )));
  assert.equal(first.transcript.audio.sourceSha256, await sha256(hello));
  assert.equal(first.receipt.providerCalls, 0);
  assert.equal(first.receipt.cost, "$0");
});

test("the packaged transcribe command creates a transcript and receipt without a provider", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-transcribe-cli-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const output = path.join(scratch, "transcript.json");
  const report = JSON.parse(execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "transcribe",
    `--audio=${hello}`,
    `--output=${output}`,
  ], { cwd: root, encoding: "utf8" }));
  assert.equal(report.status, "pass");
  assert.equal(report.wordCount, 2);
  assert.equal(report.text, "Hello, Cherry.");
  assert.equal(report.transcriptSha256, await sha256(output));
  assert.equal(
    report.receiptSha256,
    await sha256(path.join(scratch, "transcript.receipt.json")),
  );
});

test("runner rejects audio-backed choreography that is not bound to its planning transcript", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-unbound-plan-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const input = path.join(scratch, "input.json");
  await fs.writeFile(input, `${JSON.stringify({
    schemaVersion: "shaz-sequence-input-v1",
    title: "Unbound plan",
    backgroundId: "sisters-room",
    sequence: [{
      poseId: "present",
      holdFrames: 0,
      gapFrames: 0,
      anchor: { wordId: "w0001", label: "Hello", frame: 0 },
    }],
  }, null, 2)}\n`);
  assert.throws(() => execFileSync(process.execPath, [
    path.join(root, "runner.mjs"),
    "init",
    "--run=unbound-transcript-plan",
    `--input=${input}`,
    `--audio=${hello}`,
  ], { cwd: root, stdio: "pipe" }), /require planningTranscriptSha256/);
});

test("transcription rejects playlist and linked inputs before ffmpeg can open them", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-transcribe-local-only-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const playlist = path.join(scratch, "remote.m3u8");
  await fs.writeFile(playlist, "#EXTM3U\nhttps://example.invalid/audio.wav\n");
  await assert.rejects(generateTranscript({
    root,
    audioPath: playlist,
    outputPath: path.join(scratch, "playlist.json"),
  }), /unsupported transcription audio extension/);
  const link = path.join(scratch, "linked.ogg");
  await fs.symlink(hello, link);
  await assert.rejects(generateTranscript({
    root,
    audioPath: link,
    outputPath: path.join(scratch, "linked.json"),
  }), /regular local file, not a link/);
});

test("runner init rejects disguised playlists and oversized audio before staging", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-transcribe-ingress-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const fixture = path.join(root, "fixtures", "talk-to-camera", "input.json");
  const cases = [
    {
      label: "playlist",
      file: path.join(scratch, "remote.wav"),
      create: () => fs.writeFile(
        path.join(scratch, "remote.wav"),
        "#EXTM3U\n#EXTINF:1,\nhttps://example.invalid/audio.wav\n",
      ),
      expected: /ffprobe failed|not on whitelist|invalid data/i,
    },
    {
      label: "oversized",
      file: path.join(scratch, "oversized.wav"),
      create: async () => {
        const handle = await fs.open(path.join(scratch, "oversized.wav"), "w");
        try {
          await handle.truncate((512 * 1024 * 1024) + 1);
        } finally {
          await handle.close();
        }
      },
      expected: /must contain 1-536870912 bytes/,
    },
  ];
  for (const entry of cases) {
    await entry.create();
    const runId = `ingress-${entry.label}-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
    const runDirectory = path.join(root, "agent-runs", runId);
    t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
    assert.throws(() => execFileSync(process.execPath, [
      path.join(root, "runner.mjs"),
      "init",
      `--run=${runId}`,
      `--input=${fixture}`,
      `--audio=${entry.file}`,
    ], { cwd: root, stdio: "pipe" }), entry.expected);
    await assert.rejects(fs.access(runDirectory), { code: "ENOENT" });
  }
});

test("transcription rejects canonical path aliases before they can overwrite audio", async (t) => {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-transcribe-collision-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  const audioPath = path.join(scratch, "audio.ogg");
  await fs.copyFile(hello, audioPath);
  await assert.rejects(generateTranscript({
    root,
    audioPath,
    outputPath: `${scratch}/nested/../audio.ogg`,
    receiptPath: path.join(scratch, "receipt.json"),
  }), /must be different files/);
  assert.equal(await sha256(audioPath), await sha256(hello));
});

test("staged transcript validation rejects changed transcript bytes", async (t) => {
  const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-transcription-evidence-"));
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
  const audioPath = path.join(runDirectory, "user-audio.ogg");
  await fs.copyFile(hello, audioPath);
  const generated = await generateTranscript({
    root,
    audioPath,
    outputPath: path.join(runDirectory, "transcript.json"),
    receiptPath: path.join(runDirectory, "transcription-receipt.json"),
  });
  const config = {
    file: "transcript.json",
    sha256: generated.transcriptSha256,
    receiptFile: "transcription-receipt.json",
    receiptSha256: generated.receiptSha256,
    sourceAudioSha256: generated.receipt.audio.sourceSha256,
    language: generated.transcript.language,
    segmentCount: generated.transcript.segments.length,
    wordCount: generated.transcript.words.length,
  };
  const validated = await validateTranscriptEvidence({ root, runDirectory, audioPath, config });
  assert.equal(validated.receipt.wordCount, 2);

  generated.transcript.text = "Tampered";
  await fs.writeFile(
    path.join(runDirectory, "transcript.json"),
    `${JSON.stringify(generated.transcript, null, 2)}\n`,
  );
  await assert.rejects(
    validateTranscriptEvidence({ root, runDirectory, audioPath, config }),
    /transcript checksum does not match/,
  );
});

test("staged transcript validation rejects a coordinated fake provider receipt", async (t) => {
  const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-transcription-receipt-tamper-"));
  t.after(() => fs.rm(runDirectory, { recursive: true, force: true }));
  const audioPath = path.join(runDirectory, "user-audio.ogg");
  await fs.copyFile(hello, audioPath);
  const generated = await generateTranscript({
    root,
    audioPath,
    outputPath: path.join(runDirectory, "transcript.json"),
    receiptPath: path.join(runDirectory, "transcription-receipt.json"),
  });
  const receiptPath = path.join(runDirectory, "transcription-receipt.json");
  const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
  receipt.engine.name = "deepgram";
  receipt.engine.execution = "downloaded-native";
  receipt.providerCalls = 99;
  receipt.cost = "$100";
  receipt.audio.canonicalPcmSha256 = "0".repeat(64);
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  const config = {
    file: "transcript.json",
    sha256: generated.transcriptSha256,
    receiptFile: "transcription-receipt.json",
    receiptSha256: await sha256(receiptPath),
    sourceAudioSha256: generated.receipt.audio.sourceSha256,
    language: generated.transcript.language,
    segmentCount: generated.transcript.segments.length,
    wordCount: generated.transcript.words.length,
  };
  await assert.rejects(
    validateTranscriptEvidence({ root, runDirectory, audioPath, config }),
    /transcription receipt is stale/,
  );
});
