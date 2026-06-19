import type { CSSProperties } from "react";
import { getVisibleCaptionText } from "../../audio/sceneAudio";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { JingleAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fill: CSSProperties = { position: "absolute", inset: 0 };

const phoneticAliases = (phonetic: string) => Array.from(new Set([
  phonetic,
  phonetic.replace(/\bOh\b/gi, "O"),
  phonetic.replace(/\bGee\b/gi, "GEE"),
  phonetic.replace(/\bOh\b/gi, "O").replace(/\bGee\b/gi, "GEE"),
  phonetic.replace(/\bGee\b/gi, "G"),
  phonetic.replace(/\bOh\b/gi, "O").replace(/\bGee\b/gi, "G"),
].filter(Boolean)));

const displayLyricForBrand = (lyric: string, brandName: string, brandPhonetic: string) =>
  phoneticAliases(brandPhonetic).reduce(
    (display, alias) => display.replace(new RegExp(escapeRegExp(alias), "gi"), brandName),
    lyric,
  );

export function JingleFormatRenderer({
  scene,
  motionMode = "auto",
  timeSeconds = 0,
  rerollFlash,
}: FormatRenderProps<JingleAdScene>) {
  const { Image, Video } = useRenderAssetComponents();
  const activeLyric = getVisibleCaptionText(scene.audio, timeSeconds)
    || scene.layout.lyrics[0]
    || scene.creative.headline;
  const displayLyric = scene.layout.brandPhonetic
    ? displayLyricForBrand(activeLyric, scene.brand.name, scene.layout.brandPhonetic)
    : activeLyric;
  const analysis = scene.audio.status === "generated" ? scene.audio.analysis : null;
  const frameIndex = Math.max(0, Math.floor(timeSeconds * (analysis?.fps || 60)));
  const audioLevel = analysis?.levels[Math.min(analysis.levels.length - 1, frameIndex)] || 0;
  const pulse = 0.65 + (audioLevel * 0.55);
  const brandMark = scene.brand.logoUrl || scene.brand.faviconUrl || "";
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";
  const stitchedMusicVideo = scene.layout.musicVideo?.stitchedVideo || null;
  const hasMusicVideo = Boolean(stitchedMusicVideo?.url);
  const shouldPlayMusicVideo = motionMode !== "idle";

  return (
    <div
      data-format="jingle"
      data-jingle-brand-phonetic={scene.layout.brandPhonetic}
      data-jingle-music-length-ms={scene.layout.musicLengthMs}
      data-jingle-music-video={hasMusicVideo ? "true" : undefined}
      className="relative h-full w-full overflow-hidden"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: `radial-gradient(circle at 18% 18%, ${scene.style.accentColor}55, transparent 34%), linear-gradient(145deg, ${scene.style.backgroundColor}, #050816 72%)`,
        color: scene.style.textColor,
        containerType: "inline-size",
      }}
    >
      {hasMusicVideo ? (
        <div data-jingle-stitched-music-video="true" style={fill}>
          <Video
            src={stitchedMusicVideo!.url!}
            active
            autoPlay={shouldPlayMusicVideo}
            clipEndSeconds={stitchedMusicVideo!.durationMs / 1000}
            clipStartSeconds={0}
            clipTimeSeconds={timeSeconds}
            muted
            playsInline
            preload="auto"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      ) : null}
      {!hasMusicVideo ? (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            ...fill,
            opacity: 0.3,
            backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "8cqw 100%",
            transform: `translateX(${-(timeSeconds % 1) * 8}cqw)`,
          }}
        />
      ) : null}
      {!hasMusicVideo ? (
        <div
          className="absolute left-[10cqw] top-[12cqw] size-[46cqw] rounded-full blur-[8cqw]"
          style={{
            position: "absolute",
            left: "10cqw",
            top: "12cqw",
            width: "46cqw",
            height: "46cqw",
            borderRadius: "9999px",
            filter: "blur(8cqw)",
            background: scene.style.accentColor,
            opacity: 0.22,
            transform: `scale(${pulse})`,
          }}
        />
      ) : null}
      <div
        className="absolute inset-x-[6cqw] top-[6cqw] flex items-center gap-[2.6cqw]"
        style={{
          position: "absolute",
          left: "6cqw",
          right: "6cqw",
          top: "6cqw",
          display: "flex",
          alignItems: "center",
          gap: "2.6cqw",
        }}
      >
        {brandMark ? (
          <Image
            alt=""
            src={brandMark}
            className="size-[9cqw] rounded-full bg-white object-contain p-[1.2cqw]"
            style={{
              width: "9cqw",
              height: "9cqw",
              borderRadius: "9999px",
              background: "#ffffff",
              objectFit: "contain",
              padding: "1.2cqw",
            }}
          />
        ) : (
          <div
            className="grid size-[9cqw] place-items-center rounded-full bg-white text-[4cqw] font-black leading-none text-slate-950"
            style={{
              display: "grid",
              placeItems: "center",
              width: "9cqw",
              height: "9cqw",
              borderRadius: "9999px",
              background: "#ffffff",
              color: "#020617",
              fontSize: "4cqw",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {scene.brand.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0" style={{ minWidth: 0 }}>
          <p
            className="truncate text-[3.8cqw] font-black leading-none text-white"
            style={{
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "#ffffff",
              fontSize: "3.8cqw",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {scene.brand.name}
          </p>
          <p
            className="mt-[0.6cqw] text-[2.1cqw] font-black uppercase tracking-[0.18em] text-white/55"
            style={{
              margin: "0.6cqw 0 0",
              color: "rgba(255,255,255,0.55)",
              fontSize: "2.1cqw",
              fontWeight: 900,
              letterSpacing: "0.18em",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            Brand jingle
          </p>
        </div>
      </div>

      <div
        className="absolute inset-x-[7cqw] top-[32%]"
        style={{
          position: "absolute",
          left: "7cqw",
          right: "7cqw",
          top: "32%",
        }}
      >
        <p
          className={`text-balance text-center text-[8.2cqw] font-black leading-[0.98] tracking-normal text-white drop-shadow-[0_0.7cqw_0_rgba(0,0,0,0.35)] ${flashHeadline}`.trim()}
          style={{
            margin: 0,
            color: "#ffffff",
            fontSize: "8.2cqw",
            fontWeight: 900,
            lineHeight: 0.98,
            letterSpacing: 0,
            textAlign: "center",
            textWrap: "balance",
            textShadow: "0 0.7cqw 0 rgba(0,0,0,0.35)",
          }}
          data-jingle-active-lyric="true"
        >
          {displayLyric}
        </p>
      </div>

      {!hasMusicVideo ? (
        <div
          data-jingle-waveform="true"
          className="absolute inset-x-[9cqw] bottom-[10cqw] flex h-[14cqw] items-end justify-center gap-[1.2cqw]"
          style={{
            position: "absolute",
            left: "9cqw",
            right: "9cqw",
            bottom: "10cqw",
            display: "flex",
            height: "14cqw",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "1.2cqw",
          }}
        >
          {Array.from({ length: 18 }, (_, index) => {
            const height = 22 + (((index * 17) % 41) * pulse);
            return (
              <span
                key={index}
                className="w-[1.8cqw] rounded-full bg-white/80"
                style={{
                  width: "1.8cqw",
                  height: `${Math.min(92, height)}%`,
                  borderRadius: "9999px",
                  background: "rgba(255,255,255,0.8)",
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
