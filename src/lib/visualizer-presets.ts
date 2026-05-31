import type { AdElement } from '../store';

export type VoiceVisualizerPresetId = 'balanced-voice' | 'quiet-call-boost' | 'loud-call-control' | 'ai-voice-clean';

export type AudioPresetStats = {
  duration: number;
  rms: number;
  firstFiveRms: number;
  peak: number;
};

export type VoiceVisualizerPresetDecision = {
  presetId: VoiceVisualizerPresetId;
  reason: string;
  rms: number;
  firstFiveRms: number;
  peak: number;
  crest: number;
};

export const VOICE_VISUALIZER_BASELINE = {
  visualizerCeiling: 0.86,
  visualizerRelease: 0.1,
  visualizerSmoothing: 0.78,
  visualizerCurve: 'sqrt',
  visualizerBandFocus: 'voice',
} satisfies Partial<AdElement>;

export const VOICE_VISUALIZER_PRESETS: Record<VoiceVisualizerPresetId, Partial<AdElement>> = {
  'balanced-voice': {
    ...VOICE_VISUALIZER_BASELINE,
    visualizerGain: 1.7,
    visualizerCompression: 3,
    visualizerFloor: 0.08,
    visualizerAttack: 0.45,
  },
  'quiet-call-boost': {
    ...VOICE_VISUALIZER_BASELINE,
    visualizerGain: 2.25,
    visualizerCompression: 2.4,
    visualizerFloor: 0.12,
    visualizerAttack: 0.55,
  },
  'loud-call-control': {
    ...VOICE_VISUALIZER_BASELINE,
    visualizerGain: 1.15,
    visualizerCompression: 5,
    visualizerFloor: 0.06,
    visualizerAttack: 0.35,
  },
  'ai-voice-clean': {
    ...VOICE_VISUALIZER_BASELINE,
    visualizerGain: 1.55,
    visualizerCompression: 3.6,
    visualizerFloor: 0.1,
    visualizerAttack: 0.4,
  },
};

export const getVoiceVisualizerPreset = (presetId: VoiceVisualizerPresetId) => VOICE_VISUALIZER_PRESETS[presetId];

export const explainVoiceVisualizerPreset = (stats: AudioPresetStats): VoiceVisualizerPresetDecision => {
  const rms = Math.max(stats.rms || 0, stats.firstFiveRms || 0);
  const firstFiveRms = stats.firstFiveRms || 0;
  const peak = stats.peak || 0;
  const crest = peak / Math.max(0.0001, rms);

  if (rms < 0.025 || firstFiveRms < 0.02) {
    return { presetId: 'quiet-call-boost', reason: 'low-rms', rms, firstFiveRms, peak, crest };
  }
  if (rms > 0.115 || (peak > 0.9 && rms > 0.075) || (crest > 18 && rms > 0.08)) {
    return { presetId: 'loud-call-control', reason: 'loud-or-clipping', rms, firstFiveRms, peak, crest };
  }
  if (crest < 5.5 && rms > 0.035 && rms < 0.1) {
    return { presetId: 'ai-voice-clean', reason: 'low-crest-clean-voice', rms, firstFiveRms, peak, crest };
  }
  return { presetId: 'balanced-voice', reason: 'balanced-default', rms, firstFiveRms, peak, crest };
};

export const pickVoiceVisualizerPreset = (stats: AudioPresetStats): VoiceVisualizerPresetId =>
  explainVoiceVisualizerPreset(stats).presetId;

export const VOICE_VISUALIZER_PRESET = {
  ...VOICE_VISUALIZER_BASELINE,
  visualizerGain: 1.7,
  visualizerCompression: 3,
  visualizerFloor: 0.08,
  visualizerAttack: 0.45,
} satisfies Partial<AdElement>;
