import { Lock, Sparkles, ThumbsDown, ThumbsUp, Unlock } from "lucide-react";
import type { CanvasInteractionLocks } from "@/features/create/canvasInteractionStore";
import {
  sceneLockKeys,
  sceneLockLabels,
  type SceneLockKey,
} from "@/features/create/reroll";
import type { RenderFlashState, RenderSelectableSlot } from "@/features/formats/types";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import type { AdScene } from "@/features/scene/types";
import { FormatRail, PhonePreviewFrame, type PreviewPlatform } from "./CreatePreviewChrome";
import {
  getLockedSlotsForScene,
  getSceneFormatInteraction,
  getSceneSelectableSlots,
  getSceneSelectedSlotLabel,
  getSlotColorsForScene,
} from "./createFormatInteraction";

export function CreateCanvasColumn({
  adScenesCount,
  isAudioPlaying,
  onChangePreviewBackgroundColor,
  onChangePreviewSlotColor,
  onOpenAudioPanel,
  onRerollScene,
  onSelectPreviewSlot,
  onToggleLock,
  onTogglePlayback,
  onTogglePreviewSlotLock,
  playableAudioUrl,
  previewPlatform,
  previewTimeSeconds,
  rerollCount,
  rerollFlash,
  result,
  sceneLocks,
  selectedPreviewSlot,
  selectedScene,
}: {
  adScenesCount: number;
  isAudioPlaying: boolean;
  onChangePreviewBackgroundColor: (color: string) => void;
  onChangePreviewSlotColor: (slot: RenderSelectableSlot, color: string) => void;
  onOpenAudioPanel: () => void;
  onRerollScene: () => void;
  onSelectPreviewSlot: (slot: RenderSelectableSlot) => void;
  onToggleLock: (key: SceneLockKey) => void;
  onTogglePlayback: () => void;
  onTogglePreviewSlotLock: (slot: RenderSelectableSlot) => void;
  playableAudioUrl: string;
  previewPlatform: PreviewPlatform;
  previewTimeSeconds: number;
  rerollCount: number;
  rerollFlash: RenderFlashState | null;
  result: StoredWebsiteResearchResult | null;
  sceneLocks: CanvasInteractionLocks;
  selectedPreviewSlot: RenderSelectableSlot | null;
  selectedScene: AdScene | null;
}) {
  return (
    <div>
      <div className="flex items-start justify-center gap-4">
        <FormatRail />
        <div>
          <PhonePreviewFrame
            scene={selectedScene}
            result={result}
            platform={previewPlatform}
            motionMode={isAudioPlaying ? "audio" : "idle"}
            rerollFlash={rerollFlash}
            timeSeconds={previewTimeSeconds}
            onOpenAudioPanel={onOpenAudioPanel}
            onTogglePlayback={onTogglePlayback}
            previewReady={Boolean(playableAudioUrl)}
            isAudioPlaying={isAudioPlaying}
            selectedSlot={selectedPreviewSlot}
            selectableSlots={selectedScene ? getSceneSelectableSlots(selectedScene) : undefined}
            lockedSlots={selectedScene ? getLockedSlotsForScene(selectedScene, sceneLocks) : undefined}
            slotColors={selectedScene ? getSlotColorsForScene(selectedScene) : undefined}
            backgroundColor={selectedScene ? getSceneFormatInteraction(selectedScene).getBackgroundColor(selectedScene) : "#fbfaf5"}
            onSelectSlot={onSelectPreviewSlot}
            onToggleSlotLock={onTogglePreviewSlotLock}
            onChangeSlotColor={onChangePreviewSlotColor}
            onChangeBackgroundColor={onChangePreviewBackgroundColor}
          />

          {adScenesCount ? (
            <>
              <section className="mx-auto mt-7 w-full max-w-[520px] rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_20px_54px_rgba(15,23,42,0.12)]">
                <button
                  type="button"
                  onClick={onRerollScene}
                  className="group flex w-full items-center justify-center gap-3 rounded-[22px] bg-slate-950 px-5 py-4 text-2xl font-black text-white shadow-[0_16px_42px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
                >
                  <Sparkles className="size-7" />
                  <span>Press</span>
                  <kbd className="rounded-xl bg-white px-7 py-2.5 text-lg font-black uppercase tracking-[0.22em] text-slate-950 shadow-[inset_0_-2px_0_rgba(15,23,42,0.12)]">
                    Spacebar
                  </kbd>
                  <span>make a wish</span>
                </button>
                <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  {selectedPreviewSlot && selectedScene
                    ? `Spacebar rerolls the ${getSceneSelectedSlotLabel(selectedScene, selectedPreviewSlot)}`
                    : rerollCount
                      ? `${rerollCount} reroll${rerollCount === 1 ? "" : "s"} this session`
                      : "Start here. Make a fresh version in one tap."}
                </p>
              </section>

              <section className="mx-auto mt-5 flex w-full max-w-[390px] items-center justify-between rounded-[28px] border border-slate-200 bg-white/95 px-6 py-4 shadow-[0_18px_46px_rgba(15,23,42,0.10)]">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">Generation</p>
                  <p className="mt-1 text-xl font-black text-slate-950">Was this one useful?</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    aria-label="Thumbs up"
                    className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    <ThumbsUp className="size-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Thumbs down"
                    className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    <ThumbsDown className="size-6" />
                  </button>
                </div>
              </section>

              <section className="mx-auto mt-5 grid w-full max-w-[520px] grid-cols-4 gap-2 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.10)]">
                {sceneLockKeys.map((key) => {
                  const locked = sceneLocks[key];
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => onToggleLock(key)}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-black transition ${
                        locked
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                      }`}
                      aria-pressed={locked}
                    >
                      {locked ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                      {sceneLockLabels[key]}
                    </button>
                  );
                })}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
