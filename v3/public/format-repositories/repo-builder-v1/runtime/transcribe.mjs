import { access, lstat, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { hashFile, readJson, regularFile, writeJson } from './contracts.mjs';
import { runTool } from './intake.mjs';

const SHA256 = /^[a-f0-9]{64}$/;
const fail = (message) => { throw new Error(message); };
const requireValue = (condition, message) => { if (!condition) fail(message); };

async function requireAbsent(file) {
  try { await lstat(file); } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  fail(`Transcript output already exists; do not overwrite it: ${path.basename(file)}`);
}

async function suppliedFile(value, label) {
  requireValue(typeof value === 'string' && value.trim().length > 0, `Supply the already-installed ${label} path; automatic downloads are disabled.`);
  const absolute = path.resolve(value);
  const file = await regularFile(path.dirname(absolute), path.basename(absolute));
  requireValue((await stat(file)).size > 0, `${label} file is empty.`);
  return file;
}

/** Optional English-only local speech evidence; never edits evidence.json. */
export async function transcribe({ runDirectory, whisperBinary, modelFile, execute = runTool }) {
  const evidenceFile = await regularFile(runDirectory, 'evidence.json');
  requireValue((await stat(evidenceFile)).size <= 1_000_000, 'Evidence JSON exceeds the supported size.');
  const run = path.dirname(evidenceFile);
  const evidence = await readJson(evidenceFile);
  requireValue(evidence?.schemaVersion === 1 && evidence.source?.hasAudio === true && evidence.audio,
    'No audio evidence is available; transcription requires a voiced reference intake.');
  requireValue(evidence.source.file?.startsWith('private/') && evidence.audio.file === 'evidence/audio.wav',
    'Transcription requires the private source and intake-generated evidence/audio.wav.');
  requireValue(SHA256.test(evidence.source.sha256) && SHA256.test(evidence.audio.sha256), 'Audio and source require SHA-256 evidence hashes.');
  const duration = evidence.source.durationSeconds;
  requireValue(Number.isFinite(duration) && duration > 0 && duration <= 600, 'Reference duration must be known and no greater than 600 seconds.');
  const source = await regularFile(run, evidence.source.file);
  const audio = await regularFile(run, evidence.audio.file);
  for (const file of [source, audio]) {
    const size = (await stat(file)).size;
    requireValue(size > 0 && size <= 100_000_000, 'Reference or audio is empty or exceeds the 100 MB bound.');
  }
  const output = path.join(run, 'transcript.json');
  const rawOutput = path.join(run, 'evidence', 'whisper-transcript.json');
  await requireAbsent(output);
  await requireAbsent(rawOutput);
  const binary = await suppliedFile(whisperBinary, 'whisper.cpp binary');
  await access(binary, constants.X_OK);
  const model = await suppliedFile(modelFile, 'Whisper model');
  requireValue((await stat(model)).size <= 4_000_000_000, 'Whisper model exceeds the supported 4 GB local-file limit.');
  const [sourceSha256, audioSha256, modelSha256, evidenceSha256] = await Promise.all([
    hashFile(source), hashFile(audio), hashFile(model), hashFile(evidenceFile),
  ]);
  requireValue(sourceSha256 === evidence.source.sha256, 'Source video hash mismatch; rerun intake before transcription.');
  requireValue(audioSha256 === evidence.audio.sha256, 'Audio evidence hash mismatch; rerun intake before transcription.');
  await execute(binary, ['--model', model, '--file', audio, '--language', 'en', '--threads', '4',
    '--output-json-full', '--output-file', rawOutput.slice(0, -'.json'.length), '--no-prints'],
  { timeoutMs: 120_000, maxBufferBytes: 1_000_000 });
  const rawFile = await regularFile(run, 'evidence/whisper-transcript.json');
  requireValue((await stat(rawFile)).size <= 10_000_000, 'Whisper JSON exceeds the supported 10 MB bound.');
  const raw = await readJson(rawFile);
  requireValue(Array.isArray(raw?.transcription) && raw.transcription.length > 0 && raw.transcription.length <= 10_000,
    'Whisper returned no transcript segments or an unsupported transcript.');
  const segments = raw.transcription.flatMap((segment) => {
    requireValue(typeof segment?.text === 'string', 'Whisper segment text is invalid.');
    const text = segment.text.trim();
    if (!text || /^\[(?:BLANK_AUDIO|SILENCE|NO_SPEECH)\]$/i.test(text)) return [];
    const from = segment.offsets?.from;
    const to = segment.offsets?.to;
    requireValue(Number.isFinite(from) && Number.isFinite(to) && from >= 0 && to > from
      && from / 1000 < duration && to / 1000 <= duration + 0.5,
    'Whisper segment timestamps are invalid or outside the reference duration.');
    return [{ startSeconds: from / 1000, endSeconds: Math.min(to / 1000, duration), text }];
  });
  requireValue(segments.length > 0, 'Whisper returned no speech text; do not invent a transcript.');
  for (let index = 1; index < segments.length; index += 1) {
    requireValue(segments[index].startSeconds >= segments[index - 1].startSeconds, 'Whisper segment timestamps must be in chronological order.');
  }
  const currentHashes = await Promise.all([hashFile(source), hashFile(audio), hashFile(model), hashFile(evidenceFile)]);
  requireValue(currentHashes.every((value, index) => value === [sourceSha256, audioSha256, modelSha256, evidenceSha256][index]),
    'Reference, evidence, audio, or model changed during transcription; no transcript receipt was written.');
  const receipt = {
    schemaVersion: 1, sourceAudioSha256: audioSha256, sourceVideoSha256: sourceSha256,
    engine: 'whisper.cpp', language: 'en', modelSha256,
    text: segments.map((segment) => segment.text).join(' '), segments, uncertain: true,
    limitations: [
      'This baseline explicitly requests English; language was not automatically identified.',
      'Machine transcription can omit, mistranscribe, or hallucinate speech. Verify wording against the source before relying on it.',
      'Segment timestamps are estimates; a final boundary within 0.5 seconds of the source end is clamped to measured video duration.',
      'Text does not establish speaker identity, voice characteristics, music, sound effects, intelligibility, or direct audio perception.',
    ],
  };
  await writeJson(output, receipt, { exclusive: true });
  return receipt;
}
