"use client";

import { Pause, Play, Rotate3D, VolumeX } from "lucide-react";
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

const RESTING_CAMERA_ORBIT = "0deg 75deg 105%";
const RESTING_FIELD_OF_VIEW = "30deg";
const RETURN_DELAY_MS = 3000;
const PREVIEW_BACKGROUND = "#f4f6f8";

type CharacterModelViewerElement = HTMLElement & {
  cameraOrbit: string;
  fieldOfView: string;
};

const CAMERA_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "PageDown",
  "PageUp",
]);

export function DiscoveryCharacterModelViewer({
  src,
  poster,
  alt,
  characterId,
  voicePreview,
}: {
  src: string;
  poster: string;
  alt: string;
  characterId: string;
  voicePreview?: {
    line: string;
    kind: "fish-tts" | "original-nonverbal-cue";
    status: "ready" | "voice-pending";
    isPlaying: boolean;
    hasError: boolean;
    reason?: string;
    onToggle: () => void;
  };
}) {
  const viewerRef = useRef<CharacterModelViewerElement | null>(null);
  const [isExploring, setIsExploring] = useState(false);

  useEffect(() => {
    let returnTimer: number | undefined;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const startExploring = () => {
      window.clearTimeout(returnTimer);
      setIsExploring(true);
    };

    const scheduleReturn = () => {
      window.clearTimeout(returnTimer);
      returnTimer = window.setTimeout(() => {
        if (!viewer) return;
        viewer.cameraOrbit = RESTING_CAMERA_ORBIT;
        viewer.fieldOfView = RESTING_FIELD_OF_VIEW;
        setIsExploring(false);
      }, RETURN_DELAY_MS);
    };

    const handleWheel = () => {
      startExploring();
      scheduleReturn();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!CAMERA_KEYS.has(event.key)) return;
      startExploring();
      scheduleReturn();
    };

    void import("@google/model-viewer");
    viewer.addEventListener("pointerdown", startExploring);
    viewer.addEventListener("pointerup", scheduleReturn);
    viewer.addEventListener("pointercancel", scheduleReturn);
    viewer.addEventListener("wheel", handleWheel);
    viewer.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(returnTimer);
      viewer.removeEventListener("pointerdown", startExploring);
      viewer.removeEventListener("pointerup", scheduleReturn);
      viewer.removeEventListener("pointercancel", scheduleReturn);
      viewer.removeEventListener("wheel", handleWheel);
      viewer.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-[#f4f6f8]">
      {createElement("model-viewer", {
        ref: viewerRef,
        src,
        poster,
        alt,
        loading: "lazy",
        reveal: "auto",
        "camera-controls": "",
        "disable-pan": "",
        "touch-action": "pan-y",
        "interaction-prompt": "none",
        "shadow-intensity": "0",
        "camera-orbit": RESTING_CAMERA_ORBIT,
        "field-of-view": RESTING_FIELD_OF_VIEW,
        "interpolation-decay": "100",
        "data-character-id": characterId,
        "data-return-delay-ms": String(RETURN_DELAY_MS),
        "data-testid": "character-model-viewer",
        className: "block h-full w-full cursor-grab active:cursor-grabbing",
        style: {
          "--poster-color": PREVIEW_BACKGROUND,
          backgroundColor: PREVIEW_BACKGROUND,
        } as CSSProperties,
      })}
      <div className="pointer-events-none absolute inset-x-1.5 bottom-3 flex items-center justify-center gap-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1 rounded-full border-2 border-[#080817] bg-white px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.06em] text-[#080817] shadow-[2px_2px_0_#080817] min-[550px]:text-[8px]">
          <Rotate3D className="size-3 shrink-0" aria-hidden="true" />
          {isExploring ? "Returns in 3 sec" : "Drag to rotate"}
        </div>
        {voicePreview ? (
          <button
            type="button"
            disabled={voicePreview.status !== "ready"}
            onClick={voicePreview.onToggle}
            aria-label={
              voicePreview.status === "ready"
                ? `${voicePreview.isPlaying ? "Stop" : "Play"} ${alt}: ${voicePreview.line}`
                : `${alt} voice pending: ${voicePreview.reason ?? "No approved voice is available."}`
            }
            aria-pressed={
              voicePreview.status === "ready"
                ? voicePreview.isPlaying
                : undefined
            }
            title={
              voicePreview.status === "ready"
                ? voicePreview.line
                : voicePreview.reason
            }
            className="pointer-events-auto flex items-center gap-1 rounded-full border-2 border-[#080817] bg-[#080817] px-2 py-1.5 !text-[8px] font-black uppercase tracking-[0.06em] text-white shadow-[2px_2px_0_#52d6ff] transition-colors hover:bg-[#30374b] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#52d6ff] disabled:cursor-not-allowed disabled:bg-[#667087] disabled:text-white/85 disabled:shadow-[2px_2px_0_#aab2c2]"
            data-testid="character-voice-preview"
            data-character-id={characterId}
            data-preview-status={voicePreview.status}
          >
            {voicePreview.status !== "ready" ? (
              <VolumeX className="size-3 shrink-0" aria-hidden="true" />
            ) : voicePreview.isPlaying ? (
              <Pause className="size-3 shrink-0" aria-hidden="true" />
            ) : (
              <Play className="size-3 shrink-0" aria-hidden="true" />
            )}
            {voicePreview.status !== "ready"
              ? "Voice pending"
              : voicePreview.isPlaying
                ? "Stop"
                : voicePreview.kind === "original-nonverbal-cue"
                  ? "Play cue"
                  : "Play voice"}
          </button>
        ) : null}
      </div>
      {voicePreview?.hasError ? (
        <p role="alert" className="sr-only">
          {alt} voice preview did not load. Try again.
        </p>
      ) : null}
    </div>
  );
}
