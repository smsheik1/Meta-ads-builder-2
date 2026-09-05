import type { LegoMusicVideoAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { JingleFormatRenderer } from "../jingle/render";
import { validateLegoMusicVideoScene } from "./contract";

export const legoMusicVideoFormatModule: AdFormatModule<"lego-music-video", LegoMusicVideoAdScene> = {
  id: "lego-music-video",
  label: "Lego Music Video",
  defaultSlots: ["headline"],
  editorSchema: { text: [], style: [], format: [] },
  RenderComponent: JingleFormatRenderer,
  validate: (scene) => validateLegoMusicVideoScene(scene, { ready: true }),
};
