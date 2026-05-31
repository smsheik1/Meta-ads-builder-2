export type AudioAnalysisData = {
  fps: number;
  durationSeconds: number;
  smoothing: number;
  sourceKey: string;
  levels: number[];
  bands: number[][];
};

const ANALYSIS_SAMPLE_RATE = 16000;
export const AUDIO_ANALYSIS_FPS = 60;

const percentile = (values: number[], amount: number) => {
  if (values.length === 0) return 0;
  return values[Math.min(values.length - 1, Math.max(0, Math.floor(values.length * amount)))] || 0;
};

const getMixedSample = (audioBuffer: AudioBuffer, sourceIndex: number) => {
  const ratio = audioBuffer.sampleRate / ANALYSIS_SAMPLE_RATE;
  const sampleIndex = Math.min(audioBuffer.length - 1, Math.max(0, Math.floor(sourceIndex * ratio)));
  let sum = 0;
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    sum += audioBuffer.getChannelData(channel)[sampleIndex] || 0;
  }
  return sum / Math.max(1, audioBuffer.numberOfChannels);
};

export const analyzeAudioBuffer = (
  audioBuffer: AudioBuffer,
  options: {
    durationSeconds: number;
    smoothing?: number;
    attack?: number;
    release?: number;
    fps?: number;
    sourceKey: string;
  },
): AudioAnalysisData => {
  const fps = options.fps ?? AUDIO_ANALYSIS_FPS;
  const durationSeconds = Math.max(1, Math.min(options.durationSeconds, audioBuffer.duration || options.durationSeconds));
  const smoothing = options.smoothing ?? 0.8;
  const sampleCount = Math.max(1, Math.ceil(durationSeconds * ANALYSIS_SAMPLE_RATE));
  const samples = new Float32Array(sampleCount);

  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = getMixedSample(audioBuffer, index);
  }

  const frameCount = Math.max(1, Math.ceil(durationSeconds * fps));
  const sums = new Array(frameCount).fill(0);
  const counts = new Array(frameCount).fill(0);

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const frameIndex = Math.min(frameCount - 1, Math.floor((sampleIndex / ANALYSIS_SAMPLE_RATE) * fps));
    const sample = samples[sampleIndex];
    sums[frameIndex] += sample * sample;
    counts[frameIndex] += 1;
  }

  const rms = sums.map((sum, index) => Math.sqrt(sum / Math.max(1, counts[index])));
  const sorted = [...rms].sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.12)] || 0;
  const peak = sorted[Math.floor(sorted.length * 0.96)] || Math.max(...rms, 0.001);
  const dynamicRange = Math.max(0.001, peak - noiseFloor);
  const smoothingAmount = Math.min(0.7, Math.max(0.12, smoothing * 0.55));
  const attackAmount = typeof options.attack === 'number' ? Math.min(1, Math.max(0.05, options.attack)) : null;
  const releaseAmount = typeof options.release === 'number' ? Math.min(1, Math.max(0.02, options.release)) : null;

  let previous = 0;
  const levels = rms.map((value) => {
    const gated = Math.max(0, value - noiseFloor);
    const linear = Math.min(1, gated / dynamicRange);
    const compressed = Math.pow(linear, 0.55);
    const blend = compressed >= previous
      ? attackAmount ?? (1 - smoothingAmount)
      : releaseAmount ?? (1 - smoothingAmount);
    const smoothed = previous + (compressed - previous) * blend;
    previous = smoothed;
    return Number(smoothed.toFixed(4));
  });

  const fftSize = 256;
  const focusedBinCount = 52;
  const rawBands: number[][] = Array.from({ length: frameCount }, () => new Array(focusedBinCount).fill(0));
  const flatBands: number[] = [];
  const windowValues = Array.from(
    { length: fftSize },
    (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, fftSize - 1)),
  );

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const centerSample = Math.floor((frameIndex / fps) * ANALYSIS_SAMPLE_RATE);
    const startSample = centerSample - Math.floor(fftSize / 2);

    for (let binIndex = 0; binIndex < focusedBinCount; binIndex += 1) {
      const fftBin = binIndex + 1;
      const coeff = 2 * Math.cos((2 * Math.PI * fftBin) / fftSize);
      let s1 = 0;
      let s2 = 0;

      for (let sampleOffset = 0; sampleOffset < fftSize; sampleOffset += 1) {
        const sample = samples[startSample + sampleOffset] || 0;
        const s0 = sample * windowValues[sampleOffset] + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
      }

      const power = Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2);
      const magnitude = Math.sqrt(power) / fftSize;
      rawBands[frameIndex][binIndex] = magnitude;
      flatBands.push(magnitude);
    }
  }

  const sortedBands = flatBands.sort((a, b) => a - b);
  const bandFloor = percentile(sortedBands, 0.1);
  const bandPeak = Math.max(bandFloor + 0.0001, percentile(sortedBands, 0.965));
  const bandRange = bandPeak - bandFloor;
  const previousBands = new Array(focusedBinCount).fill(0);
  const bands = rawBands.map((frameBands, frameIndex) => {
    const rawFrameLevel = Math.min(1, Math.max(0, (rms[frameIndex] - noiseFloor) / dynamicRange));
    const gate = Math.pow(rawFrameLevel, 0.35);
    return frameBands.map((value, bandIndex) => {
      const normalizedBand = Math.min(1, Math.max(0, (value - bandFloor) / bandRange));
      const compressed = Math.pow(normalizedBand, 0.55) * gate;
      const previousBand = previousBands[bandIndex] ?? 0;
      const blend = compressed >= previousBand
        ? attackAmount ?? Math.max(0.14, 1 - smoothingAmount)
        : releaseAmount ?? Math.max(0.06, (1 - smoothingAmount) * 0.45);
      const smoothedBand = previousBand + (compressed - previousBand) * blend;
      previousBands[bandIndex] = smoothedBand;
      return Number(smoothedBand.toFixed(4));
    });
  });

  return {
    fps,
    durationSeconds,
    smoothing,
    sourceKey: options.sourceKey,
    levels,
    bands,
  };
};

export const precomputeAudioAnalysisFromUrl = async (
  url: string,
  options: {
    durationSeconds: number;
    smoothing?: number;
    attack?: number;
    release?: number;
    sourceKey?: string;
  },
) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Audio analysis is not supported in this browser.');
  }

  const audioContext = new AudioCtx();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return analyzeAudioBuffer(audioBuffer, {
      durationSeconds: options.durationSeconds,
      smoothing: options.smoothing,
      attack: options.attack,
      release: options.release,
      sourceKey: options.sourceKey || url,
    });
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
};
