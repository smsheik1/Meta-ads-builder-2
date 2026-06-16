import type { AdScene, AdSceneAudio, AdSceneAudioAnalysis, AdSceneCaption } from "../scene/types";

export const PINNED_TTS_MODEL = "gemini-3.1-flash-tts-preview";
export const UPLOADED_AUDIO_MODEL = "uploaded-audio";
export const MAX_CAPTION_WORDS_ON_SCREEN = 7;

const minimumAudioDurationMs = 4200;
const maximumAudioDurationMs = 28000;
export const MAX_CAPTION_EDIT_TEXT_LENGTH = 180;

const cleanText = (value: unknown) => String(value ?? "")
  .replace(/[—–]/g, ", ")
  .replace(/\s+/g, " ")
  .trim();

export const getSceneAudioKey = (scene: AdScene) => [
  scene.metadata.generationBatchId,
  scene.metadata.candidateIndex,
  scene.creative.angleId,
].join(":");

export const createVoiceoverLines = (scene: AdScene) => {
  const proof = cleanText(scene.creative.selectedProof);
  const subheadline = cleanText(scene.creative.subheadline);
  const cta = cleanText(scene.creative.ctaText);

  return [
    cleanText(scene.creative.headline),
    proof || subheadline,
    cta,
  ].filter(Boolean);
};

export const createVoiceoverPrompt = (scene: AdScene) => (
  [
    "Read this as a short, natural Meta ad voiceover.",
    "Sound conversational, confident, and human. Do not sound like a movie trailer or corporate pitch.",
    "",
    createVoiceoverLines(scene).join(". "),
  ].join("\n")
);

export const estimateVoiceoverDurationMs = (scene: AdScene) => {
  const words = createVoiceoverLines(scene)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(
    minimumAudioDurationMs,
    Math.min(maximumAudioDurationMs, Math.round((words / 2.45) * 1000)),
  );
};

export const createCaptionsForVoiceover = (
  scene: AdScene,
  durationMs = estimateVoiceoverDurationMs(scene),
): AdSceneCaption[] => {
  const lines = createVoiceoverLines(scene);
  const weights = lines.map((line) => Math.max(3, line.split(/\s+/).filter(Boolean).length));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;

  return lines.map((line, index) => {
    const isLast = index === lines.length - 1;
    const lineDuration = isLast
      ? Math.max(700, durationMs - cursor)
      : Math.max(1000, Math.round((weights[index] / totalWeight) * durationMs));
    const startMs = cursor;
    const endMs = isLast ? durationMs : Math.min(durationMs, cursor + lineDuration);
    cursor = endMs;

    return {
      text: cleanText(line),
      startMs,
      endMs,
    };
  });
};

export const createGeneratedSceneAudio = ({
  storageId,
  url,
  mimeType,
  durationMs,
  transcript,
  captions,
  analysis,
  model,
  provider = "gemini",
}: {
  storageId: string;
  url: string;
  mimeType: string;
  durationMs: number;
  transcript: string;
  captions: AdSceneCaption[];
  analysis?: AdSceneAudioAnalysis;
  model: string;
  provider?: "gemini" | "upload" | "elevenlabs";
}): AdSceneAudio => ({
  status: "generated",
  storageId,
  url,
  mimeType,
  durationMs,
  durationSeconds: durationMs / 1000,
  transcript,
  captions,
  analysis,
  provider,
  model,
  generatedAt: Date.now(),
});

export const hasDisplayableCaptionTrack = (audio: AdSceneAudio) => (
  audio.status === "generated" &&
  audio.captions.some((caption) => cleanText(caption.text))
);

export const getVisibleCaptionText = (
  audio: AdSceneAudio,
  timeSeconds: number,
) => {
  if (audio.status !== "generated") return "";
  if (!hasDisplayableCaptionTrack(audio)) return "";

  const timeMs = Math.max(0, timeSeconds * 1000);
  const captions = audio.captions.filter((caption) => cleanText(caption.text));
  const current = captions.find((caption) => (
    timeMs >= caption.startMs && timeMs <= caption.endMs
  ));

  return current
    ? getCaptionWindowText(current, timeSeconds)
    : getCaptionWindowText(captions[0], captions[0]?.startMs ? captions[0].startMs / 1000 : 0);
};

export const getCaptionWindowText = (
  caption: AdSceneCaption | undefined,
  timeSeconds: number,
) => {
  if (!caption) return "";
  const words = cleanText(caption.text).split(/\s+/).filter(Boolean);
  if (words.length <= MAX_CAPTION_WORDS_ON_SCREEN) return cleanText(caption.text);

  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += MAX_CAPTION_WORDS_ON_SCREEN) {
    chunks.push(words.slice(index, index + MAX_CAPTION_WORDS_ON_SCREEN).join(" "));
  }

  const durationSeconds = Math.max(0.001, (caption.endMs - caption.startMs) / 1000);
  const progress = Math.min(
    0.999999,
    Math.max(0, (timeSeconds - caption.startMs / 1000) / durationSeconds),
  );
  return chunks[Math.min(chunks.length - 1, Math.floor(progress * chunks.length))] || "";
};

export const updateGeneratedAudioCaptionText = (
  audio: AdSceneAudio,
  captionIndex: number,
  text: string,
): AdSceneAudio => {
  if (audio.status !== "generated") return audio;
  if (!audio.captions[captionIndex]) return audio;

  const safeText = text
    .replace(/[\r\n]+/g, " ")
    .slice(0, MAX_CAPTION_EDIT_TEXT_LENGTH);
  const captions = audio.captions.map((caption, index) => (
    index === captionIndex ? { ...caption, text: safeText } : caption
  ));

  return {
    ...audio,
    transcript: captions.map((caption) => caption.text.trim()).filter(Boolean).join("\n"),
    captions,
  };
};
