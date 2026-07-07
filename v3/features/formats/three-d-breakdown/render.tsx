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

function getActiveClipPlan(scene: ThreeDBreakdownAdScene, timelineMs: number) {
  const clipPlans = scene.layout.clipPlans || [];
  if (!clipPlans.length) return null;
  return clipPlans.find((clip) => timelineMs >= clip.startMs && timelineMs < clip.endMs)
    || clipPlans[clipPlans.length - 1]
    || null;
}

function getFallbackCaption(scene: ThreeDBreakdownAdScene, timelineMs: number) {
  const beat = scene.layout.scriptBeats.find((item) => timelineMs >= item.startMs && timelineMs <= item.endMs)
    || scene.layout.scriptBeats[0];
  return beat?.narration || scene.creative.headline;
}

function normalizeCaption(value: string) {
  return value
    .replace(/\bis built to protect\b/gi, "protects")
    .replace(/\bcan break\b/gi, "breaks")
    .replace(/\bcan scatter\b/gi, "scatters")
    .replace(/[^A-Za-z0-9'% -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCaptionWords(value: string) {
  return normalizeCaption(value)
    .split(" ")
    .filter(Boolean);
}

function splitCaptionClause(value: string, maxWords = 5) {
  const words = cleanCaptionWords(value);
  if (words.length <= maxWords) return [words.join(" ")].filter(Boolean);

  const chunks: string[][] = [];
  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords));
  }
  const lastChunk = chunks[chunks.length - 1];
  const previousChunk = chunks[chunks.length - 2];
  if (lastChunk && previousChunk && lastChunk.length <= 2 && previousChunk.length + lastChunk.length <= 7) {
    previousChunk.push(...lastChunk);
    chunks.pop();
  }

  return chunks.map((chunk) => chunk.join(" ")).filter(Boolean);
}

function getCaptionChunks(value: string) {
  const normalized = normalizeCaption(value);
  const clauses = normalized
    .split(/\b(?:and|but|then|so|because|while|until)\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => splitCaptionClause(part));

  if (clauses.length) return clauses;
  return splitCaptionClause(normalized);
}

function getCaptionForTimeline(scene: ThreeDBreakdownAdScene, timelineMs: number, fallback: string) {
  const beat = scene.layout.scriptBeats.find((item) => timelineMs >= item.startMs && timelineMs < item.endMs)
    || scene.layout.scriptBeats[scene.layout.scriptBeats.length - 1];
  const text = beat?.narration || fallback;
  const chunks = getCaptionChunks(text);
  if (!chunks.length || !beat) return text;
  const beatDuration = Math.max(1, beat.endMs - beat.startMs);
  const progress = clamp((timelineMs - beat.startMs) / beatDuration, 0, 0.999);
  return chunks[Math.floor(progress * chunks.length)] || chunks[0] || text;
}

function getCaptionWords(value: string) {
  const words = cleanCaptionWords(value);
  return words.slice(0, words.length > 6 ? 6 : words.length).map((word) => word.toUpperCase());
}

function getFinalCtaText(scene: ThreeDBreakdownAdScene) {
  return String(scene.creative.ctaText || scene.layout.storyContract.ctaLine || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ThreeDBreakdownFormatRenderer({
  scene,
  mode,
  motionMode = "auto",
  timeSeconds = 0,
}: FormatRenderProps<ThreeDBreakdownAdScene>) {
  const { Image, Video } = useRenderAssetComponents();
  const timelineMs = getTimelineMs(scene, timeSeconds);
  const activeShot = getActiveShot(scene, timelineMs);
  const activeClipPlan = getActiveClipPlan(scene, timelineMs);
  const activeStoryboardFrame = getActiveStoryboardFrame(scene, timelineMs);
  const finalVideo = scene.layout.finalVideo?.status === "ready" && scene.layout.finalVideo.url
    ? scene.layout.finalVideo
    : null;
  const shouldUseFinalVideo = Boolean(finalVideo && mode !== "video");
  const rawCaption = scene.audio.status === "generated"
    ? getVisibleCaptionText(scene.audio, timeSeconds) || getFallbackCaption(scene, timelineMs)
    : activeShot?.captionText || getFallbackCaption(scene, timelineMs);
  const caption = scene.audio.status === "generated" && rawCaption
    ? rawCaption
    : getCaptionForTimeline(scene, timelineMs, rawCaption);
  const brandColor = scene.style.accentColor || "#7DD3FC";
  const videoUrl = finalVideo && shouldUseFinalVideo
    ? finalVideo.url
    : activeClipPlan?.video?.status === "ready"
    ? activeClipPlan.video.url
    : activeShot?.video?.status === "ready"
      ? activeShot.video.url
      : "";
  const imageUrl = activeShot?.image?.status === "ready" ? activeShot.image.url : "";
  const storyboardFrameUrl = activeStoryboardFrame?.image?.status === "ready" ? activeStoryboardFrame.image.url : "";
  const clipStartSeconds = shouldUseFinalVideo ? 0 : activeClipPlan ? activeClipPlan.startMs / 1000 : 0;
  const clipEndSeconds = shouldUseFinalVideo
    ? (finalVideo?.durationMs || scene.layout.durationMs) / 1000
    : activeClipPlan ? activeClipPlan.endMs / 1000 : undefined;
  const clipTimeSeconds = shouldUseFinalVideo
    ? timelineMs / 1000
    : activeClipPlan ? Math.max(0, timelineMs / 1000 - clipStartSeconds) : timeSeconds;
  const captionWords = getCaptionWords(caption);
  const finalCtaText = getFinalCtaText(scene);
  const showFinalCta = Boolean(finalCtaText && timelineMs >= scene.layout.durationMs - 3600);
  const productAnchor = scene.layout.productAnchor;
  const showFinalProductAnchor = Boolean(productAnchor?.imageUrl && timelineMs >= scene.layout.durationMs - 3000);

  return (
    <div
      className="relative size-full overflow-hidden bg-slate-950 text-white"
      data-three-d-breakdown-screen="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        color: "#fff",
        background: `radial-gradient(circle at 20% 12%, ${brandColor}33, transparent 28%), linear-gradient(145deg, #050816 0%, #0f172a 52%, #020617 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      {shouldUseFinalVideo && finalVideo ? (
        <Video
          src={finalVideo.url!}
          className="absolute inset-0 size-full object-cover"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
          active
          autoPlay={motionMode !== "idle"}
          muted
          playsInline
          preload="auto"
          clipEndSeconds={clipEndSeconds}
          clipStartSeconds={0}
          clipTimeSeconds={clipTimeSeconds}
        />
      ) : videoUrl ? (
        <Video
          src={videoUrl}
          className="absolute inset-0 size-full object-cover"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
          active
          muted
          playsInline
          clipEndSeconds={clipEndSeconds}
          clipStartSeconds={clipStartSeconds}
          clipTimeSeconds={clipTimeSeconds}
        />
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      ) : storyboardFrameUrl ? (
        <Image
          src={storyboardFrameUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
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

      {!shouldUseFinalVideo && showFinalProductAnchor && productAnchor ? (
        <div
          data-three-d-breakdown-final-payoff="true"
          style={{
            position: "absolute",
            left: "8%",
            right: "8%",
            bottom: "31%",
            zIndex: 8,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              maxWidth: "68%",
              padding: "4%",
              borderRadius: "5cqw",
              background: "linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,255,255,.84))",
              boxShadow: "0 2.4cqw 8cqw rgba(0,0,0,.34)",
            }}
          >
            <Image
              src={productAnchor.imageUrl}
              alt={productAnchor.imageAlt || productAnchor.title}
              style={{
                display: "block",
                width: "100%",
                maxHeight: "29cqh",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      ) : null}

      {!showFinalCta && !shouldUseFinalVideo ? (
      <div
        className="absolute inset-x-[5.5%] bottom-[16%] z-10 flex flex-wrap items-center justify-center gap-x-[1.5cqw] gap-y-[0.8cqw]"
        data-three-d-breakdown-keyword-captions="true"
        style={{
          position: "absolute",
          left: "5.5%",
          right: "5.5%",
          bottom: "16%",
          zIndex: 10,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          columnGap: "1.5cqw",
          rowGap: "0.8cqw",
          pointerEvents: "none",
        }}
      >
        {captionWords.map((word, index) => {
          const highlighted = captionWords.length <= 2 ? index === 0 : index >= captionWords.length - 2;
          return (
            <span
              key={`${word}-${index}`}
              className="font-black uppercase"
              style={{
                color: highlighted ? "#FDE047" : "#FFFFFF",
                fontSize: highlighted ? "8.6cqw" : "7.9cqw",
                fontWeight: 950,
                letterSpacing: "0",
                lineHeight: 0.84,
                textAlign: "center",
                textShadow: "0 0.55cqw 0 #020617, 0 0.9cqw 2.2cqw rgba(0,0,0,.72)",
                textTransform: "uppercase",
                WebkitTextStroke: "0.18cqw #020617",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      ) : null}

      {showFinalCta ? (
        <div
          data-three-d-breakdown-final-cta="true"
          style={{
            position: "absolute",
            left: "6%",
            right: "6%",
            bottom: "24%",
            zIndex: 14,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              maxWidth: "100%",
              padding: "3.1cqw 4.4cqw",
              borderRadius: "4.8cqw",
              background: "linear-gradient(180deg, rgba(255,255,255,.97), rgba(235,245,255,.92))",
              boxShadow: "0 1.2cqw 0 rgba(2,6,23,.95), 0 2.4cqw 8cqw rgba(0,0,0,.42)",
              color: "#020617",
              fontSize: "4.35cqw",
              fontWeight: 950,
              letterSpacing: "0",
              lineHeight: 0.96,
              overflowWrap: "break-word",
              textAlign: "center",
              textTransform: "none",
            }}
          >
            {finalCtaText}
          </div>
        </div>
      ) : null}
    </div>
  );
}
