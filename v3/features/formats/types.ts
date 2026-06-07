import type { ComponentType } from "react";
import type { AdFormatId, AdScene } from "../scene/types";

export type RenderMode = "preview" | "poster" | "video";

export type FormatRenderProps = {
  scene: AdScene;
  mode: RenderMode;
  timeSeconds?: number;
};

export type FormatValidationResult = {
  valid: boolean;
  errors: string[];
};

export type AdFormatModule = {
  id: AdFormatId;
  label: string;
  RenderComponent: ComponentType<FormatRenderProps>;
  validate(scene: AdScene): FormatValidationResult;
};
