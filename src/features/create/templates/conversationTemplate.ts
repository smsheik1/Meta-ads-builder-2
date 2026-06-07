import type { AdElement } from '../../../store';
import type { CreateTemplateDefinition } from './types';

const cleanConversationLine = (value: string) => value
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 96);

const buildConversationFallbackLines = (
  variation: Parameters<CreateTemplateDefinition['buildElements']>[1]['variation'],
  brandBrain: Parameters<CreateTemplateDefinition['buildElements']>[1]['brandBrain'],
) => {
  const pain = cleanConversationLine(brandBrain.pain || 'the hard part is getting ignored');
  const offer = cleanConversationLine(brandBrain.offer || 'the offer is easier to understand this way');
  const result = cleanConversationLine(brandBrain.promisedResult || 'people understand the value faster');
  return [
    { speaker: 'Alex', text: `I keep seeing ${pain}.` },
    { speaker: 'Jordan', text: `${offer} makes that much clearer.` },
    { speaker: 'Alex', text: `So the ad should say, ${variation.headline.toLowerCase()}?` },
    { speaker: 'Jordan', text: `Exactly. Show ${result} before they scroll.` },
  ];
};

const buildConversationElements = (
  context: Parameters<CreateTemplateDefinition['buildElements']>[1],
): AdElement[] => {
  const { variation, brandBrain, canvasLogoUrl } = context;
  const businessName = cleanConversationLine(brandBrain.businessName || 'Your brand').slice(0, 28);
  const lines = (variation.conversationLines?.length ? variation.conversationLines : buildConversationFallbackLines(variation, brandBrain))
    .map((line) => ({
      speaker: cleanConversationLine(line.speaker || ''),
      text: cleanConversationLine(line.text || ''),
    }))
    .filter((line) => line.text)
    .slice(0, 4);

  return [
    {
      id: 'logo-1',
      type: 'image',
      componentRole: 'logo',
      imageUrl: canvasLogoUrl,
      x: 26,
      y: 24,
      width: 42,
      height: 42,
      rotation: 0,
      zIndex: 10,
      removeWhite: false,
      borderRadius: 12,
    },
    {
      id: 'conversation-brand-1',
      type: 'text',
      content: businessName,
      x: 76,
      y: 24,
      width: 250,
      height: 42,
      rotation: 0,
      zIndex: 11,
      fontSize: 19,
      fontWeight: '900',
      color: '#0f172a',
      textAlign: 'left',
      lineHeight: 1.05,
    },
    {
      id: 'headline-1',
      type: 'text',
      componentRole: 'headline',
      content: variation.headline,
      x: 26,
      y: 74,
      width: 308,
      height: 62,
      rotation: 0,
      zIndex: 1,
      fontSize: 31,
      fontWeight: '900',
      color: '#0f172a',
      textAlign: 'center',
      lineHeight: 1.02,
      styleArchetypeId: variation.archetype.id,
    },
    ...lines.map((line, index): AdElement => {
      const sentByBrand = index % 2 === 1;
      return {
        id: `conversation-line-${index + 1}`,
        type: 'text',
        content: line.text,
        x: sentByBrand ? 70 : 20,
        y: 152 + index * 66,
        width: 270,
        height: 62,
        rotation: 0,
        zIndex: 20 + index,
        fontSize: 19,
        fontWeight: '800',
        fontFamily: 'Inter, sans-serif',
        color: sentByBrand ? variation.archetype.ctaTextColor : variation.archetype.headlineColor,
        textAlign: 'left',
        lineHeight: 1.12,
        backgroundColor: sentByBrand ? variation.archetype.ctaBackgroundColor : '#e2e8f0',
        borderRadius: 18,
        styleArchetypeId: variation.archetype.id,
      };
    }),
  ];
};

export const conversationTemplate: CreateTemplateDefinition = {
  id: 'conversation',
  label: 'Conversation card',
  kind: 'image',
  supportedPlatforms: ['instagram-feed', 'reels', 'stories', 'youtube', 'vertical'],
  capabilities: {
    audio: false,
    captions: false,
    logo: true,
    cta: false,
    visualizer: false,
  },
  defaultLayout: [],
  resolveBackgroundColor: () => '#f8fafc',
  buildElements: (currentElements, context) => {
    const lockedById = new Map(
      context.isNewBrand
        ? []
        : currentElements.filter((element) => element.locked).map((element) => [element.id, element])
    );
    return buildConversationElements(context)
      .map((element) => lockedById.get(element.id) || element);
  },
};
