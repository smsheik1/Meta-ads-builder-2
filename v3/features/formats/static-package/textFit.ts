import type { StaticTextLayer } from "../../scene/types";

export function fitStaticTextLayer(layer: StaticTextLayer, text: string): StaticTextLayer {
  let fontSize = layer.fontSize;
  const longestWord = Math.max(1, ...text.trim().split(/\s+/).map((word) => word.length));
  while (fontSize > 10) {
    const charactersPerLine = Math.max(1, Math.floor(layer.width / (fontSize * 0.72)));
    const lines = Math.max(1, Math.floor(layer.height / (fontSize * layer.lineHeight)));
    if (longestWord <= charactersPerLine && text.length <= charactersPerLine * lines) break;
    fontSize -= 2;
  }
  return { ...layer, text, fontSize };
}
