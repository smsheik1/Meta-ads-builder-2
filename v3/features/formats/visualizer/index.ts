import type { AdFormatModule } from "../types";
import { VisualizerFormatRenderer } from "./render";
import { validateVisualizerScene } from "./validate";

export const visualizerFormatModule: AdFormatModule = {
  id: "visualizer",
  label: "Audio visualizer",
  RenderComponent: VisualizerFormatRenderer,
  validate: validateVisualizerScene,
};
