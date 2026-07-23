import {
  Check,
  Clapperboard,
  Film,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Mic2,
  Play,
  ScrollText,
} from "lucide-react";

export type ThreeDBreakdownProgressState = {
  activeMessage: string;
  activeStatus: "waiting" | "working" | "error";
  activeStep: number;
  completedSteps: number;
};

type ThreeDBreakdownProgressInput = {
  show: boolean;
  hasScene: boolean;
  storyDirectionCount: number;
  storyDirectionStatus: "idle" | "loading" | "ready" | "error";
  storyboardReady: boolean;
  framesReady: boolean;
  imageStatus: "idle" | "loading" | "ready" | "error";
  clipsReady: boolean;
  voiceReady: boolean;
  animationStatus: "idle" | "loading" | "ready" | "error";
  audioStatus: "idle" | "loading" | "ready" | "error";
  renderBusy: boolean;
  renderFailed: boolean;
  renderStatusLabel: string;
};

export function getThreeDBreakdownProgress({
  show,
  hasScene,
  storyDirectionCount,
  storyDirectionStatus,
  storyboardReady,
  framesReady,
  imageStatus,
  clipsReady,
  voiceReady,
  animationStatus,
  audioStatus,
  renderBusy,
  renderFailed,
  renderStatusLabel,
}: ThreeDBreakdownProgressInput): ThreeDBreakdownProgressState | null {
  if (!show) return null;

  if (!hasScene) {
    const scriptStage = storyDirectionCount > 0 && (storyDirectionStatus === "loading" || storyDirectionStatus === "error");
    return {
      activeMessage: storyDirectionStatus === "loading"
        ? storyDirectionCount > 0 ? "Writing your narrator script" : "Finding five story ideas"
        : storyDirectionStatus === "error"
          ? storyDirectionCount > 0 ? "The script needs another try" : "Story ideas need another try"
          : "Choose a story on the right",
      activeStatus: storyDirectionStatus === "loading" ? "working" : storyDirectionStatus === "error" ? "error" : "waiting",
      activeStep: scriptStage ? 1 : 0,
      completedSteps: scriptStage ? 1 : 0,
    };
  }

  if (!storyboardReady) {
    return {
      activeMessage: imageStatus === "loading" ? "Drawing your six-frame storyboard" : imageStatus === "error" ? "The storyboard needs another try" : "Ready to generate the storyboard",
      activeStatus: imageStatus === "loading" ? "working" : imageStatus === "error" ? "error" : "waiting",
      activeStep: 2,
      completedSteps: 2,
    };
  }

  if (!framesReady) {
    return {
      activeMessage: imageStatus === "loading" ? "Creating two polished video scenes" : imageStatus === "error" ? "The video scenes need another try" : "Ready to create the video scenes",
      activeStatus: imageStatus === "loading" ? "working" : imageStatus === "error" ? "error" : "waiting",
      activeStep: 3,
      completedSteps: 3,
    };
  }

  if (!clipsReady || !voiceReady) {
    const loading = animationStatus === "loading" || audioStatus === "loading";
    const failed = animationStatus === "error" || audioStatus === "error";
    return {
      activeMessage: loading
        ? clipsReady ? "Recording the narrator voice" : "Animating your video"
        : failed
          ? "Motion or voice needs another try"
          : clipsReady
            ? "Ready to add the narrator voice"
            : "Ready to animate the video",
      activeStatus: loading ? "working" : failed ? "error" : "waiting",
      activeStep: 4,
      completedSteps: 4,
    };
  }

  return {
    activeMessage: renderBusy ? renderStatusLabel : renderFailed ? "The final video needs another try" : "Ready to build the final video",
    activeStatus: renderBusy ? "working" : renderFailed ? "error" : "waiting",
    activeStep: 5,
    completedSteps: 5,
  };
}

const steps = [
  { title: "Choose your story", detail: "One clear video idea", Icon: Lightbulb },
  { title: "Write the script", detail: "A 20-second narrator script", Icon: ScrollText },
  { title: "Build the storyboard", detail: "Six frames map the story", Icon: ImageIcon },
  { title: "Create the scenes", detail: "Two polished video scenes", Icon: Clapperboard },
  { title: "Add motion + voice", detail: "Animation and narration", Icon: Mic2 },
  { title: "Finish the video", detail: "A ready-to-share MP4", Icon: Film },
] as const;

export function ThreeDBreakdownProgressCanvas({ progress }: { progress: ThreeDBreakdownProgressState }) {
  const activeStep = Math.min(Math.max(progress.activeStep, 0), steps.length - 1);
  const completedSteps = Math.min(Math.max(progress.completedSteps, 0), steps.length);
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <section
      className="relative mx-auto aspect-[1/2] h-[clamp(470px,calc(100vh-15rem),720px)] w-auto max-w-full overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-950 shadow-2xl shadow-slate-950/15"
      data-three-d-progress-canvas="true"
    >
      <div className="flex h-full flex-col p-5">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-600">3D Breakdown</p>
              <h2 className="mt-1 text-2xl font-black leading-none">Building your video</h2>
            </div>
            <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white">
              Step {activeStep + 1} of {steps.length}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${progressPercent}% complete`}>
            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="mt-4 space-y-2" data-three-d-progress-steps="true">
          {steps.map(({ title, detail, Icon }, index) => {
            const complete = index < completedSteps;
            const active = index === activeStep;
            const activeWorking = active && progress.activeStatus === "working";
            const activeError = active && progress.activeStatus === "error";

            return (
              <div
                key={title}
                className={`flex min-h-[62px] items-center gap-3 rounded-xl border px-3 py-2 transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/12"
                    : complete
                      ? "border-emerald-100 bg-emerald-50 text-slate-950"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
                data-three-d-progress-step={index + 1}
                data-status={complete ? "complete" : active ? progress.activeStatus : "upcoming"}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  active ? "bg-cyan-300 text-slate-950" : complete ? "bg-emerald-500 text-white" : "bg-white text-slate-300"
                }`}>
                  {complete ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : activeWorking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black leading-4">{title}</p>
                    {activeError ? (
                      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-red-300">Needs retry</span>
                    ) : null}
                  </div>
                  <p className={`mt-1 text-[11px] font-bold leading-4 ${active ? "text-white/65" : complete ? "text-emerald-700" : "text-slate-400"}`}>
                    {active ? progress.activeMessage : detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-xl bg-cyan-300 px-4 py-3 text-slate-950">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80">
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
          <div>
            <p className="text-xs font-black">Your final video will appear here</p>
            <p className="mt-0.5 text-[10px] font-bold leading-4 text-slate-700">This tracker becomes your video when every step is done.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
