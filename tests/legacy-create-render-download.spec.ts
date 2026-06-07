import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_ELEMENTS, type AdElement } from '../src/store';
import { createLegacyCreateAdScene } from '../src/lib/legacy-create-ad-scene';
import { requestAdSceneRenderDownload, requestLegacyCreateRenderDownload } from '../src/lib/legacy-create-render-download';
import { buildShareMetadataFromAdScene } from '../src/features/share/shareMetadata';
import type { BrandBrain } from '../src/lib/prompts/brand-brain';

const brandBrain: BrandBrain = {
  businessName: 'OGTool',
  websiteUrl: 'https://ogtool.com/',
  brandLogoUrl: 'https://ogtool.com/logo.png',
  brandAssets: {
    images: {
      logo: 'https://ogtool.com/logo.png',
      favicon: 'https://ogtool.com/favicon.ico',
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
  },
  offer: 'Fully managed Reddit and ChatGPT visibility campaigns.',
  audience: 'D2C operators.',
  pain: 'Your competitor shows up in ChatGPT and you do not.',
  promisedResult: 'First ChatGPT mention in 14 days.',
  differentiator: 'Reddit campaigns tied to AI search visibility.',
  tone: 'direct',
  colors: ['#082f49', '#93c5fd', '#020617'],
  proof: ['First ChatGPT mention in 14 days'],
  receipts: {
    specificClaims: ['First ChatGPT mention in 14 days'],
    buyerMoments: [],
    exactSiteLanguage: [],
    namedProof: [],
  },
  bannedGenericPhrases: [],
  adAngles: ['AI recommends your competitors'],
};

const variation = {
  id: 'ogtool-1',
  angle: 'AI recommends your competitors',
  headline: 'Why AI recommends your competitors',
  format: 'visualizer' as const,
  index: 0,
  visualizerColor: '#93c5fd',
  accentColor: '#082f49',
  headlineColor: '#082f49',
  archetype: {
    id: 'clean-blue',
    name: 'Clean blue',
    variantFingerprint: 'clean-blue',
    backgroundColor: '#fafaf7',
    headlineColor: '#082f49',
    subheadlineColor: '#475569',
    visualizerColor: '#93c5fd',
    speaker1CaptionColor: '#475569',
    speaker2CaptionColor: '#c026d3',
    ctaBackgroundColor: '#020617',
    ctaTextColor: '#ffffff',
    visualizer: {
      visualizerTypes: ['waveform-strip' as const],
      barCounts: [24],
      sensitivities: [1.5],
      heights: [0.9],
    },
    visualizerVariant: {
      visualizerType: 'waveform-strip' as const,
      barCount: 24,
      sensitivity: 1.5,
      height: 0.9,
    },
    headlineTreatment: {
      fontSize: 52,
      fontWeight: '900',
      lineHeight: 1.04,
      width: 320,
    },
  },
};

const legacyElements = () => (
  DEFAULT_ELEMENTS.map((element): AdElement => {
    if (element.componentRole === 'headline') {
      return { ...element, content: 'Why AI recommends your competitors' };
    }
    return element;
  })
);

const mp4Blob = () => {
  const bytes = new Uint8Array(1200);
  bytes.set([0, 0, 0, 20, 102, 116, 121, 112], 0);
  return new Blob([bytes], { type: 'video/mp4' });
};

test('legacy create download helper sends an AdScene render ticket request', async () => {
  let submittedScene: any = null;
  let uploadedAudio: FormDataEntryValue | null = null;

  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);

    if (url.endsWith('/voice.mp3')) {
      return new Response(new Blob(['voice'], { type: 'audio/mpeg' }));
    }

    if (url.endsWith('/wiggly-logo.png')) {
      return new Response(new Blob(['logo'], { type: 'image/png' }));
    }

    if (url === '/api/render-scene-ticket') {
      const formData = init?.body as FormData;
      submittedScene = JSON.parse(String(formData.get('scene')));
      uploadedAudio = formData.get('audio');
      return Response.json({
        ticketId: 'ticket-1',
        filename: 'ogtool-render.mp4',
        downloadUrl: '/api/render-scene/ticket-1',
      });
    }

    if (url.endsWith('/api/render-scene/ticket-1')) {
      return new Response(mp4Blob(), { headers: { 'content-type': 'video/mp4' } });
    }

    return new Response('not found', { status: 404 });
  };

  const render = await requestLegacyCreateRenderDownload({
    brandBrain,
    variation,
    elements: legacyElements(),
    captions: [{ text: 'I just checked the numbers.', start: 0, end: 1.2, speaker: 1 }],
    platform: 'instagram-feed',
    backgroundColor: '#fafaf7',
    audioStatus: 'uploaded',
    audioUrl: '/voice.mp3',
    audioMimeType: 'audio/mpeg',
    validateMp4Blob: async () => {},
    fetcher,
  });

  expect(uploadedAudio).toBeInstanceOf(Blob);
  expect(submittedScene.id).toContain('legacy-create-ogtool');
  expect(submittedScene.platform).toBe('instagram-feed');
  expect(submittedScene.audio.status).toBe('uploaded');
  expect(submittedScene.audio.url).toBeNull();
  expect(render.filename).toBe('ogtool-render.mp4');
  expect(render.blob.type).toBe('video/mp4');
});

test('legacy create share metadata comes from the exported AdScene', () => {
  const scene = createLegacyCreateAdScene({
    brandBrain,
    variation,
    elements: legacyElements(),
    captions: [{ text: 'I just checked the numbers.', start: 0, end: 1.2, speaker: 1 }],
    platform: 'instagram-feed',
    backgroundColor: '#fafaf7',
    visualizerColor: '#93c5fd',
    ctaText: 'See the strategy',
    ctaUrl: 'ogtool.com',
    now: 1_717_200_000_000,
  });

  const metadata = buildShareMetadataFromAdScene(scene);

  expect(metadata.headline).toBe('Why AI recommends your competitors');
  expect(metadata.businessName).toBe('OGTool');
  expect(metadata.brandName).toBe('OGTool');
  expect(metadata.platform).toBe('instagram-feed');
  expect(metadata.ctaText).toBe('See the strategy');
  expect(metadata.ctaUrl).toBe('https://ogtool.com/');
});

test('legacy create AdScene metadata keeps the actual canvas logo image', () => {
  const scene = createLegacyCreateAdScene({
    brandBrain: {
      ...brandBrain,
      businessName: "David's Cookies",
      brandLogoUrl: 'https://profile.example/avatar.png',
      brandAssets: {
        ...brandBrain.brandAssets,
        images: {
          ...brandBrain.brandAssets.images,
          logo: 'https://brand-assets.example/fallback-logo.png',
        },
      },
    },
    variation: {
      ...variation,
      headline: 'Better Cookies, Better Choice',
    },
    elements: legacyElements().map((element) => (
      element.componentRole === 'logo'
        ? { ...element, imageUrl: 'https://davids-cookies.example/logo.png' }
        : element
    )),
    captions: [],
    platform: 'instagram-feed',
    backgroundColor: '#fafaf7',
    brandLogoUrl: 'https://profile.example/avatar.png',
    now: 1_717_200_000_000,
  });

  expect(scene.brand.logoUrl).toBe('https://davids-cookies.example/logo.png');
});

test('saved legacy create scenes can render without rebuilding from live variation state', async () => {
  let submittedScene: any = null;
  const savedScene = createLegacyCreateAdScene({
    brandBrain,
    variation,
    elements: legacyElements(),
    captions: [{ text: 'Saved scene caption.', start: 0, end: 1.2, speaker: 1 }],
    platform: 'instagram-feed',
    backgroundColor: '#fafaf7',
    audioStatus: 'none',
    now: 1_717_200_000_000,
  });

  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);

    if (url.endsWith('/wiggly-logo.png')) {
      return new Response(new Blob(['logo'], { type: 'image/png' }));
    }

    if (url === '/api/render-scene-ticket') {
      const formData = init?.body as FormData;
      submittedScene = JSON.parse(String(formData.get('scene')));
      return Response.json({
        ticketId: 'ticket-1',
        filename: 'saved-scene.mp4',
        downloadUrl: '/api/render-scene/ticket-1',
      });
    }

    if (url.endsWith('/api/render-scene/ticket-1')) {
      return new Response(mp4Blob(), { headers: { 'content-type': 'video/mp4' } });
    }

    return new Response('not found', { status: 404 });
  };

  const render = await requestAdSceneRenderDownload({
    scene: savedScene,
    validateMp4Blob: async () => {},
    fetcher,
  });

  expect(submittedScene.id).toBe(savedScene.id);
  expect(submittedScene.creative.headline).toBe('Why AI recommends your competitors');
  expect(render.filename).toBe('saved-scene.mp4');
});

test('legacy create keeps AdScene routes but downloads visible canvas through Remotion snapshots', () => {
  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(process.cwd(), 'src/features/create/CreatePage.tsx'), 'utf8');
  const createFlowSource = fs.readFileSync(path.join(process.cwd(), 'src/components/CreateFlow.tsx'), 'utf8');
  const exportControllerSource = fs.readFileSync(path.join(process.cwd(), 'src/features/create/useCreateExportController.ts'), 'utf8');
  const shareHookSource = fs.readFileSync(path.join(process.cwd(), 'src/features/share/useShareLink.ts'), 'utf8');
  const sharePagesSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/share-pages.ts'), 'utf8');

  expect(serverSource).toContain("app.post('/api/render-scene-ticket'");
  expect(serverSource).toContain("app.get('/api/render-scene/:ticketId'");
  expect(serverSource).toContain('renderAdSceneToMp4');
  expect(serverSource).toContain('createRenderSceneTicket');
  expect(serverSource).toContain('readRenderSceneTicket');
  expect(serverSource).toContain('saveShareSceneSnapshot');
  expect(serverSource).toContain('parseShareSceneBody');
  expect(appSource).not.toContain("import { requestAdSceneRenderDownload }");
  expect(appSource).not.toContain('useCreateExportController');
  expect(createPageSource).toContain('useCreateExportController');
  expect(createPageSource).toContain('createRemotionSnapshot');
  expect(exportControllerSource).toContain('currentCreateAdScene');
  expect(exportControllerSource).toContain('getCurrentLegacyCreateAdScene');
  expect(exportControllerSource).toContain('tryRemotionExport({ ...exportSnapshot, adScene: scene }');
  expect(exportControllerSource).toContain('adScene: exportSnapshot.adScene || null');
  expect(exportControllerSource).toContain('adScene?: AdScene | null');
  expect(createPageSource).toContain('setCurrentCreateAdScene(hydratedTemplate.adScene || null)');
  expect(createPageSource).toContain('saveCurrentTemplate(variation.headline, scene)');
  expect(exportControllerSource).toContain('snapshot: exportSnapshot');
  expect(shareHookSource).toContain('buildShareMetadataFromAdScene');
  expect(shareHookSource).toContain('scene: exportDownload.adScene || null');
  expect(sharePagesSource).toContain("formData.append('scene'");
  expect(createFlowSource).toContain('onDownloadVideo(activeVariation, brandBrain)');
});
