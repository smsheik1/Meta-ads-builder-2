import type { CSSProperties } from "react";
import type { DiscoveryEntry } from "./types";
import styles from "./DiscoveryAudioArtwork.module.css";

const barHeights = [22, 44, 66, 35, 74, 50, 88, 38, 62, 46, 80, 54, 70, 30, 58];

export function DiscoveryAudioArtwork({
  entry,
  className = "",
  playing = false,
}: {
  entry: DiscoveryEntry;
  className?: string;
  playing?: boolean;
}) {
  return (
    <div
      className={`${styles.artwork} ${playing ? styles.playing : ""} ${className}`}
      style={{ "--jingle-accent": entry.media.accentColor || "#7c5cff" } as CSSProperties}
    >
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Made with Wiggly · Brand Jingle</p>
        <p className={styles.brand}>{entry.brand}</p>
        <p className={styles.title}>{entry.title}</p>
        <div className={styles.bars} aria-hidden="true">
          {barHeights.map((height, index) => (
            <span
              className={styles.bar}
              key={`${height}-${index}`}
              style={{
                "--bar-height": height,
                "--bar-index": index,
              } as CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
