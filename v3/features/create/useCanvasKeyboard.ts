"use client";

import { useEffect, type RefObject } from "react";
import { useCanvasCanReroll } from "./canvasInteractionStore";

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ),
  );
}

function isRerollSpacebarKey(event: KeyboardEvent): boolean {
  return event.key === " " || event.key === "Spacebar" || event.code === "Space";
}

type UseCanvasKeyboardOptions = {
  editorScopeRef: RefObject<HTMLElement | null>;
  onReroll: () => void;
};

export function useCanvasKeyboard({ editorScopeRef, onReroll }: UseCanvasKeyboardOptions) {
  const canReroll = useCanvasCanReroll();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isRerollSpacebarKey(event)) return;
      if (!canReroll) return;
      if (isEditableShortcutTarget(event.target) || isEditableShortcutTarget(document.activeElement)) return;
      if (!editorScopeRef.current) return;

      event.preventDefault();
      onReroll();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [canReroll, editorScopeRef, onReroll]);
}
