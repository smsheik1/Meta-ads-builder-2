import type { CSSProperties } from "react";
import type { WereSorryAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const getLogoSource = (scene: WereSorryAdScene) => (
  scene.brand.logoUrl || scene.brand.faviconUrl || ""
);

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join("") || "W";

const hexToRgb = (hex: string) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return {
    r: parseInt(match[1]!, 16),
    g: parseInt(match[2]!, 16),
    b: parseInt(match[3]!, 16),
  };
};

const rgba = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);
  return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : `rgba(15, 23, 42, ${alpha})`;
};

const getBrandMarkStyle = (scene: WereSorryAdScene): CSSProperties => ({
  borderColor: rgba(scene.style.accentColor, 0.34),
  boxShadow: `0 18px 60px ${rgba(scene.style.accentColor, 0.18)}`,
});

export function WereSorryFormatRenderer({
  scene,
  rerollFlash,
}: FormatRenderProps<WereSorryAdScene>) {
  const logoSource = getLogoSource(scene);
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";
  const apology = scene.creative.headline || scene.layout.apology;
  const makeGood = scene.creative.subheadline || scene.layout.makeGood;

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden"
      data-format="were-sorry"
      style={{
        background: `linear-gradient(145deg, ${scene.style.backgroundColor}, #FFFFFF 58%, ${rgba(scene.style.accentColor, 0.16)})`,
        color: scene.style.textColor,
        containerType: "inline-size",
      }}
    >
      <div
        className="relative flex h-full w-full flex-col overflow-hidden px-[7cqw] py-[6cqw]"
        data-were-sorry-card="true"
      >
        <div className="absolute inset-x-0 top-0 h-[2cqw]" style={{ backgroundColor: scene.style.accentColor }} />
        <div className="relative z-10 flex items-center justify-between gap-[4cqw]">
          <div className="flex min-w-0 items-center gap-[3cqw]">
            <div
              className="flex size-[12cqw] shrink-0 items-center justify-center overflow-hidden rounded-full border-[0.7cqw] bg-white text-[4cqw] font-black"
              style={getBrandMarkStyle(scene)}
            >
              {logoSource ? (
                <img
                  alt=""
                  className="size-full object-contain p-[1.5cqw]"
                  src={logoSource}
                />
              ) : (
                <span>{getInitials(scene.brand.name)}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[4.4cqw] font-black leading-none tracking-normal">
                {scene.brand.name}
              </p>
              <p className="mt-[1cqw] text-[2.3cqw] font-black uppercase tracking-[0.18em] opacity-55">
                {scene.layout.badgeText}
              </p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full px-[3cqw] py-[1.5cqw] text-[2.2cqw] font-black uppercase tracking-[0.14em] text-white"
            style={{ backgroundColor: scene.style.accentColor }}
          >
            Sorry
          </span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center py-[7cqw]">
          <p className="text-[4cqw] font-black uppercase tracking-[0.18em] opacity-45">
            We're sorry
          </p>
          <h2
            className={`mt-[3cqw] max-w-[92%] text-[11cqw] font-black leading-[0.94] tracking-normal ${flashHeadline}`}
            data-were-sorry-apology="true"
          >
            {apology}
          </h2>
          <p
            className="mt-[5cqw] max-w-[86%] text-[4.9cqw] font-extrabold leading-[1.08] tracking-normal opacity-75"
            data-were-sorry-make-good="true"
          >
            {makeGood}
          </p>
        </div>

        <div className="relative z-10 flex items-end justify-between gap-[4cqw]">
          <div className="h-[1.3cqw] flex-1 rounded-full opacity-85" style={{ backgroundColor: scene.style.accentColor }} />
          <div
            className="rounded-full border border-black/10 bg-white px-[5cqw] py-[2.6cqw] text-[3.2cqw] font-black shadow-xl shadow-slate-950/10"
            data-were-sorry-cta="true"
          >
            {scene.creative.ctaText}
          </div>
        </div>
      </div>
    </div>
  );
}
