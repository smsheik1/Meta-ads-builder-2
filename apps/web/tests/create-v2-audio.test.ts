import assert from 'node:assert/strict';
import { BillShieldError, assertAudioRouteAllowed } from '../features/audio/billShield';
import {
  generateDialogueScripts,
  normalizeDialogueScripts,
  scriptCacheMatches,
  type DialogueScript,
} from '../features/audio/dialogueScripts';
import {
  createCaptionsForScript,
  generateGeminiDialogueAudio,
  scriptToTranscript,
} from '../features/audio/geminiTts';

const test = async (name: string, run: () => void | Promise<void>) => {
  try {
    await run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
};

const script: DialogueScript = {
  id: 'chatgpt-mentions',
  title: 'AI visibility proof',
  angle: 'A founder notices competitors showing up first',
  lines: [
    {
      speaker: 'Ava',
      tone: 'surprised',
      text: 'Just checked ChatGPT again, two competitors show up before us.',
    },
    {
      speaker: 'Sam',
      tone: 'calm',
      text: 'Yeah, that was our exact problem last month.',
    },
    {
      speaker: 'Ava',
      tone: 'curious',
      text: 'What changed after you fixed the Reddit visibility?',
    },
    {
      speaker: 'Sam',
      tone: 'assured',
      text: 'First AI ranking showed up in 14 days.',
    },
  ],
};

await test('script cache only reuses options for the same scene', () => {
  assert.equal(scriptCacheMatches('scene-a', 'scene-a', [script]), true);
  assert.equal(scriptCacheMatches('scene-b', 'scene-a', [script]), false);
  assert.equal(scriptCacheMatches('scene-a', 'scene-a', []), false);
});

await test('normalizes dialogue scripts and rejects infomercial phrases', () => {
  const scripts = normalizeDialogueScripts({
    scripts: [
      script,
      {
        title: 'Bad option',
        angle: 'Pitchy',
        lines: [
          { text: "I'm worried this tool is not working" },
          { text: 'This tool will transform your business' },
          { text: 'Will that really make a difference' },
          { text: 'It is a revolutionary game-changer' },
        ],
      },
    ],
  }, 5);

  assert.equal(scripts.length, 1);
  assert.equal(scripts[0]?.title, script.title);
});

await test('caption timing is deterministic and covers the whole script duration', () => {
  const captions = createCaptionsForScript(script, 8000);

  assert.equal(captions.length, script.lines.length);
  assert.equal(captions[0]?.startMs, 0);
  assert.equal(captions.at(-1)?.endMs, 8000);
  assert.equal(captions[0]?.speaker, 'a');
  assert.equal(captions[1]?.speaker, 'b');
});

await test('transcript preserves selected script words', () => {
  const transcript = scriptToTranscript(script);

  assert.match(transcript, /Ava: Just checked ChatGPT/);
  assert.match(transcript, /Sam: First AI ranking/);
});

await test('Gemini TTS fails loudly when not configured', async () => {
  await assert.rejects(
    () => generateGeminiDialogueAudio(script, { apiKey: '' }),
    /Gemini 3.1 Flash TTS is not configured/,
  );
});

await test('Groq script timeout errors do not leak raw abort messages', async () => {
  await assert.rejects(
    () => generateDialogueScripts({
      id: 'scene-test',
      version: 1,
      brand: {
        name: 'OGTool',
        websiteUrl: 'https://ogtool.com/',
        logoUrl: null,
        faviconUrl: null,
        offer: 'Managed Reddit and AI visibility campaigns.',
        audience: 'D2C operators',
        receipts: {
          specificClaims: ['First AI ranking in 14 days'],
          buyerMoments: ['A founder sees competitors showing up first'],
          exactSiteLanguage: ['ChatGPT Mentions in 14 Days'],
          namedProof: [],
          reviews: [],
        },
      },
      platform: 'instagram-feed',
      creative: {
        angleId: 'test',
        headline: 'ChatGPT Mentions in 14 Days',
        subheadline: 'Managed Reddit visibility campaigns.',
        ctaText: 'Learn More',
        ctaUrl: 'https://ogtool.com/',
        backgroundColor: '#ffffff',
        accentColor: '#7dd3fc',
        visualizer: {
          color: '#7dd3fc',
          idlePreset: 'wide-soft-bars',
          playbackPreset: 'voice-reactive-bars',
        },
      },
      audio: {
        status: 'none',
        url: null,
        transcript: '',
        captions: [],
        brandKey: null,
        sourceSceneId: null,
        scriptId: null,
        durationMs: null,
      },
      layout: {
        brand: { x: 0.5, y: 0.18, width: 0.78, height: 0.08 },
        headline: { x: 0.5, y: 0.35, width: 0.86, height: 0.22 },
        visualizer: { x: 0.5, y: 0.57, width: 0.96, height: 0.18 },
        caption: { x: 0.5, y: 0.75, width: 0.82, height: 0.14 },
      },
      locks: {
        headline: false,
        subheadline: false,
        logo: false,
        visualizer: false,
        audio: false,
      },
      createdAt: 1,
      updatedAt: 1,
    }, {
      apiKey: 'test-groq-key',
      fetcher: async () => {
        throw new DOMException('This operation was aborted', 'AbortError');
      },
    }),
    (error) => (
      error instanceof Error &&
      /Voice script generation took too long/.test(error.message) &&
      !/This operation was aborted/.test(error.message)
    ),
  );
});

await test('audio bill shield can disable expensive routes', () => {
  const previous = process.env.TEST_AUDIO_DISABLED;
  process.env.TEST_AUDIO_DISABLED = 'false';

  assert.throws(
    () => assertAudioRouteAllowed('audioGeneration', new Request('https://example.com'), 'TEST_AUDIO_DISABLED'),
    (error) => error instanceof BillShieldError && error.status === 503,
  );

  if (previous === undefined) {
    delete process.env.TEST_AUDIO_DISABLED;
  } else {
    process.env.TEST_AUDIO_DISABLED = previous;
  }
});
