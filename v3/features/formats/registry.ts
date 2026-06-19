import type { AdFormatId } from "../scene/types";
import type { AdFormatModule } from "./types";
import { memeFormatModule } from "./meme";
import { jingleFormatModule } from "./jingle";
import { videoMemeFormatModule } from "./video-meme";
import { textMessageFormatModule } from "./text-message";
import { brainrotFormatModule } from "./brainrot";
import { visualizerFormatModule } from "./visualizer";
import { wereSorryFormatModule } from "./were-sorry";

export type AnyAdFormatModule = AdFormatModule<string, any>;

export const createFormatRegistry = <TModules extends Record<string, AnyAdFormatModule>>(modules: TModules) => modules;

export const formatRegistry = createFormatRegistry({
  visualizer: visualizerFormatModule,
  meme: memeFormatModule,
  "were-sorry": wereSorryFormatModule,
  "video-meme": videoMemeFormatModule,
  jingle: jingleFormatModule,
  "text-message": textMessageFormatModule,
  brainrot: brainrotFormatModule,
} satisfies Record<AdFormatId, AnyAdFormatModule>);

export const getFormatModuleFromRegistry = <
  TModules extends Record<string, AnyAdFormatModule>,
  TFormat extends keyof TModules & string,
>(
  registry: TModules,
  format: TFormat,
): TModules[TFormat] => {
  const module = registry[format];
  if (!module) throw new Error(`Unknown ad format: ${format}`);
  return module;
};

export const getFormatModule = (format: AdFormatId): AdFormatModule => {
  return getFormatModuleFromRegistry(formatRegistry, format) as AdFormatModule;
};
