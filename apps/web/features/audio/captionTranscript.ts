import type { AdSceneCaption } from '@/features/create/scene';

export const mergeCaptionTextIntoTranscript = (
  transcript: string,
  captions: AdSceneCaption[],
) => {
  if (!captions.length) return transcript.trim();

  const transcriptLines = transcript.split(/\r?\n/).filter((line) => line.trim());

  return captions.map((caption, index) => {
    const originalLine = transcriptLines[index] || '';
    const speakerPrefix = originalLine.match(/^([^:\n]{1,40}):\s*/)?.[0] || '';
    return `${speakerPrefix}${caption.text.trim()}`.trim();
  }).join('\n');
};
