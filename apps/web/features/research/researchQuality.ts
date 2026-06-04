import type { WebsiteResearch } from './websiteResearch';

export type ResearchQuality = {
  score: number;
  level: 'strong' | 'usable' | 'weak';
  canGenerate: boolean;
  reasons: string[];
};

const countReceipts = (research: WebsiteResearch) => (
  research.receipts.specificClaims.length +
  research.receipts.buyerMoments.length +
  research.receipts.exactSiteLanguage.length +
  research.receipts.namedProof.length +
  research.receipts.reviews.length
);

export const evaluateResearchQuality = (research: WebsiteResearch): ResearchQuality => {
  const reasons: string[] = [];
  let score = 0;

  if (research.brandName.length >= 2) {
    score += 15;
    reasons.push('Brand name found.');
  }

  if (research.description.length >= 24) {
    score += 18;
    reasons.push('Readable page description found.');
  }

  if (research.headings.length >= 2) {
    score += 12;
    reasons.push('Multiple page headings found.');
  }

  if (research.paragraphs.length >= 2) {
    score += 15;
    reasons.push('Enough page copy found.');
  }

  if (research.receipts.exactSiteLanguage.length > 0) {
    score += 12;
    reasons.push('Exact site language found.');
  }

  if (research.receipts.specificClaims.length > 0) {
    score += 16;
    reasons.push('Specific claim or number found.');
  }

  if (research.receipts.buyerMoments.length > 0) {
    score += 12;
    reasons.push('Buyer moment found.');
  }

  if (research.logoUrl || research.faviconUrl) {
    score += 5;
    reasons.push('Brand image signal found.');
  }

  const receiptCount = countReceipts(research);
  const hasMinimumCopy = Boolean(research.description || research.headings[0] || research.title);
  const canGenerate = score >= 45 && hasMinimumCopy && receiptCount >= 1;
  const level = score >= 78 ? 'strong' : score >= 45 ? 'usable' : 'weak';

  return {
    score: Math.min(score, 100),
    level,
    canGenerate,
    reasons: canGenerate ? reasons : [
      ...reasons,
      'Not enough specific page evidence to make a trustworthy ad.',
    ],
  };
};

export const assertResearchCanGenerateScene = (research: WebsiteResearch) => {
  const quality = evaluateResearchQuality(research);
  if (!quality.canGenerate) {
    throw new Error(`Wiggly could read the page, but not enough specific ad evidence was found. ${quality.reasons.at(-1)}`);
  }
  return quality;
};
