import type { PlatformType } from '../../components/PlatformFrame';
import { stripRichText } from '../../lib/rich-text';

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
  const lowered = trimmed.toLowerCase();
  if (
    /(?:^|\/)(?:favicon|apple-touch-icon|mstile|site-icon|android-chrome|icon[-_]\d|icon\.)/i.test(lowered)
    || /\.(?:ico)(?:$|[?#])/i.test(lowered)
  ) {
    return null;
  }
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
