import type { ComponentType } from "react";
import type { AdSceneBase, AdSceneStyleBase, RenderableAdFormatId, RenderableAdScene } from "../scene/types";

export type RenderMode = "preview" | "poster" | "video";
export type RenderMotionMode = "auto" | "idle" | "audio";
export type RenderFlashRole = "headline" | "visualizer" | "captions";
export type RenderFlashState = {
  key: string;
  roles: RenderFlashRole[];
};

export type FormatRenderProps<TScene extends AdSceneBase<string, AdSceneStyleBase, { preset: string }> = RenderableAdScene> = {
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

export type FormatEditorOption = {
  label: string;
  value: string;
};

export type FormatTextEditorField = {
  id: string;
  label: string;
  kind: "text" | "textarea";
};

export type FormatStyleEditorField = {
  id: string;
  label: string;
  kind: "color";
};

export type FormatSpecificEditorField =
  | {
    id: string;
    label: string;
    kind: "select" | "preset";
    options: readonly FormatEditorOption[];
  }
  | {
    id: string;
    label: string;
    kind: "audio" | "captions";
  };

export type FormatEditorSchema = {
  text: readonly FormatTextEditorField[];
  style: readonly FormatStyleEditorField[];
  format: readonly FormatSpecificEditorField[];
};

export type AdFormatModule<
  TFormat extends string = RenderableAdFormatId,
  TScene extends AdSceneBase<string, AdSceneStyleBase, { preset: string }> = RenderableAdScene,
> = {
  id: TFormat;
  label: string;
  defaultSlots: readonly RenderFlashRole[];
  editorSchema: FormatEditorSchema;
  RenderComponent: ComponentType<FormatRenderProps<TScene>>;
  validate(scene: TScene): FormatValidationResult;
};
