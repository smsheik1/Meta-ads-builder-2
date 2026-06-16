export const VIDEO_MEME_VARIANT_COUNT = 8;

export type VideoMemeTemplateId = "bear-sniff";

export type VideoMemeTemplate = {
  id: VideoMemeTemplateId;
  name: string;
  videoSrc: string;
  durationSeconds: number;
  captionPosition: "top";
  captionMaxChars: number;
  patternPrefix: string;
  notes: string;
};

export const VIDEO_MEME_TEMPLATES: readonly VideoMemeTemplate[] = [
  {
    id: "bear-sniff",
    name: "Bear Sniffing Meme",
    videoSrc: "/video-memes/bear-sniff.mp4",
    durationSeconds: 8,
    captionPosition: "top",
    captionMaxChars: 90,
    patternPrefix: "This bear sniffs",
    notes: "The bear is a secret-sniffer. The strongest captions expose a hidden thought, guilty work habit, or embarrassing buyer moment.",
  },
] as const;

export const getVideoMemeTemplate = (id: string) => (
  VIDEO_MEME_TEMPLATES.find((template) => template.id === id) || null
);
