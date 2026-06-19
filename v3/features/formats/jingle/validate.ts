import type { JingleAdScene } from "../../scene/types";
import { JINGLE_MAX_MUSIC_LENGTH_MS } from "./prompt";

export function validateJingleScene(scene: JingleAdScene) {
  const errors: string[] = [];
  const chunks = scene.layout.compositionPlan?.chunks || [];
  const durationSum = chunks.reduce((sum, chunk) => sum + chunk.duration_ms, 0);

  if (scene.format !== "jingle") errors.push("Scene format must be jingle.");
  if (scene.layout.preset !== "jingle-lyrics") errors.push("Jingle layout preset is invalid.");
  if (!scene.layout.brandPhonetic?.trim()) errors.push("Jingle brand phonetic is missing.");
  if (!scene.layout.lyrics?.length) errors.push("Jingle lyrics are missing.");
  if (scene.layout.musicLengthMs > JINGLE_MAX_MUSIC_LENGTH_MS) errors.push("Jingle is longer than 30 seconds.");
  if (chunks.length !== 3) errors.push("Jingle must have exactly three chunks.");
  if (durationSum !== scene.layout.musicLengthMs) errors.push("Jingle chunk durations must sum to music length.");
  if (scene.layout.musicVideo) {
    const clips = scene.layout.musicVideo.clips || [];
    if (!scene.layout.musicVideo.sourceStoryboardId) errors.push("Jingle music video source storyboard is missing.");
    if (!clips.length) errors.push("Jingle music video clips are missing.");
    for (const clip of clips) {
      if (!clip.storageId) errors.push("Jingle music video clip storage is missing.");
      if (clip.endMs <= clip.startMs) errors.push("Jingle music video clip timing is invalid.");
    }
    if (scene.layout.musicVideo.stitchedVideo) {
      if (!scene.layout.musicVideo.stitchedVideo.storageId) errors.push("Jingle stitched music video storage is missing.");
      if (scene.layout.musicVideo.stitchedVideo.durationMs <= 0) errors.push("Jingle stitched music video duration is invalid.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
