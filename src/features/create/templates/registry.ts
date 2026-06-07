import type { GeneratedAdVariation } from '../../../components/CreateFlow';
import { normalizeGeneratedAdFormat } from '../../formats/registry';
import { conversationTemplate } from './conversationTemplate';
import type { CreateTemplateDefinition } from './types';
import { visualizerTemplate } from './visualizerTemplate';

export const CREATE_AD_TEMPLATES: CreateTemplateDefinition[] = [
  visualizerTemplate,
  conversationTemplate,
];

export const CREATE_AD_TEMPLATE_BY_FORMAT = new Map(
  CREATE_AD_TEMPLATES.map((template) => [template.id, template]),
);

export const getCreateAdTemplateForVariation = (variation: GeneratedAdVariation): CreateTemplateDefinition => (
  CREATE_AD_TEMPLATE_BY_FORMAT.get(normalizeGeneratedAdFormat(variation.format)) || visualizerTemplate
);

export type {
  CreateTemplateApplicationContext,
  CreateTemplateCapabilities,
  CreateTemplateDefinition,
  CreateTemplateKind,
} from './types';
