import type { StaticAdLayer, StaticPackageAdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";

const isFiniteGeometry = (layer: StaticAdLayer) => (
  [layer.x, layer.y, layer.width, layer.height, layer.rotation, layer.opacity, layer.zIndex]
    .every(Number.isFinite)
);

export function validateStaticPackageScene(scene: StaticPackageAdScene): FormatValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  if (scene.format !== "static-package") errors.push("Static package scene format is invalid.");
  if (scene.layout.preset !== "static-package") errors.push("Static package layout preset is invalid.");
  if (!Number.isFinite(scene.layout.canvas.width) || scene.layout.canvas.width <= 0) errors.push("Canvas width must be positive.");
  if (!Number.isFinite(scene.layout.canvas.height) || scene.layout.canvas.height <= 0) errors.push("Canvas height must be positive.");

  const visit = (layers: StaticAdLayer[]) => {
    for (const layer of layers) {
      if (!layer.id.trim()) errors.push("Every static layer needs an id.");
      if (seenIds.has(layer.id)) errors.push(`Static layer id ${layer.id} is duplicated.`);
      seenIds.add(layer.id);
      if (!isFiniteGeometry(layer) || layer.width <= 0 || layer.height <= 0) {
        errors.push(`Static layer ${layer.id || "unknown"} has invalid geometry.`);
      }
      if (layer.opacity < 0 || layer.opacity > 1) errors.push(`Static layer ${layer.id || "unknown"} opacity is invalid.`);
      if (layer.type === "text" && !layer.text.trim()) errors.push(`Text layer ${layer.id || "unknown"} is empty.`);
      if (layer.type === "image" && !layer.src.trim()) errors.push(`Image layer ${layer.id || "unknown"} has no source.`);
      if (layer.type === "group") visit(layer.children);
    }
  };

  visit(scene.layout.layers);
  if (seenIds.size === 0) errors.push("Static package scene needs at least one layer.");

  return { valid: errors.length === 0, errors };
}
