import type { GeneratedAdFormat } from '../../lib/prompts/headline-variations';

export type CreateFormatMode = 'all' | GeneratedAdFormat;

export type CreateFormatCapabilities = {
  audio: boolean;
  captions: boolean;
  logo: boolean;
  cta: boolean;
  visualizer: boolean;
};

export type CreateFormatDefinition = {
  id: GeneratedAdFormat;
  label: string;
  shortLabel: string;
  active: boolean;
  capabilities: CreateFormatCapabilities;
};

export type CreateFormatModeDefinition = {
  id: CreateFormatMode;
  label: string;
};
