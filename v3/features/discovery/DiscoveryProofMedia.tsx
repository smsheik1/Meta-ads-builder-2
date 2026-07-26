import type { DiscoveryEntry } from "./types";

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
