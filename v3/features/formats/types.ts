import type { ComponentType } from "react";
import type { AdFormatId, AdScene, AdSceneBase, AdSceneStyleBase } from "../scene/types";

export type RenderMode = "preview" | "poster" | "video";
export type RenderMotionMode = "auto" | "idle" | "audio";
export type RenderFlashRole = "headline" | "visualizer" | "captions";
export type RenderFlashState = {
  key: string;
  roles: RenderFlashRole[];
};

export type FormatRenderProps<TScene extends AdSceneBase<string, AdSceneStyleBase, { preset: string }> = AdScene> = {
  scene: TScene;
  mode: RenderMode;
  timeSeconds?: number;
  motionMode?: RenderMotionMode;
  rerollFlash?: RenderFlashState | null;
};

export type FormatValidationResult = {
  valid: boolean;
  errors: string[];
};

export type AdFormatModule<
  TFormat extends string = AdFormatId,
  TScene extends AdSceneBase<string, AdSceneStyleBase, { preset: string }> = AdScene,
> = {
  id: TFormat;
  label: string;
  defaultSlots: readonly RenderFlashRole[];
  RenderComponent: ComponentType<FormatRenderProps<TScene>>;
  validate(scene: TScene): FormatValidationResult;
};
