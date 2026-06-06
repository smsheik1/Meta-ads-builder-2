import type { CreateFormatDefinition } from './types';

export const visualizerFormat: CreateFormatDefinition = {
  id: 'visualizer',
  label: 'Audio visualizer',
  shortLabel: 'Visualizer',
  active: true,
  capabilities: {
    audio: true,
    captions: true,
    logo: true,
    cta: true,
    visualizer: true,
  },
};
