"use client";

import { PhonePreviewFrame } from "../create/CreatePreviewChrome";

const previewCards = [
  { variantIndex: 0, delaySeconds: -0.5 },
  { variantIndex: 1, delaySeconds: 3 },
  { variantIndex: 2, delaySeconds: 6.5 },
  { variantIndex: 3, delaySeconds: 10 },
] as const;

export function HomepagePreviewCarousel() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[520px] w-[min(82vw,390px)] overflow-visible sm:h-[620px] lg:h-[min(72vh,680px)]"
      data-homepage-preview-carousel="true"
    >
      {previewCards.map(({ variantIndex, delaySeconds }) => (
        <div
          key={variantIndex}
          className="wiggly-home-preview-card absolute inset-0 flex items-center justify-center"
          style={{ animationDelay: `${delaySeconds}s` }}
        >
          <PhonePreviewFrame
            scene={null}
            result={null}
            platform="instagram-feed"
            motionMode="idle"
            timeSeconds={1.1}
            placeholderVariantIndex={variantIndex}
          />
        </div>
      ))}
    </div>
  );
}
