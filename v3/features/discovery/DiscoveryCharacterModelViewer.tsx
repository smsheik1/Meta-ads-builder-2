"use client";

import { Rotate3D } from "lucide-react";
import { createElement, useEffect, type CSSProperties } from "react";

export function DiscoveryCharacterModelViewer({
  src,
  poster,
  alt,
}: {
  src: string;
  poster: string;
  alt: string;
}) {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <div className="relative h-full w-full bg-white">
      {createElement("model-viewer", {
        src,
        poster,
        alt,
        loading: "eager",
        reveal: "auto",
        "camera-controls": "",
        "disable-pan": "",
        "touch-action": "pan-y",
        "interaction-prompt": "none",
        "shadow-intensity": "0",
        "camera-orbit": "0deg 75deg 105%",
        "field-of-view": "30deg",
        "data-testid": "character-model-viewer",
        className: "block h-full w-full cursor-grab active:cursor-grabbing",
        style: {
          "--poster-color": "#ffffff",
          backgroundColor: "#ffffff",
        } as CSSProperties,
      })}
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#080817] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#080817] shadow-[2px_2px_0_#080817]">
        <Rotate3D className="size-3.5" aria-hidden="true" />
        Drag to rotate
      </div>
    </div>
  );
}
