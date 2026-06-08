import assert from "node:assert/strict";
import { analyzeGeneratedWavAudio } from "../features/audio/audioAnalysis";

const createTestWav = () => {
  const sampleRate = 24000;
  const durationSeconds = 1;
  const samples = sampleRate * durationSeconds;
  const pcm = new Uint8Array(samples * 2);
  const view = new DataView(pcm.buffer);

  for (let index = 0; index < samples; index += 1) {
    const firstHalf = index < samples / 2;
    const quiet = firstHalf ? 0.18 : 0.74;
    const frequency = firstHalf ? 220 : 880;
    const value = Math.sin((index / sampleRate) * Math.PI * 2 * frequency) * quiet;
    view.setInt16(index * 2, Math.round(value * 32767), true);
  }

  const header = new ArrayBuffer(44);
  const headerView = new DataView(header);
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      headerView.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  headerView.setUint32(4, 36 + pcm.length, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  headerView.setUint32(16, 16, true);
  headerView.setUint16(20, 1, true);
  headerView.setUint16(22, 1, true);
  headerView.setUint32(24, sampleRate, true);
  headerView.setUint32(28, sampleRate * 2, true);
  headerView.setUint16(32, 2, true);
  headerView.setUint16(34, 16, true);
  writeAscii(36, "data");
  headerView.setUint32(40, pcm.length, true);

  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  return wav;
};

const strongestBandIndex = (bands: number[]) => bands.reduce((bestIndex, value, index) => (
  value > (bands[bestIndex] ?? 0) ? index : bestIndex
), 0);

const analysis = analyzeGeneratedWavAudio(createTestWav(), { fps: 10, bandCount: 8 });
const defaultAnalysis = analyzeGeneratedWavAudio(createTestWav());

assert.ok(analysis, "Generated WAV audio should produce analysis.");
assert.equal(defaultAnalysis?.fps, 60);
assert.equal(defaultAnalysis?.bands[0]?.length, 52);
assert.equal(analysis?.fps, 10);
assert.equal(analysis?.bands[0]?.length, 8);
assert.ok((analysis?.levels.length || 0) >= 10);
assert.ok(Math.max(...(analysis?.levels || [])) <= 1);
assert.ok(Math.min(...(analysis?.levels || [])) >= 0);
assert.ok(
  (analysis?.levels.at(-1) || 0) > (analysis?.levels[0] || 0),
  "Analysis should reflect the louder second half of the test audio.",
);
assert.notEqual(
  strongestBandIndex(analysis?.bands[2] || []),
  strongestBandIndex(analysis?.bands.at(-2) || []),
  "Analysis should produce real frequency bands, not time-sliced RMS chunks.",
);

console.log("audio-analysis tests passed");
