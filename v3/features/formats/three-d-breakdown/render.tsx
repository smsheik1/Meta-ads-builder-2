import { getVisibleCaptionText } from "../../audio/sceneAudio";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { FormatRenderProps } from "../types";
import type { ThreeDBreakdownAdScene } from "../../scene/types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function getTimelineMs(scene: ThreeDBreakdownAdScene, timeSeconds: number) {
  const audioDurationMs = scene.audio.status === "generated" ? scene.audio.durationMs : scene.layout.durationMs;
  const safeDurationMs = Math.max(1000, audioDurationMs);
  return clamp(timeSeconds * 1000 * (scene.layout.durationMs / safeDurationMs), 0, scene.layout.durationMs);
}

function getActiveShot(scene: ThreeDBreakdownAdScene, timelineMs: number) {
  if (timelineMs < 7000) return scene.layout.shots[0];
  if (timelineMs < 14000) return scene.layout.shots[1];
  return scene.layout.shots[2];
}

function getActiveStoryboardFrame(scene: ThreeDBreakdownAdScene, timelineMs: number) {
  const frames = scene.layout.storyboardBoard?.frames || [];
  const frameIndex = clamp(Math.floor(timelineMs / (scene.layout.durationMs / 6)), 0, 5);
  return frames[frameIndex];
}

function getFallbackCaption(scene: ThreeDBreakdownAdScene, timelineMs: number) {
  const beat = scene.layout.scriptBeats.find((item) => timelineMs >= item.startMs && timelineMs <= item.endMs)
    || scene.layout.scriptBeats[0];
  return beat?.narration || scene.creative.headline;
}

export function ThreeDBreakdownFormatRenderer({
  scene,
  timeSeconds = 0,
}: FormatRenderProps<ThreeDBreakdownAdScene>) {
  const { Image, Video } = useRenderAssetComponents();
  const timelineMs = getTimelineMs(scene, timeSeconds);
  const activeShot = getActiveShot(scene, timelineMs);
  const activeStoryboardFrame = getActiveStoryboardFrame(scene, timelineMs);
  const caption = scene.audio.status === "generated"
    ? getVisibleCaptionText(scene.audio, timeSeconds) || getFallbackCaption(scene, timelineMs)
    : activeShot?.captionText || getFallbackCaption(scene, timelineMs);
  const brandColor = scene.style.accentColor || "#7DD3FC";
  const videoUrl = activeShot?.video?.status === "ready" ? activeShot.video.url : "";
  const imageUrl = activeShot?.image?.status === "ready" ? activeShot.image.url : "";
  const storyboardFrameUrl = activeStoryboardFrame?.image?.status === "ready" ? activeStoryboardFrame.image.url : "";

  return (
    <div
      className="relative size-full overflow-hidden bg-slate-950 text-white"
      data-three-d-breakdown-screen="true"
      style={{
        background: `radial-gradient(circle at 20% 12%, ${brandColor}33, transparent 28%), linear-gradient(145deg, #050816 0%, #0f172a 52%, #020617 100%)`,
      }}
    >
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
      {videoUrl ? (
        <Video
          src={videoUrl}
          className="absolute inset-0 size-full object-cover"
          active
          muted
          playsInline
          clipTimeSeconds={timeSeconds}
        />
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : storyboardFrameUrl ? (
        <Image
          src={storyboardFrameUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-[10%]">
          <div
            className="aspect-square w-[64%] rounded-[12%] border border-white/20 bg-white/10 shadow-2xl shadow-black/40"
            style={{ transform: `rotate(${Math.sin(timeSeconds * 0.7) * 3}deg)` }}
          >
            <div className="flex size-full items-center justify-center rounded-[12%] bg-black/20 p-[10%] text-center text-[10cqw] font-black leading-[0.92] tracking-[-0.03em]">
              3D
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-[7%] top-[7%] z-10 flex items-center gap-[2.8%]">
        {scene.brand.logoUrl ? (
          <Image
            src={scene.brand.logoUrl}
            alt=""
            className="size-[9cqw] rounded-full border-[0.55cqw] border-white/90 bg-white object-contain p-[1.2cqw]"
          />
        ) : (
          <div className="flex size-[9cqw] items-center justify-center rounded-full border-[0.55cqw] border-white/90 bg-white text-[4cqw] font-black text-slate-950">
            {scene.brand.name.slice(0, 1)}
          </div>
        )}
        <div>
          <p className="text-[3.4cqw] font-black leading-none text-white drop-shadow">{scene.brand.name}</p>
          <p className="mt-[.7cqw] text-[2.1cqw] font-black uppercase tracking-[0.18em] text-white/70">3D Breakdown</p>
        </div>
      </div>

      <div className="absolute inset-x-[6.5%] bottom-[9%] z-10 rounded-[6cqw] border border-white/14 bg-slate-950/72 p-[5cqw] shadow-2xl shadow-black/35 backdrop-blur-md">
        <p className="mb-[2.2cqw] text-[2.2cqw] font-black uppercase tracking-[0.2em] text-white/60">
          {activeShot?.role.replace(/-/g, " ")}
        </p>
        <p className="text-balance text-[7.2cqw] font-black leading-[0.94] tracking-tight text-white drop-shadow">
          {caption}
        </p>
      </div>
    </div>
  );
}
