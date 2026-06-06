import type { Caption } from '../../store';
import type { BrandReceipts } from '../../lib/prompts/brand-brain';

export type CreativeBrief = {
  offer: string;
  buyer: string;
  pain: string;
  failedAlternatives: string;
  promisedResult: string;
  differentiator: string;
  cta: string;
  reference: string;
  receipts: BrandReceipts;
};

export type CreativeBriefTextKey = Exclude<keyof CreativeBrief, 'receipts'>;

export type DialogueLine = {
  speaker: 'Ava' | 'Sam' | string;
  tone: string;
  text: string;
};

export type DialogueScript = {
  title: string;
  angle: string;
  lines: DialogueLine[];
};

export type ConversationWizardStep = 'brief' | 'scripts' | 'edit';

export const GEMINI_3_1_FLASH_TTS_COST = {
  inputPerMillionUsd: 1,
  outputPerMillionUsd: 20,
  model: 'gemini-3.1-flash-tts-preview',
};

const estimateDialogueLineTokens = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.25));
};

export const estimateDialogueScriptCostUsd = (script: DialogueScript | null) => {
  if (!script) return 0;
  const scriptText = script.lines.map((line) => `${line.speaker}: ${line.text}`).join(' ').trim();
  if (!scriptText) return 0;
  const estimatedInputTokens = estimateDialogueLineTokens(scriptText);
  const estimatedOutputTokens = estimateDialogueLineTokens(scriptText);
  return (
    (estimatedInputTokens * GEMINI_3_1_FLASH_TTS_COST.inputPerMillionUsd)
    + (estimatedOutputTokens * GEMINI_3_1_FLASH_TTS_COST.outputPerMillionUsd)
  ) / 1_000_000;
};

export const formatDialogueScriptCost = (script: DialogueScript | null) => {
  const estimatedCostUsd = estimateDialogueScriptCostUsd(script);
  const estimatedCents = estimatedCostUsd * 100;
  if (!Number.isFinite(estimatedCents) || estimatedCents <= 0) return '<0.01¢';
  if (estimatedCents < 0.01) return '<0.01¢';
  return `${estimatedCents.toFixed(2)}¢`;
};

export const cloneDialogueScript = (script: DialogueScript): DialogueScript => ({
  title: script.title,
  angle: script.angle,
  lines: script.lines.map((line) => ({ ...line })),
});

const cleanDialogueTextForVoiceover = (value: string) => value
  .replace(/[—–]/g, ', ')
  .replace(/\s+/g, ' ')
  .trim();

export const cleanDialogueScriptForVoiceover = (script: DialogueScript): DialogueScript => ({
  ...script,
  title: cleanDialogueTextForVoiceover(script.title),
  angle: cleanDialogueTextForVoiceover(script.angle),
  lines: script.lines.map((line) => ({
    ...line,
    tone: cleanDialogueTextForVoiceover(line.tone),
    text: cleanDialogueTextForVoiceover(line.text),
  })),
});

export const captionsFromDialogueScript = (script: DialogueScript, totalDuration?: number): Caption[] => {
  let cursor = 0;
  const gap = 0.18;
  const speakers = Array.from(new Set(script.lines.map((line) => line.speaker).filter(Boolean))).slice(0, 2);
  const wordCounts = script.lines.map((line) => Math.max(1, line.text.trim().split(/\s+/).filter(Boolean).length));
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0) || 1;
  const usableDuration = totalDuration && totalDuration > 0
    ? Math.max(script.lines.length * 1.25, totalDuration - gap * Math.max(0, script.lines.length - 1))
    : 0;

  return script.lines.map((line, index) => {
    const duration = usableDuration
      ? Math.max(1.25, usableDuration * (wordCounts[index] / totalWords))
      : Math.max(1.4, Math.min(4.5, wordCounts[index] * 0.38));
    const caption = {
      text: line.text,
      start: cursor,
      end: cursor + duration,
      speaker: speakers.indexOf(line.speaker) === 1 ? 2 : 1,
    };
    cursor += duration + gap;
    return caption;
  });
};
