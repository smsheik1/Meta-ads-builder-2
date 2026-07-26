import type { DiscoveryEntry } from "./types";
import { DiscoveryAudioArtwork } from "./DiscoveryAudioArtwork";

export function DiscoveryProofMedia({
  entry,
  className,
  autoPlay = false,
}: {
  entry: DiscoveryEntry;
  className: string;
  autoPlay?: boolean;
}) {
  if (entry.media.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={entry.media.src} alt={`${entry.brand}: ${entry.title}`} />;
  }

  if (entry.media.kind === "audio") {
    return (
      <div className={`relative ${className}`}>
        <DiscoveryAudioArtwork entry={entry} className="absolute inset-0" />
        <audio
          className="absolute inset-x-5 bottom-5 z-10 w-[calc(100%-2.5rem)]"
          src={entry.media.src}
          controls
          preload="none"
        />
      </div>
    );
  }

  return (
    <video
      className={className}
      src={entry.media.src}
      poster={entry.media.poster}
      autoPlay={autoPlay}
      muted
      loop
      controls
      playsInline
      preload={autoPlay ? "metadata" : "none"}
    />
  );
}
