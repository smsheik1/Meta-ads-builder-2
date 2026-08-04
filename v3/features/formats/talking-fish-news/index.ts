import type { TalkingFishNewsProofScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { TalkingFishNewsRenderer } from "./render";
import { talkingFishNewsEditorSchema } from "./schema";
import { validateTalkingFishNewsScene } from "./validate";

export const talkingFishNewsFormatModule: AdFormatModule<"talking-fish-news", TalkingFishNewsProofScene> = {
  id: "talking-fish-news",
  label: "Talking Fish News",
  defaultSlots: ["headline", "captions"],
  editorSchema: talkingFishNewsEditorSchema,
  RenderComponent: TalkingFishNewsRenderer,
  validate: validateTalkingFishNewsScene,
};
