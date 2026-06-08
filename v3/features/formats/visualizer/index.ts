import type { VisualizerAdScene } from "../../scene/types";
import type { AdFormatModule, FormatInteractionConfig } from "../types";
import { VisualizerFormatRenderer } from "./render";
import { validateVisualizerScene } from "./validate";

const visualizerInteraction: FormatInteractionConfig<VisualizerAdScene> = {
  selectableSlots: [
    {
      slot: "headline",
      label: "Headline",
      lockKey: "headline",
      top: 118,
      left: 20,
      width: 320,
      height: 120,
    },
    {
      slot: "visualizer",
      label: "Visualizer",
      lockKey: "style",
      top: 255,
      left: 0,
      width: 360,
      height: 90,
    },
    {
      slot: "captions",
      label: "Captions",
      lockKey: "captionColor",
      top: 336,
      left: 20,
      width: 320,
      height: 62,
    },
  ],
  getSlotColor: (scene, slot) => {
    if (slot === "headline") return scene.style.textColor;
    if (slot === "visualizer") return scene.style.visualizerColor;
    return scene.style.accentColor;
  },
  applySlotColor: (scene, slot, color) => ({
    ...scene,
    style: {
      ...scene.style,
      ...(slot === "headline" ? { textColor: color } : null),
      ...(slot === "visualizer" ? { visualizerColor: color } : null),
      ...(slot === "captions" ? { accentColor: color } : null),
    },
  }),
  getBackgroundColor: (scene) => scene.style.backgroundColor,
  applyBackgroundColor: (scene, color) => ({
    ...scene,
    style: {
      ...scene.style,
      backgroundColor: color,
    },
  }),
  getRerollLocksForSlot: (slot, locks) => ({
    headline: slot !== "headline" || locks.headline,
    subheadline: slot !== "captions",
    style: slot !== "visualizer" || locks.style,
    captionColor: slot !== "captions" || locks.captionColor,
    audio: true,
  }),
  applySlotReroll: ({
    selectedSlot,
    currentScene,
    nextScene,
    allScenes,
    locks,
    fallbackColors,
    offset,
    pickDistinctColor,
  }) => {
    if (selectedSlot !== "captions") return nextScene;

    const nextCaptionColor = pickDistinctColor(
      currentScene.style.accentColor,
      [
        nextScene.style.accentColor,
        nextScene.style.visualizerColor,
        ...currentScene.brand.colors,
        ...allScenes.flatMap((scene) => [scene.style.accentColor, scene.style.visualizerColor]),
        ...fallbackColors,
      ],
      offset,
    );

    return {
      ...currentScene,
      style: {
        ...currentScene.style,
        accentColor: locks.captionColor ? currentScene.style.accentColor : nextCaptionColor,
      },
    };
  },
};

export const visualizerFormatModule: AdFormatModule<"visualizer", VisualizerAdScene> = {
  id: "visualizer",
  label: "Audio visualizer",
  defaultSlots: ["headline", "visualizer", "captions"],
  interaction: visualizerInteraction,
  RenderComponent: VisualizerFormatRenderer,
  validate: validateVisualizerScene,
};
