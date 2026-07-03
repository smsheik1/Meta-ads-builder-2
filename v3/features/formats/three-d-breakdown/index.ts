import type { ThreeDBreakdownAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { ThreeDBreakdownFormatRenderer } from "./render";
import { validateThreeDBreakdownScene } from "./validate";

export const threeDBreakdownFormatModule: AdFormatModule<"three-d-breakdown", ThreeDBreakdownAdScene> = {
  id: "three-d-breakdown",
  label: "3D Breakdown",
  defaultSlots: ["headline", "captions"],
  editorSchema: {
    text: [],
    style: [],
    format: [],
  },
  RenderComponent: ThreeDBreakdownFormatRenderer,
  validate: validateThreeDBreakdownScene,
};
