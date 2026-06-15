import type { VisualizerAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { VisualizerFormatRenderer } from "./render";
import { visualizerEditorSchema } from "./schema";
import { validateVisualizerScene } from "./validate";

export const visualizerFormatModule: AdFormatModule<"visualizer", VisualizerAdScene> = {
  id: "visualizer",
  label: "Audio visualizer",
  defaultSlots: ["headline", "visualizer", "captions"],
  editorSchema: visualizerEditorSchema,
  RenderComponent: VisualizerFormatRenderer,
  validate: validateVisualizerScene,
};
