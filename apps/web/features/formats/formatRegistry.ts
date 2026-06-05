import type { AdFormatDefinition, AdFormatId, AdFormatModule, PlannedAdFormat } from './formatTypes';
import { visualizerFormat } from './visualizer/visualizerFormat';

export const ACTIVE_AD_FORMAT_ID: AdFormatId = 'visualizer';

const plannedFormats = [
  {
    id: 'meme',
    label: 'Meme',
    description: 'Image-led meme ads will live in their own format module.',
    status: 'planned',
  },
  {
    id: 'text-message',
    label: 'Text',
    description: 'Message-style ads will get a separate renderer and editor.',
    status: 'planned',
  },
  {
    id: 'tweet',
    label: 'Tweet',
    description: 'Social-post ads will not share visualizer editing state.',
    status: 'planned',
  },
  {
    id: 'conversation-card',
    label: 'Chat',
    description: 'Conversation-card ads stay isolated until the format is real.',
    status: 'planned',
  },
] satisfies PlannedAdFormat[];

export const AD_FORMAT_REGISTRY = [
  visualizerFormat,
  ...plannedFormats,
] satisfies AdFormatDefinition[];

export const ACTIVE_AD_FORMATS = AD_FORMAT_REGISTRY.filter(
  (format): format is AdFormatModule => format.status === 'active',
);

export const getActiveAdFormat = (id: AdFormatId = ACTIVE_AD_FORMAT_ID) => (
  ACTIVE_AD_FORMATS.find((format) => format.id === id) || visualizerFormat
);
