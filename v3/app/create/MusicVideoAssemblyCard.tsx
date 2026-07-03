"use client";

import {
  Check,
  ChevronDown,
  Clapperboard,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Music2,
  RotateCcw,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { BrickStoryboard } from "@/features/formats/jingle/storyboard";

type BrickStoryboardStatus = "idle" | "loading" | "ready" | "error";
type AssemblyStep = "song" | "scenes" | "images" | "animation" | "final";

const statusClass = (status: string) => {
  if (status === "Failed") return "bg-red-50 text-red-600";
  if (status === "Building") return "bg-sky-50 text-sky-600";
  if (status === "Final ready" || status === "Ready") return "bg-emerald-50 text-emerald-600";
  return "bg-slate-100 text-slate-500";
};

const shotStatusClass = (status: string) => {
  if (status.includes("failed")) return "bg-red-50 text-red-600";
  if (status.includes("ready")) return "bg-emerald-50 text-emerald-600";
  if (status.includes("building")) return "bg-sky-50 text-sky-600";
  return "bg-slate-100 text-slate-500";
};

function AssemblyRow({
  children,
  defaultOpen,
  icon,
  status,
  summary,
  title,
}: {
  children: ReactNode;
  defaultOpen: boolean;
  icon: ReactNode;
  status: string;
  summary: string;
  title: string;
}) {
  return (
    <details
      className="group rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-lg open:shadow-slate-950/5"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-black text-slate-950">{title}</span>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${statusClass(status)}`}>
              {status}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-500">
            {summary}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3">
        {children}
      </div>
    </details>
  );
}

export type MusicVideoAssemblyCardProps = {
  brickStoryboard: BrickStoryboard | null;
  brickStoryboardAnimationStatus: BrickStoryboardStatus;
  brickStoryboardBuildStatus: BrickStoryboardStatus;
  brickStoryboardError: string;
  brickStoryboardShotBusyIndex: number | null;
  brickStoryboardVideoBusyIndex: number | null;
  brickStoryboardStatus: BrickStoryboardStatus;
  canGenerateBrickStoryboard: boolean;
  onAnimateBrickStoryboard: () => void;
  onBuildBrickMusicVideo: () => void;
  onGenerateBrickStoryboard: () => void;
  onRegenerateBrickShot: (shotIndex: number) => void;
  onRegenerateBrickShotVideo: (shotIndex: number) => void;
};

export function MusicVideoAssemblyCard({
  brickStoryboard,
  brickStoryboardAnimationStatus,
  brickStoryboardBuildStatus,
  brickStoryboardError,
  brickStoryboardShotBusyIndex,
  brickStoryboardVideoBusyIndex,
  brickStoryboardStatus,
  canGenerateBrickStoryboard,
  onAnimateBrickStoryboard,
  onBuildBrickMusicVideo,
  onGenerateBrickStoryboard,
  onRegenerateBrickShot,
  onRegenerateBrickShotVideo,
}: MusicVideoAssemblyCardProps) {
  const storyboardBusy = brickStoryboardStatus === "loading";
  const animating = brickStoryboardAnimationStatus === "loading";
  const building = brickStoryboardBuildStatus === "loading";
  const shots = Array.isArray(brickStoryboard?.shots) ? brickStoryboard.shots : [];
  const anyShotBusy = brickStoryboardShotBusyIndex !== null || brickStoryboardVideoBusyIndex !== null;
  const imageReadyCount = shots.filter((shot) => shot.status === "ok" && shot.image?.url).length;
  const videoReadyCount = shots.filter((shot) => shot.video?.url).length;
  const allImagesReady = Boolean(brickStoryboard?.referenceFrame?.image?.url && shots.length && imageReadyCount === shots.length);
  const allVideosReady = Boolean(shots.length && videoReadyCount === shots.length);
  const finalReady = Boolean(brickStoryboard?.musicVideo?.stitchedVideo?.url);
  const canAnimate = allImagesReady && !storyboardBusy && !animating && !building && !anyShotBusy;
  const canBuild = allVideosReady && !storyboardBusy && !animating && !building && !anyShotBusy;
  const defaultStep: AssemblyStep = storyboardBusy || !brickStoryboard
    ? "scenes"
    : !allImagesReady || brickStoryboardShotBusyIndex !== null
      ? "images"
      : !allVideosReady || brickStoryboardVideoBusyIndex !== null || brickStoryboardAnimationStatus === "error"
        ? "animation"
        : !finalReady || building
          ? "final"
          : "song";
  const storyShots = brickStoryboard?.storyPlan?.shots || [];

  const scenesStatus = storyboardBusy ? "Building" : brickStoryboard ? "Ready" : "Needs scenes";
  const imagesStatus = brickStoryboardShotBusyIndex !== null ? "Building" : allImagesReady ? "Ready" : "Needs image";
  const animationStatus = brickStoryboardVideoBusyIndex !== null || animating
    ? "Building"
    : brickStoryboardAnimationStatus === "error"
      ? "Failed"
      : allVideosReady
        ? "Ready"
        : "Needs animation";
  const finalStatus = building ? "Building" : finalReady ? "Final ready" : allVideosReady ? "Ready to build" : "Needs animation";
  const animationShotsNeedingAction = shots.filter((shot) => (
    brickStoryboardVideoBusyIndex === shot.shotIndex || !shot.video?.url || Boolean(shot.error && shot.image?.url)
  ));
  const showAnimateAllButton = Boolean(shots.length && videoReadyCount === 0);

  return (
    <section
      className="self-start rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/8"
      data-music-video-assembly-card="true"
    >
      <div className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
          Music Video Assembly
        </p>
        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
          Build the jingle video in order. Fix only the broken step.
        </p>
      </div>

      {brickStoryboardError ? (
        <p className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          {brickStoryboardError}
        </p>
      ) : null}

      <div className="space-y-2">
        <AssemblyRow
          defaultOpen={defaultStep === "song"}
          icon={<Music2 className="size-4" />}
          status="Ready"
          summary="Jingle audio is the master track."
          title="Song"
        >
          <p className="text-xs font-bold leading-5 text-slate-600">
            The generated song drives the lyric timing. Use the global Play button above to preview it.
          </p>
        </AssemblyRow>

        <AssemblyRow
          defaultOpen={defaultStep === "scenes"}
          icon={storyboardBusy ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
          status={scenesStatus}
          summary={brickStoryboard ? `${shots.length || 0} lyric-mapped scenes` : "Turn the song into scenes."}
          title="Scenes"
        >
          <Button
            type="button"
            onClick={onGenerateBrickStoryboard}
            disabled={!canGenerateBrickStoryboard || storyboardBusy || animating || building || anyShotBusy}
            className="h-10 w-full rounded-2xl bg-slate-950 text-[10px] font-black uppercase tracking-[0.12em] text-white hover:bg-slate-800"
          >
            {storyboardBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Clapperboard className="mr-2 size-4" />}
            Generate scenes
          </Button>
          {shots.length ? (
            <div className="space-y-2">
              {shots.map((shot) => {
                const storyShot = storyShots.find((item) => item.shotIndex === shot.shotIndex);
                return (
                  <div key={shot.shotIndex} className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Shot {shot.shotIndex + 1}
                    </p>
                    <p className="mt-1 text-xs font-black leading-4 text-slate-950">{shot.lyricLine}</p>
                    {storyShot?.sceneDescription ? (
                      <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-slate-500">
                        {storyShot.sceneDescription}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </AssemblyRow>

        <AssemblyRow
          defaultOpen={defaultStep === "images"}
          icon={brickStoryboardShotBusyIndex !== null ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          status={imagesStatus}
          summary={`${imageReadyCount}/${shots.length || 3} still images ready`}
          title="Images"
        >
          {shots.length ? (
            <div className="space-y-2">
              {shots.map((shot) => {
                const storyShot = storyShots.find((item) => item.shotIndex === shot.shotIndex);
                const shotImageBusy = brickStoryboardShotBusyIndex === shot.shotIndex;
                return (
                  <div
                    key={shot.shotIndex}
                    className="grid grid-cols-[52px_1fr] gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2"
                    data-brick-shot-card={shot.shotIndex}
                  >
                    {shot.image?.url ? (
                      <img alt="" className="aspect-[9/16] w-full rounded-xl object-cover" src={shot.image.url} />
                    ) : (
                      <div className="grid aspect-[9/16] place-items-center rounded-xl bg-slate-200 text-[9px] font-black uppercase text-slate-400">
                        No image
                      </div>
                    )}
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Shot {shot.shotIndex + 1}
                          </p>
                          <p className="line-clamp-2 text-xs font-black leading-4 text-slate-950">{shot.lyricLine}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${shotStatusClass(shotImageBusy ? "building image" : shot.image?.url ? "image ready" : "needs image")}`}>
                          {shotImageBusy ? "Building" : shot.image?.url ? "Ready" : "Needs image"}
                        </span>
                      </div>
                      {storyShot?.sceneDescription ? (
                        <p className="line-clamp-2 text-[11px] font-bold leading-4 text-slate-500">{storyShot.sceneDescription}</p>
                      ) : null}
                      {shot.error ? <p className="text-[11px] font-bold leading-4 text-red-600">{shot.error}</p> : null}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={storyboardBusy || animating || building || anyShotBusy}
                          onClick={() => onRegenerateBrickShot(shot.shotIndex)}
                          className="h-8 min-w-0 overflow-hidden rounded-xl border-slate-200 px-2 text-[10px] font-black uppercase tracking-[0.08em]"
                          data-brick-shot-regenerate={shot.shotIndex}
                        >
                          {shotImageBusy ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <RotateCcw className="mr-1.5 size-3 shrink-0" />}
                          <span className="min-w-0 truncate">New image</span>
                        </Button>
                        <details
                          className="min-w-0 rounded-xl border border-slate-200 bg-white"
                          data-brick-shot-prompt={shot.shotIndex}
                        >
                          <summary className="flex h-8 cursor-pointer list-none items-center justify-center gap-1.5 overflow-hidden px-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 [&::-webkit-details-marker]:hidden">
                            <FileText className="size-3 shrink-0" />
                            <span className="min-w-0 truncate">Prompts</span>
                          </summary>
                          <div className="max-h-56 overflow-auto border-t border-slate-200 bg-slate-950 p-2 text-[10px] font-bold leading-4 text-slate-100">
                            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Still image prompt
                            </p>
                            <pre className="whitespace-pre-wrap font-inherit">
                              {shot.shotPrompt || "No still prompt stored for this shot."}
                            </pre>
                            <p className="mb-1 mt-3 border-t border-white/10 pt-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                              Seedance video prompt
                            </p>
                            <pre className="whitespace-pre-wrap font-inherit">
                              {shot.animationPrompt || "No video prompt stored for this shot."}
                            </pre>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-bold leading-5 text-slate-500">Generate scenes first.</p>
          )}
        </AssemblyRow>

        <AssemblyRow
          defaultOpen={defaultStep === "animation"}
          icon={animating || brickStoryboardVideoBusyIndex !== null ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}
          status={animationStatus}
          summary={`${videoReadyCount}/${shots.length || 3} clips ready`}
          title="Animation"
        >
          {showAnimateAllButton ? (
            <Button
              type="button"
              onClick={onAnimateBrickStoryboard}
              disabled={!canAnimate}
              variant="outline"
              className="h-10 w-full rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-[0.12em]"
              data-brick-storyboard-animate="true"
            >
              {animating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Film className="mr-2 size-4" />}
              Animate clips
            </Button>
          ) : null}
          {animationShotsNeedingAction.length ? (
            <div className="space-y-2">
              {animationShotsNeedingAction.map((shot) => {
                const shotVideoBusy = brickStoryboardVideoBusyIndex === shot.shotIndex;
                const status = shotVideoBusy
                  ? "building animation"
                  : shot.video?.url
                    ? "animation ready"
                    : shot.error && shot.image?.url
                      ? "animation failed"
                      : shot.image?.url
                        ? "needs animation"
                        : "needs image";
                return (
                  <div key={shot.shotIndex} className="rounded-2xl border border-slate-100 bg-slate-50 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Shot {shot.shotIndex + 1}
                        </p>
                        <p className="line-clamp-2 text-xs font-black leading-4 text-slate-950">{shot.lyricLine}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${shotStatusClass(status)}`}>
                        {shotVideoBusy ? "Building" : shot.video?.url ? "Ready" : status.includes("failed") ? "Failed" : shot.image?.url ? "Needs animation" : "Needs image"}
                      </span>
                    </div>
                    {shot.error ? <p className="mt-2 text-[11px] font-bold leading-4 text-red-600">{shot.error}</p> : null}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={storyboardBusy || animating || building || anyShotBusy || !shot.image?.url || !shot.animationPrompt}
                      onClick={() => onRegenerateBrickShotVideo(shot.shotIndex)}
                      className="mt-2 h-8 w-full rounded-xl border-slate-200 px-2 text-[10px] font-black uppercase tracking-[0.08em]"
                      data-brick-shot-retry-video={shot.shotIndex}
                    >
                      {shotVideoBusy ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <Film className="mr-1.5 size-3" />}
                      Retry animation
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : shots.length ? (
            <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-700">
              All clips are ready. Nothing needs animation.
            </p>
          ) : null}
        </AssemblyRow>

        <AssemblyRow
          defaultOpen={defaultStep === "final"}
          icon={building ? <Loader2 className="size-4 animate-spin" /> : finalReady ? <Check className="size-4" /> : <Download className="size-4" />}
          status={finalStatus}
          summary={finalReady ? "The stitched music video is ready." : "Build after all clips are ready."}
          title="Final Video"
        >
          <Button
            type="button"
            onClick={onBuildBrickMusicVideo}
            disabled={!canBuild}
            variant={finalReady ? "outline" : "default"}
            className="h-10 w-full rounded-2xl text-[10px] font-black uppercase tracking-[0.12em]"
            data-brick-storyboard-build="true"
          >
            {building ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Build final video
          </Button>
          <p className="text-xs font-bold leading-5 text-slate-500">
            {finalReady
              ? "Use the global MP4 button above to download it."
              : allVideosReady
                ? "This clears stale output and stitches the current clips."
                : "Finish the animation step before building the MP4."}
          </p>
        </AssemblyRow>
      </div>
    </section>
  );
}
