import { FIXED_AD_BACKGROUND_COLOR, createTintedAdBackground } from '../../../lib/style-archetypes';
import { VOICE_VISUALIZER_PRESET } from '../../../lib/visualizer-presets';
import { DEFAULT_ELEMENTS, type AdElement } from '../../../store';
import type { CreateTemplateDefinition } from './types';

const applyVisualizerTemplateElement = (
  element: AdElement,
  context: Parameters<CreateTemplateDefinition['buildElements']>[1],
): AdElement => {
  const { variation, canvasLogoUrl, isNewBrand, visualizerColor, accentColor } = context;

  if (element.componentRole === 'logo') {
    return {
      ...element,
      imageUrl: canvasLogoUrl,
      removeWhite: false,
      styleArchetypeId: variation.archetype.id,
    };
  }
  if (element.locked && !isNewBrand) return element;
  if (element.componentRole === 'headline') {
    const headlineWidth = Math.min(320, variation.archetype.headlineTreatment.width);
    return {
      ...element,
      content: variation.headline,
      fontFamily: undefined,
      color: variation.headlineColor || variation.archetype.headlineColor,
      fontSize: variation.archetype.headlineTreatment.fontSize,
      fontWeight: variation.archetype.headlineTreatment.fontWeight,
      lineHeight: Math.max(1.08, variation.archetype.headlineTreatment.lineHeight),
      x: (360 - headlineWidth) / 2,
      width: headlineWidth,
      styleArchetypeId: variation.archetype.id,
    };
  }
  if (element.componentRole === 'subheadline') {
    return {
      ...element,
      fontFamily: undefined,
      color: variation.archetype.subheadlineColor,
      styleArchetypeId: variation.archetype.id,
    };
  }
  if (element.type === 'visualizer') {
    return {
      ...element,
      styleArchetypeId: variation.archetype.id,
      visualizerType: variation.archetype.visualizerVariant.visualizerType,
      barColor: visualizerColor,
      barCount: variation.archetype.visualizerVariant.barCount,
      visualizerSensitivity: variation.archetype.visualizerVariant.sensitivity,
      visualizerHeight: variation.archetype.visualizerVariant.height,
      ...VOICE_VISUALIZER_PRESET,
    };
  }
  if (element.componentRole === 'captions') {
    return {
      ...element,
      styleArchetypeId: variation.archetype.id,
      color: accentColor,
      captionSpeaker1Color: visualizerColor,
      captionSpeaker2Color: accentColor,
    };
  }
  if (element.componentRole === 'cta') {
    return {
      ...element,
      fontFamily: undefined,
      color: variation.archetype.ctaTextColor,
      backgroundColor: variation.archetype.ctaBackgroundColor,
      styleArchetypeId: variation.archetype.id,
    };
  }
  return {
    ...element,
    styleArchetypeId: variation.archetype.id,
  };
};

export const visualizerTemplate: CreateTemplateDefinition = {
  id: 'visualizer',
  label: 'Audio visualizer',
  kind: 'video',
  supportedPlatforms: ['instagram-feed', 'reels', 'stories', 'youtube', 'vertical'],
  capabilities: {
    audio: true,
    captions: true,
    logo: true,
    cta: true,
    visualizer: true,
  },
  defaultLayout: DEFAULT_ELEMENTS,
  resolveBackgroundColor: ({ variation, visualizerColor }) => createTintedAdBackground(
    visualizerColor,
    variation.archetype.backgroundColor || FIXED_AD_BACKGROUND_COLOR,
  ),
  buildElements: (currentElements, context) => {
    const sourceElements = currentElements.length ? currentElements : DEFAULT_ELEMENTS;
    return sourceElements.map((element) => applyVisualizerTemplateElement(element, context));
  },
};
