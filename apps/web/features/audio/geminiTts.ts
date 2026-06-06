import { GoogleGenAI } from '@google/genai';
import type { AdSceneCaption } from '@/features/engine/scene';
import type { DialogueScript } from './dialogueScripts';

export type GenerateDialogueAudioOptions = {
  apiKey?: string;
  model?: string;
};

export type DialogueAudioResult = {
  audioBase64: string;
  mimeType: string;
  transcript: string;
  captions: AdSceneCaption[];
  durationMs: number;
  provider: 'gemini';
  model: string;
};

const PINNED_TTS_MODEL = 'gemini-3.1-flash-tts-preview';

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ''));

const cleanText = (value: unknown) => String(value ?? '')
  .replace(/[—–]/g, ', ')
  .replace(/\s+/g, ' ')
  .trim();

const pcmBase64ToWavBase64 = (pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) => {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]).toString('base64');
};

const getWavDurationMs = (wavBase64: string) => {
  const wav = Buffer.from(wavBase64, 'base64');
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF') return null;
  const byteRate = wav.readUInt32LE(28);
  const dataBytes = wav.readUInt32LE(40);
  if (!byteRate || !dataBytes) return null;
  return Math.round((dataBytes / byteRate) * 1000);
};

const estimateDurationMs = (script: DialogueScript) => {
  const words = script.lines.flatMap((line) => line.text.split(/\s+/).filter(Boolean)).length;
  return Math.max(4200, Math.min(28_000, Math.round((words / 2.45) * 1000)));
};

export const scriptToTranscript = (script: DialogueScript) => (
  script.lines.map((line) => `${line.speaker}: ${cleanText(line.text)}`).join('\n')
);

export const createCaptionsForScript = (
  script: DialogueScript,
  durationMs = estimateDurationMs(script),
): AdSceneCaption[] => {
  const weights = script.lines.map((line) => Math.max(3, line.text.split(/\s+/).filter(Boolean).length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;

  return script.lines.map((line, index) => {
    const isLast = index === script.lines.length - 1;
    const lineDuration = isLast
      ? Math.max(700, durationMs - cursor)
      : Math.max(1000, Math.round((weights[index] / totalWeight) * durationMs));
    const startMs = cursor;
    const endMs = isLast ? durationMs : Math.min(durationMs, cursor + lineDuration);
    cursor = endMs;

    return {
      text: cleanText(line.text),
      startMs,
      endMs,
      speaker: line.speaker === 'Sam' ? 'b' : 'a',
    };
  });
};

export const generateGeminiDialogueAudio = async (
  script: DialogueScript,
  options: GenerateDialogueAudioOptions = {},
): Promise<DialogueAudioResult> => {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const model = options.model ?? process.env.TTS_MODEL ?? PINNED_TTS_MODEL;

  if (!apiKey || isDisabled(process.env.GEMINI_ENABLED) || isDisabled(process.env.TTS_ENABLED)) {
    throw new Error('Gemini 3.1 Flash TTS is not configured.');
  }

  if (model !== PINNED_TTS_MODEL) {
    throw new Error(`Speech generation is pinned to ${PINNED_TTS_MODEL}.`);
  }

  const cleanedLines = script.lines.map((line) => ({
    ...line,
    text: cleanText(line.text),
  }));
  const ttsText = `Read this as a natural, subtle, two-person conversation for a Meta ad. Keep it conversational and not salesy. Do not add em dashes, choppy dramatic pauses, forced contrast phrasing, or robotic cadence.\n\n${cleanedLines.map((line) => `${line.speaker}: [${line.tone || 'natural'}] ${line.text}`).join('\n')}`;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: ttsText }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'Ava',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            {
              speaker: 'Sam',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
          ],
        },
      },
    },
  } as Parameters<typeof ai.models.generateContent>[0]);

  const inlineData = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inlineData?.data) {
    throw new Error('No audio returned from Gemini TTS.');
  }

  const mimeType = inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
  const normalizedMimeType = mimeType.toLowerCase();
  const sampleRate = Number(normalizedMimeType.match(/rate=(\d+)/)?.[1] || 24000);
  const channels = Number(normalizedMimeType.match(/channels=(\d+)/)?.[1] || 1);
  const isPcm = normalizedMimeType.includes('audio/l16') || normalizedMimeType.includes('pcm');
  const audioBase64 = isPcm ? pcmBase64ToWavBase64(inlineData.data, sampleRate, channels) : inlineData.data;
  const finalMimeType = isPcm ? 'audio/wav' : mimeType;
  const durationMs = finalMimeType === 'audio/wav'
    ? getWavDurationMs(audioBase64) ?? estimateDurationMs(script)
    : estimateDurationMs(script);

  return {
    audioBase64,
    mimeType: finalMimeType,
    transcript: scriptToTranscript(script),
    captions: createCaptionsForScript(script, durationMs),
    durationMs,
    provider: 'gemini',
    model,
  };
};
