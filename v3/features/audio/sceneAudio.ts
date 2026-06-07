import type { AdScene, AdSceneAudio, AdSceneAudioAnalysis, AdSceneCaption } from "../scene/types";

export const PINNED_TTS_MODEL = "gemini-3.1-flash-tts-preview";

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
}: {
  storageId: string;
  url: string;
  mimeType: string;
  durationMs: number;
  transcript: string;
  captions: AdSceneCaption[];
  analysis?: AdSceneAudioAnalysis;
  model: string;
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
  provider: "gemini",
  model,
  generatedAt: Date.now(),
});

export const getVisibleCaptionText = (
  audio: AdSceneAudio,
  timeSeconds: number,
) => {
  if (audio.status !== "generated") return "";

  const timeMs = Math.max(0, timeSeconds * 1000);
  const current = audio.captions.find((caption) => (
    timeMs >= caption.startMs && timeMs <= caption.endMs
  ));

  return current?.text || audio.captions[0]?.text || "";
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
