import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { classifyRetrievalFailure, intakeMedia, setupIntake, sourceAssertion } from "../intake.mjs";
import { REQUIRED_FFMPEG_CAPABILITIES } from "../doctor.mjs";

const hash = (data) => createHash("sha256").update(data).digest("hex");
const json = async (file, data) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(data)); };

test("doctor requires PCM24 encoding and decoding for preserved intake and exact review WAVs", () => {
  assert.ok(REQUIRED_FFMPEG_CAPABILITIES.encoders.includes("pcm_s24le"));
  assert.ok(REQUIRED_FFMPEG_CAPABILITIES.decoders.includes("pcm_s24le"));
});

async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "wiggly-intake-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runDirectory = path.join(root, "agent-runs", "new-run");
  const source = path.join(root, "input.mp4");
  await writeFile(source, "original media bytes");
  await mkdir(path.join(root, ".intake-env", "bin"), { recursive: true });
  await writeFile(path.join(root, ".intake-env", "bin", "python"), "test-only fake executable");
  const model = path.join(root, ".intake-models", "small.en");
  await mkdir(model, { recursive: true });
  await writeFile(path.join(model, "model.bin"), "test weights");
  await json(path.join(root, "scripts", "intake-model.json"), { repository: "test/model", revision: "test-revision", files: [{ name: "model.bin", bytes: 12, sha256: hash("test weights") }] });
  const calls = [];
  const exec = async (program, args) => {
    calls.push({ program, args });
    if (args.includes("--check")) return JSON.stringify({ ready: true, versions: { "faster-whisper": "test" } });
    if (args.includes("-version")) return "test version";
    if (args.includes("yt_dlp")) {
      if (options.urlError) throw new Error(options.urlError);
      const template = args[args.indexOf("--output") + 1];
      await writeFile(template.replace("%(ext)s", "mp4"), "URL media bytes");
      return "";
    }
    if (program === "ffprobe") {
      const file = args.at(-1);
      const isAsr = file.endsWith("asr-audio.wav");
      return JSON.stringify({ streams: options.noAudio ? [] : [{ codec_type: "audio", sample_rate: isAsr ? "16000" : "48000", channels: isAsr ? 1 : 2, duration: "31.25", start_time: file.endsWith("source.mp4") ? "2.5" : "0" }], format: { duration: "31.25" } });
    }
    if (program === "ffmpeg") {
      await writeFile(args.at(-1), args.at(-1).endsWith("asr-audio.wav") ? "separate ASR derivative" : "full render soundtrack");
      return "";
    }
    if (args.includes("--audio")) {
      if (options.asrError) throw new Error("test transcription failure");
      await json(args[args.indexOf("--output") + 1], { uncertain: true, segments: [{ text: "Words requiring review", words: [] }] });
      return "{}";
    }
    return "";
  };
  return { root, runDirectory, source, exec, calls, model };
}

test("local intake preserves source/audio separation and returns agent-owned draft action", async (t) => {
  const f = await fixture(t);
  const result = await intakeMedia(f);
  assert.equal(result.status, "needs-script-draft");
  assert.equal(result.nextAction.owner, "agent");
  assert.equal(result.audio.file, "user-audio.wav");
  assert.equal(result.audio.sampleRate, 48000);
  assert.equal(result.audio.channels, 2);
  assert.equal(result.source.sourceAudioStartSeconds, 2.5);
  assert.notEqual(result.audio.sha256, result.asrAudio.sha256);
  assert.equal(await readFile(f.source, "utf8"), "original media bytes");
  assert.equal(await readFile(path.join(f.runDirectory, result.source.originalFile), "utf8"), "original media bytes");
  assert.ok(f.calls.some(({ args }) => args.includes("16000")));
  const transcription = f.calls.find(({ args }) => args.includes("--audio"));
  assert.equal(transcription.args[transcription.args.indexOf("--source-offset") + 1], "2.5");
  assert.equal(f.calls.some(({ args }) => args.includes("yt_dlp") || args.includes("pip")), false);
  assert.equal(result.transcript.uncertain, true);
});

test("prepared intake is idempotent and altered audio/source cannot silently reuse transcript", async (t) => {
  const f = await fixture(t);
  const first = await intakeMedia(f);
  const count = f.calls.length;
  assert.deepEqual(await intakeMedia(f), first);
  assert.equal(f.calls.length, count);
  await writeFile(path.join(f.runDirectory, "user-audio.wav"), "changed");
  assert.equal((await intakeMedia(f)).nextAction.action, "new-run-required");
  assert.deepEqual(JSON.parse(await readFile(path.join(f.runDirectory, "intake.json"), "utf8")), first);
});

test("missing or corrupted weights request setup and never trigger implicit downloads", async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.model, "model.bin"), "bad weights!");
  const result = await intakeMedia(f);
  assert.equal(result.status, "setup-required");
  assert.match(result.nextAction.message, /modified model/);
  assert.equal(f.calls.some(({ args }) => args.includes("--audio") || args.includes("yt_dlp") || args.includes("pip")), false);
});

test("missing decoder is setup-required, not a source failure", async (t) => {
  const f = await fixture(t);
  const real = f.exec;
  f.exec = (program, args) => program === "ffmpeg" ? Promise.reject(new Error("ENOENT")) : real(program, args);
  assert.equal((await intakeMedia(f)).status, "setup-required");
});

test("empty audio and failed ASR have distinct states; ASR failure retains extracted audio", async (t) => {
  const empty = await fixture(t, { noAudio: true });
  assert.equal((await intakeMedia(empty)).status, "missing-audio");
  const broken = await fixture(t, { asrError: true });
  const result = await intakeMedia(broken);
  assert.equal(result.status, "transcription-failed");
  assert.equal(result.nextAction.owner, "agent");
  assert.ok(result.audio.sha256);
});

test("URL isolation flags, generated filenames, and assertions omit signed query data", async (t) => {
  const f = await fixture(t);
  f.source = "https://example.test/video/123?signature=PRIVATE#fragment";
  const result = await intakeMedia(f);
  assert.equal(result.status, "needs-script-draft");
  assert.equal(result.source.assertedUrl, "https://example.test/video/123");
  const retrieval = f.calls.find(({ args }) => args.includes("yt_dlp"));
  for (const option of ["--ignore-config", "--no-plugin-dirs", "--no-playlist", "--no-cookies-from-browser", "--no-netrc", "--max-downloads"]) assert.ok(retrieval.args.includes(option));
  assert.match(retrieval.args[retrieval.args.indexOf("--output") + 1], /source\.%\(ext\)s$/);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|fragment/);
});

test("mocked URL failures distinguish login, connection, and inaccessible sources with file fallback", async (t) => {
  for (const [message, status] of [["Please login with cookies", "login-required"], ["DNS could not resolve host", "network-error"], ["HTTP Error 403 Forbidden", "source-inaccessible"]]) {
    const f = await fixture(t, { urlError: message });
    f.source = "https://example.test/video";
    const result = await intakeMedia(f);
    assert.equal(result.status, status);
    assert.match(result.nextAction.message, /downloaded media file/);
  }
  assert.equal(classifyRetrievalFailure("HTTP Error 503"), "network-error");
});

test("asserted URLs reject embedded credentials and unsafe schemes", () => {
  assert.throws(() => sourceAssertion("https://user:password@example.test/clip"), /credentials/);
  assert.throws(() => sourceAssertion("file:///private/audio.wav"), /HTTP/);
  assert.equal(sourceAssertion("https://www.youtube.com/watch?v=abcdefghijk&signature=private"), "https://www.youtube.com/watch?v=abcdefghijk");
});

test("an ASR retry reuses acquired URL media without fetching the remote link again", async (t) => {
  const f = await fixture(t, { asrError: true });
  f.source = "https://example.test/retry";
  assert.equal((await intakeMedia(f)).status, "transcription-failed");
  assert.equal(f.calls.filter(({ args }) => args.includes("yt_dlp")).length, 1);
  assert.equal((await intakeMedia(f)).status, "transcription-failed");
  assert.equal(f.calls.filter(({ args }) => args.includes("yt_dlp")).length, 1);
});

test("setup enforces model checksums and removes interrupted staging files", async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.model, "model.bin"));
  await assert.rejects(setupIntake({ ...f, fetcher: async () => new Response("wrong weights") }), /checksum mismatch/);
  const { readdir } = await import("node:fs/promises");
  assert.deepEqual(await readdir(f.model), []);
  assert.equal(await readFile(f.source, "utf8"), "original media bytes");
});
