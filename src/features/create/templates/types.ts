import type { GeneratedAdVariation } from '../../../components/CreateFlow';
import type { PlatformType } from '../../../components/PlatformFrame';
import type { BrandBrain } from '../../../lib/prompts/brand-brain';
import type { GeneratedAdFormat } from '../../../lib/prompts/headline-variations';
import type { AdElement } from '../../../store';

export type CreateTemplateKind = 'video' | 'image';

export type CreateTemplateCapabilities = {
  audio: boolean;
  captions: boolean;
  logo: boolean;
  cta: boolean;
  visualizer: boolean;
};

export type CreateTemplateApplicationContext = {
  variation: GeneratedAdVariation;
  brandBrain: BrandBrain;
  businessName: string;
  canvasLogoUrl: string;
  isNewBrand: boolean;
  visualizerColor: string;
  accentColor: string;
};

export type CreateTemplateDefinition = {
  id: GeneratedAdFormat;
  label: string;
  kind: CreateTemplateKind;
  supportedPlatforms: PlatformType[];
  capabilities: CreateTemplateCapabilities;
  defaultLayout: AdElement[];
  resolveBackgroundColor?: (context: CreateTemplateApplicationContext) => string;
  buildElements: (currentElements: AdElement[], context: CreateTemplateApplicationContext) => AdElement[];
};
