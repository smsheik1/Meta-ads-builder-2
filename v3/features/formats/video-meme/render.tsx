import type { CSSProperties } from "react";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { VideoMemeAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const captionWrapStyle: CSSProperties = {
  textWrap: "balance",
};
const rootStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "#000000",
  color: "#FFFFFF",
  containerType: "inline-size",
};
const videoFillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};
const topGradientStyle: CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  height: "32%",
  background: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.25), transparent)",
};
const getTopCaptionWrapStyle = (top: string): CSSProperties => ({
  pointerEvents: "none",
  position: "absolute",
  left: "4.5cqw",
  right: "4.5cqw",
  top,
  display: "flex",
  justifyContent: "center",
});
const getCaptionTextStyle = (options: {
  background?: string;
  fontSize: string;
  lineHeight: number;
  padding?: string;
  rounded?: boolean;
  textShadow?: string;
}): CSSProperties => ({
  ...captionWrapStyle,
  maxWidth: "94%",
  margin: 0,
  borderRadius: options.rounded ? "1.4cqw" : undefined,
  background: options.background,
  padding: options.padding,
  color: "#ffffff",
  fontSize: options.fontSize,
  fontWeight: 900,
  lineHeight: options.lineHeight,
  letterSpacing: 0,
  textAlign: "center",
  textShadow: options.textShadow,
  boxShadow: options.rounded ? "0 25px 50px -12px rgba(0,0,0,0.3)" : undefined,
});
const pinguDreadStartsAtSeconds = 4;

export function VideoMemeFormatRenderer({
  scene,
  rerollFlash,
  timeSeconds = 0,
}: FormatRenderProps<VideoMemeAdScene>) {
  const { Video } = useRenderAssetComponents();
  const isPingu = scene.layout.templateId === "pingu-noot-noot";
  const isDarwin = scene.layout.templateId === "darwin-journey";
  const caption = scene.creative.headline || scene.layout.slots.caption || scene.layout.slots.dreadText || "";
  const setupText = scene.layout.slots.setupText || "";
  const dreadText = scene.layout.slots.dreadText || "";
  const shouldShowPinguDread = isPingu && (timeSeconds ?? 0) >= pinguDreadStartsAtSeconds;
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      data-format="video-meme"
      data-video-meme-template={scene.layout.templateId}
      data-video-meme-caption-position={scene.layout.captionPosition}
      data-video-meme-caption={caption}
      data-video-meme-setup-text={setupText || undefined}
      data-video-meme-dread-text={dreadText || undefined}
      style={rootStyle}
    >
      <Video
        src={scene.layout.videoSrc}
        style={videoFillStyle}
        autoPlay
        loop
        playsInline
        preload="auto"
      />
      <div style={topGradientStyle} />
      {isPingu ? (
        <>
          <div style={getTopCaptionWrapStyle(shouldShowPinguDread ? "12cqw" : "4cqw")}>
            <p
              className={`max-w-[94%] rounded-[1.4cqw] bg-black/72 px-[4.2cqw] py-[2.4cqw] text-center text-[5.2cqw] font-black leading-[1] tracking-normal text-white shadow-2xl shadow-black/30 ${flashHeadline}`}
              data-video-meme-setup-text={shouldShowPinguDread ? undefined : "true"}
              data-video-meme-dread-text={shouldShowPinguDread ? "true" : undefined}
              style={getCaptionTextStyle({
                background: "rgba(0,0,0,0.72)",
                fontSize: "5.2cqw",
                lineHeight: 1,
                padding: "2.4cqw 4.2cqw",
                rounded: true,
              })}
            >
              {shouldShowPinguDread ? dreadText : setupText}
            </p>
          </div>
        </>
      ) : isDarwin ? (
        <div style={getTopCaptionWrapStyle("4cqw")}>
          <p
            className={`max-w-[94%] text-center text-[5.1cqw] font-black leading-[1.04] tracking-normal text-white drop-shadow-[0_0.3cqw_0_rgba(0,0,0,0.9)] ${flashHeadline}`}
            data-video-meme-caption-text="true"
            style={getCaptionTextStyle({
              fontSize: "5.1cqw",
              lineHeight: 1.04,
              textShadow: "0 0.3cqw 0 rgba(0,0,0,0.9)",
            })}
          >
            {caption}
          </p>
        </div>
      ) : (
        <div style={getTopCaptionWrapStyle("4cqw")}>
          <p
            className={`max-w-[94%] rounded-[1.4cqw] bg-black/68 px-[4.2cqw] py-[2.8cqw] text-center text-[5.7cqw] font-black leading-[0.98] tracking-normal text-white shadow-2xl shadow-black/30 ${flashHeadline}`}
            data-video-meme-caption-text="true"
            style={getCaptionTextStyle({
              background: "rgba(0,0,0,0.68)",
              fontSize: "5.7cqw",
              lineHeight: 0.98,
              padding: "2.8cqw 4.2cqw",
              rounded: true,
            })}
          >
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}
