import type { TextMessageAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { TextMessageFormatRenderer } from "./render";
import { textMessageEditorSchema } from "./schema";
import { validateTextMessageScene } from "./validate";

export const textMessageFormatModule: AdFormatModule<"text-message", TextMessageAdScene> = {
  id: "text-message",
  label: "iMessage Ad",
  defaultSlots: ["headline"],
  editorSchema: textMessageEditorSchema,
  RenderComponent: TextMessageFormatRenderer,
  validate: validateTextMessageScene,
};
