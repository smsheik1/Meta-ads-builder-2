import type { ThreeDBreakdownMusicBedId } from "../../scene/types";

export const THREE_D_BREAKDOWN_DURATION_MS = 21_000;
export const THREE_D_BREAKDOWN_MUSIC_VOLUME = 0.12 as const;

const musicSrcById: Record<ThreeDBreakdownMusicBedId, string> = {
  "polished-upbeat": "/motion-story/music/polished-upbeat.mp3",
  "warm-premium": "/motion-story/music/warm-premium.mp3",
  "playful-retail": "/motion-story/music/playful-retail.mp3",
};

const rotation: ThreeDBreakdownMusicBedId[] = [
  "polished-upbeat",
  "warm-premium",
  "playful-retail",
];

export function getThreeDBreakdownMusicBedId(index: number) {
  return rotation[index % rotation.length] || "polished-upbeat";
}

export function getThreeDBreakdownMusicBed(id: ThreeDBreakdownMusicBedId) {
  return {
    id,
    src: musicSrcById[id],
    volume: THREE_D_BREAKDOWN_MUSIC_VOLUME,
    loop: true as const,
  };
}
