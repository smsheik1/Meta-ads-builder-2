import type { AdScene, AdSceneAudio, AdSceneAudioAnalysis, AdSceneCaption } from "../scene/types";

export const PINNED_TTS_MODEL = "gemini-3.1-flash-tts-preview";
export const UPLOADED_AUDIO_MODEL = "uploaded-audio";
export const MAX_CAPTION_WORDS_ON_SCREEN = 7;

const minimumAudioDurationMs = 4200;
const maximumAudioDurationMs = 28000;
export const MAX_CAPTION_EDIT_TEXT_LENGTH = 180;
const maxStoredAnalysisFps = 30;
const maxStoredAnalysisBands = 24;

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
  if (scene.format === "three-d-breakdown") {
    return scene.layout.scriptBeats
      .map((beat) => cleanText(beat.narration))
      .filter(Boolean);
  }

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
  scene.format === "three-d-breakdown"
    ? [
      "Read this as a cinematic but grounded explainer voiceover.",
      "Sound documentary, curious, and clear. Do not overact. Do not sound like a movie trailer.",
      "",
      createVoiceoverLines(scene).join(". "),
    ].join("\n")
    : [
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

const splitThreeDBreakdownCaptionLine = (value: string) => {
  const normalized = cleanText(value)
    .replace(/\bis built to protect\b/gi, "protects")
    .replace(/\bcan break\b/gi, "breaks")
    .replace(/\bcan scatter\b/gi, "scatters")
    .replace(/^(but|then|and|so)\s+/i, "")
    .replace(/\s+long before\b.+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const clauses = normalized
    .split(/\b(?:and|but|then|so|because|while|until)\b/i)
    .map((part) => cleanText(part).replace(/^(but|then|and|so)\s+/i, ""))
    .filter(Boolean);
  const chunks: string[] = [];
  const maxWords = 4;
  const maxChars = 32;
  const trailingPrepositions = new Set(["after", "before", "for", "from", "inside", "into", "of", "through", "to", "with"]);

  for (const clause of clauses.length ? clauses : [normalized]) {
    const words = clause.split(/\s+/).filter(Boolean);
    let current: string[] = [];

    for (const word of words) {
      const candidate = [...current, word].join(" ");
      if (current.length && (current.length + 1 > maxWords || candidate.length > maxChars)) {
        const trailingWord = current[current.length - 1]?.replace(/[^\w]+$/g, "").toLowerCase();
        if (trailingWord && trailingPrepositions.has(trailingWord) && current.length > 1) {
          const moved = current.pop()!;
          chunks.push(current.join(" "));
          current = [moved, word];
          continue;
        }
        chunks.push(current.join(" "));
        current = [word];
      } else {
        current.push(word);
      }
    }

    if (current.length) chunks.push(current.join(" "));
  }

  const last = chunks[chunks.length - 1];
  const previous = chunks[chunks.length - 2];
  if (
    last &&
    previous &&
    last.split(/\s+/).length <= 2 &&
    `${previous} ${last}`.length <= maxChars &&
    previous.split(/\s+/).length + last.split(/\s+/).length <= maxWords
  ) {
    chunks.splice(chunks.length - 2, 2, `${previous} ${last}`);
  }

  return chunks.filter(Boolean);
};

export const createCaptionsForVoiceover = (
  scene: AdScene,
  durationMs = estimateVoiceoverDurationMs(scene),
): AdSceneCaption[] => {
  if (scene.format === "three-d-breakdown") {
    const targetDurationMs = scene.layout.durationMs;
    const captions: AdSceneCaption[] = [];

    for (const beat of scene.layout.scriptBeats) {
      const chunks = splitThreeDBreakdownCaptionLine(beat.narration);
      const beatStart = Math.round((beat.startMs / targetDurationMs) * durationMs);
      const beatEnd = Math.round((beat.endMs / targetDurationMs) * durationMs);
      const weights = chunks.map((chunk) => Math.max(1, chunk.split(/\s+/).filter(Boolean).length));
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
      let cursor = beatStart;

      chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;
        const chunkDuration = isLast
          ? Math.max(360, beatEnd - cursor)
          : Math.max(360, Math.round(((beatEnd - beatStart) * weights[index]!) / totalWeight));
        const endMs = isLast ? beatEnd : Math.min(beatEnd, cursor + chunkDuration);
        captions.push({
          text: chunk,
          startMs: cursor,
          endMs,
        });
        cursor = endMs;
      });
    }

    return captions;
  }

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

const resampleIndex = (sourceLength: number, targetIndex: number, targetLength: number) => {
  if (sourceLength <= 1 || targetLength <= 1) return 0;
  return Math.min(
    sourceLength - 1,
    Math.max(0, Math.round((targetIndex / (targetLength - 1)) * (sourceLength - 1))),
  );
};

export const compactSceneAudioAnalysis = (
  analysis: AdSceneAudioAnalysis | null | undefined,
): AdSceneAudioAnalysis | undefined => {
  if (!analysis?.levels.length) return analysis || undefined;

  const sourceFps = Math.max(1, analysis.fps || maxStoredAnalysisFps);
  const sourceBands = analysis.bands[0]?.length || 0;
  if (sourceFps <= maxStoredAnalysisFps && sourceBands <= maxStoredAnalysisBands) {
    return analysis;
  }

  const targetFps = Math.min(sourceFps, maxStoredAnalysisFps);
  const targetBandCount = Math.max(0, Math.min(sourceBands, maxStoredAnalysisBands));
  const durationSeconds = analysis.levels.length / sourceFps;
  const targetFrameCount = Math.max(1, Math.ceil(durationSeconds * targetFps));
  const levels = Array.from({ length: targetFrameCount }, (_, index) => (
    analysis.levels[resampleIndex(analysis.levels.length, index, targetFrameCount)] ?? 0
  ));
  const bands = Array.from({ length: targetFrameCount }, (_, frameIndex) => {
    const sourceFrame = analysis.bands[resampleIndex(analysis.bands.length, frameIndex, targetFrameCount)] || [];
    return Array.from({ length: targetBandCount }, (_, bandIndex) => (
      sourceFrame[resampleIndex(sourceFrame.length, bandIndex, targetBandCount)] ?? 0
    ));
  });

  return {
    fps: targetFps,
    levels,
    bands,
  };
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
  provider?: "gemini" | "upload" | "elevenlabs" | "fish-studio";
}): AdSceneAudio => ({
  status: "generated",
  storageId,
  url,
  mimeType,
  durationMs,
  durationSeconds: durationMs / 1000,
  transcript,
  captions,
  analysis: compactSceneAudioAnalysis(analysis),
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

  if (current) return getCaptionWindowText(current, timeSeconds);
  const firstCaption = captions[0];
  if (firstCaption && timeMs < firstCaption.startMs) {
    return getCaptionWindowText(firstCaption, firstCaption.startMs / 1000);
  }
  return "";
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
