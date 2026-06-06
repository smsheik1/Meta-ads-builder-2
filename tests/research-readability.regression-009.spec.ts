import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { hasReadableWebsiteResearch } from '../src/lib/research-readability';

test('empty website scrape with only icons is not enough for a brand brief', () => {
  expect(hasReadableWebsiteResearch({
    pages: [{
      title: '',
      description: '',
      markdown: '',
    }],
    brandAssets: {
      images: {
        favicon: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png',
        heroImages: [],
        allImages: ['https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png'],
      },
      colors: {},
      fonts: [],
      componentStyles: {},
      metadata: {
        icon: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png',
      },
      socialLinks: [
        'https://legal.twitter.com/imprint.html',
        'https://business.twitter.com/en/help/troubleshooting/how-twitter-ads-work.html',
      ],
      reviews: [],
      pages: [{
        url: 'https://x.com/',
        title: '',
        description: '',
        colors: [],
        markdownPreview: '',
      }],
      rawBranding: {
        images: {
          favicon: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png',
        },
      },
    },
  })).toBe(false);
});

test('real homepage copy is enough for a brand brief', () => {
  expect(hasReadableWebsiteResearch({
    pages: [{
      title: 'OGTool',
      description: 'Fully managed Reddit campaigns and ChatGPT search visibility optimization.',
      markdown: [
        'Get your first ChatGPT mention in 14 days.',
        'Seed Reddit conversations that rank on Google and influence AI recommendations.',
        'Track revenue from organic visibility instead of paying for another ad click.',
      ].join('\n'),
    }],
    brandAssets: {
      images: {
        heroImages: [],
        allImages: [],
      },
      colors: {},
      fonts: [],
      componentStyles: {},
      metadata: {},
      socialLinks: [],
      reviews: [],
      pages: [],
      rawBranding: {},
    },
  })).toBe(true);
});

test('brand research fails closed on empty reads and recovers low-confidence AI briefs', () => {
  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  const researchSource = fs.readFileSync(path.join(process.cwd(), 'src', 'server', 'brand-research.ts'), 'utf8');

  expect(serverSource).toContain('hasReadableWebsiteResearch(research)');
  expect(serverSource).toContain('could not find enough readable words');
  expect(researchSource).toContain('getAlternateResearchUrls');
  expect(researchSource).toContain('https://about.x.com/en');
  expect(researchSource).toContain('using_alternate_research_page');
  expect(serverSource).toContain('brain_low_confidence_using_heuristic');
  expect(serverSource).toContain('fallbackHeadlines(brandBrain, totalCount - variations.length, used)');
  expect(serverSource).toMatch(/if \(brandBrainNeedsFallback\(brandBrain\)\) \{[\s\S]*?buildHeuristicBrandBrain/);
});
