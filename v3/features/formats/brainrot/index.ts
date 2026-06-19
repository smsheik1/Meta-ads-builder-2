import type { BrainrotAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { BrainrotFormatRenderer } from "./render";
import { brainrotEditorSchema } from "./schema";
import { validateBrainrotScene } from "./validate";

export const brainrotFormatModule: AdFormatModule<"brainrot", BrainrotAdScene> = {
  id: "brainrot",
  label: "Minecraft Brainrot",
  defaultSlots: ["headline", "captions"],
  editorSchema: brainrotEditorSchema,
  RenderComponent: BrainrotFormatRenderer,
  validate: validateBrainrotScene,
};
