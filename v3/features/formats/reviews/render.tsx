import type { ReviewsAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

function StarRow({ rating }: { rating?: number }) {
  if (!rating) return null;
  return (
    <div
      aria-label={`${rating} stars`}
      data-reviews-stars="true"
      style={{
        display: "flex",
        gap: "0.5cqw",
        color: "#F59E0B",
        fontSize: "4.2cqw",
        lineHeight: 1,
      }}
    >
      {Array.from({ length: Math.round(Math.min(5, Math.max(1, rating))) }, (_, index) => (
        <span key={index}>★</span>
      ))}
    </div>
  );
}

function MinimalQuoteReviewsRenderer({ scene, reviewText, sourceName }: {
  scene: ReviewsAdScene;
  reviewText: string;
  sourceName?: string;
}) {
  const logoSource = scene.brand.logoUrl || scene.brand.faviconUrl || "";
  const quoteFontSize = reviewText.length > 150 ? "5.9cqw" : reviewText.length > 95 ? "6.7cqw" : "7.7cqw";
  const hasAttribution = Boolean(sourceName || scene.layout.proof.rating);

  return (
    <div
      data-format="reviews"
      data-reviews-screen="true"
      data-reviews-template="minimal-quote"
      data-reviews-minimal-quote="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        containerType: "inline-size",
        overflow: "hidden",
        backgroundColor: "#F7F7F5",
        color: "#050505",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <section
        style={{
          position: "absolute",
          inset: "14cqw 9cqw 8cqw 11cqw",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          aria-hidden="true"
          data-reviews-minimal-quote-mark="true"
          style={{
            color: "#050505",
            fontSize: "30cqw",
            fontWeight: 950,
            lineHeight: 0.62,
            letterSpacing: 0,
          }}
        >
          “
        </div>
        <h2
          data-reviews-proof-text="true"
          data-reviews-minimal-quote-text="true"
          style={{
            maxWidth: "78cqw",
            margin: "6cqw 0 0",
            color: "#050505",
            fontSize: quoteFontSize,
            fontWeight: 500,
            lineHeight: 1.14,
            letterSpacing: 0,
          }}
        >
          {reviewText}
        </h2>
        {hasAttribution ? (
          <div
            data-reviews-minimal-attribution="true"
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1.5cqw",
              marginTop: "6.5cqw",
              color: "#050505",
              fontSize: "3.4cqw",
              fontWeight: 500,
              lineHeight: 1.2,
            }}
          >
            {sourceName ? <strong style={{ fontWeight: 850 }}>{sourceName}</strong> : null}
            <StarRow rating={scene.layout.proof.rating} />
          </div>
        ) : null}
        <div style={{ flex: 1 }} />
        <footer
          data-reviews-minimal-brand-lockup="true"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2cqw",
            color: "#050505",
            fontSize: "4.1cqw",
            fontWeight: 850,
            lineHeight: 1,
          }}
        >
          {logoSource ? (
            <img
              alt=""
              src={logoSource}
              style={{
                width: "7cqw",
                height: "7cqw",
                objectFit: "contain",
              }}
            />
          ) : null}
          <span>{scene.brand.name}</span>
        </footer>
      </section>
    </div>
  );
}

export function ReviewsFormatRenderer({
  scene,
  rerollFlash,
}: FormatRenderProps<ReviewsAdScene>) {
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";
  const product = scene.layout.productAnchor;
  const images = [
    ...(product?.imageUrl ? [product.imageUrl] : []),
    ...(scene.layout.backgroundImages || []),
  ].filter((src, index, all) => src && all.indexOf(src) === index);
  const accent = scene.style.accentColor;
  const reviewText = scene.layout.proofText.replace(/^["“”]+|["“”]+$/g, "").trim();
  const reviewFontSize = reviewText.length > 150 ? "5.3cqw" : reviewText.length > 95 ? "6.1cqw" : "7.1cqw";
  const sourceName = scene.layout.proof.sourceName?.trim();
  const proofNumber = Math.max(1, scene.layout.proofIndex + 1);
  const proofTotal = Math.max(proofNumber, scene.layout.proofTotal || 0);

  if ((scene.layout.template || "proof-card") === "minimal-quote") {
    return <MinimalQuoteReviewsRenderer scene={scene} reviewText={reviewText} sourceName={sourceName} />;
  }

  return (
    <div
      data-format="reviews"
      data-reviews-screen="true"
      data-reviews-template="proof-card"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        containerType: "inline-size",
        overflow: "hidden",
        backgroundColor: scene.style.backgroundColor,
        color: scene.style.textColor,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        data-reviews-background="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          background: images.length
            ? `linear-gradient(180deg, rgba(15,23,42,0.36), rgba(15,23,42,0.84))`
            : `radial-gradient(circle at 25% 18%, ${accent}44, transparent 34%), linear-gradient(145deg, #FFFFFF 0%, #EEF2FF 100%)`,
        }}
      >
        {images.length ? (
          <div
            data-reviews-image-rail="true"
            style={{
              position: "absolute",
              inset: "-8cqw",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "3cqw",
              opacity: 0.62,
              transform: "rotate(-5deg)",
            }}
          >
            {Array.from({ length: 6 }, (_, index) => {
              const src = images[index % images.length];
              return src ? (
                <img
                  key={`${src}-${index}`}
                  alt=""
                  src={src}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: "3cqw",
                    filter: "saturate(1.1) contrast(1.05)",
                  }}
                />
              ) : null;
            })}
          </div>
        ) : null}
      </div>

      <div
        data-reviews-overlay="true"
        style={{
          position: "absolute",
          inset: 0,
          background: images.length
            ? "linear-gradient(180deg, rgba(2,6,23,0.16), rgba(2,6,23,0.74))"
            : "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.72))",
        }}
      />

      <article
        data-reviews-card="true"
        style={{
          position: "absolute",
          left: "6cqw",
          right: "6cqw",
          top: "10cqw",
          bottom: "10cqw",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: "4.2cqw",
          padding: "5.8cqw",
          overflow: "hidden",
          borderRadius: "6cqw",
          backgroundColor: "rgba(255,255,255,0.94)",
          boxShadow: "0 4cqw 12cqw rgba(15,23,42,0.22)",
        }}
      >
        <div
          data-reviews-product-context="true"
          style={{
            display: "grid",
            gridTemplateColumns: product?.imageUrl ? "22cqw minmax(0, 1fr)" : "1fr",
            alignItems: "center",
            gap: "3cqw",
          }}
        >
          {product?.imageUrl ? (
            <img
              alt={product.imageAlt || product.title}
              src={product.imageUrl}
              style={{
                width: "22cqw",
                height: "22cqw",
                objectFit: "cover",
                borderRadius: "3.4cqw",
                border: "0.55cqw solid rgba(15,23,42,0.08)",
                backgroundColor: "#FFFFFF",
              }}
            />
          ) : null}
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "1.5cqw",
            }}
          >
            <p
              style={{
                margin: 0,
                color: accent,
                fontSize: "2.55cqw",
                fontWeight: 950,
                letterSpacing: "0.12em",
                lineHeight: 1,
                textTransform: "uppercase",
              }}
            >
              {product?.isBestSeller ? "Best seller review" : "Real customer review"}
            </p>
            <p
              data-reviews-context="true"
              style={{
                margin: 0,
                color: "#020617",
                fontSize: "4.2cqw",
                fontWeight: 950,
                lineHeight: 1.02,
                letterSpacing: 0,
              }}
            >
              {product?.title || scene.brand.name}
            </p>
          </div>
        </div>

        <section
          data-reviews-proof-type="review"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "3.1cqw",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "10.5cqw",
              height: "10.5cqw",
              borderRadius: "3.2cqw",
              display: "grid",
              placeItems: "center",
              backgroundColor: accent,
              color: "#FFFFFF",
              fontSize: "5.8cqw",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            “
          </div>
          <h2
            className={flashHeadline}
            data-reviews-proof-text="true"
            style={{
              margin: 0,
              fontSize: reviewFontSize,
              fontWeight: 950,
              lineHeight: 0.98,
              letterSpacing: 0,
              color: "#020617",
            }}
          >
            “{reviewText}”
          </h2>
          <StarRow rating={scene.layout.proof.rating} />
        </section>

        <footer
          data-reviews-attribution="true"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.3cqw",
            color: "#64748B",
            fontSize: "2.75cqw",
            fontWeight: 950,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}
        >
          {sourceName ? <span>{sourceName}</span> : null}
          {sourceName ? <span style={{ opacity: 0.48 }}>•</span> : null}
          <span>{proofNumber} of {proofTotal} reviews</span>
        </footer>
      </article>
    </div>
  );
}
