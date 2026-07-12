import type { CSSProperties } from "react";
import type { StaticAdLayer, StaticPackageAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const geometryStyle = (
  layer: StaticAdLayer,
  canvas: { width: number; height: number },
): CSSProperties => ({
  position: "absolute",
  left: `${(layer.x / canvas.width) * 100}%`,
  top: `${(layer.y / canvas.height) * 100}%`,
  width: `${(layer.width / canvas.width) * 100}%`,
  height: `${(layer.height / canvas.height) * 100}%`,
  opacity: layer.opacity,
  transform: `rotate(${layer.rotation}deg)`,
  transformOrigin: "center",
  zIndex: layer.zIndex,
});

function StaticLayer({
  layer,
  canvas,
}: {
  layer: StaticAdLayer;
  canvas: { width: number; height: number };
}) {
  if (!layer.visible) return null;
  const style = geometryStyle(layer, canvas);
  const editorMetadata = {
    "data-static-layer-id": layer.id,
    "data-static-layer-type": layer.type,
    "data-static-layer-locked": layer.locked ? "true" : "false",
  };

  if (layer.type === "text") {
    return (
      <div
        {...editorMetadata}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          color: layer.color,
          fontFamily: layer.fontFamily,
          fontSize: `${(layer.fontSize / canvas.width) * 100}cqw`,
          fontWeight: layer.fontWeight,
          lineHeight: layer.lineHeight,
          textAlign: layer.textAlign,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          overflowWrap: "anywhere",
        }}
      >
        <span style={{ width: "100%" }}>{layer.text}</span>
      </div>
    );
  }

  if (layer.type === "image") {
    return (
      <div {...editorMetadata} style={{ ...style, overflow: "hidden", borderRadius: `${(layer.borderRadius / canvas.width) * 100}cqw` }}>
        <img alt={layer.alt} draggable={false} src={layer.src} style={{ width: "100%", height: "100%", display: "block", objectFit: layer.objectFit }} />
      </div>
    );
  }

  if (layer.type === "shape") {
    return (
      <div
        {...editorMetadata}
        style={{
          ...style,
          backgroundColor: layer.fill,
          borderColor: layer.borderColor,
          borderStyle: layer.borderWidth > 0 ? "solid" : "none",
          borderWidth: `${(layer.borderWidth / canvas.width) * 100}cqw`,
          borderRadius: layer.shape === "ellipse" ? "50%" : `${(layer.borderRadius / canvas.width) * 100}cqw`,
        }}
      />
    );
  }

  return (
    <div {...editorMetadata} style={style}>
      {layer.children.map((child) => (
        <StaticLayer key={child.id} layer={child} canvas={{ width: layer.width, height: layer.height }} />
      ))}
    </div>
  );
}

export function StaticPackageFormatRenderer({ scene }: FormatRenderProps<StaticPackageAdScene>) {
  const canvas = scene.layout.canvas;

  return (
    <div
      data-format="static-package"
      data-static-package-canvas="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        containerType: "inline-size",
        backgroundColor: canvas.backgroundColor,
      }}
    >
      {[...scene.layout.layers]
        .sort((left, right) => left.zIndex - right.zIndex)
        .map((layer) => <StaticLayer key={layer.id} layer={layer} canvas={canvas} />)}
    </div>
  );
}
