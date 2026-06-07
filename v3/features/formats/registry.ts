import type { AdFormatId } from "../scene/types";
import type { AdFormatModule } from "./types";
import { visualizerFormatModule } from "./visualizer";

export const formatRegistry = {
  visualizer: visualizerFormatModule,
} satisfies Record<AdFormatId, AdFormatModule>;

export const getFormatModule = (format: AdFormatId) => {
  const module = formatRegistry[format];
  if (!module) throw new Error(`Unknown ad format: ${format}`);
  return module;
};
