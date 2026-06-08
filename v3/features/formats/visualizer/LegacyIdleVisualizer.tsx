import type { CSSProperties } from "react";
import {
  getIdleVisualizerPercent,
  getVisualizerBarCount,
  normalizeVisualizerType,
  type VisualizerType,
} from "../../audio/visualizer";

type LegacyIdleVisualizerProps = {
  type?: VisualizerType | string | null;
  barCount?: number | null;
  color: string;
  speaker2Color?: string;
  splitSpeakers?: boolean;
  className?: string;
  style?: CSSProperties;
  gap?: CSSProperties["gap"];
  barMinWidth?: CSSProperties["minWidth"];
};

const getLegacyIdleDelayMs = (type: VisualizerType, index: number) => (
  type === "waveform-strip" ? index * 28 : index * 45
);

const getLegacyIdleClassName = (type: VisualizerType) => (
  type === "waveform-strip"
    ? "wiggly-idle-bar wiggly-idle-bar-strong flex-1 rounded-full opacity-80"
    : "wiggly-idle-bar flex-1 rounded-full"
);

const getLegacyIdleGap = (type: VisualizerType) => (
  type === "waveform-strip" ? 2 : 4
);

const getLegacyIdleMinWidth = (type: VisualizerType) => (
  type === "waveform-strip" ? 3 : 4
);

const getLegacyIdleContainerStyle = (
  type: VisualizerType,
  gap: CSSProperties["gap"] | undefined,
  style: CSSProperties | undefined,
): CSSProperties => ({
  position: type === "waveform-strip" ? "absolute" : undefined,
  inset: type === "waveform-strip" && !style?.position ? 0 : undefined,
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: type === "bars-bottom" ? "flex-end" : "center",
  justifyContent: "space-between",
  gap: gap ?? getLegacyIdleGap(type),
  ...style,
});

export function LegacyIdleVisualizer({
  type,
  barCount,
  color,
  speaker2Color = "#8b5cf6",
  splitSpeakers = false,
  className,
  style,
  gap,
  barMinWidth,
}: LegacyIdleVisualizerProps) {
  const visualizerType = normalizeVisualizerType(type);
  const count = getVisualizerBarCount(visualizerType, barCount);
  const midpoint = Math.floor(count / 2);
  const minWidth = barMinWidth ?? getLegacyIdleMinWidth(visualizerType);

  return (
    <div
      aria-hidden="true"
      className={className}
      data-visualizer-kind={`legacy-create-${visualizerType}`}
      data-visualizer-motion="css-idle"
      style={getLegacyIdleContainerStyle(visualizerType, gap, style)}
    >
      {Array.from({ length: count }, (_, index) => {
        const barColor = splitSpeakers && index >= midpoint ? speaker2Color : color;

        return (
          <span
            className={getLegacyIdleClassName(visualizerType)}
            data-visualizer-bar="true"
            key={index}
            style={{
              animationDelay: `${getLegacyIdleDelayMs(visualizerType, index)}ms`,
              backgroundColor: barColor,
              height: `${getIdleVisualizerPercent(visualizerType, index, count)}%`,
              minWidth,
            }}
          />
        );
      })}
    </div>
  );
}
