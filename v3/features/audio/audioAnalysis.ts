import type { AdSceneAudioAnalysis } from "../scene/types";

const defaultFps = 30;
const defaultBandCount = 24;
const maxAnalysisSeconds = 45;

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

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

const computeRms = (
  bytes: Uint8Array,
  startSample: number,
  endSample: number,
  channels: number,
  bitsPerSample: number,
  dataOffset: number,
) => {
  const safeEnd = Math.max(startSample + 1, endSample);
  let sum = 0;
  let count = 0;

  for (let sampleIndex = startSample; sampleIndex < safeEnd; sampleIndex += 1) {
    const sample = readMonoSample(bytes, sampleIndex, channels, bitsPerSample, dataOffset);
    sum += sample * sample;
    count += 1;
  }

  return Math.sqrt(sum / Math.max(1, count));
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
  const sampleCount = Math.floor(data.size / Math.max(1, bytesPerFrame));
  const durationSeconds = Math.min(maxAnalysisSeconds, sampleCount / format.sampleRate);
  const frameCount = Math.max(1, Math.ceil(durationSeconds * fps));
  const samplesPerFrame = Math.max(1, Math.floor(format.sampleRate / fps));
  const rawLevels: number[] = [];
  const rawBands: number[][] = [];

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = Math.min(sampleCount - 1, frame * samplesPerFrame);
    const end = Math.min(sampleCount, start + samplesPerFrame);
    const level = computeRms(bytes, start, end, format.channels, format.bitsPerSample, data.offset);
    rawLevels.push(level);

    rawBands.push(Array.from({ length: bandCount }).map((_, bandIndex) => {
      const bandStart = start + Math.floor((bandIndex / bandCount) * Math.max(1, end - start));
      const bandEnd = start + Math.floor(((bandIndex + 1) / bandCount) * Math.max(1, end - start));
      return computeRms(bytes, bandStart, bandEnd, format.channels, format.bitsPerSample, data.offset);
    }));
  }

  const peak = Math.max(0.0001, ...rawLevels, ...rawBands.flat());
  let smoothed = 0;
  const levels = rawLevels.map((value) => {
    const normalized = Math.pow(clamp01(value / peak), 0.72);
    const coefficient = normalized > smoothed ? 0.65 : 0.24;
    smoothed += (normalized - smoothed) * coefficient;
    return Number(clamp01(smoothed).toFixed(4));
  });
  const bands = rawBands.map((frameBands, frameIndex) => (
    frameBands.map((value, bandIndex) => {
      const normalized = Math.pow(clamp01(value / peak), 0.68);
      const shape = 0.72 + Math.sin((bandIndex / Math.max(1, bandCount - 1)) * Math.PI) * 0.28;
      const anchored = normalized * 0.74 + (levels[frameIndex] ?? 0) * 0.26;
      return Number(clamp01(anchored * shape).toFixed(4));
    })
  ));

  return { fps, levels, bands };
};
