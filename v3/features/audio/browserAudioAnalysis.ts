import {
  analyzeResampledMonoAudio,
  AUDIO_ANALYSIS_SAMPLE_RATE,
} from "./audioAnalysis";
import type { AdSceneAudioAnalysis } from "../scene/types";

export const isStaleAudioAnalysis = (analysis: AdSceneAudioAnalysis | null | undefined) => (
  !analysis?.levels.length
  || analysis.fps < 60
  || (analysis.bands[0]?.length || 0) < 40
);

const getMixedSample = (audioBuffer: AudioBuffer, sourceIndex: number) => {
  const safeIndex = Math.min(audioBuffer.length - 1, Math.max(0, sourceIndex));
  let sum = 0;

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    sum += audioBuffer.getChannelData(channel)[safeIndex] || 0;
  }

  return sum / Math.max(1, audioBuffer.numberOfChannels);
};

export const precomputeBrowserAudioAnalysisFromUrl = async (
  url: string,
  {
    durationSeconds,
  }: {
    durationSeconds: number;
  },
) => {
  if (typeof window === "undefined") {
    throw new Error("Browser audio analysis is only available in the browser.");
  }

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Audio analysis is not supported in this browser.");
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioCtx();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const safeDurationSeconds = Math.max(0.001, Math.min(durationSeconds, audioBuffer.duration || durationSeconds));
    const sampleCount = Math.max(1, Math.ceil(safeDurationSeconds * AUDIO_ANALYSIS_SAMPLE_RATE));
    const samples = new Float32Array(sampleCount);
    const ratio = audioBuffer.sampleRate / AUDIO_ANALYSIS_SAMPLE_RATE;

    for (let index = 0; index < sampleCount; index += 1) {
      samples[index] = getMixedSample(audioBuffer, Math.floor(index * ratio));
    }

    return analyzeResampledMonoAudio(samples, safeDurationSeconds);
  } finally {
    if (audioContext.state !== "closed") {
      await audioContext.close();
    }
  }
};
