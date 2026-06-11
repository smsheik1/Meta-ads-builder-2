import type { AdSceneAudioAnalysis } from "../scene/types";

export const AUDIO_ANALYSIS_SAMPLE_RATE = 16000;
const defaultFps = 60;
const defaultBandCount = 52;
const maxAnalysisSeconds = 45;

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

const percentile = (values: number[], amount: number) => {
  if (values.length === 0) return 0;
  return values[Math.min(values.length - 1, Math.max(0, Math.floor(values.length * amount)))] || 0;
};

const readAscii = (bytes: Uint8Array, offset: number, length: number) => (
  Array.from(bytes.slice(offset, offset + length)).map((char) => String.fromCharCode(char)).join("")
);

const readUint16 = (bytes: Uint8Array, offset: number) => (
  new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true)
);

const readUint32 = (bytes: Uint8Array, offset: number) => (
  new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true)
);

const findWavChunks = (bytes: Uint8Array) => {
  if (bytes.length < 44 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WAVE") {
    return null;
  }

  let cursor = 12;
  let format: {
    audioFormat: number;
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
  } | null = null;
  let data: { offset: number; size: number } | null = null;

  while (cursor + 8 <= bytes.length) {
    const id = readAscii(bytes, cursor, 4);
    const size = readUint32(bytes, cursor + 4);
    const offset = cursor + 8;

    if (id === "fmt " && offset + 16 <= bytes.length) {
      format = {
        audioFormat: readUint16(bytes, offset),
        channels: readUint16(bytes, offset + 2),
        sampleRate: readUint32(bytes, offset + 4),
        bitsPerSample: readUint16(bytes, offset + 14),
      };
    }

    if (id === "data") {
      data = {
        offset,
        size: Math.min(size, bytes.length - offset),
      };
    }

    cursor = offset + size + (size % 2);
    if (format && data) break;
  }

  if (!format || !data) return null;
  return { format, data };
};

const readPcmSample = (
  bytes: Uint8Array,
  sampleIndex: number,
  channel: number,
  channels: number,
  bitsPerSample: number,
  dataOffset: number,
) => {
  const bytesPerSample = bitsPerSample / 8;
  const offset = dataOffset + ((sampleIndex * channels + channel) * bytesPerSample);
  if (offset + bytesPerSample > bytes.length) return 0;

  if (bitsPerSample === 16) {
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getInt16(0, true) / 32768;
  }

  if (bitsPerSample === 8) {
    return ((bytes[offset] ?? 128) - 128) / 128;
  }

  return 0;
};

const readMonoSample = (
  bytes: Uint8Array,
  sampleIndex: number,
  channels: number,
  bitsPerSample: number,
  dataOffset: number,
) => {
  let sum = 0;
  for (let channel = 0; channel < channels; channel += 1) {
    sum += readPcmSample(bytes, sampleIndex, channel, channels, bitsPerSample, dataOffset);
  }
  return sum / Math.max(1, channels);
};

export const analyzeResampledMonoAudio = (
  samples: Float32Array,
  durationSeconds: number,
  {
    fps = defaultFps,
    bandCount = defaultBandCount,
  }: {
    fps?: number;
    bandCount?: number;
  } = {},
): AdSceneAudioAnalysis => {
  const safeDurationSeconds = Math.max(0.001, Math.min(maxAnalysisSeconds, durationSeconds));
  const frameCount = Math.max(1, Math.ceil(safeDurationSeconds * fps));
  const sums = new Array(frameCount).fill(0);
  const counts = new Array(frameCount).fill(0);

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const frameIndex = Math.min(frameCount - 1, Math.floor((sampleIndex / AUDIO_ANALYSIS_SAMPLE_RATE) * fps));
    const sample = samples[sampleIndex] || 0;
    sums[frameIndex] += sample * sample;
    counts[frameIndex] += 1;
  }

  const rms = sums.map((sum, index) => Math.sqrt(sum / Math.max(1, counts[index])));
  const sortedRms = [...rms].sort((a, b) => a - b);
  const noiseFloor = percentile(sortedRms, 0.12);
  const peak = percentile(sortedRms, 0.96) || Math.max(...rms, 0.001);
  const dynamicRange = Math.max(0.001, peak - noiseFloor);

  let previousLevel = 0;
  const levels = rms.map((value) => {
    const gated = Math.max(0, value - noiseFloor);
    const linear = Math.min(1, gated / dynamicRange);
    const compressed = Math.pow(linear, 0.55);
    const blend = compressed >= previousLevel ? 0.56 : 0.24;
    previousLevel += (compressed - previousLevel) * blend;
    return Number(clamp01(previousLevel).toFixed(4));
  });

  const safeBandCount = Math.max(1, bandCount);
  const fftSize = 256;
  const windowValues = Array.from(
    { length: fftSize },
    (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, fftSize - 1)),
  );
  const rawBands: number[][] = Array.from({ length: frameCount }, () => new Array(safeBandCount).fill(0));
  const flatBands: number[] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const centerSample = Math.floor((frameIndex / fps) * AUDIO_ANALYSIS_SAMPLE_RATE);
    const startSample = centerSample - Math.floor(fftSize / 2);

    for (let bandIndex = 0; bandIndex < safeBandCount; bandIndex += 1) {
      const fftBin = bandIndex + 1;
      const coeff = 2 * Math.cos((2 * Math.PI * fftBin) / fftSize);
      let s1 = 0;
      let s2 = 0;

      for (let sampleOffset = 0; sampleOffset < fftSize; sampleOffset += 1) {
        const sample = (samples[startSample + sampleOffset] || 0) * windowValues[sampleOffset];
        const s0 = sample + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
      }

      const power = Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
      const magnitude = Math.sqrt(power) / fftSize;
      rawBands[frameIndex][bandIndex] = magnitude;
      flatBands.push(magnitude);
    }
  }

  const sortedBands = flatBands.sort((a, b) => a - b);
  const bandFloor = percentile(sortedBands, 0.1);
  const bandPeak = Math.max(bandFloor + 0.0001, percentile(sortedBands, 0.965));
  const bandRange = bandPeak - bandFloor;
  const previousBands = new Array(safeBandCount).fill(0);
  const bands = rawBands.map((frameBands, frameIndex) => (
    frameBands.map((value, bandIndex) => {
      const rawFrameLevel = Math.min(1, Math.max(0, (rms[frameIndex] - noiseFloor) / dynamicRange));
      const gate = Math.pow(rawFrameLevel, 0.35);
      const normalizedBand = Math.min(1, Math.max(0, (value - bandFloor) / bandRange));
      const compressed = Math.pow(normalizedBand, 0.55) * gate;
      const previousBand = previousBands[bandIndex] ?? 0;
      const blend = compressed >= previousBand ? 0.20 : 0.11;
      const smoothedBand = previousBand + (compressed - previousBand) * blend;
      previousBands[bandIndex] = smoothedBand;
      return Number(clamp01(smoothedBand).toFixed(4));
    })
  ));

  return { fps, levels, bands };
};

export const analyzeGeneratedWavAudio = (
  bytes: Uint8Array,
  {
    fps = defaultFps,
    bandCount = defaultBandCount,
  }: {
    fps?: number;
    bandCount?: number;
  } = {},
): AdSceneAudioAnalysis | null => {
  const chunks = findWavChunks(bytes);
  if (!chunks) return null;

  const { format, data } = chunks;
  if (format.audioFormat !== 1 || (format.bitsPerSample !== 16 && format.bitsPerSample !== 8)) return null;
  if (!format.sampleRate || !format.channels || !data.size) return null;

  const bytesPerFrame = format.channels * (format.bitsPerSample / 8);
  const sourceSampleCount = Math.floor(data.size / Math.max(1, bytesPerFrame));
  const durationSeconds = Math.min(maxAnalysisSeconds, sourceSampleCount / format.sampleRate);
  const resampledCount = Math.max(1, Math.ceil(durationSeconds * AUDIO_ANALYSIS_SAMPLE_RATE));
  const samples = new Float32Array(resampledCount);

  for (let index = 0; index < resampledCount; index += 1) {
    const sourceIndex = Math.min(
      sourceSampleCount - 1,
      Math.max(0, Math.floor(index * (format.sampleRate / AUDIO_ANALYSIS_SAMPLE_RATE))),
    );
    samples[index] = readMonoSample(
      bytes,
      sourceIndex,
      format.channels,
      format.bitsPerSample,
      data.offset,
    );
  }

  return analyzeResampledMonoAudio(samples, durationSeconds, { fps, bandCount });
};
