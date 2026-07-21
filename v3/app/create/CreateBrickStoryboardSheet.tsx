"use client";

import {
  Check,
  Clapperboard,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Music2,
  RotateCcw,
} from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { BrickStoryboard } from "@/features/formats/jingle/storyboard";
import { CreateAssemblyLine, type CreateAssemblyStageStatus } from "./CreateAssemblyLine";

type BrickStoryboardStatus = "idle" | "loading" | "ready" | "error";

export type CreateBrickStoryboardSheetProps = {
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

type StageId = "song" | "scenes" | "images" | "animation" | "final";

const stageMeta = [
  { id: "song", label: "Song", compactLabel: "Song", kicker: "audio and lyrics", icon: <Music2 className="size-4" /> },
  { id: "scenes", label: "Scenes", compactLabel: "Scenes", kicker: "idea per lyric", icon: <Clapperboard className="size-4" /> },
  { id: "images", label: "Images", compactLabel: "Images", kicker: "first frames", icon: <ImageIcon className="size-4" /> },
  { id: "animation", label: "Animation", compactLabel: "Clips", kicker: "motion clips", icon: <Film className="size-4" /> },
  { id: "final", label: "Final Video", compactLabel: "Final", kicker: "stitched MP4", icon: <Download className="size-4" /> },
] satisfies Array<{ id: StageId; label: string; compactLabel: string; kicker: string; icon: ReactNode }>;

const pillTone = (status: string) => {
  if (status.includes("failed")) return "bg-red-50 text-red-600";
  if (status.includes("ready")) return "bg-emerald-50 text-emerald-600";
  if (status.includes("building")) return "bg-sky-50 text-sky-600";
  return "bg-slate-100 text-slate-500";
};

export function CreateBrickStoryboardSheet({
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
}: CreateBrickStoryboardSheetProps) {
  const storyboardBusy = brickStoryboardStatus === "loading";
  const animating = brickStoryboardAnimationStatus === "loading";
  const building = brickStoryboardBuildStatus === "loading";
  const shots = Array.isArray(brickStoryboard?.shots) ? brickStoryboard.shots : [];
  const storyShots = brickStoryboard?.storyPlan?.shots || [];
  const anyShotBusy = brickStoryboardShotBusyIndex !== null || brickStoryboardVideoBusyIndex !== null;
  const imageReadyCount = shots.filter((shot) => shot.status === "ok" && shot.image?.url).length;
  const videoReadyCount = shots.filter((shot) => shot.video?.url).length;
  const allImagesReady = Boolean(brickStoryboard?.referenceFrame?.image?.url && shots.length && imageReadyCount === shots.length);
  const allVideosReady = Boolean(shots.length && videoReadyCount === shots.length);
  const finalReady = Boolean(brickStoryboard?.musicVideo?.stitchedVideo?.url);
  const songReady = canGenerateBrickStoryboard || Boolean(brickStoryboard);
  const canAnimate = allImagesReady && !storyboardBusy && !animating && !building && !anyShotBusy;
  const canBuild = allVideosReady && !storyboardBusy && !animating && !building && !anyShotBusy;
  const animationFailed = brickStoryboardAnimationStatus === "error" || shots.some((shot) => Boolean(shot.error && shot.image?.url && !shot.video?.url));

  const statuses: Record<StageId, CreateAssemblyStageStatus> = {
    song: songReady ? "ready" : "needs",
    scenes: storyboardBusy ? "building" : brickStoryboard ? "ready" : "needs",
    images: brickStoryboardShotBusyIndex !== null ? "building" : allImagesReady ? "ready" : "needs",
    animation: brickStoryboardVideoBusyIndex !== null || animating ? "building" : animationFailed ? "failed" : allVideosReady ? "ready" : "needs",
    final: building ? "building" : finalReady ? "ready" : "needs",
  };
  const defaultStage: StageId = !songReady
    ? "song"
    : storyboardBusy || !brickStoryboard
      ? "scenes"
      : !allImagesReady || brickStoryboardShotBusyIndex !== null
        ? "images"
        : !allVideosReady || brickStoryboardVideoBusyIndex !== null || animationFailed
          ? "animation"
          : !finalReady || building
            ? "final"
            : "song";
  const animationShotsNeedingAction = shots.filter((shot) => (
    brickStoryboardVideoBusyIndex === shot.shotIndex || !shot.video?.url || Boolean(shot.error && shot.image?.url)
  ));

  return (
    <section data-music-video-assembly-card="true">
      <CreateAssemblyLine
        defaultStageId={defaultStage}
        error={brickStoryboardError}
        stages={stageMeta.map((stage) => ({
          ...stage,
          status: statuses[stage.id],
          content: stage.id === "song" ? (
                <p className="text-xs font-bold leading-5 text-slate-600">
                  The song is the master track. Use the global Play/Add Audio button above.
                </p>
              ) : stage.id === "scenes" ? (
                <ScenesStage
                  busy={storyboardBusy}
                  canGenerate={canGenerateBrickStoryboard && !storyboardBusy && !animating && !building && !anyShotBusy}
                  onGenerate={onGenerateBrickStoryboard}
                  shots={shots}
                  storyShots={storyShots}
                />
              ) : stage.id === "images" ? (
                <ImagesStage
                  anyBusy={storyboardBusy || animating || building || anyShotBusy}
                  busyIndex={brickStoryboardShotBusyIndex}
                  onRegenerate={onRegenerateBrickShot}
                  shots={shots}
                  storyShots={storyShots}
                />
              ) : stage.id === "animation" ? (
                <AnimationStage
                  allImagesReady={allImagesReady}
                  canAnimate={canAnimate}
                  onAnimate={onAnimateBrickStoryboard}
                  onRetry={onRegenerateBrickShotVideo}
                  shots={animationShotsNeedingAction}
                  videoBusyIndex={brickStoryboardVideoBusyIndex}
                  anyBusy={storyboardBusy || animating || building || anyShotBusy}
                  animating={animating}
                  videoReadyCount={videoReadyCount}
                />
              ) : (
                <FinalStage
                  canBuild={canBuild}
                  finalReady={finalReady}
                  building={building}
                  allVideosReady={allVideosReady}
                  onBuild={onBuildBrickMusicVideo}
                />
              ),
        }))}
      />
    </section>
  );
}

function StagePill({ children, status }: { children: ReactNode; status: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${pillTone(status)}`}>
      {children}
    </span>
  );
}

function ScenesStage({
  busy,
  canGenerate,
  onGenerate,
  shots,
  storyShots,
}: {
  busy: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  shots: NonNullable<CreateBrickStoryboardSheetProps["brickStoryboard"]>["shots"];
  storyShots: NonNullable<NonNullable<CreateBrickStoryboardSheetProps["brickStoryboard"]>["storyPlan"]>["shots"];
}) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className="h-10 w-full rounded-2xl bg-slate-950 text-[10px] font-black uppercase tracking-[0.12em] text-white hover:bg-slate-800"
      >
        {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Clapperboard className="mr-2 size-4" />}
        Generate scenes
      </Button>
      {shots.length ? (
        <div className="space-y-2">
          {shots.map((shot) => {
            const storyShot = storyShots.find((item) => item.shotIndex === shot.shotIndex);
            return (
              <div key={shot.shotIndex} className="rounded-2xl bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Shot {shot.shotIndex + 1}</p>
                <p className="mt-1 text-xs font-black leading-4 text-slate-950">{shot.lyricLine}</p>
                {storyShot?.sceneDescription ? (
                  <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-slate-500">{storyShot.sceneDescription}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs font-bold leading-5 text-slate-500">
          Generate the scene ideas after the jingle audio exists.
        </p>
      )}
    </div>
  );
}

function ImagesStage({
  anyBusy,
  busyIndex,
  onRegenerate,
  shots,
  storyShots,
}: {
  anyBusy: boolean;
  busyIndex: number | null;
  onRegenerate: (shotIndex: number) => void;
  shots: NonNullable<CreateBrickStoryboardSheetProps["brickStoryboard"]>["shots"];
  storyShots: NonNullable<NonNullable<CreateBrickStoryboardSheetProps["brickStoryboard"]>["storyPlan"]>["shots"];
}) {
  if (!shots.length) {
    return <p className="text-xs font-bold leading-5 text-slate-500">Generate scenes first.</p>;
  }

  return (
    <div className="space-y-2">
      {shots.map((shot) => {
        const storyShot = storyShots.find((item) => item.shotIndex === shot.shotIndex);
        const shotBusy = busyIndex === shot.shotIndex;
        return (
          <div
            key={shot.shotIndex}
            className="grid grid-cols-[52px_1fr] gap-3 rounded-2xl border border-slate-100 bg-white p-2"
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
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Shot {shot.shotIndex + 1}</p>
                  <p className="line-clamp-2 text-xs font-black leading-4 text-slate-950">{shot.lyricLine}</p>
                </div>
                <StagePill status={shotBusy ? "building image" : shot.image?.url ? "image ready" : "needs image"}>
                  {shotBusy ? "Building" : shot.image?.url ? "Ready" : "Needs image"}
                </StagePill>
              </div>
              {storyShot?.sceneDescription ? (
                <p className="line-clamp-2 text-[11px] font-bold leading-4 text-slate-500">{storyShot.sceneDescription}</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={anyBusy}
                  onClick={() => onRegenerate(shot.shotIndex)}
                  className="h-8 min-w-0 overflow-hidden rounded-xl border-slate-200 px-2 text-[10px] font-black uppercase tracking-[0.08em]"
                  data-brick-shot-regenerate={shot.shotIndex}
                >
                  {shotBusy ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <RotateCcw className="mr-1.5 size-3 shrink-0" />}
                  <span className="min-w-0 truncate">New image</span>
                </Button>
                <PromptDetails shotPrompt={shot.shotPrompt} animationPrompt={shot.animationPrompt} shotIndex={shot.shotIndex} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnimationStage({
  allImagesReady,
  anyBusy,
  animating,
  canAnimate,
  onAnimate,
  onRetry,
  shots,
  videoBusyIndex,
  videoReadyCount,
}: {
  allImagesReady: boolean;
  anyBusy: boolean;
  animating: boolean;
  canAnimate: boolean;
  onAnimate: () => void;
  onRetry: (shotIndex: number) => void;
  shots: NonNullable<CreateBrickStoryboardSheetProps["brickStoryboard"]>["shots"];
  videoBusyIndex: number | null;
  videoReadyCount: number;
}) {
  if (!allImagesReady) {
    return <p className="text-xs font-bold leading-5 text-slate-500">Finish Images before animation.</p>;
  }

  return (
    <div className="space-y-2">
      {videoReadyCount === 0 ? (
        <Button
          type="button"
          onClick={onAnimate}
          disabled={!canAnimate}
          variant="outline"
          className="h-10 w-full rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-[0.12em]"
          data-brick-storyboard-animate="true"
        >
          {animating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Film className="mr-2 size-4" />}
          Animate clips
        </Button>
      ) : null}
      {shots.length ? shots.map((shot) => {
        const shotBusy = videoBusyIndex === shot.shotIndex;
        const status = shotBusy ? "building animation" : shot.video?.url ? "animation ready" : shot.error ? "animation failed" : "needs animation";
        return (
          <div key={shot.shotIndex} className="rounded-2xl border border-slate-100 bg-white p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Shot {shot.shotIndex + 1}</p>
                <p className="line-clamp-2 text-xs font-black leading-4 text-slate-950">{shot.lyricLine}</p>
              </div>
              <StagePill status={status}>
                {shotBusy ? "Building" : shot.video?.url ? "Ready" : shot.error ? "Failed" : "Needs animation"}
              </StagePill>
            </div>
            {shot.error ? <p className="mt-2 text-[11px] font-bold leading-4 text-red-600">{shot.error}</p> : null}
            <Button
              type="button"
              variant="outline"
              disabled={anyBusy || !shot.image?.url || !shot.animationPrompt}
              onClick={() => onRetry(shot.shotIndex)}
              className="mt-2 h-8 w-full rounded-xl border-slate-200 px-2 text-[10px] font-black uppercase tracking-[0.08em]"
              data-brick-shot-retry-video={shot.shotIndex}
            >
              {shotBusy ? <Loader2 className="mr-1.5 size-3 animate-spin" /> : <Film className="mr-1.5 size-3" />}
              Retry animation
            </Button>
          </div>
        );
      }) : (
        <p className="text-xs font-bold leading-5 text-slate-500">Generate scenes first.</p>
      )}
    </div>
  );
}

function FinalStage({
  allVideosReady,
  building,
  canBuild,
  finalReady,
  onBuild,
}: {
  allVideosReady: boolean;
  building: boolean;
  canBuild: boolean;
  finalReady: boolean;
  onBuild: () => void;
}) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={onBuild}
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
            ? "This stitches the current clips."
            : "Finish Animation before building the MP4."}
      </p>
    </div>
  );
}

function PromptDetails({
  animationPrompt,
  shotIndex,
  shotPrompt,
}: {
  animationPrompt?: string;
  shotIndex: number;
  shotPrompt?: string;
}) {
  return (
    <details className="min-w-0 rounded-xl border border-slate-200 bg-white" data-brick-shot-prompt={shotIndex}>
      <summary className="flex h-8 cursor-pointer list-none items-center justify-center gap-1.5 overflow-hidden px-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 [&::-webkit-details-marker]:hidden">
        <FileText className="size-3 shrink-0" />
        <span className="min-w-0 truncate">Prompts</span>
      </summary>
      <div className="max-h-56 overflow-auto border-t border-slate-200 bg-slate-950 p-2 text-[10px] font-bold leading-4 text-slate-100">
        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
          Still image prompt
        </p>
        <pre className="whitespace-pre-wrap font-inherit">{shotPrompt || "No still prompt stored for this shot."}</pre>
        <p className="mb-1 mt-3 border-t border-white/10 pt-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
          Seedance video prompt
        </p>
        <pre className="whitespace-pre-wrap font-inherit">{animationPrompt || "No video prompt stored for this shot."}</pre>
      </div>
    </details>
  );
}
