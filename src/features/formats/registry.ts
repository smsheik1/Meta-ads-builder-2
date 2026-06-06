import type { GeneratedAdFormat, HeadlineVariation } from '../../lib/prompts/headline-variations';
import { conversationFormat } from './conversation';
import type { CreateFormatMode, CreateFormatModeDefinition } from './types';
import { visualizerFormat } from './visualizer';

export const CREATE_FORMATS = [
  visualizerFormat,
  conversationFormat,
] as const;

export const ALL_GENERATED_FORMATS = CREATE_FORMATS.map((format) => format.id);

export const ACTIVE_GENERATED_FORMATS = CREATE_FORMATS
  .filter((format) => format.active)
  .map((format) => format.id);

export const PAUSED_GENERATED_FORMATS = new Set<GeneratedAdFormat>(
  CREATE_FORMATS
    .filter((format) => !format.active)
    .map((format) => format.id),
);

export const CREATE_FORMAT_MODES: CreateFormatModeDefinition[] = [
  { id: 'all', label: 'All formats' },
  ...CREATE_FORMATS
    .filter((format) => format.active)
    .map((format) => ({ id: format.id, label: format.label })),
];

export const isGeneratedAdFormat = (value: unknown): value is GeneratedAdFormat => (
  typeof value === 'string' && ALL_GENERATED_FORMATS.includes(value as GeneratedAdFormat)
);

export const normalizeGeneratedAdFormat = (value: unknown): GeneratedAdFormat => (
  isGeneratedAdFormat(value) ? value : 'visualizer'
);

export const isCreateFormatActive = (value: unknown): value is GeneratedAdFormat => (
  isGeneratedAdFormat(value) && !PAUSED_GENERATED_FORMATS.has(value)
);

export const normalizeCreateFormatMode = (value: unknown): CreateFormatMode => {
  if (value === 'all') return 'all';
  return isCreateFormatActive(value) ? value : 'all';
};

export const filterActiveGeneratedVariations = <T extends Pick<HeadlineVariation, 'format'>>(
  variations: T[],
) => variations.filter((variation) => isCreateFormatActive(normalizeGeneratedAdFormat(variation.format)));

export const getCreateFormatModeLabel = (mode: CreateFormatMode) => (
  CREATE_FORMAT_MODES.find((formatMode) => formatMode.id === mode)?.label || 'Generated'
);
