import type { VisualizerAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { VisualizerFormatRenderer } from "./render";
import { validateVisualizerScene } from "./validate";

export const visualizerFormatModule: AdFormatModule<"visualizer", VisualizerAdScene> = {
  id: "visualizer",
  label: "Audio visualizer",
  defaultSlots: ["headline", "visualizer", "captions"],
  RenderComponent: VisualizerFormatRenderer,
  validate: validateVisualizerScene,
};
