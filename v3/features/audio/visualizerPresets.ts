import type { AdSceneAudioAnalysis, AdSceneVisualizerStyle } from "../scene/types";

export type VoiceVisualizerPresetId = "balanced-voice" | "quiet-call-boost" | "loud-call-control" | "ai-voice-clean";

export type VoiceVisualizerPresetDecision = {
  presetId: VoiceVisualizerPresetId;
  reason: string;
  rms: number;
  firstFiveRms: number;
  peak: number;
  crest: number;
};

type VoiceVisualizerPreset = Pick<
  AdSceneVisualizerStyle,
  "gain" | "compression" | "floor" | "ceiling" | "curve" | "bandFocus"
>;

export const voiceVisualizerBaseline = {
  ceiling: 0.86,
  curve: "sqrt",
  bandFocus: "voice",
} satisfies Pick<AdSceneVisualizerStyle, "ceiling" | "curve" | "bandFocus">;

export const voiceVisualizerPresets: Record<VoiceVisualizerPresetId, VoiceVisualizerPreset> = {
  "balanced-voice": {
    ...voiceVisualizerBaseline,
    gain: 1.7,
    compression: 3,
    floor: 0.08,
  },
  "quiet-call-boost": {
    ...voiceVisualizerBaseline,
    gain: 2.25,
    compression: 2.4,
    floor: 0.12,
  },
  "loud-call-control": {
    ...voiceVisualizerBaseline,
    gain: 1.15,
    compression: 5,
    floor: 0.06,
  },
  "ai-voice-clean": {
    ...voiceVisualizerBaseline,
    gain: 1.55,
    compression: 3.6,
    floor: 0.1,
  },
};

export const getVoiceVisualizerPreset = (presetId: VoiceVisualizerPresetId) => (
  voiceVisualizerPresets[presetId]
);

export const applyVoiceVisualizerPreset = (
  visualizer: AdSceneVisualizerStyle,
  presetId: VoiceVisualizerPresetId,
): AdSceneVisualizerStyle => ({
  ...visualizer,
  ...getVoiceVisualizerPreset(presetId),
});

const mean = (values: number[]) => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
);

const rms = (values: number[]) => (
  values.length ? Math.sqrt(values.reduce((sum, value) => sum + (value * value), 0) / values.length) : 0
);

export const explainVoiceVisualizerPresetFromAnalysis = (
  analysis: AdSceneAudioAnalysis | null | undefined,
  durationMs: number,
): VoiceVisualizerPresetDecision => {
  const levels = analysis?.levels || [];
  const fps = analysis?.fps || 30;
  const firstFiveFrameCount = Math.max(1, Math.min(levels.length, Math.round(fps * 5)));
  const levelRms = rms(levels);
  const firstFiveRms = rms(levels.slice(0, firstFiveFrameCount));
  const bandPeak = Math.max(0, ...(analysis?.bands || []).flat());
  const peak = Math.max(0, ...levels, bandPeak);
  const crest = peak / Math.max(0.0001, Math.max(levelRms, firstFiveRms));

  if (!levels.length || durationMs <= 0) {
    return {
      presetId: "balanced-voice",
      reason: "no-analysis",
      rms: levelRms,
      firstFiveRms,
      peak,
      crest,
    };
  }

  if (levelRms < 0.18 || firstFiveRms < 0.16) {
    return {
      presetId: "quiet-call-boost",
      reason: "low-normalized-rms",
      rms: levelRms,
      firstFiveRms,
      peak,
      crest,
    };
  }

  if (levelRms > 0.74 || (peak > 0.94 && levelRms > 0.56) || (crest > 3.8 && levelRms > 0.52)) {
    return {
      presetId: "loud-call-control",
      reason: "hot-normalized-levels",
      rms: levelRms,
      firstFiveRms,
      peak,
      crest,
    };
  }

  if (crest < 1.75 && mean(levels) > 0.24 && mean(levels) < 0.62) {
    return {
      presetId: "ai-voice-clean",
      reason: "steady-clean-voice",
      rms: levelRms,
      firstFiveRms,
      peak,
      crest,
    };
  }

  return {
    presetId: "balanced-voice",
    reason: "balanced-default",
    rms: levelRms,
    firstFiveRms,
    peak,
    crest,
  };
};
