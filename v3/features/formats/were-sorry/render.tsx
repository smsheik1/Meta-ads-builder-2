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

const markStyle = (scene: WereSorryAdScene): CSSProperties => ({
  borderColor: scene.style.accentColor,
  color: scene.style.accentColor,
});

export function WereSorryFormatRenderer({
  scene,
  rerollFlash,
}: FormatRenderProps<WereSorryAdScene>) {
  const logoSource = getLogoSource(scene);
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";
  const header = scene.creative.headline || scene.layout.apologyHeader;
  const opener = scene.creative.subheadline || scene.layout.legalOpener;

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden bg-[#f8fafc] px-[5cqw] py-[5cqw]"
      data-format="were-sorry"
      style={{
        color: scene.style.textColor,
        containerType: "inline-size",
      }}
    >
      <article
        className="flex h-full w-full flex-col bg-white px-[7cqw] py-[6cqw]"
        data-were-sorry-card="true"
      >
        <header className="flex items-center justify-between border-b border-slate-200 pb-[4cqw]">
          <div className="flex min-w-0 items-center gap-[3cqw]">
            <div
              className="flex size-[10cqw] shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white text-[3.2cqw] font-black"
              style={markStyle(scene)}
            >
              {logoSource ? (
                <img
                  alt=""
                  className="size-full object-contain p-[1.4cqw]"
                  src={logoSource}
                />
              ) : (
                <span>{getInitials(scene.brand.name)}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[3.5cqw] font-black leading-none tracking-normal">
                {scene.brand.name}
              </p>
              <p className="mt-[0.9cqw] text-[1.9cqw] font-black uppercase tracking-[0.2em] text-slate-400">
                Official statement
              </p>
            </div>
          </div>
          <div className="h-[0.8cqw] w-[18cqw]" style={{ backgroundColor: scene.style.accentColor }} />
        </header>

        <section className="flex flex-1 flex-col justify-center py-[5cqw]">
          <p className="text-[2.2cqw] font-black uppercase tracking-[0.24em] text-slate-400">
            Public notice
          </p>
          <h2
            className={`mt-[2.5cqw] text-[8.4cqw] font-black leading-[0.95] tracking-normal text-slate-950 ${flashHeadline}`}
            data-were-sorry-apology="true"
          >
            {header}
          </h2>
          <p
            className="mt-[4cqw] max-w-[88%] text-[3.6cqw] font-semibold leading-[1.22] text-slate-600"
            data-were-sorry-legal-opener="true"
          >
            {opener}
          </p>

          <div className="mt-[4.5cqw] space-y-[2cqw]" data-were-sorry-confessions="true">
            {scene.layout.confessions.map((confession, index) => (
              <p
                key={`${confession}-${index}`}
                className="border-l-[0.7cqw] bg-slate-50 py-[2.2cqw] pl-[3cqw] pr-[2cqw] text-[3.35cqw] font-black leading-[1.12] text-slate-900"
                style={{ borderColor: scene.style.accentColor }}
              >
                {confession}
              </p>
            ))}
          </div>
        </section>

        <footer className="flex items-end justify-between gap-[4cqw] border-t border-slate-200 pt-[4cqw]">
          <p className="max-w-[60%] text-[3cqw] font-black leading-tight text-slate-900" data-were-sorry-signoff="true">
            {scene.layout.signoff}
          </p>
          <p className="text-right text-[1.8cqw] font-black uppercase tracking-[0.18em] text-slate-400">
            No further comment
          </p>
        </footer>
      </article>
    </div>
  );
}
