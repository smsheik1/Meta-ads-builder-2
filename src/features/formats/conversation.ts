import type { CreateFormatDefinition } from './types';

export const conversationFormat: CreateFormatDefinition = {
  id: 'conversation',
  label: 'Conversation Card',
  shortLabel: 'Conversation',
  active: false,
  capabilities: {
    audio: true,
    captions: true,
    logo: true,
    cta: true,
    visualizer: false,
  },
};
