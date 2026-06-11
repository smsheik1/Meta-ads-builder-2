import type { AdSceneVisualizerStyle } from "./types";
import { getVoiceVisualizerPreset } from "../audio/visualizerPresets";

const balancedVoicePreset = getVoiceVisualizerPreset("balanced-voice");

export const legacyCreateVisualizerStyle: AdSceneVisualizerStyle = {
  type: "waveform-strip",
  barCount: 24,
  sensitivity: 1.5,
  heightScale: 0.9,
  baseline: 4,
  ...balancedVoicePreset,
  mirror: false,
  splitSpeakers: false,
};
