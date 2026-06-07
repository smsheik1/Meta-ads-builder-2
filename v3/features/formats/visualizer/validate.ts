import type { AdScene } from "../../scene/types";
import type { FormatValidationResult } from "../types";

export const validateVisualizerScene = (scene: AdScene): FormatValidationResult => {
  const errors: string[] = [];

  if (scene.format !== "visualizer") errors.push("Scene format must be visualizer.");
  if (!scene.brand.name.trim()) errors.push("Scene brand name is required.");
  if (!scene.creative.headline.trim()) errors.push("Scene headline is required.");
  if (!scene.creative.subheadline.trim()) errors.push("Scene subheadline is required.");
  if (!/^#[0-9A-F]{6}$/i.test(scene.style.visualizerColor)) {
    errors.push("Scene visualizer color must be a hex color.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
