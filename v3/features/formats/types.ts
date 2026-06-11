import type { ComponentType } from "react";
import type { AdFormatId, AdScene, AdSceneBase, AdSceneStyleBase } from "../scene/types";

export type RenderMode = "preview" | "poster" | "video";
export type RenderMotionMode = "auto" | "idle" | "audio";
export type RenderFlashRole = "headline" | "visualizer" | "captions";
export type RenderSelectableSlot = RenderFlashRole;
export type FormatSceneLockKey = "headline" | "subheadline" | "style" | "captionColor" | "audio";
export type FormatSceneLocks = Record<FormatSceneLockKey, boolean>;
export type RenderFlashState = {
  key: string;
  roles: RenderFlashRole[];
};

export type FormatSelectableSlotDefinition = {
  slot: RenderSelectableSlot;
  label: string;
  lockKey: FormatSceneLockKey;
  top: number;
  left: number;
  width: number;
  height: number;
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

export type FormatApplySlotRerollArgs<TScene extends AdSceneBase<string, AdSceneStyleBase, { preset: string }>> = {
  selectedSlot: RenderSelectableSlot | null;
  currentScene: TScene;
  nextScene: TScene;
  allScenes: TScene[];
  locks: FormatSceneLocks;
  fallbackColors: string[];
  offset: number;
  pickDistinctColor: (currentColor: string, colors: string[], offset: number) => string;
};

export type FormatInteractionConfig<TScene extends AdSceneBase<string, AdSceneStyleBase, { preset: string }>> = {
  selectableSlots: readonly FormatSelectableSlotDefinition[];
  getSlotColor(scene: TScene, slot: RenderSelectableSlot): string;
  applySlotColor(scene: TScene, slot: RenderSelectableSlot, color: string): TScene;
  getBackgroundColor(scene: TScene): string;
  applyBackgroundColor(scene: TScene, color: string): TScene;
  getRerollLocksForSlot(slot: RenderSelectableSlot, locks: FormatSceneLocks): FormatSceneLocks;
  applySlotReroll(args: FormatApplySlotRerollArgs<TScene>): TScene;
};

export type AdFormatModule<
  TFormat extends string = AdFormatId,
  TScene extends AdSceneBase<string, AdSceneStyleBase, { preset: string }> = AdScene,
> = {
  id: TFormat;
  label: string;
  defaultSlots: readonly RenderSelectableSlot[];
  interaction: FormatInteractionConfig<TScene>;
  RenderComponent: ComponentType<FormatRenderProps<TScene>>;
  validate(scene: TScene): FormatValidationResult;
};
