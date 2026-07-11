import type { StaticPackageAdScene } from "../../scene/types";
import type { AdFormatModule } from "../types";
import { StaticPackageFormatRenderer } from "./render";
import { staticPackageEditorSchema } from "./schema";
import { validateStaticPackageScene } from "./validate";

export const staticPackageFormatModule: AdFormatModule<"static-package", StaticPackageAdScene> = {
  id: "static-package",
  label: "Static package",
  defaultSlots: ["headline"],
  editorSchema: staticPackageEditorSchema,
  RenderComponent: StaticPackageFormatRenderer,
  validate: validateStaticPackageScene,
};
