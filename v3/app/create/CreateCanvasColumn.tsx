"use client";

import { Sparkles } from "lucide-react";
import type { MouseEvent, PointerEvent } from "react";
import { useRef } from "react";
import type { RenderFlashState } from "@/features/formats/types";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import type { AdScene } from "@/features/scene/types";
import { FormatRail } from "./CreateFormatRail";
import { PhonePreviewFrame, type PreviewPlatform } from "./CreatePreviewChrome";

export function CreateCanvasColumn({
  adScenesCount,
  isAudioPlaying,
  onRerollScene,
  placeholderVariantIndex,
  previewPlatform,
  previewTimeSeconds,
  rerollCount,
  rerollFlash,
  result,
  selectedScene,
}: {
  adScenesCount: number;
  isAudioPlaying: boolean;
  onRerollScene: () => void;
  placeholderVariantIndex: number;
  previewPlatform: PreviewPlatform;
  previewTimeSeconds: number;
  rerollCount: number;
  rerollFlash: RenderFlashState | null;
  result: StoredWebsiteResearchResult | null;
  selectedScene: AdScene | null;
}) {
  const lastPointerRerollAtRef = useRef(0);

  const onWishPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" || event.pointerType === "touch" || event.pointerType === "pen") {
      event.preventDefault();
      lastPointerRerollAtRef.current = Date.now();
      onRerollScene();
    }
  };

  const onWishClick = (event: MouseEvent<HTMLButtonElement>) => {
    const pointerAlreadyHandled = Date.now() - lastPointerRerollAtRef.current < 250;
    if (!pointerAlreadyHandled || event.detail === 0) onRerollScene();
  };

  return (
    <div className="relative flex flex-col items-center gap-3 lg:block">
      <FormatRail />
      <div>
        <PhonePreviewFrame
          scene={selectedScene}
          result={result}
          platform={previewPlatform}
          motionMode={isAudioPlaying ? "audio" : "idle"}
          rerollFlash={rerollFlash}
          timeSeconds={previewTimeSeconds}
          placeholderVariantIndex={placeholderVariantIndex}
        />

          <section className="mx-auto mt-4 w-full max-w-[390px] rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)]">
            <button
              type="button"
              onClick={onWishClick}
              onPointerDown={onWishPointerDown}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_22px_52px_rgba(15,23,42,0.18)]"
              data-testid="spacebar-reroll-button"
            >
              <Sparkles className="size-4" />
              <span>Press</span>
              <kbd className="rounded-lg border border-white/20 bg-white px-5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-[inset_0_-2px_0_rgba(15,23,42,0.10)] transition group-hover:bg-slate-100">
                Spacebar
              </kbd>
              <span>make a wish</span>
            </button>
            <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {rerollCount
                ? `${rerollCount} reroll${rerollCount === 1 ? "" : "s"} this session`
                : adScenesCount
                  ? "Start here. Make a fresh version in one tap."
                  : "Start here. Tour the starter ads in one tap."}
            </p>
          </section>
      </div>
    </div>
  );
}
