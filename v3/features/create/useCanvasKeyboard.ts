"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useCanvasInteractionStore } from "./canvasInteractionStore";

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ),
  );
}

function isDocumentShortcutTarget(target: EventTarget | null): boolean {
  return target === document || target === document.body || target === document.documentElement;
}

function targetIsInScope(target: EventTarget | null, scope: HTMLElement | null): boolean {
  return Boolean(scope && target instanceof Node && scope.contains(target));
}

function isRerollSpacebarKey(event: KeyboardEvent): boolean {
  return event.key === " " || event.key === "Spacebar" || event.code === "Space";
}

type UseCanvasKeyboardOptions = {
  enabled: boolean;
  editorScopeRef: RefObject<HTMLElement | null>;
  onReroll: () => void;
};

export function useCanvasKeyboard({ enabled, editorScopeRef, onReroll }: UseCanvasKeyboardOptions) {
  const mode = useCanvasInteractionStore((state) => state.mode);
  const shortcutScopeActiveRef = useRef(true);

  useEffect(() => {
    const syncShortcutScope = (event: Event) => {
      shortcutScopeActiveRef.current = targetIsInScope(event.target, editorScopeRef.current);
    };

    window.addEventListener("pointerdown", syncShortcutScope, true);
    window.addEventListener("focusin", syncShortcutScope, true);
    return () => {
      window.removeEventListener("pointerdown", syncShortcutScope, true);
      window.removeEventListener("focusin", syncShortcutScope, true);
    };
  }, [editorScopeRef]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isRerollSpacebarKey(event)) return;
      if (mode !== "idle") return;
      if (isEditableShortcutTarget(event.target) || isEditableShortcutTarget(document.activeElement)) return;

      const targetInScope = targetIsInScope(event.target, editorScopeRef.current);
      const targetUsesActiveScope = isDocumentShortcutTarget(event.target) && shortcutScopeActiveRef.current;
      if (!targetInScope && !targetUsesActiveScope) return;

      event.preventDefault();
      onReroll();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, editorScopeRef, mode, onReroll]);
}
