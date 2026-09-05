import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, open, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execute, exists, readJson, writeJson } from "./common.mjs";

const relative = (root, file) => path.relative(root, file).split(path.sep).join("/");
const paths = (root) => ({
  python: path.join(root, ".intake-env", "bin", "python"),
  model: path.join(root, ".intake-models", "small.en"),
  manifest: path.join(root, "scripts", "intake-model.json"),
  requirements: path.join(root, "scripts", "intake-requirements.lock"),
  helper: path.join(root, "scripts", "intake.py"),
});

async function digest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

export function sourceAssertion(source) {
  const parsed = new URL(source);
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("Use a public HTTP(S) video link without embedded credentials, or supply a local file.");
  }
  const youtubeId = /(^|\.)youtube\.com$/i.test(parsed.hostname) ? parsed.searchParams.get("v") : null;
  parsed.search = "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(youtubeId || "")) parsed.searchParams.set("v", youtubeId);
  parsed.hash = "";
  return parsed.href;
}

export function classifyRetrievalFailure(message) {
  if (/login|log.in|sign.in|authentication|cookies|private video|age.restrict/i.test(message)) return "login-required";
  if (/timed?.?out|network|connection|resolve|dns|unreachable|ssl|certificate|http error 5\d\d/i.test(message)) return "network-error";
  return "source-inaccessible";
}

async function checkSetup(root, exec) {
  const p = paths(root);
  const missing = [];
  let versions = {};
  for (const tool of ["ffmpeg", "ffprobe"]) {
    try { await exec(tool, ["-version"], { capture: true }); }
    catch { missing.push(`${tool} is missing or unusable; run the dependency doctor.`); }
  }
  if (!await exists(p.python)) missing.push("Kit-local Python environment is missing.");
  else {
    try {
      const result = JSON.parse(await exec(p.python, [p.helper, "--check", "--requirements", p.requirements], { capture: true, stdoutOnly: true }));
      versions = result.versions;
      if (!result.ready) missing.push(...result.missing);
    } catch { missing.push("Kit-local Python dependencies could not be checked."); }
  }
  const manifest = await readJson(p.manifest);
  for (const file of manifest.files) {
    const local = path.join(p.model, file.name);
    if (!await exists(local) || (await stat(local)).size !== file.bytes || await digest(local) !== file.sha256) missing.push(`Missing or modified model file: ${file.name}`);
  }
  return { ready: missing.length === 0, missing, versions, modelRevision: manifest.revision };
}

export async function setupIntake({ root, exec = execute, fetcher = fetch }) {
  if (!((process.platform === "darwin" && process.arch === "arm64") || (process.platform === "linux" && process.arch === "x64"))) {
    throw new Error("Local intake supports Apple Silicon macOS or Linux x64 (including Linux binaries inside WSL); native Windows is not supported.");
  }
  const p = paths(root);
  const lockPath = path.join(root, ".intake-setup.lock");
  const lock = await open(lockPath, "wx").catch(() => { throw new Error("Intake setup is already running or was interrupted. Inspect .intake-setup.lock before retrying."); });
  try {
    if (!await exists(p.python)) {
      const python = process.env.PYTHON || "python3.12";
      await exec(python, ["-c", "import sys; assert sys.version_info[:2] == (3,12), 'Python 3.12 is required'"], { capture: true });
      await exec(python, ["-m", "venv", path.join(root, ".intake-env")], { capture: true });
    }
    await exec(p.python, ["-m", "pip", "--isolated", "--disable-pip-version-check", "install", "--no-input", "--no-cache-dir", "--index-url", "https://pypi.org/simple", "--require-hashes", "--only-binary=:all:", "-r", p.requirements], { capture: true });
    const manifest = await readJson(p.manifest);
    await mkdir(p.model, { recursive: true });
    for (const file of manifest.files) {
      const destination = path.join(p.model, file.name);
      if (await exists(destination) && (await stat(destination)).size === file.bytes && await digest(destination) === file.sha256) continue;
      const url = `https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${file.name}`;
      const temporary = `${destination}.${randomUUID()}.download`;
      try {
        const response = await fetcher(url, { signal: AbortSignal.timeout(300_000) });
        if (!response.ok || !response.body) throw new Error(`Model setup download failed: HTTP ${response.status}`);
        await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: "wx" }));
        if ((await stat(temporary)).size !== file.bytes || await digest(temporary) !== file.sha256) throw new Error(`Model checksum mismatch: ${file.name}`);
        await rename(temporary, destination);
      } finally { await rm(temporary, { force: true }); }
    }
    const readiness = await checkSetup(root, exec);
    if (!readiness.ready) throw new Error(readiness.missing.join("\n"));
    await writeJson(path.join(root, ".intake-models", "setup.json"), { schemaVersion: 1, ...readiness });
    return { status: "ready", ...readiness };
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

async function probe(file, exec) {
  return JSON.parse(await exec("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { capture: true, stdoutOnly: true }));
}

export async function intakeMedia({ root, runDirectory, source, exec = execute }) {
  const receiptPath = path.join(runDirectory, "intake.json");
  await mkdir(runDirectory, { recursive: true });
  let sourceInfo;
  const persist = async (status, message, owner = "operator", extra = {}) => {
    const result = { schemaVersion: 1, status, ...(sourceInfo ? { source: sourceInfo } : {}), nextAction: { owner, action: status, message }, ...extra };
    await writeJson(receiptPath, result);
    return result;
  };
  if (typeof source !== "string" || !source.trim()) return persist("invalid-source", "Supply a supported accessible video link or an existing local media file.", "user");
  const isUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(source);
  const identity = createHash("sha256").update(source).digest("hex");
  const privateDir = path.join(runDirectory, "private", `source-${identity.slice(0, 24)}`);
  const previous = await exists(receiptPath) ? await readJson(receiptPath) : null;
  if (previous?.status === "needs-script-draft" && previous.source?.requestHash !== identity) {
    return { schemaVersion: 1, status: "invalid-source", nextAction: { owner: "agent", action: "new-run-required", message: "This run already has prepared media. Use a new run for a different source; the existing intake was preserved." } };
  }
  try {
    sourceInfo = isUrl ? { kind: "url", assertedUrl: sourceAssertion(source), assertionBasis: "user-supplied source, not independent verification", requestHash: identity } : { kind: "file", requestHash: identity };
    if (!isUrl && (!await exists(source) || !(await stat(source)).isFile())) return persist("invalid-source", "The local media file is missing. Supply an existing downloaded file.", "user");
  } catch (error) { return persist("invalid-source", error.message, "user"); }
  if (previous?.status === "needs-script-draft") {
    const artifacts = [previous.audio, previous.transcript, previous.asrAudio, { file: previous.source.originalFile, sha256: previous.source.sha256 }];
    const unchanged = await Promise.all(artifacts.map(async (item) => item && await exists(path.join(runDirectory, item.file)) && await digest(path.join(runDirectory, item.file)) === item.sha256));
    if (unchanged.every(Boolean) && (isUrl || await digest(source) === previous.source.sha256)) return previous;
    return { schemaVersion: 1, status: "invalid-source", nextAction: { owner: "agent", action: "new-run-required", message: "Prepared media or transcription changed. Preserve this run and start a fresh intake; stale evidence cannot be reused." } };
  }
  const readiness = await checkSetup(root, exec);
  if (!readiness.ready) return persist("setup-required", `Run explicit setup-intake first. ${readiness.missing.join(" ")}`, "operator");
  const p = paths(root);
  await mkdir(privateDir, { recursive: true });
  await writeJson(path.join(privateDir, "request.json"), { source });
  let original;
  const acquiredPath = path.join(privateDir, "acquired.json");
  if (await exists(acquiredPath)) {
    const acquired = await readJson(acquiredPath);
    const candidate = path.join(privateDir, acquired.file);
    if (path.dirname(candidate) === privateDir && await exists(candidate) && await digest(candidate) === acquired.sha256 && (isUrl || await digest(source) === acquired.sha256)) original = candidate;
  }
  if (!original && isUrl) {
    try {
      await exec(p.python, ["-m", "yt_dlp", "--ignore-config", "--no-plugin-dirs", "--no-playlist", "--max-downloads", "1", "--no-cache-dir", "--no-cookies-from-browser", "--no-netrc", "--no-progress", "--write-info-json", "--no-overwrites", "--format", "bestaudio/best", "--output", path.join(privateDir, "source.%(ext)s"), "--", source], { capture: true, timeoutMs: 180_000 });
    } catch (error) {
      // yt-dlp exits 101 after reaching an explicit one-item limit, even if that item succeeded.
      if (!/exited 101\b/.test(error.message)) {
        const status = classifyRetrievalFailure(error.message);
        const reason = { "login-required": "The site requires login; automatic credential or cookie access is disabled.", "network-error": "The connection failed. Retry after connectivity is restored, or use a local file.", "source-inaccessible": "This link is unsupported, unavailable, or access-restricted." }[status];
        return persist(status, `${reason} Ask the user for a downloaded media file if needed.`, status === "network-error" ? "operator" : "user");
      }
    }
    const candidates = (await readdir(privateDir)).filter((name) => /^source\.[a-z0-9]{1,8}$/i.test(name) && !/\.(part|json|ytdl|temp)$/i.test(name));
    if (candidates.length !== 1) return persist("source-inaccessible", "No single usable media file was retrieved. Ask the user for a downloaded local file.", "user");
    original = path.join(privateDir, candidates[0]);
  } else if (!original) {
    const suffix = /^\.[a-z0-9]{1,8}$/i.test(path.extname(source)) ? path.extname(source).toLowerCase() : ".media";
    original = path.join(privateDir, `source${suffix}`);
    const temporary = `${original}.${randomUUID()}.tmp`;
    try {
      await copyFile(source, temporary);
      await rename(temporary, original);
    } finally { await rm(temporary, { force: true }); }
  }
  await writeJson(acquiredPath, { file: path.basename(original), sha256: await digest(original) });
  const infoFile = path.join(privateDir, "source.info.json");
  if (isUrl && await exists(infoFile)) {
    try {
      const metadata = await readJson(infoFile);
      sourceInfo = { ...sourceInfo, credits: { title: String(metadata.title || "").slice(0, 500), creator: String(metadata.uploader || metadata.channel || "").slice(0, 200), assertionBasis: "downloader-reported metadata, not independent verification" } };
    } catch { /* Optional metadata never substitutes for verified media. */ }
  }
  let media;
  try { media = await probe(original, exec); }
  catch { return persist("missing-audio", "The source could not be decoded. Verify FFprobe is installed and ask for a playable media file with audio.", "operator"); }
  const stream = media.streams?.find((item) => item.codec_type === "audio");
  if (!stream) return persist("missing-audio", "This file has no audio track. Ask the user for a version containing the original audio.", "user");
  sourceInfo = { ...sourceInfo, originalFile: relative(runDirectory, original), sha256: await digest(original), sourceAudioStartSeconds: Number(stream.start_time || 0) };
  const audioFile = path.join(runDirectory, "user-audio.wav");
  const asrFile = path.join(privateDir, "asr-audio.wav");
  try {
    // Do not trim to the video duration: some sources retain their final word beyond the last video frame.
    await exec("ffmpeg", ["-v", "error", "-y", "-i", original, "-map", "0:a:0", "-vn", "-c:a", "pcm_s24le", audioFile], { capture: true });
    await exec("ffmpeg", ["-v", "error", "-y", "-i", audioFile, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", asrFile], { capture: true });
  } catch { return persist("missing-audio", "Audio extraction failed. Check FFmpeg installation and source readability; the original remains preserved.", "operator"); }
  const extracted = await probe(audioFile, exec);
  const asr = await probe(asrFile, exec);
  const decodedStream = extracted.streams.find((item) => item.codec_type === "audio");
  const duration = Number(decodedStream?.duration || extracted.format?.duration);
  if (!(duration > 0)) return persist("missing-audio", "The decoded audio is empty. Supply a media file with audible content.", "user");
  const audio = { file: "user-audio.wav", sha256: await digest(audioFile), durationSeconds: duration, sampleRate: Number(decodedStream.sample_rate), channels: decodedStream.channels };
  const asrAudio = { file: relative(runDirectory, asrFile), sha256: await digest(asrFile), durationSeconds: Number(asr.format?.duration) };
  const transcriptPath = path.join(runDirectory, "transcript.json");
  try {
    await exec(p.python, [p.helper, "--requirements", p.requirements, "--audio", asrFile, "--model", p.model, "--manifest", p.manifest, "--source-offset", String(sourceInfo.sourceAudioStartSeconds), "--output", transcriptPath], { capture: true, stdoutOnly: true });
  } catch { return persist("transcription-failed", "Local transcription failed or found no words. The agent must inspect the preserved source and diagnose; do not ask the user to author timestamps.", "agent", { audio, asrAudio }); }
  return persist("needs-script-draft", "Draft the complete episode from the source and uncertain transcript, then import it with review-script --input. Review words, timing, vocalizations, overlap, and character choices with the user; ASR did not approve or assign speakers.", "agent", { audio, asrAudio, transcript: { file: "transcript.json", sha256: await digest(transcriptPath), engine: "faster-whisper", modelRevision: readiness.modelRevision, uncertain: true } });
}
