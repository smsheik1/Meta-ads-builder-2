import type { ComponentType } from "react";
import type { AdFormatId, AdScene } from "../scene/types";

export type RenderMode = "preview" | "poster" | "video";
export type RenderMotionMode = "auto" | "idle" | "audio";
export type RenderFlashRole = "headline" | "visualizer" | "captions";
export type RenderSelectableSlot = RenderFlashRole;
export type RenderFlashState = {
  key: string;
  roles: RenderFlashRole[];
};

export type FormatRenderProps = {
  scene: AdScene;
  mode: RenderMode;
  timeSeconds?: number;
  motionMode?: RenderMotionMode;
  rerollFlash?: RenderFlashState | null;
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
