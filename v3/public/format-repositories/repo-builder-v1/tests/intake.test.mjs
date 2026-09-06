import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdtemp, readFile, realpath, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { doctor, intake, inspectMedia, INTAKE_LIMITS } from '../runtime/intake.mjs';

let root;
let voiced;
let silent;
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
const exists = async (file) => lstat(file).then(() => true, () => false);
const localExecute = async (command, args, options = {}) => ({
  stdout: execFileSync(command, args, { encoding: 'utf8', timeout: options.timeoutMs ?? 30_000, maxBuffer: 2_000_000, stdio: ['ignore', 'pipe', 'pipe'] }), stderr: '',
});

before(async () => {
  root = await mkdtemp(path.join(await realpath(os.tmpdir()), 'wiggly-builder-intake-'));
  voiced = path.join(root, 'voiced.mp4');
  silent = path.join(root, 'silent.mp4');
  execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-n', '-f', 'lavfi', '-i', 'color=c=red:s=128x96:r=4',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=16000', '-t', '1.25', '-c:v', 'mpeg4', '-c:a', 'aac', voiced]);
  execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-n', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=4',
    '-t', '0.25', '-c:v', 'mpeg4', silent]);
});

after(async () => {
  // Only this test's freshly allocated, uniquely named directory is removed.
  if (root) await rm(root, { recursive: true });
});

test('doctor checks actual local tools and treats yt-dlp as optional', async () => {
  const report = await doctor();
  assert.equal(report.nodeSupported, true);
  for (const name of ['ffmpeg', 'ffprobe']) assert.equal(report.tools.find((tool) => tool.name === name).available, true);
  assert.equal(report.tools.find((tool) => tool.name === 'yt-dlp').required, false);
  const noDownloader = await doctor({ execute: async (command) => {
    if (command === 'yt-dlp') throw new Error('not installed');
    return { stdout: 'test version' };
  } });
  assert.equal(noDownloader.ok, true);
  assert.deepEqual(noDownloader.limits, INTAKE_LIMITS);
});

test('real offline intake hashes original, timestamped frames, and audio without analysis claims', async () => {
  const runDirectory = path.join(root, 'voiced-run');
  const receipt = await intake({ source: voiced, runDirectory });
  assert.equal(receipt.source.file, 'private/source.mp4');
  assert.equal(receipt.source.sha256, digest(await readFile(voiced)));
  assert.equal(receipt.source.width, 128);
  assert.equal(receipt.source.height, 96);
  assert.equal(receipt.source.fps, 4);
  assert.equal(receipt.source.hasAudio, true);
  assert.equal(receipt.source.durationSeconds, 1.25);
  assert.deepEqual(receipt.frames.map((frame) => frame.atSeconds), [0, 0.625]);
  assert.equal(receipt.sampling.method, 'uniform');
  assert(receipt.sampling.limitations.some((line) => line.includes('direct playback')));
  for (const item of [receipt.source, ...receipt.frames, receipt.audio]) {
    assert.equal(item.sha256, digest(await readFile(path.join(runDirectory, item.file))));
    assert(!path.isAbsolute(item.file));
    assert(!item.file.includes('..'));
  }
  assert.deepEqual(JSON.parse(await readFile(path.join(runDirectory, 'evidence.json'), 'utf8')), receipt);
  assert.equal(receipt.transcript, undefined);
  await assert.rejects(intake({ source: voiced, runDirectory }), /already exists/);
});

test('old downloader warning does not block free local-file operation', async () => {
  for (const [version, expectedWarnings] of [['2026.07.04', 1], ['2026.08.19', 0], ['2026.09.01', 0]]) {
    const report = await doctor({ execute: async (command) => ({ stdout: command === 'yt-dlp' ? version : 'test version' }) });
    assert.equal(report.ok, true);
    assert.equal(report.warnings.length, expectedWarnings);
  }
});

test('YouTube 403 is an access failure, not a missing video or a retry loop', async () => {
  for (const stage of ['preflight', 'download']) {
    let calls = 0;
    const cause = new Error('HTTP Error 403: Forbidden');
    const runDirectory = path.join(root, `forbidden-${stage}`);
    const execute = async (command, args) => {
      assert.equal(command, 'yt-dlp'); calls += 1;
      if (stage === 'download' && args.includes('--skip-download')) return { stdout: JSON.stringify({ duration: 1, is_live: false }) };
      throw cause;
    };
    await assert.rejects(intake({ source: 'https://youtu.be/1AFsqhV8lss', runDirectory, allowDownload: true, execute }), (error) => error.code === 'YOUTUBE_ACCESS_FORBIDDEN' && error.cause === cause);
    assert.equal(calls, stage === 'preflight' ? 1 : 2, 'No automatic retry or alternate-client request');
    assert.equal(await exists(path.join(runDirectory, 'evidence.json')), false, 'Metadata must not become a completed intake receipt');
  }
});

test('one-frame silent references remain valid and do not fabricate audio', async () => {
  const receipt = await intake({ source: silent, runDirectory: path.join(root, 'silent-run') });
  assert.equal(receipt.source.hasAudio, false);
  assert.equal(receipt.audio, undefined);
  assert.equal(receipt.frames.length, 1);
  assert.equal(receipt.frames[0].atSeconds, 0);
});

test('technical inspection includes streams and hashes, never creative approval or an absolute source path', async () => {
  const output = path.join(root, 'inspection.json');
  const report = await inspectMedia({ media: voiced, output });
  assert.equal(report.kind, 'technical-media-inspection');
  assert.equal(report.media.sha256, digest(await readFile(voiced)));
  assert.equal(report.media.file, 'voiced.mp4');
  assert.deepEqual(report.streams.map((stream) => stream.type), ['video', 'audio']);
  assert.equal(report.review.status, 'not-assessed');
  assert(!JSON.stringify(report).includes(root));
  await assert.rejects(inspectMedia({ media: voiced, output }), /already exists/);
});

test('invalid sizes, durations, output paths, and symlinks fail before extraction', async () => {
  let calls = 0;
  const never = async () => { calls += 1; throw new Error('should not execute'); };
  for (const maxSeconds of [0, -1, 601, Infinity, NaN, '180']) {
    await assert.rejects(intake({ source: voiced, runDirectory: path.join(root, 'bad-duration'), maxSeconds, execute: never }), /maxSeconds/);
  }
  const oversized = path.join(root, 'oversized.mp4');
  await writeFile(oversized, 'x');
  await truncate(oversized, INTAKE_LIMITS.maxBytes + 1);
  await assert.rejects(intake({ source: oversized, runDirectory: path.join(root, 'oversized-run'), execute: never }), /100 MB/);
  assert.equal(await exists(path.join(root, 'oversized-run')), false);
  const linked = path.join(root, 'linked.mp4');
  await symlink(voiced, linked);
  await assert.rejects(intake({ source: linked, runDirectory: path.join(root, 'linked-run'), execute: never }), /symbolic link/);
  const directoryLink = path.join(root, 'linked-directory');
  await symlink(root, directoryLink);
  await assert.rejects(intake({ source: path.join(directoryLink, 'voiced.mp4'), runDirectory: path.join(root, 'linked-parent-run'), execute: never }), /Symbolic links/);
  await assert.rejects(intake({ source: voiced, runDirectory: path.join(directoryLink, 'new-run'), execute: never }), /Symbolic links/);
  const outputLink = path.join(root, 'output-link');
  await symlink(path.join(root, 'missing-target'), outputLink);
  await assert.rejects(intake({ source: voiced, runDirectory: outputLink, execute: never }), /already exists/);
  assert.equal(calls, 0);
  await assert.rejects(intake({ source: voiced, runDirectory: path.join(root, 'too-long'), maxSeconds: 1 }), /no greater than 1 seconds/);
  assert.equal(await exists(path.join(root, 'too-long')), false);
});

test('URL allowlist and download approval reject unsafe inputs before any network executor call', async () => {
  let calls = 0;
  const never = async () => { calls += 1; throw new Error('should not execute'); };
  const urls = ['http://youtube.com/watch?v=1AFsqhV8lss', 'https://youtube.com.evil.test/watch?v=1AFsqhV8lss',
    'https://user:password@youtube.com/watch?v=1AFsqhV8lss', 'https://youtube.com:444/watch?v=1AFsqhV8lss',
    'https://youtube.com/playlist?list=abc', 'https://youtu.be/../../etc/passwd', 'https://example.com/video.mp4'];
  for (const source of urls) await assert.rejects(intake({ source, runDirectory: path.join(root, 'unsafe-url'), allowDownload: true, execute: never }));
  await assert.rejects(intake({ source: 'https://youtube.com/shorts/1AFsqhV8lss', runDirectory: path.join(root, 'no-approval'), execute: never }), /explicit --allow-download/);
  assert.equal(calls, 0);
});

test('mocked YouTube success permits adaptive merging with bounded flags and no credential/plugin auto-access', async () => {
  const calls = [];
  const runDirectory = path.join(root, 'mock-url');
  const execute = async (command, args, options) => {
    calls.push({ command, args, options });
    if (command !== 'yt-dlp') return localExecute(command, args, options);
    if (args.includes('--print')) return { stdout: JSON.stringify({ duration: 1, is_live: false }) };
    const template = args[args.indexOf('--output') + 1];
    await copyFile(voiced, template.replace('%(ext)s', 'mp4'));
    return { stdout: '', stderr: '' };
  };
  const receipt = await intake({ source: 'https://youtube.com/shorts/1AFsqhV8lss?feature=share', runDirectory, allowDownload: true, execute });
  assert.equal(receipt.source.sha256, digest(await readFile(voiced)));
  assert.equal(receipt.source.durationSeconds, 1.25, 'Read duration from the actual downloaded media, not remote metadata');
  const downloadCalls = calls.filter((call) => call.command === 'yt-dlp');
  assert.equal(downloadCalls.length, 2);
  const preflight = downloadCalls[0];
  assert.equal(preflight.args[preflight.args.indexOf('--print') + 1], '%(.{duration,is_live,live_status,_type,filesize,n_entries})j');
  assert(!preflight.args.includes('--dump-single-json'));
  assert.equal(preflight.options.maxBufferBytes, 2_000_000);
  for (const { args } of downloadCalls) {
    assert(args.includes('--ignore-config'));
    assert(args.includes('--no-plugin-dirs'));
    assert(args.includes('--no-cookies-from-browser'));
    assert(args.includes('--no-playlist'));
    assert(args.includes('--no-cache-dir'));
    for (const forbidden of ['--cookies', '--cookies-from-browser', '--netrc', '--netrc-cmd', '--plugin-dirs', '--config-locations', '--remote-components', '--exec']) {
      assert(!args.includes(forbidden));
    }
    assert.equal(args.at(-1), 'https://www.youtube.com/watch?v=1AFsqhV8lss');
    assert.equal(args.at(-2), '--');
  }
  const download = downloadCalls[1];
  assert(download.args.includes('--max-filesize'));
  assert(download.args.includes(String(INTAKE_LIMITS.maxBytes)));
  assert(download.args.includes('--match-filters'));
  assert.equal(download.args[download.args.indexOf('--format') + 1], 'bestvideo[height<=720]+bestaudio/best[height<=720]');
  assert.equal(download.args[download.args.indexOf('--merge-output-format') + 1], 'mp4');
  assert.equal(download.options.budgetDirectory, path.join(runDirectory, 'private'));
  assert.equal(download.options.timeoutMs, 180_000);
  for (const call of calls.filter((call) => call.command === 'ffmpeg')) {
    assert(call.args.includes('-nostdin'));
    assert(call.args.includes('-n'));
    assert(call.args.includes('file,pipe'));
    assert(call.options.timeoutMs <= 60_000);
  }
});

test('mocked YouTube rejects unbounded metadata and propagates one failure without retries', async () => {
  for (const metadata of [{ duration: 601 }, { is_live: true, duration: 1 }, { _type: 'playlist', duration: 1 }, { n_entries: 2, duration: 1 }, { duration: null }, { duration: 1, filesize: INTAKE_LIMITS.maxBytes + 1 }]) {
    let calls = 0;
    await assert.rejects(intake({ source: 'https://youtu.be/1AFsqhV8lss', runDirectory: path.join(root, 'bad-remote'), allowDownload: true,
      execute: async () => { calls += 1; return { stdout: JSON.stringify(metadata) }; } }));
    assert.equal(calls, 1);
    assert.equal(await exists(path.join(root, 'bad-remote')), false);
  }
  let failures = 0;
  await assert.rejects(intake({ source: 'https://youtu.be/1AFsqhV8lss', runDirectory: path.join(root, 'remote-failed'), allowDownload: true,
    execute: async () => { failures += 1; throw new Error('Download unavailable; supply a local file'); } }), /Download unavailable/);
  assert.equal(failures, 1);
});

test('sample count is capped at 24 and invalid probe metadata stops before decoding', async () => {
  const runDirectory = path.join(root, 'max-frames');
  const metadata = { format: { duration: 600 }, streams: [{ index: 0, codec_type: 'video', codec_name: 'mpeg4', width: 64, height: 64, avg_frame_rate: '4/1' }] };
  let frameCalls = 0;
  const receipt = await intake({ source: silent, runDirectory, maxSeconds: 600, execute: async (command, args) => {
    if (command === 'ffprobe') return { stdout: JSON.stringify(metadata) };
    frameCalls += 1;
    await writeFile(args.at(-1), 'mock frame bytes');
    return { stdout: '' };
  } });
  assert.equal(frameCalls, 24);
  assert.deepEqual(receipt.frames.map((frame) => frame.atSeconds), Array.from({ length: 24 }, (_, index) => index * 25));
  const invalid = [
    { format: { duration: 1 }, streams: [] },
    { ...metadata, format: { duration: 'N/A' } },
    { ...metadata, streams: [{ ...metadata.streams[0], width: 100000 }] },
    { ...metadata, streams: [{ ...metadata.streams[0], avg_frame_rate: '1000/1' }] },
    { ...metadata, streams: [{ ...metadata.streams[0], disposition: { attached_pic: 1 } }] },
  ];
  for (const value of invalid) {
    const execute = async (command) => { assert.equal(command, 'ffprobe'); return { stdout: JSON.stringify(value) }; };
    await assert.rejects(intake({ source: silent, runDirectory: path.join(root, 'invalid-probe'), maxSeconds: 600, execute }));
  }
});

test('downloaded files are independently bounded and symlinks rejected even if downloader flags were ignored', async () => {
  for (const variant of ['oversized', 'symlink', 'wrong-duration', 'leftover-track']) {
    const runDirectory = path.join(root, `bad-download-${variant}`);
    const execute = async (command, args, options) => {
      if (command !== 'yt-dlp') return localExecute(command, args, options);
      if (args.includes('--print')) return { stdout: JSON.stringify({ duration: 0.5 }) };
      const output = args[args.indexOf('--output') + 1].replace('%(ext)s', 'mp4');
      if (variant === 'symlink') await symlink(voiced, output);
      else {
        await copyFile(voiced, output);
        if (variant === 'oversized') await truncate(output, INTAKE_LIMITS.maxBytes + 1);
        if (variant === 'leftover-track') await writeFile(path.join(runDirectory, 'private/source.f251.webm'), 'unmerged track');
      }
      return { stdout: '' };
    };
    const pattern = variant === 'oversized' ? /100 MB/ : variant === 'symlink' ? /symbolic link/ : variant === 'leftover-track' ? /one supported complete video/ : /no greater than 1 seconds/;
    await assert.rejects(intake({ source: 'https://youtu.be/1AFsqhV8lss', runDirectory, maxSeconds: 1, allowDownload: true, execute }), pattern);
    assert.equal(await exists(path.join(runDirectory, 'evidence.json')), false);
  }
});

test('preflight projection excludes oversized format/caption metadata without increasing the output budget', async () => {
  const verboseMetadata = {
    duration: 0.25, is_live: false, live_status: 'not_live', _type: 'video', filesize: 500,
    formats: [{ details: 'x'.repeat(2_100_000) }], automatic_captions: { en: [{ url: 'https://unused.invalid/captions' }] },
    description: 'Irrelevant metadata must not be printed',
  };
  let projectionObserved = false;
  const execute = async (command, args, options) => {
    if (command !== 'yt-dlp') return localExecute(command, args, options);
    if (args.includes('--print')) {
      const template = args[args.indexOf('--print') + 1];
      const keys = /^%\(\.\{([a-z_,]+)\}\)j$/.exec(template)?.[1].split(',');
      assert(keys, 'Use the documented dictionary-projection JSON template');
      assert.deepEqual(keys, ['duration', 'is_live', 'live_status', '_type', 'filesize', 'n_entries']);
      const stdout = JSON.stringify(Object.fromEntries(keys.filter((key) => key in verboseMetadata).map((key) => [key, verboseMetadata[key]])));
      assert(stdout.length < 200);
      assert(!stdout.includes('formats'));
      assert(!stdout.includes('automatic_captions'));
      assert(!stdout.includes('description'));
      assert.equal(options.maxBufferBytes, 2_000_000);
      projectionObserved = true;
      return { stdout };
    }
    assert(!args.includes('--dump-single-json'));
    await copyFile(silent, args[args.indexOf('--output') + 1].replace('%(ext)s', 'mp4'));
    return { stdout: '' };
  };
  const receipt = await intake({ source: 'https://youtu.be/1AFsqhV8lss', runDirectory: path.join(root, 'projected-url'), allowDownload: true, execute });
  assert.equal(projectionObserved, true);
  assert.equal(receipt.source.durationSeconds, 0.25);
});
