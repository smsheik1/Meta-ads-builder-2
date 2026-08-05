"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { DiscoveryCharacterModelViewer } from "./DiscoveryCharacterModelViewer";
import type { DiscoveryCharacterOption } from "./types";

export function DiscoveryCharacterOptions({
  options,
}: {
  options: DiscoveryCharacterOption[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  async function togglePreview(option: DiscoveryCharacterOption) {
    const current = audioRef.current;
    if (current && activeId === option.id && !current.paused) {
      current.pause();
      current.currentTime = 0;
      setActiveId(null);
      return;
    }

    if (current) {
      current.pause();
      current.currentTime = 0;
    }

    const audio = new Audio(option.audioSrc);
    audio.preload = "auto";
    audioRef.current = audio;
    setActiveId(option.id);
    setErrorId(null);

    audio.addEventListener(
      "ended",
      () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setActiveId(null);
        }
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
          setActiveId(null);
          setErrorId(option.id);
        }
      },
      { once: true },
    );

    try {
      await audio.play();
    } catch {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setActiveId(null);
        setErrorId(option.id);
      }
    }
  }

  return (
    <div className="mt-9 grid gap-5 md:grid-cols-3">
      {options.map((option) => {
        const isPlaying = activeId === option.id;
        const hasError = errorId === option.id;

        return (
          <article
            key={option.id}
            className="overflow-hidden rounded-lg border-2 border-[#080817] bg-white shadow-[6px_6px_0_#080817]"
            style={{ borderTopColor: option.accentColor, borderTopWidth: 10 }}
          >
            <div className="aspect-[4/5] overflow-hidden bg-white">
              {option.modelSrc ? (
                <DiscoveryCharacterModelViewer
                  src={option.modelSrc}
                  poster={option.portraitSrc}
                  alt={`${option.name} interactive 3D presenter model`}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={option.portraitSrc}
                  alt={`${option.name} verified 3D presenter model`}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="border-t-2 border-[#080817] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#667087]">
                    Verified 3D anchor
                  </p>
                  <h3 className="mt-1 text-2xl font-black leading-none">
                    {option.name}
                  </h3>
                </div>
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void togglePreview(option)}
                  aria-label={`${isPlaying ? "Stop" : "Play"} ${option.name} voice preview`}
                  aria-pressed={isPlaying}
                  className="size-11 shrink-0 rounded-full border-2 border-[#080817] bg-[#080817] text-white shadow-[3px_3px_0_var(--character-accent)] hover:bg-[#30374b]"
                  style={
                    {
                      "--character-accent": option.accentColor,
                    } as CSSProperties
                  }
                >
                  {isPlaying ? (
                    <Pause aria-hidden="true" />
                  ) : (
                    <Play aria-hidden="true" />
                  )}
                </Button>
              </div>
              <p className="mt-3 text-sm font-bold leading-5 text-[#596176]">
                {option.personality}
              </p>
              <div className="mt-4 rounded-md border-2 border-[#dbe2ee] bg-[#f5f1e8] p-3">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#667087]">
                  <Volume2 className="size-3.5" aria-hidden="true" />
                  {isPlaying ? "Playing preview" : "Tap to hear the voice"}
                </p>
                <p className="mt-2 text-sm font-black leading-5">
                  “{option.previewLine}”
                </p>
                {hasError ? (
                  <p
                    role="alert"
                    className="mt-2 text-xs font-black text-[#c21f39]"
                  >
                    Preview did not load. Tap play to try again.
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
