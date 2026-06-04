import assert from 'node:assert/strict';
import { buildAdSceneFromWebsiteResearch } from '../features/research/sceneFactory';
import { extractWebsiteResearch, fetchWebsiteResearch } from '../features/research/websiteResearch';
import { assertPublicWebsiteUrl, isPrivateAddress, normalizeWebsiteUrl } from '../features/research/url';

const sampleHtml = `
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
    <header>
      <img src="/logo.png" alt="OGTool logo" />
    </header>
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

await test('normalizes bare website URLs', () => {
  const url = normalizeWebsiteUrl('OGTool.com');

  assert.equal(url.href, 'https://ogtool.com/');
  assert.equal(url.username, '');
  assert.equal(url.password, '');
});

await test('blocks local and private research targets', async () => {
  assert.equal(isPrivateAddress('127.0.0.1'), true);
  assert.equal(isPrivateAddress('192.168.1.20'), true);
  assert.equal(isPrivateAddress('8.8.8.8'), false);

  await assert.rejects(
    () => assertPublicWebsiteUrl(normalizeWebsiteUrl('localhost')),
    /Local and private/,
  );

  await assert.rejects(
    () => assertPublicWebsiteUrl(
      normalizeWebsiteUrl('example.com'),
      async () => [{ address: '10.0.0.5', family: 4 }],
    ),
    /private network/,
  );
});

await test('extracts brand research and receipts from HTML', () => {
  const research = extractWebsiteResearch({
    websiteUrl: normalizeWebsiteUrl('https://ogtool.com/'),
    html: sampleHtml,
  });

  assert.equal(research.brandName, 'OGTool');
  assert.equal(research.faviconUrl, 'https://ogtool.com/favicon.ico');
  assert.equal(research.logoUrl, 'https://ogtool.com/logo.png');
  assert.equal(research.colors[0], '#7DD3FC');
  assert.ok(research.receipts.exactSiteLanguage.includes('ChatGPT Mentions in 14 Days'));
  assert.ok(research.receipts.specificClaims.some((claim) => claim.includes('14 days')));
  assert.ok(research.receipts.buyerMoments.some((moment) => moment.includes('D2C operators')));
});

await test('fetches website research through an injected fetcher', async () => {
  const research = await fetchWebsiteResearch('ogtool.com', {
    skipNetworkGuard: true,
    fetcher: async () => new Response(sampleHtml, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }),
  });

  assert.equal(research.websiteUrl, 'https://ogtool.com/');
  assert.equal(research.brandName, 'OGTool');
});

await test('builds a generated AdScene without audio side effects', () => {
  const research = extractWebsiteResearch({
    websiteUrl: normalizeWebsiteUrl('https://ogtool.com/'),
    html: sampleHtml,
  });
  const scene = buildAdSceneFromWebsiteResearch(research, 123);

  assert.equal(scene.id, 'scene-ogtool-123');
  assert.equal(scene.brand.name, 'OGTool');
  assert.equal(scene.brand.websiteUrl, 'https://ogtool.com/');
  assert.equal(scene.brand.receipts.specificClaims.length > 0, true);
  assert.equal(scene.creative.headline, 'ChatGPT Mentions in 14 Days');
  assert.equal(scene.creative.ctaUrl, 'https://ogtool.com/');
  assert.equal(scene.audio.status, 'none');
  assert.equal(scene.audio.transcript, '');
  assert.deepEqual(scene.audio.captions, []);
});

await test('generated headlines strip brand title prefixes', () => {
  const research = extractWebsiteResearch({
    websiteUrl: normalizeWebsiteUrl('https://ogtool.com/'),
    html: sampleHtml.replace(
      'content="ChatGPT Mentions in 14 Days"',
      'content="OGTool | First AI Ranking in 14 Days"',
    ),
  });
  const scene = buildAdSceneFromWebsiteResearch(research, 124);

  assert.equal(scene.creative.headline, 'First AI Ranking in 14 Days');
});
