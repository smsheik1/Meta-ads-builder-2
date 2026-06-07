import { GoogleGenAI } from "@google/genai";
import { analyzeGeneratedWavAudio } from "./audioAnalysis";
import {
  captionsFromDialogueScript,
  cleanDialogueScriptForVoiceover,
  type DialogueScript,
} from "../dialogue/dialogueScripts";
import type { AdSceneAudioAnalysis, AdSceneCaption } from "../scene/types";
import {
  createCaptionsForVoiceover,
  createVoiceoverLines,
  createVoiceoverPrompt,
  estimateVoiceoverDurationMs,
  PINNED_TTS_MODEL,
} from "./sceneAudio";
import type { AdScene } from "../scene/types";

export type GeminiVoiceoverResult = {
  bytes: Uint8Array;
  mimeType: string;
  transcript: string;
  captions: AdSceneCaption[];
  analysis?: AdSceneAudioAnalysis;
  durationMs: number;
  provider: "gemini";
  model: string;
};

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const base64ToBytes = (base64: string) => Uint8Array.from(
  atob(base64),
  (char) => char.charCodeAt(0),
);

const pcmBase64ToWavBytes = (
  pcmBase64: string,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
) => {
  const pcm = base64ToBytes(pcmBase64);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;

  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, "data");
  view.setUint32(40, pcm.length, true);

  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  return wav;
};

const getWavDurationMs = (bytes: Uint8Array) => {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteRate = view.getUint32(28, true);
  const dataBytes = view.getUint32(40, true);
  if (!byteRate || !dataBytes) return null;
  return Math.round((dataBytes / byteRate) * 1000);
};

export async function generateGeminiVoiceover(
  scene: AdScene,
  options: { apiKey?: string; model?: string } = {},
): Promise<GeminiVoiceoverResult> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const model = options.model ?? process.env.TTS_MODEL ?? PINNED_TTS_MODEL;

  if (!apiKey || isDisabled(process.env.GEMINI_ENABLED) || isDisabled(process.env.TTS_ENABLED)) {
    throw new Error("Gemini TTS is not configured.");
  }

  if (model !== PINNED_TTS_MODEL) {
    throw new Error(`Speech generation is pinned to ${PINNED_TTS_MODEL}.`);
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: createVoiceoverPrompt(scene) }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Puck",
          },
        },
      },
    },
  } as Parameters<typeof ai.models.generateContent>[0]);

  const inlineData = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inlineData?.data) throw new Error("No audio returned from Gemini TTS.");

  const mimeType = inlineData.mimeType || "audio/L16;codec=pcm;rate=24000";
  const normalizedMimeType = mimeType.toLowerCase();
  const sampleRate = Number(normalizedMimeType.match(/rate=(\d+)/)?.[1] || 24000);
  const channels = Number(normalizedMimeType.match(/channels=(\d+)/)?.[1] || 1);
  const isPcm = normalizedMimeType.includes("audio/l16") || normalizedMimeType.includes("pcm");
  const bytes = isPcm ? pcmBase64ToWavBytes(inlineData.data, sampleRate, channels) : base64ToBytes(inlineData.data);
  const finalMimeType = isPcm ? "audio/wav" : mimeType;
  const durationMs = finalMimeType === "audio/wav"
    ? getWavDurationMs(bytes) ?? estimateVoiceoverDurationMs(scene)
    : estimateVoiceoverDurationMs(scene);
  const captions = createCaptionsForVoiceover(scene, durationMs);
  const analysis = finalMimeType === "audio/wav" ? analyzeGeneratedWavAudio(bytes) ?? undefined : undefined;

  return {
    bytes,
    mimeType: finalMimeType,
    transcript: createVoiceoverLines(scene).join("\n"),
    captions,
    analysis,
    durationMs,
    provider: "gemini",
    model,
  };
}

const createDialogueVoiceoverPrompt = (script: DialogueScript) => {
  const cleaned = cleanDialogueScriptForVoiceover(script);
  return [
    "Read this as a natural, subtle, two-person conversation for a Meta ad.",
    "Keep it conversational and not salesy.",
    "Do not add extra lines, em dashes, choppy dramatic pauses, forced contrast phrasing, or robotic cadence.",
    "",
    ...cleaned.lines.map((line) => `${line.speaker}: [${line.tone || "natural"}] ${line.text}`),
  ].join("\n");
};

const getDialogueSpeakers = (script: DialogueScript) => {
  const speakers = Array.from(new Set(
    cleanDialogueScriptForVoiceover(script).lines
      .map((line) => line.speaker)
      .filter(Boolean),
  )).slice(0, 2);
  while (speakers.length < 2) speakers.push(`Speaker ${speakers.length + 1}`);
  return speakers;
};

export async function generateGeminiDialogueVoiceover(
  script: DialogueScript,
  options: { apiKey?: string; model?: string } = {},
): Promise<GeminiVoiceoverResult> {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const model = options.model ?? process.env.TTS_MODEL ?? PINNED_TTS_MODEL;

  if (!apiKey || isDisabled(process.env.GEMINI_ENABLED) || isDisabled(process.env.TTS_ENABLED)) {
    throw new Error("Gemini TTS is not configured.");
  }

  if (model !== PINNED_TTS_MODEL) {
    throw new Error(`Speech generation is pinned to ${PINNED_TTS_MODEL}.`);
  }

  const cleanedScript = cleanDialogueScriptForVoiceover(script);
  if (cleanedScript.lines.length < 2) throw new Error("Dialogue script needs at least two lines.");

  const speakers = getDialogueSpeakers(cleanedScript);
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: createDialogueVoiceoverPrompt(cleanedScript) }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: speakers[0],
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Zephyr",
                },
              },
            },
            {
              speaker: speakers[1],
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck",
                },
              },
            },
          ],
        },
      },
    },
  } as Parameters<typeof ai.models.generateContent>[0]);

  const inlineData = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inlineData?.data) throw new Error("No audio returned from Gemini TTS.");

  const mimeType = inlineData.mimeType || "audio/L16;codec=pcm;rate=24000";
  const normalizedMimeType = mimeType.toLowerCase();
  const sampleRate = Number(normalizedMimeType.match(/rate=(\d+)/)?.[1] || 24000);
  const channels = Number(normalizedMimeType.match(/channels=(\d+)/)?.[1] || 1);
  const isPcm = normalizedMimeType.includes("audio/l16") || normalizedMimeType.includes("pcm");
  const bytes = isPcm ? pcmBase64ToWavBytes(inlineData.data, sampleRate, channels) : base64ToBytes(inlineData.data);
  const finalMimeType = isPcm ? "audio/wav" : mimeType;
  const durationMs = finalMimeType === "audio/wav"
    ? getWavDurationMs(bytes) ?? Math.max(4200, cleanedScript.lines.length * 1800)
    : Math.max(4200, cleanedScript.lines.length * 1800);
  const captions = captionsFromDialogueScript(cleanedScript, durationMs);
  const analysis = finalMimeType === "audio/wav" ? analyzeGeneratedWavAudio(bytes) ?? undefined : undefined;
  const transcript = cleanedScript.lines.map((line) => `${line.speaker}: ${line.text}`).join("\n");

  return {
    bytes,
    mimeType: finalMimeType,
    transcript,
    captions,
    analysis,
    durationMs,
    provider: "gemini",
    model,
  };
}
