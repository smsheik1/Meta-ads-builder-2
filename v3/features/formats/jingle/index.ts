import type { JingleAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { jingleEditorSchema } from "./schema";
import { JingleFormatRenderer } from "./render";
import { validateJingleScene } from "./validate";

export const jingleFormatModule: AdFormatModule<"jingle", JingleAdScene> = {
  id: "jingle",
  label: "Brand Jingle",
  defaultSlots: ["headline", "visualizer", "captions"],
  editorSchema: jingleEditorSchema,
  RenderComponent: JingleFormatRenderer,
  validate: validateJingleScene,
};
