import { useRenderAssetComponents } from "../../render/RenderAssetContext";
import type { MotionStoryAdScene, MotionStoryBeat } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const beatOpacity = (beat: MotionStoryBeat, timeMs: number) => {
  const fadeMs = 300;
  const fadeIn = clamp((timeMs - beat.startMs) / fadeMs);
  const fadeOut = clamp((beat.endMs - timeMs) / fadeMs);
  return Math.min(fadeIn, fadeOut);
};

const beatProgress = (beat: MotionStoryBeat, timeMs: number) => clamp((timeMs - beat.startMs) / Math.max(1, beat.endMs - beat.startMs));

const stripQuotes = (value: string) => value.replace(/^["“”]+|["“”]+$/g, "").trim();

function BrandLockup({ scene, color = "#FFFFFF" }: { scene: MotionStoryAdScene; color?: string }) {
  const { Image } = useRenderAssetComponents();
  const logoUrl = scene.layout.brandLockup.logoUrl;
  return (
    <div
      data-motion-story-lockup="true"
      style={{
        position: "absolute",
        left: "7cqw",
        right: "7cqw",
        bottom: "6cqw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2.2cqw",
        color,
        fontSize: "3.2cqw",
        fontWeight: 950,
        lineHeight: 1,
        letterSpacing: 0,
      }}
    >
      {logoUrl ? (
        <Image
          alt=""
          src={logoUrl}
          style={{
            width: "9cqw",
            height: "9cqw",
            objectFit: "contain",
            borderRadius: "2cqw",
          }}
        />
      ) : null}
      <span>{scene.layout.brandLockup.fallbackText}</span>
    </div>
  );
}

export function MotionStoryFormatRenderer({
  scene,
  timeSeconds = 0,
}: FormatRenderProps<MotionStoryAdScene>) {
  const { Image } = useRenderAssetComponents();
  const timeMs = Math.max(0, timeSeconds * 1000);
  const accent = scene.style.accentColor;
  const brandRed = scene.brand.colors.find((color) => /^#(?:d6001c|c42929|e11d48|dc2626)/i.test(color)) || accent;
  const dark = "#070B1D";
  const proofQuote = stripQuotes(scene.layout.proof.displayText);
  const productAlt = scene.layout.product.title;

  return (
    <div
      data-format="motion-story"
      data-motion-story-screen="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        containerType: "inline-size",
        overflow: "hidden",
        backgroundColor: dark,
        color: "#FFFFFF",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {scene.layout.beats.map((beat) => {
        const opacity = beatOpacity(beat, timeMs);
        const progress = beatProgress(beat, timeMs);
        const active = opacity > 0.001;
        if (beat.role === "hook") {
          return (
            <section
              key={beat.role}
              data-motion-story-beat="hook"
              style={{
                position: "absolute",
                inset: 0,
                opacity,
                overflow: "hidden",
                background: `radial-gradient(circle at 86% 12%, rgba(255,255,255,0.22), transparent 30%), linear-gradient(145deg, ${brandRed} 0%, #7F1020 100%)`,
                pointerEvents: active ? "auto" : "none",
              }}
            >
              <h2
                data-motion-story-hook-headline="true"
                style={{
                  position: "absolute",
                  left: "7cqw",
                  right: "7cqw",
                  top: "18cqw",
                  margin: 0,
                  color: "#FFFFFF",
                  fontSize: beat.headline.length > 44 ? "10cqw" : "11.6cqw",
                  fontWeight: 950,
                  letterSpacing: 0,
                  lineHeight: 0.9,
                  textWrap: "balance",
                  transform: `translateY(${(1 - progress) * 8}cqw) scale(${0.96 + progress * 0.04})`,
                  textShadow: "0 1.1cqw 2.4cqw rgba(15,23,42,0.26)",
                }}
              >
                {beat.headline}
              </h2>
              <Image
                alt={productAlt}
                src={scene.layout.product.cutoutUrl}
                style={{
                  position: "absolute",
                  right: "-7cqw",
                  bottom: "-3cqw",
                  width: "46cqw",
                  height: "46cqw",
                  objectFit: "contain",
                  filter: "drop-shadow(0 5cqw 6cqw rgba(15,23,42,0.38))",
                  transform: `translateY(${(1 - progress) * 12}cqw) rotate(-7deg) scale(${0.92 + progress * 0.08})`,
                }}
              />
            </section>
          );
        }

        if (beat.role === "product") {
          return (
            <section
              key={beat.role}
              data-motion-story-beat="product"
              style={{
                position: "absolute",
                inset: 0,
                opacity,
                overflow: "hidden",
                background: `radial-gradient(circle at 50% 36%, ${accent}44, transparent 34%), linear-gradient(180deg, #111827 0%, #020617 100%)`,
                pointerEvents: active ? "auto" : "none",
              }}
            >
              <Image
                alt={productAlt}
                src={scene.layout.product.cutoutUrl}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "14cqw",
                  width: "66cqw",
                  height: "62cqw",
                  objectFit: "contain",
                  filter: "drop-shadow(0 5cqw 7cqw rgba(0,0,0,0.42))",
                  transform: `translateX(-50%) scale(${0.94 + progress * 0.08})`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "7cqw",
                  right: "7cqw",
                  bottom: "15cqw",
                  textAlign: "center",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: "#FFFFFF",
                    fontSize: "7.2cqw",
                    fontWeight: 950,
                    letterSpacing: 0,
                    lineHeight: 0.95,
                    textWrap: "balance",
                  }}
                >
                  {beat.headline}
                </h2>
                {beat.supportingText ? (
                  <p
                    style={{
                      margin: "3cqw 0 0",
                      color: "rgba(255,255,255,0.78)",
                      fontSize: "3.6cqw",
                      fontWeight: 850,
                      lineHeight: 1.12,
                    }}
                  >
                    {beat.supportingText}
                  </p>
                ) : null}
              </div>
            </section>
          );
        }

        if (beat.role === "proof") {
          return (
            <section
              key={beat.role}
              data-motion-story-beat="proof"
              style={{
                position: "absolute",
                inset: 0,
                opacity,
                overflow: "hidden",
                background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
                color: "#07101F",
                pointerEvents: active ? "auto" : "none",
              }}
            >
              <article
                data-motion-story-proof-card="true"
                style={{
                  position: "absolute",
                  left: "7cqw",
                  right: "7cqw",
                  top: "13cqw",
                  bottom: "13cqw",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "4cqw",
                  padding: "7cqw",
                  borderRadius: "6cqw",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 4cqw 12cqw rgba(15,23,42,0.16)",
                  transform: `scale(${0.98 + progress * 0.02})`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: accent,
                    fontSize: "2.6cqw",
                    fontWeight: 950,
                    letterSpacing: "0.16em",
                    lineHeight: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Real customer proof
                </p>
                <blockquote
                  style={{
                    margin: 0,
                    color: "#020617",
                    fontSize: proofQuote.length > 78 ? "6cqw" : "7.4cqw",
                    fontWeight: 950,
                    letterSpacing: 0,
                    lineHeight: 0.96,
                    textWrap: "balance",
                  }}
                >
                  "{proofQuote}"
                </blockquote>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "3cqw",
                    color: "#64748B",
                    fontSize: "3.1cqw",
                    fontWeight: 900,
                    lineHeight: 1.1,
                  }}
                >
                  <span>{scene.layout.proof.sourceName || "Verified customer"}</span>
                  {scene.layout.proof.rating ? <span style={{ color: "#F59E0B" }}>★★★★★</span> : null}
                </div>
                {scene.layout.proof.aggregateText ? (
                  <p
                    style={{
                      margin: 0,
                      color: "#94A3B8",
                      fontSize: "2.7cqw",
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {scene.layout.proof.aggregateText}
                  </p>
                ) : null}
              </article>
            </section>
          );
        }

        return (
          <section
            key={beat.role}
            data-motion-story-beat="cta"
            style={{
              position: "absolute",
              inset: 0,
              opacity,
              overflow: "hidden",
              background: `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.22), transparent 30%), linear-gradient(145deg, ${brandRed} 0%, #050816 100%)`,
              pointerEvents: active ? "auto" : "none",
            }}
          >
            <Image
              alt={productAlt}
              src={scene.layout.product.cutoutUrl}
              style={{
                position: "absolute",
                left: "4cqw",
                bottom: "12cqw",
                width: "42cqw",
                height: "46cqw",
                objectFit: "contain",
                filter: "drop-shadow(0 4cqw 6cqw rgba(0,0,0,0.34))",
                transform: `translateX(${(1 - progress) * -10}cqw) scale(${0.96 + progress * 0.04})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "42cqw",
                right: "6cqw",
                top: "21cqw",
                color: "#FFFFFF",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: beat.headline.length > 44 ? "7.8cqw" : "9cqw",
                  fontWeight: 950,
                  letterSpacing: 0,
                  lineHeight: 0.9,
                  textWrap: "balance",
                  textShadow: "0 1cqw 2.1cqw rgba(15,23,42,0.28)",
                  transform: `scale(${0.96 + progress * 0.04})`,
                }}
              >
                {beat.headline}
              </h2>
              {beat.supportingText ? (
                <p
                  style={{
                    margin: "3cqw 0 0",
                    color: "rgba(255,255,255,0.78)",
                    fontSize: "3.5cqw",
                    fontWeight: 850,
                    lineHeight: 1.12,
                  }}
                >
                  {beat.supportingText}
                </p>
              ) : null}
            </div>
            <BrandLockup scene={scene} />
          </section>
        );
      })}
    </div>
  );
}
