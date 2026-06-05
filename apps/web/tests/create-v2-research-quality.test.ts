import assert from 'node:assert/strict';
import { generateAdCopy } from '../features/research/adCopy';
import {
  parseAdCopyModelChoice,
  resolveAdCopyModel,
} from '../features/research/adCopyModels';
import {
  enrichResearchWithFirecrawl,
  fetchResearchWithFirecrawl,
  firecrawlResearchWasUsed,
} from '../features/research/firecrawl';
import { evaluateResearchQuality } from '../features/research/researchQuality';
import { buildAdSceneFromWebsiteResearch } from '../features/research/sceneFactory';
import { extractWebsiteResearch } from '../features/research/websiteResearch';
import { normalizeWebsiteUrl } from '../features/research/url';

const strongHtml = `
<!doctype html>
<html>
  <head>
    <title>OGTool | ChatGPT Mentions in 14 Days</title>
    <meta property="og:site_name" content="OGTool" />
    <meta property="og:title" content="ChatGPT Mentions in 14 Days" />
    <meta name="description" content="Fully managed Reddit marketing campaigns and ChatGPT search visibility optimization for D2C brands seeking rapid organic growth." />
    <meta name="theme-color" content="#7DD3FC" />
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>
    <main>
      <h1>ChatGPT Mentions in 14 Days</h1>
      <h2>Reddit campaigns that become AI search receipts</h2>
      <p>First ChatGPT mention in 14 days for a D2C brand after Reddit visibility work.</p>
      <p>D2C operators are tired of paying for attention while competitors show up in trusted AI answers first.</p>
      <p>Customer result: first ranking in 14 days and $88k tracked in two months.</p>
    </main>
  </body>
</html>
`;

const test = async (name: string, run: () => void | Promise<void>) => {
  try {
    await run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
};

const researchFrom = (html: string) => extractWebsiteResearch({
  websiteUrl: normalizeWebsiteUrl('https://ogtool.com/'),
  html,
});

await test('research quality fails loudly when page evidence is too thin', () => {
  const research = researchFrom('<html><head><title>Home</title></head><body>Hi</body></html>');
  const quality = evaluateResearchQuality(research);

  assert.equal(quality.level, 'weak');
  assert.equal(quality.canGenerate, false);
  assert.match(quality.reasons.at(-1) || '', /specific page evidence/);
});

await test('research quality allows strong receipt-backed pages', () => {
  const research = researchFrom(strongHtml);
  const quality = evaluateResearchQuality(research);

  assert.equal(quality.canGenerate, true);
  assert.ok(quality.score >= 45);
});

await test('Firecrawl enrichment skips without a key and preserves HTML research', async () => {
  const research = researchFrom(strongHtml);
  const enriched = await enrichResearchWithFirecrawl(research, { apiKey: '' });

  assert.equal(enriched.brandName, 'OGTool');
  assert.equal(enriched.providerStatus.some((item) => (
    item.provider === 'firecrawl' && item.status === 'skipped'
  )), true);
});

await test('Firecrawl enrichment merges receipts from an injected fetcher', async () => {
  const research = researchFrom(strongHtml);
  const enriched = await enrichResearchWithFirecrawl(research, {
    apiKey: 'test-firecrawl-key',
    fetcher: async () => new Response(JSON.stringify({
      success: true,
      data: {
        metadata: {
          title: 'OGTool | AI Search Visibility',
          description: 'Managed Reddit visibility campaigns for brands that want ChatGPT mentions.',
          images: ['https://ogtool.com/case-study.png'],
          socialLinks: ['https://www.linkedin.com/company/ogtool'],
        },
        branding: {
          colors: ['#7DD3FC'],
          logo: 'https://ogtool.com/logo.png',
        },
        markdown: `
# Why AI recommends your competitors
First ChatGPT mention in 14 days.
Customer result: $88k tracked in two months from Reddit visibility.
Operators are tired of competitors showing up in AI answers first.
Review from Mina, founder: OGTool helped us get cited inside ChatGPT answers.
Built for D2C operators and growth teams that need managed Reddit visibility campaigns.
        `,
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  assert.equal(enriched.providerStatus.some((item) => (
    item.provider === 'firecrawl' && item.status === 'used'
  )), true);
  assert.equal(enriched.receipts.specificClaims.some((claim) => claim.includes('$88k')), true);
  assert.equal(enriched.rawMarkdown?.includes('Why AI recommends your competitors'), true);
  assert.equal(enriched.imageUrls.includes('https://ogtool.com/case-study.png'), true);
  assert.equal(enriched.socialLinks.includes('https://www.linkedin.com/company/ogtool'), true);
  assert.equal(enriched.reviewCandidates.some((review) => review.includes('Mina')), true);
  assert.equal(enriched.offerCandidates.some((offer) => offer.includes('managed Reddit visibility')), true);
  assert.equal(enriched.audienceCandidates.some((audience) => audience.includes('D2C operators')), true);
});

await test('Firecrawl primary research builds website research without direct HTML', async () => {
  const research = await fetchResearchWithFirecrawl('ogtool.com', {
    apiKey: 'test-firecrawl-key',
    skipNetworkGuard: true,
    fetcher: async () => new Response(JSON.stringify({
      success: true,
      data: {
        metadata: {
          ogSiteName: 'OGTool',
          title: 'OGTool | First AI Ranking in 14 Days',
          description: 'Managed Reddit visibility campaigns for brands that want ChatGPT mentions.',
          favicon: 'https://ogtool.com/favicon.ico',
          image: 'https://ogtool.com/social-card.png',
        },
        branding: {
          logo: 'https://ogtool.com/logo.png',
          colors: ['#7DD3FC'],
        },
        markdown: `
# First AI Ranking in 14 Days
Customer result: $88k tracked in two months.
Operators are tired of competitors showing up in AI answers first.
Built for D2C operators and growth teams that need managed Reddit visibility campaigns.
Review from Mina, founder: OGTool helped us get cited inside ChatGPT answers.
https://www.linkedin.com/company/ogtool
        `,
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  assert.equal(research.brandName, 'OGTool');
  assert.equal(research.websiteUrl, 'https://ogtool.com/');
  assert.equal(firecrawlResearchWasUsed(research), true);
  assert.equal(research.receipts.specificClaims.some((claim) => claim.includes('$88k')), true);
  assert.equal(research.rawMarkdown?.includes('First AI Ranking in 14 Days'), true);
  assert.equal(research.metadata?.ogSiteName, 'OGTool');
  assert.equal(research.branding?.logo, 'https://ogtool.com/logo.png');
  assert.equal(research.imageUrls.includes('https://ogtool.com/social-card.png'), true);
  assert.equal(research.imageUrls.includes('https://ogtool.com/logo.png'), true);
  assert.equal(research.socialLinks.includes('https://www.linkedin.com/company/ogtool'), true);
  assert.equal(research.reviewCandidates.some((review) => review.includes('Mina')), true);
  assert.equal(research.offerCandidates.some((offer) => offer.includes('managed Reddit visibility')), true);
  assert.equal(research.audienceCandidates.some((audience) => audience.includes('D2C operators')), true);
});

await test('Firecrawl primary research fails when not configured', async () => {
  await assert.rejects(
    () => fetchResearchWithFirecrawl('ogtool.com', {
      apiKey: '',
      skipNetworkGuard: true,
    }),
    /Firecrawl is required/,
  );
});

await test('Firecrawl timeout errors do not leak raw abort messages', async () => {
  await assert.rejects(
    () => fetchResearchWithFirecrawl('ogtool.com', {
      apiKey: 'test-firecrawl-key',
      skipNetworkGuard: true,
      fetcher: async () => {
        throw new DOMException('This operation was aborted', 'AbortError');
      },
    }),
    (error) => (
      error instanceof Error &&
      /Firecrawl took too long/.test(error.message) &&
      !/This operation was aborted/.test(error.message)
    ),
  );
});

await test('OpenRouter copy generation skips without a key and uses receipt fallback', async () => {
  const research = researchFrom(strongHtml);
  const result = await generateAdCopy(research, { apiKey: '' });

  assert.equal(result.providerStatus.status, 'skipped');
  assert.equal(result.copy.headline, 'ChatGPT Mentions in 14 Days');
});

await test('ad copy model choices are allowlisted before OpenRouter calls', async () => {
  assert.equal(parseAdCopyModelChoice(undefined), 'auto');
  assert.equal(parseAdCopyModelChoice('kimi-k2.6-free'), 'kimi-k2.6-free');
  assert.equal(parseAdCopyModelChoice('moonshotai/kimi-k2.6'), null);

  const kimi = resolveAdCopyModel('kimi-k2.6-free');
  const auto = resolveAdCopyModel('auto', 'meta-llama/llama-3.3-70b-instruct:free');

  assert.equal(kimi.model, 'moonshotai/kimi-k2.6:free');
  assert.equal(kimi.label, 'Kimi K2.6 Free (OpenRouter)');
  assert.equal(auto.model, 'meta-llama/llama-3.3-70b-instruct:free');
});

await test('OpenRouter copy generation requires an explicit model before calling out', async () => {
  const research = researchFrom(strongHtml);
  let called = false;
  const result = await generateAdCopy(research, {
    apiKey: 'test-openrouter-key',
    model: '',
    fetcher: async () => {
      called = true;
      return new Response('{}');
    },
  });

  assert.equal(called, false);
  assert.equal(result.providerStatus.status, 'skipped');
});

await test('OpenRouter copy generation uses injected JSON without live API calls', async () => {
  const research = researchFrom(strongHtml);
  const result = await generateAdCopy(research, {
    apiKey: 'test-openrouter-key',
    model: 'test/model',
    modelLabel: 'Test Model (OpenRouter)',
    fetcher: async () => new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            headline: 'Own the AI answer',
            subheadline: 'First ChatGPT mention in 14 days after Reddit visibility work.',
            angleId: 'ai-answer-ownership',
            ctaText: 'Learn More',
          }),
        },
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  assert.equal(result.providerStatus.status, 'used');
  assert.match(result.providerStatus.reason, /Test Model/);
  assert.equal(result.copy.headline, 'Own the AI answer');
});

await test('OpenRouter prompt tells the model to pick the best website stuff first', async () => {
  const research = researchFrom(strongHtml);
  let prompt = '';
  const result = await generateAdCopy(research, {
    apiKey: 'test-openrouter-key',
    model: 'test/model',
    fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body || '{}')) as {
        messages?: Array<{ content?: string }>;
      };
      prompt = body.messages?.[0]?.content || '';

      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify({
              headline: 'Own the AI answer',
              subheadline: 'First ChatGPT mention in 14 days after Reddit visibility work.',
              angleId: 'ai-answer-ownership',
              ctaText: 'Learn More',
            }),
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(result.providerStatus.status, 'used');
  assert.match(prompt, /PICK THE BEST STUFF FIRST/);
  assert.match(prompt, /Best promise/);
  assert.match(prompt, /Best buyer/);
  assert.match(prompt, /Best pain/);
  assert.match(prompt, /Best proof/);
  assert.match(prompt, /Possible offers/);
  assert.match(prompt, /Possible buyers/);
  assert.match(prompt, /Exact site phrases/);
  assert.match(prompt, /DECIDE HEADLINE TYPE BEFORE WRITING/);
  assert.match(prompt, /PAINFUL MOMENT/);
  assert.match(prompt, /RECEIPT DROP/);
  assert.match(prompt, /STUDY THESE EXAMPLES \(shape only/);
  assert.match(prompt, /Your competitor shows up in ChatGPT\. You don't\./);
  assert.match(prompt, /CTA should be 3-5 words/);
  assert.match(prompt, /BANNED WORDS/);
  assert.match(prompt, /Do not use the STUDY THESE EXAMPLES facts/);
  assert.match(prompt, /First ChatGPT mention in 14 days/);
  assert.doesNotMatch(prompt, /whole website/i);
});

await test('OpenRouter timeout status does not expose raw abort wording', async () => {
  const research = researchFrom(strongHtml);
  const result = await generateAdCopy(research, {
    apiKey: 'test-openrouter-key',
    model: 'test/model',
    fetcher: async () => {
      throw new DOMException('This operation was aborted', 'AbortError');
    },
  });

  assert.equal(result.providerStatus.status, 'failed');
  assert.match(result.providerStatus.reason, /OpenRouter took too long/);
  assert.doesNotMatch(result.providerStatus.reason, /This operation was aborted/);
});

await test('receipt copy can drive the generated AdScene without audio side effects', async () => {
  const research = researchFrom(strongHtml);
  const copyResult = await generateAdCopy(research, { apiKey: '' });
  const scene = buildAdSceneFromWebsiteResearch(research, {
    now: 456,
    copy: copyResult.copy,
  });

  assert.equal(scene.id, 'scene-ogtool-456');
  assert.equal(scene.creative.headline, copyResult.copy.headline);
  assert.equal(scene.creative.subheadline, copyResult.copy.subheadline);
  assert.equal(scene.audio.status, 'none');
  assert.deepEqual(scene.audio.captions, []);
});
