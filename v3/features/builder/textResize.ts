import type { StaticTextLayer } from "../scene/types";

const MIN_TEXT_SIZE = 8;

const rounded = (value: number) => Math.round(value * 100) / 100;

export function scaleTextLayer(
  layer: StaticTextLayer,
  scale: number,
): Pick<StaticTextLayer, "width" | "height" | "fontSize"> {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  return {
    width: Math.max(MIN_TEXT_SIZE, rounded(layer.width * safeScale)),
    height: Math.max(MIN_TEXT_SIZE, rounded(layer.height * safeScale)),
    fontSize: Math.max(MIN_TEXT_SIZE, rounded(layer.fontSize * safeScale)),
  };
}

export function scaleTextLayerToValue(
  layer: StaticTextLayer,
  property: "width" | "height" | "fontSize",
  value: number,
): Pick<StaticTextLayer, "width" | "height" | "fontSize"> {
  const currentValue = layer[property];
  const nextValue = Math.max(MIN_TEXT_SIZE, value);
  return scaleTextLayer(layer, currentValue > 0 ? nextValue / currentValue : 1);
}

export function isCornerResize(direction: number[]) {
  return direction[0] !== 0 && direction[1] !== 0;
}
