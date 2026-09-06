import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { lstat, mkdir, open, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const INTAKE_LIMITS = Object.freeze({ maxBytes: 100_000_000, maxSeconds: 600, maxFrames: 24 });
const VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.mkv', '.webm', '.avi']);
const INPUT_FLAGS = ['-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov,matroska,webm,avi'];
const LIMITATIONS = [
  'Uniformly sampled still frames can miss cuts, brief effects, motion, and timing; direct playback remains necessary.',
  'Frame atSeconds values are requested seek times; decoded frame timestamps can differ by frame granularity.',
  'Extracted audio is listening evidence, not a transcript or proof of intelligibility, music, or creative quality.',
  'Reference media and extracted evidence are private research inputs, not licensed assets for a child Repo.',
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

async function directoryBytes(directory) {
  let bytes = 0;
  for (const name of await readdir(directory)) {
    const file = path.join(directory, name);
    let info;
    try { info = await lstat(file); } catch (error) {
      // yt-dlp removes adaptive source tracks after a successful merge.
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    invariant(!info.isSymbolicLink(), 'Download produced a forbidden symbolic link.');
    bytes += info.isDirectory() ? await directoryBytes(file) : info.size;
  }
  return bytes;
}

// No shell, no inherited stdin, bounded output/time, and kill the entire child
// process group on Unix so a timed-out downloader cannot leave helpers running.
export async function runTool(command, args, { timeoutMs = 30_000, maxBufferBytes = 1_000_000, budgetDirectory } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let stdout = '';
    let stderr = '';
    let failure;
    let checking = false;
    let settled = false;
    const stop = (error) => {
      if (failure || settled) return;
      failure = error;
      try {
        if (process.platform === 'win32') child.kill('SIGKILL');
        else process.kill(-child.pid, 'SIGKILL');
      } catch { /* Process may already have exited. */ }
    };
    const timer = setTimeout(() => stop(new Error(`${command} exceeded its ${timeoutMs / 1000}s time limit.`)), timeoutMs);
    const budget = budgetDirectory ? setInterval(async () => {
      if (checking || failure) return;
      checking = true;
      try {
        if (await directoryBytes(budgetDirectory) > INTAKE_LIMITS.maxBytes) stop(new Error('Download exceeded the 100 MB file budget.'));
      } catch (error) { stop(error); }
      checking = false;
    }, 100) : undefined;
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (Buffer.byteLength(stdout) > maxBufferBytes) stop(new Error(`${command} exceeded its output limit.`));
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (Buffer.byteLength(stderr) > maxBufferBytes) stop(new Error(`${command} exceeded its output limit.`));
    });
    child.on('error', (error) => { failure ??= new Error(`${command} could not start: ${error.code ?? error.message}`); });
    child.on('close', (code) => {
      settled = true;
      clearTimeout(timer);
      clearInterval(budget);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${command} failed (${code}): ${stderr.trim().slice(-1500)}`));
      else resolve({ stdout, stderr });
    });
  });
}

function validateDurationLimit(value) {
  invariant(typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= INTAKE_LIMITS.maxSeconds,
    'maxSeconds must be a positive number no greater than 600.');
}

async function newTarget(value) {
  invariant(typeof value === 'string' && value.trim().length > 0, 'A new output path is required.');
  const absolute = path.resolve(value);
  const parent = await safeExistingPath(path.dirname(absolute));
  const target = path.join(parent, path.basename(absolute));
  try {
    await lstat(target);
  } catch (error) {
    if (error.code === 'ENOENT') return target;
    throw error;
  }
  throw new Error(`Output already exists; choose a new path: ${path.basename(target)}`);
}

async function safeExistingPath(value) {
  const absolute = path.resolve(value);
  let current = path.parse(absolute).root;
  for (const component of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    if ((await lstat(current)).isSymbolicLink()) {
      // Standard macOS aliases are not user-created links into another run.
      const systemAlias = process.platform === 'darwin' && ['/tmp', '/var', '/etc'].includes(current)
        && await realpath(current) === `/private${current}`;
      invariant(systemAlias, 'Symbolic links in media or output paths are forbidden.');
      current = await realpath(current);
    }
  }
  return current;
}

async function regularMedia(value) {
  invariant(typeof value === 'string' && value.trim().length > 0, 'A local media file is required.');
  const absolute = path.resolve(value);
  const info = await lstat(absolute);
  invariant(info.isFile() && !info.isSymbolicLink(), 'Media must be a regular file, not a symbolic link.');
  invariant(info.size > 0 && info.size <= INTAKE_LIMITS.maxBytes, 'Media must be nonempty and no larger than 100 MB.');
  invariant(VIDEO_EXTENSIONS.has(path.extname(absolute).toLowerCase()), 'Unsupported media extension; use MP4, MOV, MKV, WebM, M4V, or AVI.');
  return { file: await safeExistingPath(absolute), size: info.size };
}

function youtubeURL(source) {
  let url;
  try { url = new URL(source); } catch { throw new Error('Use a local media file or an HTTPS YouTube video URL.'); }
  invariant(url.protocol === 'https:' && !url.username && !url.password && !url.port, 'YouTube URLs must use HTTPS without credentials or a custom port.');
  let id;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else id = /^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  }
  invariant(typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id), 'Only individual YouTube watch, Shorts, embed, or youtu.be video URLs are supported.');
  return `https://www.youtube.com/watch?v=${id}`;
}

async function hash(file) {
  const result = createHash('sha256');
  for await (const chunk of createReadStream(file)) result.update(chunk);
  return result.digest('hex');
}

function frameRate(value) {
  const [numerator, denominator = '1'] = String(value ?? '').split('/').map(Number);
  return denominator > 0 && numerator > 0 ? numerator / denominator : 0;
}

async function probe(file, execute, maxSeconds = INTAKE_LIMITS.maxSeconds) {
  const { stdout } = await execute('ffprobe', ['-v', 'error', ...INPUT_FLAGS, '-show_format', '-show_streams', '-of', 'json', file], { timeoutMs: 20_000 });
  let metadata;
  try { metadata = JSON.parse(stdout); } catch { throw new Error('FFprobe did not return valid media metadata.'); }
  invariant(Array.isArray(metadata.streams) && metadata.streams.length <= 32, 'Invalid or excessive media streams.');
  const video = metadata.streams.find((stream) => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
  invariant(video, 'Reference must have a video stream, not only audio or a cover image.');
  const durationSeconds = Number(metadata.format?.duration ?? video.duration);
  invariant(Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds <= maxSeconds,
    `Media duration must be known, positive, and no greater than ${maxSeconds} seconds.`);
  const width = Number(video.width);
  const height = Number(video.height);
  invariant(Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 8192 && height <= 8192 && width * height <= 33_177_600,
    'Video dimensions are invalid or exceed the bounded 8K intake limit.');
  const fps = frameRate(video.avg_frame_rate) || frameRate(video.r_frame_rate);
  invariant(Number.isFinite(fps) && fps > 0 && fps <= 240, 'Video frame rate must be known, positive, and no greater than 240 fps.');
  return {
    durationSeconds, width, height, fps,
    videoIndex: video.index,
    hasAudio: metadata.streams.some((stream) => stream.codec_type === 'audio'),
    streams: metadata.streams.map((stream) => ({
      index: stream.index, type: stream.codec_type, codec: stream.codec_name,
      ...(stream.codec_type === 'video' ? { width: stream.width, height: stream.height } : {}),
      ...(stream.codec_type === 'audio' ? { sampleRate: Number(stream.sample_rate), channels: stream.channels } : {}),
    })),
  };
}

async function copyBounded(source, destination) {
  const input = await open(source, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const info = await input.stat();
    invariant(info.isFile() && info.size > 0 && info.size <= INTAKE_LIMITS.maxBytes, 'Source changed or exceeds the 100 MB limit.');
    const output = await open(destination, 'wx', 0o600);
    try {
      const buffer = Buffer.alloc(64 * 1024);
      let total = 0;
      for (;;) {
        const { bytesRead } = await input.read(buffer, 0, buffer.length, null);
        if (!bytesRead) break;
        total += bytesRead;
        invariant(total <= INTAKE_LIMITS.maxBytes, 'Source grew beyond the 100 MB limit while copying.');
        let offset = 0;
        while (offset < bytesRead) offset += (await output.write(buffer, offset, bytesRead - offset)).bytesWritten;
      }
    } finally { await output.close(); }
  } finally { await input.close(); }
}

/** Read-only dependency checks. Does not install tools or fetch remote components. */
export async function doctor({ execute = runTool } = {}) {
  const checks = [['ffmpeg', '-version', true], ['ffprobe', '-version', true], ['zip', '-v', true], ['unzip', '-v', true], ['yt-dlp', '--version', false]];
  const tools = await Promise.all(checks.map(async ([name, flag, required]) => {
    try {
      const { stdout } = await execute(name, [flag], { timeoutMs: 5000, maxBufferBytes: 100_000 });
      return { name, required, available: true, version: stdout.split('\n').find((line) => line.trim())?.trim() ?? 'available' };
    } catch { return { name, required, available: false, version: null }; }
  }));
  const nodeSupported = Number(process.versions.node.split('.')[0]) >= 22;
  return { ok: nodeSupported && tools.every((tool) => !tool.required || tool.available), nodeVersion: process.versions.node, nodeSupported, tools, limits: INTAKE_LIMITS };
}

/** Acquire one bounded reference and produce evidence without analysis or paid calls. */
export async function intake({ source, runDirectory, allowDownload = false, maxSeconds = 180, execute = runTool }) {
  validateDurationLimit(maxSeconds);
  invariant(typeof source === 'string' && source.length > 0, 'source is required.');
  const remote = /^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(source);
  const run = await newTarget(runDirectory);
  const common = ['--ignore-config', '--no-plugin-dirs', '--no-cookies-from-browser', '--no-playlist', '--no-cache-dir',
    '--socket-timeout', '15', '--retries', '0', '--extractor-retries', '0',
    '--format', 'bestvideo[height<=720]+bestaudio/best[height<=720]', '--merge-output-format', 'mp4'];
  let local;
  let url;
  if (remote) {
    url = youtubeURL(source);
    invariant(allowDownload === true, 'YouTube intake requires explicit --allow-download; alternatively supply a local video.');
    // yt-dlp's dictionary projection prints only these scalar checks. Full
    // metadata can exceed the output bound because of formats and captions.
    const preflightTemplate = '%(.{duration,is_live,live_status,_type,filesize,n_entries})j';
    const { stdout } = await execute('yt-dlp', [...common, '--print', preflightTemplate, '--skip-download', '--', url], { timeoutMs: 45_000, maxBufferBytes: 2_000_000 });
    let metadata;
    try { metadata = JSON.parse(stdout); } catch { throw new Error('YouTube preflight did not return valid metadata; supply a local video.'); }
    invariant(!['playlist', 'multi_video'].includes(metadata._type) && !(metadata.n_entries > 1) && !metadata.entries && !metadata.is_live && metadata.live_status !== 'is_upcoming', 'Playlists, live streams, and upcoming videos are unsupported.');
    invariant(Number.isFinite(metadata.duration) && metadata.duration > 0 && metadata.duration <= maxSeconds, `YouTube reference must have a known duration no greater than ${maxSeconds} seconds.`);
    invariant(!metadata.filesize || metadata.filesize <= INTAKE_LIMITS.maxBytes, 'YouTube reference exceeds 100 MB.');
  } else {
    local = await regularMedia(source);
    await probe(local.file, execute, maxSeconds);
  }
  await mkdir(run, { mode: 0o700 });
  const privateDirectory = path.join(run, 'private');
  const evidenceDirectory = path.join(run, 'evidence');
  await mkdir(privateDirectory, { mode: 0o700 });
  await mkdir(evidenceDirectory, { mode: 0o700 });
  let sourceFile;
  if (remote) {
    // Adaptive video + audio is normal on YouTube. The directory watchdog also
    // counts temporary source tracks and the merge output against one budget.
    await execute('yt-dlp', [...common, '--fragment-retries', '0', '--abort-on-unavailable-fragments', '--max-filesize', String(INTAKE_LIMITS.maxBytes),
      '--match-filters', `duration > 0 & duration <= ${maxSeconds} & !is_live`,
      '--no-progress', '--no-part', '--no-overwrites', '--output', path.join(privateDirectory, 'source.%(ext)s'), '--', url],
    { timeoutMs: 180_000, maxBufferBytes: 1_000_000, budgetDirectory: privateDirectory });
    invariant(await directoryBytes(privateDirectory) <= INTAKE_LIMITS.maxBytes, 'Download exceeded the 100 MB file budget.');
    const names = await readdir(privateDirectory);
    invariant(names.length === 1 && /^source\.(?:mp4|m4v|mov|mkv|webm|avi)$/.test(names[0]), 'YouTube did not produce one supported complete video; supply a local video.');
    sourceFile = (await regularMedia(path.join(privateDirectory, names[0]))).file;
  } else {
    sourceFile = path.join(privateDirectory, `source${path.extname(local.file).toLowerCase()}`);
    await copyBounded(local.file, sourceFile);
  }
  const metadata = await probe(sourceFile, execute, maxSeconds);
  const { streams: _streams, videoIndex, ...sourceMetadata } = metadata;
  const count = Math.min(INTAKE_LIMITS.maxFrames, Math.max(1, Math.ceil(metadata.durationSeconds)));
  const frames = [];
  for (let index = 0; index < count; index += 1) {
    const atSeconds = Number((metadata.durationSeconds * index / count).toFixed(6));
    const file = `evidence/frame-${String(index + 1).padStart(3, '0')}.png`;
    await execute('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-n', '-threads', '1', ...INPUT_FLAGS,
      '-ss', String(atSeconds), '-i', sourceFile, '-map', `0:${videoIndex}`, '-frames:v', '1', '-vf', "scale=w='min(960,iw)':h='min(960,ih)':force_original_aspect_ratio=decrease", '-threads', '1', path.join(run, file)], { timeoutMs: 15_000 });
    invariant((await stat(path.join(run, file))).size > 0, 'FFmpeg produced an empty evidence frame.');
    frames.push({ atSeconds, file, sha256: await hash(path.join(run, file)) });
  }
  let audio;
  if (metadata.hasAudio) {
    const file = 'evidence/audio.wav';
    await execute('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-n', '-threads', '1', ...INPUT_FLAGS,
      '-i', sourceFile, '-map', '0:a:0', '-vn', '-t', String(maxSeconds), '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', path.join(run, file)], { timeoutMs: 60_000 });
    invariant((await stat(path.join(run, file))).size > 44, 'FFmpeg produced empty audio evidence.');
    audio = { file, sha256: await hash(path.join(run, file)) };
  }
  const receipt = {
    schemaVersion: 1,
    source: { sha256: await hash(sourceFile), file: `private/${path.basename(sourceFile)}`, ...sourceMetadata },
    sampling: { method: 'uniform', limitations: LIMITATIONS }, frames,
    ...(audio ? { audio } : {}),
  };
  await writeFile(path.join(run, 'evidence.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return receipt;
}

/** Technical inspection only: this deliberately does not assert creative success. */
export async function inspectMedia({ media, output, execute = runTool }) {
  const target = await newTarget(output);
  const source = await regularMedia(media);
  const { streams, videoIndex: _videoIndex, ...metadata } = await probe(source.file, execute);
  const receipt = {
    schemaVersion: 1, kind: 'technical-media-inspection',
    media: { file: path.basename(source.file), sha256: await hash(source.file), sizeBytes: source.size, ...metadata },
    streams,
    review: { status: 'not-assessed', limitations: ['Metadata and checksums do not verify motion, content, audio perception, or creative quality. Direct review remains required.'] },
  };
  await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return receipt;
}
