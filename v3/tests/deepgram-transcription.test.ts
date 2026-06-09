import assert from "node:assert/strict";
import { normalizeDeepgramTranscription } from "../features/audio/deepgramTranscription";

const utteranceResult = normalizeDeepgramTranscription({
  results: {
    utterances: [
      {
        speaker: 0,
        words: [
          { word: "chat", punctuated_word: "Chat", start: 0, end: 0.2 },
          { word: "gp", punctuated_word: "GP.", start: 0.2, end: 0.5 },
          { word: "works", punctuated_word: "Works.", start: 0.8, end: 1.1 },
        ],
      },
      {
        speaker: 1,
        transcript: "Second speaker line",
        start: 1.2,
        end: 2.4,
      },
    ],
  },
});

assert.deepEqual(utteranceResult.captions, [
  {
    text: "ChatGPT.",
    startMs: 0,
    endMs: 500,
    speaker: 1,
  },
  {
    text: "Works.",
    startMs: 800,
    endMs: 1100,
    speaker: 1,
  },
  {
    text: "Second speaker line",
    startMs: 1200,
    endMs: 2400,
    speaker: 2,
  },
]);
assert.equal(utteranceResult.transcript, "ChatGPT. Works. Second speaker line");

const wordsFallbackResult = normalizeDeepgramTranscription({
  results: {
    channels: [
      {
        alternatives: [
          {
            words: [
              { word: "first", punctuated_word: "First", start: 0.1, end: 0.3 },
              { word: "line", punctuated_word: "line.", start: 0.3, end: 0.6 },
            ],
          },
        ],
      },
    ],
  },
});

assert.deepEqual(wordsFallbackResult.captions, [
  {
    text: "First line.",
    startMs: 100,
    endMs: 600,
    speaker: 1,
  },
]);

console.log("deepgram-transcription tests passed");
