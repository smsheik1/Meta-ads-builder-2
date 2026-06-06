import { expect, test } from '@playwright/test';
import {
  FIXED_AD_BACKGROUND_COLOR,
  createTintedAdBackground,
  getContrastRatio,
  getRandomAdStyleArchetype,
} from '../src/lib/style-archetypes';

test('tinted ad backgrounds are soft versions of the visualizer color', () => {
  expect(createTintedAdBackground('#93c5fd')).toBe('#f0f6f9');
  expect(createTintedAdBackground('#dc2626')).toBe('#fae0db');
  expect(createTintedAdBackground('#34d399')).toBe('#e3f8eb');
});

test('rolled create styles no longer force every ad onto the same cream background', () => {
  const archetypes = Array.from({ length: 10 }, () => getRandomAdStyleArchetype());

  for (const archetype of archetypes) {
    expect(archetype.backgroundColor.toLowerCase()).not.toBe(FIXED_AD_BACKGROUND_COLOR);
    expect(getContrastRatio(archetype.headlineColor, archetype.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  }
});
