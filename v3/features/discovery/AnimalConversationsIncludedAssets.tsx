"use client";

import Image from "next/image";
import { useState } from "react";
import type { AnimalConversationsTrustData } from "./animalConversationsTrust.server";

const characterAccent: Record<string, string> = {
  cat: "#52d6ff",
  bunny: "#ff78bd",
};

export function AnimalConversationsIncludedAssets({
  data,
}: {
  data: AnimalConversationsTrustData;
}) {
  const assets = data.includedAssets;
  const [selectedBackgroundId, setSelectedBackgroundId] = useState(
    assets.defaultBackgroundId,
  );
  const selectedBackground =
    assets.backgrounds.find(
      (background) => background.id === selectedBackgroundId,
    ) ?? assets.backgrounds[0];

  if (!selectedBackground) return null;

  return (
    <section
      id="included-assets"
      aria-labelledby="included-assets-title"
      className="border-y-2 border-[#080817] bg-[#fffdf8] px-4 py-[58px] text-[#080817] sm:px-7"
      data-testid="animal-conversations-included-assets"
    >
      <div className="mx-auto max-w-[980px]">
        <div className="grid gap-4 min-[701px]:grid-cols-[1fr_auto] min-[701px]:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667087]">
              Included assets
            </p>
            <h2
              id="included-assets-title"
              className="mt-3 max-w-[720px] text-[clamp(34px,5vw,54px)] font-black leading-[0.96] tracking-[-0.04em]"
            >
              The cast, rooms, and camera grammar.
            </h2>
          </div>
          <p className="text-sm font-black min-[701px]:pb-1 min-[701px]:text-right">
            {data.stats.characters} characters · {data.stats.backgrounds}{" "}
            backgrounds · {data.stats.cameras} cameras
          </p>
        </div>

        <div className="mt-8 flex items-end justify-between gap-3">
          <h3 className="text-xl font-black">Complete character poses</h3>
          <p className="text-sm font-bold text-[#667087]">
            Idle · talking · blink
          </p>
        </div>
        <div
          className="mt-3 grid gap-3 min-[520px]:grid-cols-2"
          aria-label="Two included character pose sets"
        >
          {assets.characters.map((character) => (
            <article
              key={character.id}
              className="overflow-hidden border-2 border-[#080817] bg-white shadow-[4px_4px_0_#080817]"
              style={{ borderTopColor: characterAccent[character.id] }}
            >
              <div className="relative aspect-[4/3] bg-[#f5f1e8]">
                <Image
                  src={character.posterSrc}
                  alt={`${character.label} complete colored idle pose`}
                  fill
                  sizes="(min-width: 520px) 480px, 100vw"
                  className="object-contain p-3"
                />
              </div>
              <div className="border-t-2 border-[#080817] p-3.5">
                <h4 className="text-lg font-black leading-tight">
                  {character.label}
                </h4>
                <p className="mt-1 text-xs font-bold text-[#667087]">
                  {character.poseCount} checksum-bound PNG poses
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-9 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-xl font-black">Background system</h3>
          <p className="text-sm font-bold text-[#667087]">
            Choose one packaged scene without changing the renderer
          </p>
        </div>
        <div className="mt-3 grid gap-3 min-[701px]:grid-cols-[1.35fr_0.65fr]">
          <div className="relative flex min-h-[420px] flex-col justify-end overflow-hidden border-2 border-[#080817] bg-[#080817] p-4 text-white shadow-[5px_5px_0_#080817]">
            <Image
              key={selectedBackground.src}
              src={selectedBackground.src}
              alt={`${selectedBackground.label} packaged conversation background`}
              fill
              sizes="(min-width: 701px) 620px, 100vw"
              className="object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <h4 className="text-xl font-black">{selectedBackground.label}</h4>
              <p className="mt-1 max-w-xl text-sm font-bold leading-5 text-white/85">
                {selectedBackground.description}
              </p>
            </div>
          </div>

          <div
            className="grid grid-cols-2 gap-2 max-[429px]:grid-cols-1 min-[701px]:grid-cols-1"
            aria-label="Choose a packaged conversation background"
          >
            {assets.backgrounds.map((background) => {
              const isSelected = background.id === selectedBackground.id;
              return (
                <button
                  key={background.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedBackgroundId(background.id)}
                  className={`grid min-h-[76px] grid-cols-[54px_1fr] items-center gap-2 border-2 border-[#080817] p-2 text-left text-xs font-black transition-transform focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#52d6ff] ${
                    isSelected
                      ? "-translate-x-0.5 -translate-y-0.5 bg-[#c9ff55] shadow-[4px_4px_0_#080817]"
                      : "bg-white hover:bg-[#dff8ff]"
                  }`}
                >
                  <span className="relative block aspect-square overflow-hidden border border-[#080817]">
                    <Image
                      src={background.src}
                      alt=""
                      fill
                      sizes="54px"
                      className="object-cover"
                    />
                  </span>
                  <span>{background.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-2 border-[#080817] bg-[#c9ff55] px-4 py-3.5 min-[701px]:flex-row min-[701px]:items-center min-[701px]:justify-between">
          <h3 className="text-lg font-black">Three camera angles included</h3>
          <p className="max-w-[430px] text-sm font-black min-[701px]:text-right">
            Two-shot · Cat close-up · Bunny close-up
          </p>
        </div>
      </div>
    </section>
  );
}
