"use client";

import { useEffect } from "react";
import { useCanvasInteractionStore } from "./canvasInteractionStore";

function blocksSpacebarReroll(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.dataset.allowSpacebarReroll === "true") return false;

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

function isRerollSpacebarKey(event: KeyboardEvent): boolean {
  return event.key === " " || event.key === "Spacebar" || event.code === "Space";
}

type UseCreateSpacebarOptions = {
  enabled: boolean;
  onReroll: () => void;
};

export function useCreateSpacebar({ enabled, onReroll }: UseCreateSpacebarOptions) {
  const mode = useCanvasInteractionStore((state) => state.mode);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isRerollSpacebarKey(event)) return;
      if (mode !== "idle") return;
      if (blocksSpacebarReroll(event.target) || blocksSpacebarReroll(document.activeElement)) return;

      event.preventDefault();
      onReroll();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, mode, onReroll]);
}
