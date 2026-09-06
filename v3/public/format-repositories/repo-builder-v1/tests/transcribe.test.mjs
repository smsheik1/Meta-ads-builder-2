import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { transcribe } from '../runtime/transcribe.mjs';

let root;
let binary;
let model;
let nextRun = 0;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const canonicalRaw = {
  transcription: [
    { offsets: { from: 0, to: 1000 }, text: ' First line. ', tokens: [{ text: 'First', p: 0.95 }] },
    { offsets: { from: 1100, to: 2000 }, text: 'Second line.', tokens: [] },
  ],
};

before(async () => {
  root = await mkdtemp(path.join(await realpath(os.tmpdir()), 'wiggly-builder-transcribe-'));
  binary = path.join(root, 'whisper-cli');
  model = path.join(root, 'local-model.bin');
  await writeFile(binary, '#!/bin/sh\nexit 1\n', { mode: 0o700 });
  await chmod(binary, 0o700);
  await writeFile(model, 'mock model weights');
});
after(async () => { if (root) await rm(root, { recursive: true }); });

async function fixture({ hasAudio = true } = {}) {
  const runDirectory = path.join(root, `run-${nextRun++}`);
  await mkdir(path.join(runDirectory, 'private'), { recursive: true });
  await mkdir(path.join(runDirectory, 'evidence'));
  await writeFile(path.join(runDirectory, 'private/source.mp4'), 'mock source bytes');
  const evidence = {
    schemaVersion: 1, source: { file: 'private/source.mp4', sha256: digest('mock source bytes'), hasAudio, durationSeconds: 2 },
    ...(hasAudio ? { audio: { file: 'evidence/audio.wav', sha256: digest('mock audio bytes') } } : {}),
  };
  if (hasAudio) await writeFile(path.join(runDirectory, 'evidence/audio.wav'), 'mock audio bytes');
  await writeFile(path.join(runDirectory, 'evidence.json'), JSON.stringify(evidence));
  return { runDirectory, whisperBinary: binary, modelFile: model };
}

function mockExecutor(raw = canonicalRaw, calls = []) {
  return async (command, args, options) => {
    calls.push({ command, args, options });
    await writeFile(`${args[args.indexOf('--output-file') + 1]}.json`, JSON.stringify(raw));
    return { stdout: '', stderr: '' };
  };
}

test('local English transcription normalizes offset milliseconds and binds source, audio, and model hashes', async () => {
  const options = await fixture();
  const evidenceBefore = await readFile(path.join(options.runDirectory, 'evidence.json'));
  const calls = [];
  const result = await transcribe({ ...options, execute: mockExecutor(canonicalRaw, calls) });
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.engine, 'whisper.cpp');
  assert.equal(result.language, 'en');
  assert.equal(result.sourceAudioSha256, digest('mock audio bytes'));
  assert.equal(result.sourceVideoSha256, digest('mock source bytes'));
  assert.equal(result.modelSha256, digest('mock model weights'));
  assert.equal(result.text, 'First line. Second line.');
  assert.deepEqual(result.segments, [
    { startSeconds: 0, endSeconds: 1, text: 'First line.' },
    { startSeconds: 1.1, endSeconds: 2, text: 'Second line.' },
  ]);
  assert.equal(result.uncertain, true);
  assert(result.limitations.some((text) => text.includes('English')));
  assert(result.limitations.some((text) => text.includes('hallucinate')));
  assert(result.limitations.some((text) => text.includes('direct audio perception')));
  assert(!JSON.stringify(result).includes(root));
  assert.deepEqual(await readFile(path.join(options.runDirectory, 'evidence.json')), evidenceBefore);
  assert.deepEqual(JSON.parse(await readFile(path.join(options.runDirectory, 'transcript.json'), 'utf8')), result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, binary);
  assert.deepEqual(calls[0].args, ['--model', model, '--file', path.join(options.runDirectory, 'evidence/audio.wav'), '--language', 'en', '--threads', '4',
    '--output-json-full', '--output-file', path.join(options.runDirectory, 'evidence/whisper-transcript'), '--no-prints']);
  assert.equal(calls[0].options.timeoutMs, 120_000);
});

test('missing audio, stale source/audio hashes, and missing explicit tools stop before execution', async () => {
  let calls = 0;
  const execute = async () => { calls += 1; throw new Error('must not run'); };
  await assert.rejects(transcribe({ ...await fixture({ hasAudio: false }), execute }), /No audio evidence/);
  for (const relative of ['private/source.mp4', 'evidence/audio.wav']) {
    const options = await fixture();
    await writeFile(path.join(options.runDirectory, relative), 'changed bytes');
    await assert.rejects(transcribe({ ...options, execute }), /hash mismatch/);
  }
  await assert.rejects(transcribe({ ...await fixture(), whisperBinary: undefined, execute }), /already-installed whisper.cpp binary/);
  await assert.rejects(transcribe({ ...await fixture(), modelFile: undefined, execute }), /already-installed Whisper model/);
  assert.equal(calls, 0);
});

test('existing raw JSON or transcript receipts are never overwritten', async () => {
  let calls = 0;
  const execute = async () => { calls += 1; throw new Error('must not run'); };
  for (const relative of ['transcript.json', 'evidence/whisper-transcript.json']) {
    const options = await fixture();
    const file = path.join(options.runDirectory, relative);
    await writeFile(file, 'preserved');
    await assert.rejects(transcribe({ ...options, execute }), /already exists/);
    assert.equal(await readFile(file, 'utf8'), 'preserved');
  }
  assert.equal(calls, 0);
});

test('symlink input files, tool/model files, and run ancestors are rejected', async () => {
  const options = await fixture();
  const execute = async () => { throw new Error('must not run'); };
  for (const key of ['whisperBinary', 'modelFile']) {
    const link = path.join(root, `linked-${key}`);
    await symlink(options[key], link);
    await assert.rejects(transcribe({ ...options, [key]: link, execute }), /Symlink/);
  }
  const linkedRun = path.join(root, 'linked-run');
  await symlink(options.runDirectory, linkedRun);
  await assert.rejects(transcribe({ ...options, runDirectory: linkedRun, execute }), /Symlink/);
  const linkedAudioOptions = await fixture();
  const linkedAudio = path.join(linkedAudioOptions.runDirectory, 'evidence/audio.wav');
  await rm(linkedAudio);
  await symlink(path.join(options.runDirectory, 'evidence/audio.wav'), linkedAudio);
  await assert.rejects(transcribe({ ...linkedAudioOptions, execute }), /Symlink/);
});

test('execution failure, no speech, malformed timestamps, or changed inputs never produce a receipt', async () => {
  const options = await fixture();
  let calls = 0;
  await assert.rejects(transcribe({ ...options, execute: async () => { calls += 1; throw new Error('whisper timeout'); } }), /whisper timeout/);
  assert.equal(calls, 1);
  for (const raw of [
    { transcription: [] },
    { transcription: [{ text: '   ', offsets: { from: 0, to: 0 } }] },
    { transcription: [{ text: '[BLANK_AUDIO]', offsets: { from: 0, to: 1000 } }] },
    { transcription: [{ text: 'bad', offsets: { from: -1, to: 10 } }] },
    { transcription: [{ text: 'bad', offsets: { from: 0, to: 9000 } }] },
  ]) {
    const current = await fixture();
    await assert.rejects(transcribe({ ...current, execute: mockExecutor(raw) }), /no transcript|no speech|timestamps/);
    await assert.rejects(readFile(path.join(current.runDirectory, 'transcript.json')), { code: 'ENOENT' });
  }
  const changed = await fixture();
  const writeRaw = mockExecutor();
  await assert.rejects(transcribe({ ...changed, execute: async (...args) => {
    await writeRaw(...args);
    await writeFile(path.join(changed.runDirectory, 'evidence/audio.wav'), 'mutated during transcription');
    return { stdout: '' };
  } }), /changed during transcription/);
  await assert.rejects(readFile(path.join(changed.runDirectory, 'transcript.json')), { code: 'ENOENT' });
});

test('a minor final timestamp overrun is clamped and the uncertainty remains explicit', async () => {
  const options = await fixture();
  const result = await transcribe({ ...options, execute: mockExecutor({ transcription: [{ offsets: { from: 0, to: 2250 }, text: 'Estimated boundary.' }] }) });
  assert.equal(result.segments[0].endSeconds, 2);
  assert.equal(result.uncertain, true);
  assert(result.limitations.some((text) => text.includes('clamped')));
});
