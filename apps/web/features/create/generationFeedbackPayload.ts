import type { AdScene } from './scene';

export type GenerationFeedbackRating = 'up' | 'down';
export type GenerationFeedbackStatus = 'idle' | 'saving' | 'saved' | 'error';

export type GenerationFeedbackPayload = ReturnType<typeof createGenerationFeedbackPayload>;

type CreateGenerationFeedbackPayloadOptions = {
  adModel: string;
  rating: GenerationFeedbackRating;
  scene: AdScene;
  sessionId: string;
};

export const createGenerationFeedbackKey = (scene: AdScene) => [
  scene.id,
  scene.brand.websiteUrl,
  scene.platform,
  scene.brand.logoUrl ?? '',
  scene.brand.faviconUrl ?? '',
  scene.creative.angleId,
  scene.creative.headline,
  scene.creative.subheadline,
  scene.creative.ctaText,
  scene.creative.styleId ?? '',
  scene.creative.headlineColor ?? '',
  scene.creative.backgroundColor,
  scene.creative.accentColor,
  scene.creative.visualizer.color,
  scene.creative.visualizer.idlePreset,
  scene.creative.visualizer.playbackPreset,
  String(scene.creative.visualizer.barCount ?? ''),
  String(scene.creative.visualizer.heightScale ?? ''),
].join('|');

export const createGenerationFeedbackPayload = ({
  adModel,
  rating,
  scene,
  sessionId,
}: CreateGenerationFeedbackPayloadOptions) => ({
  sessionId,
  sceneId: scene.id,
  rating,
  websiteUrl: scene.brand.websiteUrl,
  brandName: scene.brand.name,
  platform: scene.platform,
  headline: scene.creative.headline,
  subheadline: scene.creative.subheadline,
  ctaText: scene.creative.ctaText,
  styleId: scene.creative.styleId ?? null,
  headlineColor: scene.creative.headlineColor ?? null,
  backgroundColor: scene.creative.backgroundColor,
  accentColor: scene.creative.accentColor,
  visualizerColor: scene.creative.visualizer.color,
  adModel,
  hasAudio: scene.audio.status !== 'none' && Boolean(scene.audio.url),
  audioStatus: scene.audio.status,
  audioDurationMs: scene.audio.durationMs,
  sceneCreatedAt: scene.createdAt,
  sceneUpdatedAt: scene.updatedAt,
});
