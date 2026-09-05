import type { JingleMusicVideoClip } from "../../scene/types";

// Shared media preparation, not a second composition renderer. Legacy app
// calls preserve their filter; the Repo supplies measured source durations.
export function buildJingleStitchFilter(
  clips: Pick<JingleMusicVideoClip, "startMs" | "endMs">[],
  sourceDurationsSeconds?: number[],
) {
  if (!clips.length) throw new Error("Music video stitch has no source clips.");
  if (sourceDurationsSeconds && sourceDurationsSeconds.length !== clips.length) throw new Error("Probe every source clip before stitching.");
  const parts = clips.map((clip, index) => {
    const target = (clip.endMs - clip.startMs) / 1000;
    if (!Number.isFinite(target) || target <= 0) throw new Error("Clip duration must be positive.");
    const duration = target.toFixed(3);
    const source = sourceDurationsSeconds?.[index];
    if (source !== undefined) {
      const speed = source / target;
      if (!Number.isFinite(source) || source <= 0 || speed < 0.75 || speed > 1.35) throw new Error(`Clip ${index + 1} needs ${speed.toFixed(2)}x retiming; revise the shot or supply matching media.`);
      return `[${index}:v]setpts=(PTS-STARTPTS)*${(target / source).toFixed(9)},fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=${duration}[v${index}]`;
    }
    return `[${index}:v]fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,tpad=stop_mode=clone:stop_duration=${duration},trim=duration=${duration},setpts=PTS-STARTPTS[v${index}]`;
  });
  return `${parts.join(";")};${clips.map((_, index) => `[v${index}]`).join("")}concat=n=${clips.length}:v=1:a=0[outv]`;
}
