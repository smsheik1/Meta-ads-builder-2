import type { VideoMemeAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { VideoMemeFormatRenderer } from "./render";
import { videoMemeEditorSchema } from "./schema";
import { validateVideoMemeScene } from "./validate";

export const videoMemeFormatModule: AdFormatModule<"video-meme", VideoMemeAdScene> = {
  id: "video-meme",
  label: "Video Meme",
  defaultSlots: ["headline"],
  editorSchema: videoMemeEditorSchema,
  RenderComponent: VideoMemeFormatRenderer,
  validate: validateVideoMemeScene,
};
