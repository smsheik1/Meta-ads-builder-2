"use client";

import { Rotate3D } from "lucide-react";
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
}: {
  src: string;
  poster: string;
  alt: string;
  characterId: string;
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
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#080817] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#080817] shadow-[2px_2px_0_#080817]">
        <Rotate3D className="size-3.5" aria-hidden="true" />
        {isExploring ? "Returns in 3 sec" : "Drag to rotate"}
      </div>
    </div>
  );
}
