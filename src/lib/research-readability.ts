import type { BrandAssets } from './prompts/brand-brain';

type ResearchPageLike = {
  title?: string;
  description?: string;
  markdown?: string;
  markdownPreview?: string;
};

type ResearchReadabilityInput = {
  pages?: ResearchPageLike[];
  brandAssets?: BrandAssets;
};

const meaningfulWords = (value: string) => value
  .replace(/https?:\/\/\S+/gi, ' ')
  .replace(/\b(?:page|url|logo found|brand colors found|description):/gi, ' ')
  .replace(/[^a-z0-9$%]+/gi, ' ')
  .split(/\s+/)
  .map((word) => word.trim())
  .filter((word) => word.length >= 3 && /[a-z0-9]/i.test(word));

const textFromPages = (pages: ResearchPageLike[] = []) => pages
  .map((page) => [
    page.title,
    page.description,
    page.markdown,
    page.markdownPreview,
  ].filter(Boolean).join('\n'))
  .join('\n');

const textFromExternalResearch = (brandAssets?: BrandAssets) => {
  const external = brandAssets?.externalResearch;
  return [
    ...(brandAssets?.reviews || []),
    ...(external?.answers || []),
    ...(external?.sources || []).map((source) => `${source.title || ''}\n${source.content || ''}`),
  ].filter(Boolean).join('\n');
};

export const hasReadableWebsiteResearch = ({
  pages = [],
  brandAssets,
}: ResearchReadabilityInput) => {
  const pageText = textFromPages(pages);
  const externalText = textFromExternalResearch(brandAssets);
  const pageWords = meaningfulWords(pageText);
  const externalWords = meaningfulWords(externalText);
  const readableCharacters = `${pageText}\n${externalText}`.replace(/[^a-z0-9]/gi, '').length;

  return readableCharacters >= 80 && (pageWords.length + externalWords.length) >= 10;
};
