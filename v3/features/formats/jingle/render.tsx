import { getVisibleCaptionText } from "../../audio/sceneAudio";
import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { JingleAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

export function JingleFormatRenderer({
  scene,
  timeSeconds = 0,
  rerollFlash,
}: FormatRenderProps<JingleAdScene>) {
  const { Image } = useRenderAssetComponents();
  const activeLyric = getVisibleCaptionText(scene.audio, timeSeconds)
    || scene.layout.lyrics[0]
    || scene.creative.headline;
  const analysis = scene.audio.status === "generated" ? scene.audio.analysis : null;
  const frameIndex = Math.max(0, Math.floor(timeSeconds * (analysis?.fps || 60)));
  const audioLevel = analysis?.levels[Math.min(analysis.levels.length - 1, frameIndex)] || 0;
  const pulse = 0.65 + (audioLevel * 0.55);
  const brandMark = scene.brand.logoUrl || scene.brand.faviconUrl || "";
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";

  return (
    <div
      data-format="jingle"
      data-jingle-brand-phonetic={scene.layout.brandPhonetic}
      data-jingle-music-length-ms={scene.layout.musicLengthMs}
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `radial-gradient(circle at 18% 18%, ${scene.style.accentColor}55, transparent 34%), linear-gradient(145deg, ${scene.style.backgroundColor}, #050816 72%)`,
        color: scene.style.textColor,
        containerType: "inline-size",
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "8cqw 100%",
          transform: `translateX(${-(timeSeconds % 1) * 8}cqw)`,
        }}
      />
      <div
        className="absolute left-[10cqw] top-[12cqw] size-[46cqw] rounded-full blur-[8cqw]"
        style={{
          background: scene.style.accentColor,
          opacity: 0.22,
          transform: `scale(${pulse})`,
        }}
      />
      <div className="absolute inset-x-[6cqw] top-[6cqw] flex items-center gap-[2.6cqw]">
        {brandMark ? (
          <Image
            alt=""
            src={brandMark}
            className="size-[9cqw] rounded-full bg-white object-contain p-[1.2cqw]"
          />
        ) : (
          <div className="grid size-[9cqw] place-items-center rounded-full bg-white text-[4cqw] font-black leading-none text-slate-950">
            {scene.brand.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[3.8cqw] font-black leading-none text-white">{scene.brand.name}</p>
          <p className="mt-[0.6cqw] text-[2.1cqw] font-black uppercase tracking-[0.18em] text-white/55">Brand jingle</p>
        </div>
      </div>

      <div className="absolute inset-x-[7cqw] top-[32%]">
        <p
          className={`text-balance text-center text-[8.2cqw] font-black leading-[0.98] tracking-normal text-white drop-shadow-[0_0.7cqw_0_rgba(0,0,0,0.35)] ${flashHeadline}`.trim()}
          data-jingle-active-lyric="true"
        >
          {activeLyric}
        </p>
      </div>

      <div
        data-jingle-waveform="true"
        className="absolute inset-x-[9cqw] bottom-[10cqw] flex h-[14cqw] items-end justify-center gap-[1.2cqw]"
      >
        {Array.from({ length: 18 }, (_, index) => {
          const height = 22 + (((index * 17) % 41) * pulse);
          return (
            <span
              key={index}
              className="w-[1.8cqw] rounded-full bg-white/80"
              style={{
                height: `${Math.min(92, height)}%`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
