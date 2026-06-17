import type { CSSProperties } from "react";
import { getFormatModule } from "../formats/registry";
import type { RenderFlashState, RenderMode, RenderMotionMode } from "../formats/types";
import type { AdScene } from "../scene/types";
import { WIGGLY_FONT_FACE_CSS } from "./fontStack";

export type AdRenderSurfaceProps = {
  scene: AdScene;
  mode?: RenderMode;
  motionMode?: RenderMotionMode;
  rerollFlash?: RenderFlashState | null;
  timeSeconds?: number;
  fontFaceCss?: string;
  className?: string;
  style?: CSSProperties;
};

export function AdRenderSurface({
  scene,
  mode = "preview",
  motionMode = "auto",
  rerollFlash = null,
  timeSeconds = 0,
  fontFaceCss = WIGGLY_FONT_FACE_CSS,
  className,
  style,
}: AdRenderSurfaceProps) {
  const formatModule = getFormatModule(scene.format);
  const validation = formatModule.validate(scene);
  if (!validation.valid) {
    throw new Error(`Invalid ${scene.format} scene: ${validation.errors.join(" ")}`);
  }

  const FormatRenderer = formatModule.RenderComponent;

  return (
    <div
      className={className}
      data-render-surface="ad"
      data-format={scene.format}
      style={{
        width: "100%",
        height: "100%",
        containerType: "inline-size",
        ...style,
      }}
    >
      <style>{fontFaceCss}</style>
      <FormatRenderer
        scene={scene}
        mode={mode}
        motionMode={motionMode}
        rerollFlash={rerollFlash}
        timeSeconds={timeSeconds}
      />
    </div>
  );
}
