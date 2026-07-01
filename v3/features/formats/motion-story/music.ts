import type { MotionStoryMusicBedId } from "../../scene/types";

export const MOTION_STORY_DURATION_MS = 20_000;
export const MOTION_STORY_MUSIC_VOLUME = 0.18 as const;

export const MOTION_STORY_MUSIC_BEDS: Record<MotionStoryMusicBedId, { id: MotionStoryMusicBedId; src: string; volume: typeof MOTION_STORY_MUSIC_VOLUME; loop: true }> = {
  "polished-upbeat": {
    id: "polished-upbeat",
    src: "/motion-story/music/polished-upbeat.mp3",
    volume: MOTION_STORY_MUSIC_VOLUME,
    loop: true,
  },
  "warm-premium": {
    id: "warm-premium",
    src: "/motion-story/music/warm-premium.mp3",
    volume: MOTION_STORY_MUSIC_VOLUME,
    loop: true,
  },
  "playful-retail": {
    id: "playful-retail",
    src: "/motion-story/music/playful-retail.mp3",
    volume: MOTION_STORY_MUSIC_VOLUME,
    loop: true,
  },
  "bold-retail": {
    id: "bold-retail",
    src: "/motion-story/music/bold-retail.mp3",
    volume: MOTION_STORY_MUSIC_VOLUME,
    loop: true,
  },
};

const manualRotation: MotionStoryMusicBedId[] = [
  "polished-upbeat",
  "warm-premium",
  "playful-retail",
  "bold-retail",
];

export function getMotionStoryMusicBedId(index: number, count: number): MotionStoryMusicBedId {
  if (count <= 1) return "polished-upbeat";
  return manualRotation[index % manualRotation.length];
}

export function getMotionStoryMusicBed(id: MotionStoryMusicBedId) {
  return MOTION_STORY_MUSIC_BEDS[id];
}
