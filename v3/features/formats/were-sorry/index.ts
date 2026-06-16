import type { WereSorryAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { WereSorryFormatRenderer } from "./render";
import { wereSorryEditorSchema } from "./schema";
import { validateWereSorryScene } from "./validate";

export const wereSorryFormatModule: AdFormatModule<"were-sorry", WereSorryAdScene> = {
  id: "were-sorry",
  label: "We're sorry",
  defaultSlots: ["headline"],
  editorSchema: wereSorryEditorSchema,
  RenderComponent: WereSorryFormatRenderer,
  validate: validateWereSorryScene,
};
