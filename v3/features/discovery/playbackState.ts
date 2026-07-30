export type DiscoveryPlaybackState = {
  id: string;
  muted: boolean;
  playing: boolean;
} | null;

export const playbackStarted = (id: string): DiscoveryPlaybackState => ({
  id,
  muted: false,
  playing: true,
});

export const playbackPaused = (
  current: DiscoveryPlaybackState,
  id: string,
): DiscoveryPlaybackState => (
  current?.id === id ? { ...current, muted: true, playing: false } : current
);

export const playbackSynced = (
  current: DiscoveryPlaybackState,
  id: string,
  media: Pick<HTMLMediaElement, "muted" | "paused">,
): DiscoveryPlaybackState => (
  current?.id === id
    ? { id, muted: media.paused || media.muted, playing: !media.paused }
    : current
);
