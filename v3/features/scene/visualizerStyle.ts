import type { AdSceneVisualizerStyle } from "./types";

export const legacyCreateVisualizerStyle: AdSceneVisualizerStyle = {
  type: "waveform-strip",
  barCount: 24,
  sensitivity: 1.5,
  heightScale: 0.9,
  baseline: 4,
  gain: 1.7,
  compression: 3,
  floor: 0.08,
  ceiling: 0.86,
  curve: "sqrt",
  bandFocus: "voice",
  mirror: false,
  splitSpeakers: false,
};
