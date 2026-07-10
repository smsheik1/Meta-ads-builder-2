"use client";

import { Sparkles } from "lucide-react";
import type { MouseEvent, PointerEvent } from "react";
import { useRef } from "react";
import type { RenderFlashState } from "@/features/formats/types";
import {
  ThreeDBreakdownProgressCanvas,
  type ThreeDBreakdownProgressState,
} from "@/features/formats/three-d-breakdown/ProgressCanvas";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import type { AdScene } from "@/features/scene/types";
import { PhonePreviewFrame, type PreviewPlatform } from "./CreatePreviewChrome";

export function CreateCanvasColumn({
  adScenesCount,
  isAudioPlaying,
  onFinalVideoElement,
  onRerollScene,
  onOpenAudioPanel,
  onPreviewTimeChange,
  placeholderVariantIndex,
  previewBusyLabel,
  previewPlatform,
  previewTimeSeconds,
  rerollBusy,
  rerollCount,
  rerollFlash,
  result,
  selectedScene,
  threeDProgress,
}: {
  adScenesCount: number;
  isAudioPlaying: boolean;
  onFinalVideoElement: (element: HTMLVideoElement | null) => void;
  onRerollScene: () => void;
  onOpenAudioPanel: () => void;
  onPreviewTimeChange: (timeSeconds: number) => void;
  placeholderVariantIndex: number;
  previewBusyLabel: string;
  previewPlatform: PreviewPlatform;
  previewTimeSeconds: number;
  rerollBusy: boolean;
  rerollCount: number;
  rerollFlash: RenderFlashState | null;
  result: StoredWebsiteResearchResult | null;
  selectedScene: AdScene | null;
  threeDProgress: ThreeDBreakdownProgressState | null;
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
      <div>
        {threeDProgress ? (
          <ThreeDBreakdownProgressCanvas progress={threeDProgress} />
        ) : (
          <>
            <div className="relative">
              <PhonePreviewFrame
                scene={selectedScene}
                result={result}
                platform={previewPlatform}
                motionMode={isAudioPlaying ? "audio" : "idle"}
                rerollFlash={rerollFlash}
                timeSeconds={previewTimeSeconds}
                placeholderVariantIndex={placeholderVariantIndex}
                onFinalVideoElement={onFinalVideoElement}
                onOpenAudioPanel={onOpenAudioPanel}
                onPreviewTimeChange={onPreviewTimeChange}
              />
              {previewBusyLabel ? (
                <div
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[34px] bg-slate-950/35 p-6 backdrop-blur-[2px]"
                  data-preview-loading-overlay
                >
                  <div className="rounded-3xl border border-white/20 bg-white/95 px-5 py-4 text-center shadow-[0_24px_70px_rgba(15,23,42,0.30)]">
                    <img
                      src="/wiggly-wordmark-3d-crop.png"
                      alt=""
                      className="wiggly-preview-bounce mx-auto mb-3 h-12 w-auto"
                    />
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-950">{previewBusyLabel}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <section className="mx-auto mt-4 w-full max-w-[390px] rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)]">
              <button
                type="button"
                disabled={rerollBusy}
                onClick={onWishClick}
                onPointerDown={onWishPointerDown}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_22px_52px_rgba(15,23,42,0.18)] disabled:cursor-wait disabled:bg-slate-700 disabled:hover:translate-y-0"
                data-testid="spacebar-reroll-button"
              >
                <Sparkles className={`size-4 ${rerollBusy ? "animate-pulse" : ""}`} />
                <span>Press</span>
                <kbd className="rounded-lg border border-white/20 bg-white px-5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-[inset_0_-2px_0_rgba(15,23,42,0.10)] transition group-hover:bg-slate-100">
                  Spacebar
                </kbd>
                <span>make a wish</span>
              </button>
              <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {rerollBusy
                  ? "Making your next version..."
                  : rerollCount
                    ? `${rerollCount} reroll${rerollCount === 1 ? "" : "s"} this session`
                    : adScenesCount
                      ? "Start here. Make a fresh version in one tap."
                      : "Start here. Tour the starter ads in one tap."}
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
