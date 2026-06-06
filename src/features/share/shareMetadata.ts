import type { PlatformType } from '../../components/PlatformFrame';
import { stripRichText } from '../../lib/rich-text';
import type { AdScene } from '../../engine/ad-scene/scene';

type ShareMetadataElement = {
  type: string;
  componentRole?: string;
  content?: string;
};

export type ShareMetadataSnapshot = {
  name: string;
  elements: ShareMetadataElement[];
  settings: {
    simulatedCaption: string;
    autoCta: string;
    ctaUrl?: string;
    brandName: string;
    brandLogo: string | null;
    accentColor: string;
    bgColor: string;
    platform: PlatformType;
    audioUrl?: string | null;
  };
};

export type ShareMetadata = {
  headline: string;
  subhead: string;
  ctaText: string;
  ctaUrl: string;
  businessName: string;
  brandName: string;
  brandLogo: string | null;
  accentColor: string;
  backgroundColor: string;
  platform: PlatformType;
};

export const normalizeShareUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`).href;
  } catch {
    return trimmed;
  }
};

export const getShareableBrandLogo = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.startsWith('blob:')) return null;
  return trimmed;
};

export const buildShareMetadataFromSnapshot = (snapshot: ShareMetadataSnapshot): ShareMetadata => {
  const headlineElement = snapshot.elements.find(element => element.componentRole === 'headline' || element.type === 'text');
  const subheadElement = snapshot.elements.find(element => element.componentRole === 'subheadline');
  const ctaElement = snapshot.elements.find(element => element.componentRole === 'cta' || element.type === 'button');
  const headline = stripRichText(headlineElement?.content || snapshot.name).trim() || 'Wiggly ad';
  const subhead = stripRichText(subheadElement?.content || snapshot.settings.simulatedCaption).trim();

  return {
    headline,
    subhead,
    ctaText: stripRichText(ctaElement?.content || snapshot.settings.autoCta).trim() || 'Learn More',
    ctaUrl: normalizeShareUrl(snapshot.settings.ctaUrl || ''),
    businessName: snapshot.settings.brandName || 'Wiggly',
    brandName: snapshot.settings.brandName || 'Wiggly',
    brandLogo: getShareableBrandLogo(snapshot.settings.brandLogo),
    accentColor: snapshot.settings.accentColor,
    backgroundColor: snapshot.settings.bgColor,
    platform: snapshot.settings.platform,
  };
};

export const buildShareMetadataFromAdScene = (scene: AdScene): ShareMetadata => ({
  headline: stripRichText(scene.creative.headline).trim() || 'Wiggly ad',
  subhead: stripRichText(scene.creative.subheadline).trim(),
  ctaText: stripRichText(scene.creative.ctaText || '').trim() || 'Learn More',
  ctaUrl: normalizeShareUrl(scene.creative.ctaUrl || scene.brand.websiteUrl || ''),
  businessName: scene.brand.name || 'Wiggly',
  brandName: scene.brand.name || 'Wiggly',
  brandLogo: getShareableBrandLogo(scene.brand.logoUrl || scene.brand.faviconUrl),
  accentColor: scene.creative.accentColor || '#00D6B8',
  backgroundColor: scene.creative.backgroundColor || '#FAFAF7',
  platform: scene.platform as PlatformType,
});
