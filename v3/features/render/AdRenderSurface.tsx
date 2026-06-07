import type { CSSProperties } from "react";
import { getFormatModule } from "../formats/registry";
import type { RenderMode } from "../formats/types";
import type { AdScene } from "../scene/types";

export type AdRenderSurfaceProps = {
  scene: AdScene;
  mode?: RenderMode;
  timeSeconds?: number;
  className?: string;
  style?: CSSProperties;
};

export function AdRenderSurface({
  scene,
  mode = "preview",
  timeSeconds = 0,
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
        containerType: "inline-size",
        ...style,
      }}
    >
      <FormatRenderer scene={scene} mode={mode} timeSeconds={timeSeconds} />
    </div>
  );
}
