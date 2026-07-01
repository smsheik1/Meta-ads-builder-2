import type { MotionStoryAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { MotionStoryFormatRenderer } from "./render";
import { validateMotionStoryScene } from "./validate";

export const motionStoryFormatModule: AdFormatModule<"motion-story", MotionStoryAdScene> = {
  id: "motion-story",
  label: "Motion Story",
  defaultSlots: ["headline"],
  editorSchema: {
    text: [],
    style: [],
    format: [],
  },
  RenderComponent: MotionStoryFormatRenderer,
  validate: validateMotionStoryScene,
};
