import type { AdSceneCaption } from "../scene/types";

const deepgramListenUrl = "https://api.deepgram.com/v1/listen?smart_format=true&punctuate=true&utterances=true&diarize=true";
export const DEEPGRAM_TRANSCRIPTION_MODEL = "deepgram-listen-smart-format-diarized";

type DeepgramWord = {
  word?: string;
  punctuated_word?: string;
  start?: number;
  end?: number;
};

type DeepgramUtterance = {
  words?: DeepgramWord[];
  transcript?: string;
  text?: string;
  start?: number;
  end?: number;
  speaker?: number;
};

type DeepgramResponse = {
  results?: {
    utterances?: DeepgramUtterance[];
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
      }>;
    }>;
  };
};

export type DeepgramTranscription = {
  transcript: string;
  captions: AdSceneCaption[];
};

const isDisabled = (value: string | undefined) => /^(0|false|off|disabled)$/i.test(String(value || ""));

const cleanCaptionText = (text: string) => text
  .replace(/\bchat\s*gp\b/gi, "ChatGPT")
  .replace(/\bchat\s*gpt\b/gi, "ChatGPT")
  .replace(/\bchatgp\b/gi, "ChatGPT")
  .replace(/[—–]/g, ", ")
  .replace(/\s+/g, " ")
  .trim();

const speakerFromDeepgram = (speaker: unknown): 1 | 2 => {
  const value = Number(speaker);
  if (!Number.isFinite(value)) return 1;
  return value % 2 === 0 ? 1 : 2;
};

const wordText = (word: DeepgramWord) => cleanCaptionText(word.punctuated_word || word.word || "");

const secondsToMs = (value: unknown) => Math.max(0, Math.round(Number(value || 0) * 1000));

const pushCaption = (
  captions: AdSceneCaption[],
  text: string,
  startSeconds: unknown,
  endSeconds: unknown,
  speaker: unknown,
) => {
  const safeText = cleanCaptionText(text);
  const startMs = secondsToMs(startSeconds);
  const endMs = secondsToMs(endSeconds);
  if (!safeText || endMs <= startMs) return;

  captions.push({
    text: safeText,
    startMs,
    endMs,
    speaker: speakerFromDeepgram(speaker),
  });
};

const captionsFromWords = (
  words: DeepgramWord[],
  speaker: unknown,
) => {
  const captions: AdSceneCaption[] = [];
  if (!words.length) return captions;

  let currentStart = words[0]?.start || 0;
  let text = "";

  words.forEach((word, index) => {
    const nextWordText = wordText(word);
    if (!nextWordText) return;

    text += `${nextWordText} `;
    const isSentenceEnd = /[.!?]$/.test(nextWordText);
    const isLast = index === words.length - 1;

    if (isSentenceEnd || isLast) {
      pushCaption(captions, text, currentStart, word.end, speaker);
      text = "";
      currentStart = words[index + 1]?.start || word.end || currentStart;
    }
  });

  return captions;
};

export const normalizeDeepgramTranscription = (data: DeepgramResponse): DeepgramTranscription => {
  const utterances = data.results?.utterances || [];
  const captions: AdSceneCaption[] = [];

  if (utterances.length) {
    utterances.forEach((utterance) => {
      if (utterance.words?.length) {
        captions.push(...captionsFromWords(utterance.words, utterance.speaker));
        return;
      }

      pushCaption(
        captions,
        utterance.transcript || utterance.text || "",
        utterance.start,
        utterance.end,
        utterance.speaker,
      );
    });
  } else {
    const alternative = data.results?.channels?.[0]?.alternatives?.[0];
    if (alternative?.words?.length) {
      captions.push(...captionsFromWords(alternative.words, 0));
    } else if (alternative?.transcript) {
      pushCaption(captions, alternative.transcript, 0, 0, 0);
    }
  }

  return {
    captions,
    transcript: captions.map((caption) => caption.text).join(" "),
  };
};

export async function transcribeAudioWithDeepgram({
  audioBlob,
  apiKey = process.env.DEEPGRAM_API_KEY,
  mimeType,
}: {
  audioBlob: Blob;
  apiKey?: string;
  mimeType: string;
}): Promise<DeepgramTranscription> {
  if (!apiKey || isDisabled(process.env.DEEPGRAM_ENABLED)) {
    throw new Error("Deepgram transcription is not configured.");
  }

  const response = await fetch(deepgramListenUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType || "audio/wav",
    },
    body: audioBlob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram transcription failed (${response.status}): ${errorText.slice(0, 240)}`);
  }

  return normalizeDeepgramTranscription(await response.json() as DeepgramResponse);
}
