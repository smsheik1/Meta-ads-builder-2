import { getFormatModule } from "@/features/formats/registry";
import type {
  FormatSceneLocks,
  FormatSelectableSlotDefinition,
  RenderFlashRole,
  RenderSelectableSlot,
} from "@/features/formats/types";
import type { AdScene } from "@/features/scene/types";

export const fallbackCaptionColors = ["#7DD3FC", "#FB7185", "#A78BFA", "#34D399", "#F59E0B", "#F472B6"];

export const getSceneFormatInteraction = (scene: AdScene) => getFormatModule(scene.format).interaction;

export const getSceneDefaultFlashSlots = (scene: AdScene): RenderFlashRole[] => [
  ...getFormatModule(scene.format).defaultSlots,
];

export const getSceneSelectableSlots = (scene: AdScene): readonly FormatSelectableSlotDefinition[] => (
  getSceneFormatInteraction(scene).selectableSlots
);

export const getSceneSelectedSlotLabel = (scene: AdScene, slot: RenderSelectableSlot) => (
  getSceneSelectableSlots(scene).find((item) => item.slot === slot)?.label.toLowerCase() || slot
);

export const getLockedSlotsForScene = (
  scene: AdScene,
  locks: FormatSceneLocks,
): Partial<Record<RenderSelectableSlot, boolean>> => (
  Object.fromEntries(getSceneSelectableSlots(scene).map((slot) => [slot.slot, locks[slot.lockKey]]))
);

export const getSlotColorsForScene = (scene: AdScene): Partial<Record<RenderSelectableSlot, string>> => {
  const interaction = getSceneFormatInteraction(scene);
  return Object.fromEntries(interaction.selectableSlots.map((slot) => [
    slot.slot,
    interaction.getSlotColor(scene, slot.slot),
  ]));
};

function normalizeHexColor(value: string): string | null {
  if (!/^#[0-9A-F]{6}$/i.test(value)) return null;
  return value.toUpperCase();
}

export function getNextDistinctColor(currentColor: string, colors: string[], offset: number): string {
  const current = normalizeHexColor(currentColor);
  const palette = colors
    .map(normalizeHexColor)
    .filter((color): color is string => Boolean(color))
    .filter((color, index, all) => all.indexOf(color) === index);

  const usefulPalette = palette.length ? palette : fallbackCaptionColors;
  const startIndex = Math.max(0, Math.trunc(offset)) % usefulPalette.length;
  for (let step = 0; step < usefulPalette.length; step += 1) {
    const candidate = usefulPalette[(startIndex + step) % usefulPalette.length];
    if (candidate && candidate !== current) return candidate;
  }

  return fallbackCaptionColors.find((color) => color !== current) || "#7DD3FC";
}
