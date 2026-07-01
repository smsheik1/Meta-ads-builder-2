import {
  Check,
  Clapperboard,
  FileText,
  Film,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { BrickStoryboard } from "@/features/formats/jingle/storyboard";

type BrickStoryboardStatus = "idle" | "loading" | "ready" | "error";

export function CreateBrickStoryboardSheet({
  brickStoryboard,
  brickStoryboardAnimationStatus,
  brickStoryboardBuildStatus,
  brickStoryboardError,
  brickStoryboardShotBusyIndex,
  brickStoryboardStatus,
  canGenerateBrickStoryboard,
  onAnimateBrickStoryboard,
  onBuildBrickMusicVideo,
  onGenerateBrickStoryboard,
  onRegenerateBrickShot,
}: {
  brickStoryboard: BrickStoryboard | null;
  brickStoryboardAnimationStatus: BrickStoryboardStatus;
  brickStoryboardBuildStatus: BrickStoryboardStatus;
  brickStoryboardError: string;
  brickStoryboardShotBusyIndex: number | null;
  brickStoryboardStatus: BrickStoryboardStatus;
  canGenerateBrickStoryboard: boolean;
  onAnimateBrickStoryboard: () => void;
  onBuildBrickMusicVideo: () => void;
  onGenerateBrickStoryboard: () => void;
  onRegenerateBrickShot: (shotIndex: number) => void;
}) {
  const brickStoryboardBusy = brickStoryboardStatus === "loading";
  const brickStoryboardAnimating = brickStoryboardAnimationStatus === "loading";
  const brickStoryboardBuilding = brickStoryboardBuildStatus === "loading";
  const brickStoryboardShots = Array.isArray(brickStoryboard?.shots) ? brickStoryboard.shots : [];
  const canAnimateBrickStoryboard = Boolean(
    brickStoryboard?.referenceFrame?.image?.url &&
    brickStoryboardShots.length &&
    brickStoryboardShots.every((shot) => shot.status === "ok" && shot.image?.url),
  );
  const canBuildBrickMusicVideo = Boolean(
    canAnimateBrickStoryboard &&
    brickStoryboardShots.every((shot) => shot.video?.url),
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={!canGenerateBrickStoryboard && !brickStoryboard}
          className="h-auto min-h-16 w-full justify-start rounded-2xl border-slate-200 bg-white px-4 py-3 text-left shadow-lg shadow-slate-950/5"
          data-brick-storyboard-trigger="true"
        >
          <span className="flex w-full items-center gap-3">
            {brickStoryboardBusy ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Brick music video
              </span>
              <span className="block truncate text-sm font-black tracking-normal text-slate-800">
                {brickStoryboardBusy ? "Generating storyboard" : brickStoryboardStatus === "ready" ? "View storyboard" : "Generate storyboard"}
              </span>
            </span>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[720px] overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-[760px]">
        <SheetHeader className="border-b border-slate-200 px-5 py-5 text-left">
          <SheetTitle className="text-2xl font-black tracking-tight text-slate-950">
            Brick storyboard
          </SheetTitle>
          <SheetDescription className="font-semibold text-slate-500">
            Review the reference frame and shot stills before animating.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 p-5">
          <Button
            type="button"
            onClick={onGenerateBrickStoryboard}
            disabled={!canGenerateBrickStoryboard || brickStoryboardBusy || brickStoryboardAnimating || brickStoryboardBuilding}
            className="h-11 w-full rounded-2xl bg-slate-950 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-slate-800"
          >
            {brickStoryboardBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Clapperboard className="mr-2 size-4" />}
            {brickStoryboard ? "Regenerate board" : "Generate board"}
          </Button>
          {brickStoryboard ? (
            <Button
              type="button"
              onClick={onAnimateBrickStoryboard}
              disabled={!canAnimateBrickStoryboard || brickStoryboardBusy || brickStoryboardAnimating || brickStoryboardBuilding}
              variant="outline"
              className="h-11 w-full rounded-2xl border-slate-200 text-xs font-black uppercase tracking-[0.12em]"
              data-brick-storyboard-animate="true"
            >
              {brickStoryboardAnimating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Film className="mr-2 size-4" />}
              {brickStoryboardAnimating ? "Animating board" : "Animate board"}
            </Button>
          ) : null}
          {brickStoryboard ? (
            <Button
              type="button"
              onClick={onBuildBrickMusicVideo}
              disabled={!canBuildBrickMusicVideo || brickStoryboardBusy || brickStoryboardAnimating || brickStoryboardBuilding}
              variant="outline"
              className="h-11 w-full rounded-2xl border-slate-200 text-xs font-black uppercase tracking-[0.12em]"
              data-brick-storyboard-build="true"
            >
              {brickStoryboardBuilding ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              {brickStoryboardBuildStatus === "ready" ? "Music video built" : brickStoryboardBuilding ? "Stitching music video" : "Build music video"}
            </Button>
          ) : null}

          {brickStoryboardError ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-5 text-red-700">
              {brickStoryboardError}
            </p>
          ) : null}

          {brickStoryboardBusy ? (
            <div className="grid min-h-72 place-items-center rounded-3xl border border-slate-200 bg-slate-50 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
              Generating stills
            </div>
          ) : brickStoryboard ? (
            <>
              <section className="space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Reference frame</p>
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
                  {brickStoryboard.referenceFrame?.image?.url ? (
                    <img
                      alt=""
                      className="aspect-[9/16] w-full object-cover"
                      src={brickStoryboard.referenceFrame.image.url}
                    />
                  ) : (
                    <div className="grid aspect-[9/16] place-items-center text-sm font-bold text-white/60">
                      No reference image
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Shots</p>
                <div className="grid grid-cols-2 gap-3">
                  {brickStoryboardShots.map((shot) => {
                    const shotVideoFailed = shot.status === "ok" && Boolean(shot.image?.url) && !shot.video?.url && Boolean(shot.error);
                    const shotImageBusy = brickStoryboardShotBusyIndex === shot.shotIndex;
                    const shotRetryDisabled = brickStoryboardBusy ||
                      brickStoryboardBuilding ||
                      brickStoryboardAnimating ||
                      brickStoryboardShotBusyIndex !== null;
                    const shotRetryLabel = shotVideoFailed
                      ? "Retry video"
                      : shot.image?.url
                        ? "New image"
                        : "Retry image";

                    return (
                    <article
                      key={shot.shotIndex}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-950/5"
                    >
                      <div className="bg-slate-950">
                        {shot.video?.url ? (
                          <video
                            className="aspect-[9/16] w-full object-cover"
                            controls
                            loop
                            muted
                            playsInline
                            src={shot.video.url}
                          />
                        ) : shot.image?.url ? (
                          <img
                            alt=""
                            className="aspect-[9/16] w-full object-cover"
                            src={shot.image.url}
                          />
                        ) : (
                          <div className="grid aspect-[9/16] place-items-center px-4 text-center text-xs font-bold text-white/60">
                            {shot.status === "failed" ? "Image failed" : "No image"}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Shot {shot.shotIndex + 1}
                          </p>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                            shot.status === "failed"
                              ? "bg-red-50 text-red-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                          >
                            {shot.status || "ok"}
                          </span>
                        </div>
                        <p className="text-sm font-black leading-5 text-slate-900">{shot.lyricLine}</p>
                        {shot.error ? <p className="text-xs font-bold text-red-600">{shot.error}</p> : null}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={shotRetryDisabled}
                            onClick={() => {
                              if (shotVideoFailed) onAnimateBrickStoryboard();
                              else onRegenerateBrickShot(shot.shotIndex);
                            }}
                            className="h-9 min-w-0 overflow-hidden rounded-2xl border-slate-200 px-2 text-[10px] font-black uppercase tracking-[0.08em]"
                            data-brick-shot-regenerate={shotVideoFailed ? undefined : shot.shotIndex}
                            data-brick-shot-retry-video={shotVideoFailed ? shot.shotIndex : undefined}
                          >
                            {shotImageBusy || (shotVideoFailed && brickStoryboardAnimating) ? (
                              <Loader2 className="mr-1.5 size-3 shrink-0 animate-spin" />
                            ) : shotVideoFailed ? (
                              <Film className="mr-1.5 size-3 shrink-0" />
                            ) : (
                              <RotateCcw className="mr-1.5 size-3 shrink-0" />
                            )}
                            <span className="min-w-0 truncate">{shotRetryLabel}</span>
                          </Button>
                          <details
                            className="group min-w-0 rounded-2xl border border-slate-200 bg-white"
                            data-brick-shot-prompt={shot.shotIndex}
                          >
                            <summary className="flex h-9 cursor-pointer list-none items-center justify-center gap-1.5 overflow-hidden rounded-2xl px-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 [&::-webkit-details-marker]:hidden">
                              <FileText className="size-3 shrink-0" />
                              <span className="min-w-0 truncate">Prompts</span>
                            </summary>
                            <div className="max-h-64 overflow-auto rounded-b-2xl border-t border-slate-200 bg-slate-950 p-3 text-[11px] font-bold leading-5 text-slate-100">
                              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Still image prompt
                              </p>
                              <pre className="whitespace-pre-wrap font-inherit">
                                {shot.shotPrompt || "No still prompt stored for this shot."}
                              </pre>
                              <p className="mb-2 mt-4 border-t border-white/10 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Seedance video prompt
                              </p>
                              <pre className="whitespace-pre-wrap font-inherit">
                                {shot.animationPrompt || "No video prompt stored for this shot."}
                              </pre>
                            </div>
                          </details>
                        </div>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-bold leading-6 text-slate-500">
              Generate a board to review the brick-world direction before animating.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
