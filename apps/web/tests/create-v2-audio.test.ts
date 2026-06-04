import assert from 'node:assert/strict';
import { BillShieldError, assertAudioRouteAllowed } from '../features/audio/billShield';
import {
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
