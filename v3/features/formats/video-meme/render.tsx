import type { CSSProperties } from "react";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { VideoMemeAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const captionWrapStyle: CSSProperties = {
  textWrap: "balance",
};

export function VideoMemeFormatRenderer({
  scene,
  rerollFlash,
}: FormatRenderProps<VideoMemeAdScene>) {
  const { Video } = useRenderAssetComponents();
  const isPingu = scene.layout.templateId === "pingu-noot-noot";
  const caption = scene.creative.headline || scene.layout.slots.caption || scene.layout.slots.dreadText || "";
  const setupText = scene.layout.slots.setupText || "";
  const dreadText = scene.layout.slots.dreadText || "";
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
      style={{
        color: "#FFFFFF",
        containerType: "inline-size",
      }}
    >
      <Video
        src={scene.layout.videoSrc}
        className="absolute inset-0 size-full object-cover"
        autoPlay
        loop
        playsInline
        preload="auto"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-black/70 via-black/25 to-transparent" />
      {isPingu ? (
        <>
          <div className="pointer-events-none absolute inset-x-[4.5cqw] top-[4cqw] flex justify-center">
            <p
              className={`max-w-[94%] rounded-[1.4cqw] bg-black/68 px-[4.2cqw] py-[2.4cqw] text-center text-[5.2cqw] font-black leading-[1] tracking-normal text-white shadow-2xl shadow-black/30 ${flashHeadline}`}
              data-video-meme-setup-text="true"
              style={captionWrapStyle}
            >
              {setupText}
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-[4.5cqw] bottom-[7cqw] flex justify-center">
            <p
              className={`max-w-[94%] rounded-[1.4cqw] bg-black/76 px-[4.2cqw] py-[2.6cqw] text-center text-[5.6cqw] font-black leading-[0.98] tracking-normal text-white shadow-2xl shadow-black/40 ${flashHeadline}`}
              data-video-meme-dread-text="true"
              style={captionWrapStyle}
            >
              {dreadText}
            </p>
          </div>
        </>
      ) : (
        <div className="pointer-events-none absolute inset-x-[4.5cqw] top-[4cqw] flex justify-center">
          <p
            className={`max-w-[94%] rounded-[1.4cqw] bg-black/68 px-[4.2cqw] py-[2.8cqw] text-center text-[5.7cqw] font-black leading-[0.98] tracking-normal text-white shadow-2xl shadow-black/30 ${flashHeadline}`}
            data-video-meme-caption-text="true"
            style={captionWrapStyle}
          >
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}
