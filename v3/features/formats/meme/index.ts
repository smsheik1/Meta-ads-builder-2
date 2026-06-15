import type { MemeAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { MemeFormatRenderer } from "./render";
import { memeEditorSchema } from "./schema";
import { validateMemeScene } from "./validate";

export const memeFormatModule: AdFormatModule<"meme", MemeAdScene> = {
  id: "meme",
  label: "Meme",
  defaultSlots: ["headline"],
  editorSchema: memeEditorSchema,
  RenderComponent: MemeFormatRenderer,
  validate: validateMemeScene,
};
