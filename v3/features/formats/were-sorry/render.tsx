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
      data-format="were-sorry"
      style={{
        alignItems: "center",
        backgroundColor: "#f8fafc",
        color: scene.style.textColor,
        containerType: "inline-size",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        overflow: "hidden",
        padding: "5cqw",
        width: "100%",
      }}
    >
      <article
        data-were-sorry-card="true"
        style={{
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "6cqw 7cqw",
          width: "100%",
        }}
      >
        <header
          style={{
            alignItems: "center",
            borderBottom: "0.12cqw solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: "4cqw",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: "3cqw", minWidth: 0 }}>
            <div
              style={{
                ...markStyle(scene),
                alignItems: "center",
                backgroundColor: "#ffffff",
                borderRadius: "999px",
                borderStyle: "solid",
                borderWidth: "0.15cqw",
                display: "flex",
                flexShrink: 0,
                fontSize: "3.2cqw",
                fontWeight: 900,
                height: "10cqw",
                justifyContent: "center",
                overflow: "hidden",
                width: "10cqw",
              }}
            >
              {logoSource ? (
                <img
                  alt=""
                  src={logoSource}
                  style={{
                    height: "100%",
                    objectFit: "contain",
                    padding: "1.4cqw",
                    width: "100%",
                  }}
                />
              ) : (
                <span>{getInitials(scene.brand.name)}</span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: "3.5cqw",
                  fontWeight: 900,
                  letterSpacing: 0,
                  lineHeight: 1,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {scene.brand.name}
              </p>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "1.9cqw",
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                  lineHeight: 1,
                  margin: "0.9cqw 0 0",
                  textTransform: "uppercase",
                }}
              >
                Official statement
              </p>
            </div>
          </div>
          <div style={{ backgroundColor: scene.style.accentColor, height: "0.8cqw", width: "18cqw" }} />
        </header>

        <section
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            padding: "5cqw 0",
          }}
        >
          <p
            style={{
              color: "#94a3b8",
              fontSize: "2.2cqw",
              fontWeight: 900,
              letterSpacing: "0.24em",
              lineHeight: 1,
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            Public notice
          </p>
          <h2
            className={flashHeadline}
            data-were-sorry-apology="true"
            style={{
              color: "#020617",
              fontSize: "8.4cqw",
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 0.95,
              margin: "2.5cqw 0 0",
            }}
          >
            {header}
          </h2>
          <p
            data-were-sorry-legal-opener="true"
            style={{
              color: "#475569",
              fontSize: "3.6cqw",
              fontWeight: 600,
              lineHeight: 1.22,
              margin: "4cqw 0 0",
              maxWidth: "88%",
            }}
          >
            {opener}
          </p>

          <div
            data-were-sorry-confessions="true"
            style={{ display: "flex", flexDirection: "column", gap: "2cqw", marginTop: "4.5cqw" }}
          >
            {scene.layout.confessions.map((confession, index) => (
              <p
                key={`${confession}-${index}`}
                style={{
                  backgroundColor: "#f8fafc",
                  borderColor: scene.style.accentColor,
                  borderLeftStyle: "solid",
                  borderLeftWidth: "0.7cqw",
                  color: "#0f172a",
                  fontSize: "3.35cqw",
                  fontWeight: 900,
                  lineHeight: 1.12,
                  margin: 0,
                  padding: "2.2cqw 2cqw 2.2cqw 3cqw",
                }}
              >
                {confession}
              </p>
            ))}
          </div>
        </section>

        <footer
          style={{
            alignItems: "flex-end",
            borderTop: "0.12cqw solid #e2e8f0",
            display: "flex",
            gap: "4cqw",
            justifyContent: "space-between",
            paddingTop: "4cqw",
          }}
        >
          <p
            data-were-sorry-signoff="true"
            style={{
              color: "#0f172a",
              fontSize: "3cqw",
              fontWeight: 900,
              lineHeight: 1.25,
              margin: 0,
              maxWidth: "60%",
            }}
          >
            {scene.layout.signoff}
          </p>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "1.8cqw",
              fontWeight: 900,
              letterSpacing: "0.18em",
              lineHeight: 1.1,
              margin: 0,
              textAlign: "right",
              textTransform: "uppercase",
            }}
          >
            No further comment
          </p>
        </footer>
      </article>
    </div>
  );
}
