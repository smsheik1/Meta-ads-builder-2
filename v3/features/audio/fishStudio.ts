import { analyzeGeneratedWavAudio } from "./audioAnalysis";
import {
  createCaptionsForVoiceover,
  createVoiceoverLines,
} from "./sceneAudio";
import type { AdSceneCaption, BrainrotAdScene, ThreeDBreakdownAdScene } from "../scene/types";
import {
  BRAINROT_LEFT_VOICE_ID,
  BRAINROT_RIGHT_VOICE_ID,
} from "../formats/brainrot/prompt";

const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
export const FISH_STUDIO_BRAINROT_MODEL = "fish-audio/s2-pro";
export const THREE_D_BREAKDOWN_ZACH_STYLE_VOICE_ID = "0873499c22e24d13b074fa76d27562e5";
export const FISH_STUDIO_THREE_D_BREAKDOWN_MODEL = `fish-audio/s2-pro:${THREE_D_BREAKDOWN_ZACH_STYLE_VOICE_ID}`;
const fishSampleRate = 44_100;
const fishChannels = 1;
const fishBitsPerSample = 16;

type ParsedWav = {
  pcm: Uint8Array;
  durationMs: number;
};

const readAscii = (bytes: Uint8Array, offset: number, length: number) => (
  Array.from(bytes.slice(offset, offset + length)).map((char) => String.fromCharCode(char)).join("")
);

const readUint16 = (bytes: Uint8Array, offset: number) => (
  new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true)
);

const readUint32 = (bytes: Uint8Array, offset: number) => (
  new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true)
);

const writeAscii = (bytes: Uint8Array, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
};

const writeUint16 = (bytes: Uint8Array, offset: number, value: number) => {
  new DataView(bytes.buffer, bytes.byteOffset + offset, 2).setUint16(0, value, true);
};

const writeUint32 = (bytes: Uint8Array, offset: number, value: number) => {
  new DataView(bytes.buffer, bytes.byteOffset + offset, 4).setUint32(0, value, true);
};

export const parsePcmWav = (bytes: Uint8Array): ParsedWav => {
  if (bytes.length < 44 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WAVE") {
    throw new Error("Fish Studio returned audio that was not a WAV file.");
  }

  let cursor = 12;
  let format: {
    audioFormat: number;
    channels: number;
    sampleRate: number;
    byteRate: number;
    bitsPerSample: number;
  } | null = null;
  let data: { offset: number; size: number } | null = null;

  while (cursor + 8 <= bytes.length) {
    const id = readAscii(bytes, cursor, 4);
    const size = readUint32(bytes, cursor + 4);
    const offset = cursor + 8;

    if (id === "fmt " && offset + 16 <= bytes.length) {
      format = {
        audioFormat: readUint16(bytes, offset),
        channels: readUint16(bytes, offset + 2),
        sampleRate: readUint32(bytes, offset + 4),
        byteRate: readUint32(bytes, offset + 8),
        bitsPerSample: readUint16(bytes, offset + 14),
      };
    }

    if (id === "data") {
      data = {
        offset,
        size: Math.min(size, bytes.length - offset),
      };
    }

    cursor = offset + size + (size % 2);
    if (format && data) break;
  }

  if (!format || !data) throw new Error("Fish Studio returned a WAV file without audio data.");
  if (format.audioFormat !== 1 || format.channels !== fishChannels || format.sampleRate !== fishSampleRate || format.bitsPerSample !== fishBitsPerSample) {
    throw new Error(`Fish Studio returned unsupported WAV format: ${format.channels}ch ${format.sampleRate}Hz ${format.bitsPerSample}-bit.`);
  }

  return {
    pcm: bytes.slice(data.offset, data.offset + data.size),
    durationMs: Math.round((data.size / Math.max(1, format.byteRate)) * 1000),
  };
};

export const buildPcmWav = (pcm: Uint8Array): Uint8Array => {
  const bytesPerSample = fishBitsPerSample / 8;
  const byteRate = fishSampleRate * fishChannels * bytesPerSample;
  const blockAlign = fishChannels * bytesPerSample;
  const wav = new Uint8Array(44 + pcm.length);

  writeAscii(wav, 0, "RIFF");
  writeUint32(wav, 4, 36 + pcm.length);
  writeAscii(wav, 8, "WAVE");
  writeAscii(wav, 12, "fmt ");
  writeUint32(wav, 16, 16);
  writeUint16(wav, 20, 1);
  writeUint16(wav, 22, fishChannels);
  writeUint32(wav, 24, fishSampleRate);
  writeUint32(wav, 28, byteRate);
  writeUint16(wav, 32, blockAlign);
  writeUint16(wav, 34, fishBitsPerSample);
  writeAscii(wav, 36, "data");
  writeUint32(wav, 40, pcm.length);
  wav.set(pcm, 44);

  return wav;
};

const silencePcm = (durationMs: number) => {
  const sampleCount = Math.round((durationMs / 1000) * fishSampleRate);
  return new Uint8Array(sampleCount * fishChannels * (fishBitsPerSample / 8));
};

const concatUint8Arrays = (arrays: Uint8Array[]) => {
  const totalLength = arrays.reduce((sum, bytes) => sum + bytes.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((bytes) => {
    output.set(bytes, offset);
    offset += bytes.length;
  });
  return output;
};

export const stitchBrainrotWavClips = ({
  scene,
  wavClips,
}: {
  scene: BrainrotAdScene;
  wavClips: Uint8Array[];
}) => {
  if (wavClips.length !== scene.layout.beats.length) {
    throw new Error("Fish Studio stitching failed because beat audio count did not match the script.");
  }

  const pieces: Uint8Array[] = [];
  let cursorMs = 0;
  const nextBeats = scene.layout.beats.map((beat, index) => {
    const parsed = parsePcmWav(wavClips[index]);
    const startMs = cursorMs;
    pieces.push(parsed.pcm);
    cursorMs += parsed.durationMs;
    if (index < wavClips.length - 1 && scene.layout.beatGapMs > 0) {
      pieces.push(silencePcm(scene.layout.beatGapMs));
      cursorMs += scene.layout.beatGapMs;
    }
    return {
      ...beat,
      startMs,
      durationMs: parsed.durationMs,
    };
  });
  const pcm = concatUint8Arrays(pieces);
  const bytes = buildPcmWav(pcm);
  const durationMs = cursorMs;
  const captions: AdSceneCaption[] = nextBeats.map((beat) => ({
    text: beat.text,
    startMs: beat.startMs || 0,
    endMs: (beat.startMs || 0) + (beat.durationMs || 0),
  }));

  return {
    bytes,
    durationMs,
    transcript: nextBeats.map((beat) => beat.text).join("\n"),
    captions,
    analysis: analyzeGeneratedWavAudio(bytes) || undefined,
    scene: {
      ...scene,
      layout: {
        ...scene.layout,
        beats: nextBeats,
      },
    },
  };
};

const voiceIdForSpeaker = (speaker: "left" | "right") => (
  speaker === "left" ? BRAINROT_LEFT_VOICE_ID : BRAINROT_RIGHT_VOICE_ID
);

const generateFishWav = async ({
  apiKey,
  fetcher,
  speed = 1.2,
  text,
  voiceId,
}: {
  apiKey: string;
  fetcher: typeof fetch;
  speed?: number;
  text: string;
  voiceId: string;
}) => {
  const response = await fetcher(FISH_TTS_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "model": "s2-pro",
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      temperature: 0.35,
      top_p: 0.55,
      format: "wav",
      sample_rate: fishSampleRate,
      normalize: true,
      latency: "normal",
      chunk_length: 100,
      min_chunk_length: 0,
      max_new_tokens: 1024,
      repetition_penalty: 1.2,
      condition_on_previous_chunks: false,
      early_stop_threshold: 1,
      prosody: {
        speed,
        volume: 0,
        normalize_loudness: true,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Fish Studio brainrot voice failed with ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error("Fish Studio brainrot voice returned empty audio.");
  return bytes;
};

export async function generateFishBrainrotDialogue({
  apiKey = process.env.FISH_STUDIO_APIKEY,
  fetcher = fetch,
  scene,
}: {
  apiKey?: string;
  fetcher?: typeof fetch;
  scene: BrainrotAdScene;
}) {
  if (!apiKey) throw new Error("Fish Studio brainrot audio is not configured.");
  if (scene.audio.status === "generated") throw new Error("This brainrot scene already has generated audio.");

  const wavClips: Uint8Array[] = [];
  for (const beat of scene.layout.beats) {
    wavClips.push(await generateFishWav({
      apiKey,
      fetcher,
      text: beat.text,
      voiceId: voiceIdForSpeaker(beat.speaker),
    }));
  }

  const stitched = stitchBrainrotWavClips({ scene, wavClips });
  return {
    ...stitched,
    mimeType: "audio/wav",
    model: FISH_STUDIO_BRAINROT_MODEL,
    provider: "fish-studio" as const,
  };
}

export async function generateFishThreeDBreakdownVoiceover({
  apiKey = process.env.FISH_STUDIO_APIKEY,
  fetcher = fetch,
  scene,
}: {
  apiKey?: string;
  fetcher?: typeof fetch;
  scene: ThreeDBreakdownAdScene;
}) {
  if (!apiKey) throw new Error("Fish Studio 3D Breakdown voice is not configured.");
  if (scene.audio.status === "generated") throw new Error("This 3D Breakdown already has generated audio.");

  const lines = createVoiceoverLines(scene);
  const bytes = await generateFishWav({
    apiKey,
    fetcher,
    speed: 1.1,
    text: lines.join(". "),
    voiceId: THREE_D_BREAKDOWN_ZACH_STYLE_VOICE_ID,
  });
  const parsed = parsePcmWav(bytes);

  return {
    bytes,
    mimeType: "audio/wav",
    durationMs: parsed.durationMs,
    transcript: lines.join("\n"),
    captions: createCaptionsForVoiceover(scene, parsed.durationMs),
    analysis: analyzeGeneratedWavAudio(bytes) || undefined,
    model: FISH_STUDIO_THREE_D_BREAKDOWN_MODEL,
    provider: "fish-studio" as const,
  };
}
