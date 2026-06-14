import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createDefaultCanvasInteractionSnapshot,
  getCanvasCanRerollNow,
  getCanvasCanReroll,
  reduceCanvasInteractionState,
} from "../features/create/canvasInteractionStore";

const idle = createDefaultCanvasInteractionSnapshot();

assert.equal(getCanvasCanReroll(idle), true, "Spacebar should be allowed only in idle + paused.");
assert.equal(typeof getCanvasCanRerollNow, "function", "Keyboard handlers need a live store reroll gate.");

for (const modal of ["brand-dump", "dialogue", "captions"] as const) {
  const state = reduceCanvasInteractionState(idle, { type: "openModal", modal });
  assert.equal(getCanvasCanReroll(state), false, `Spacebar should be blocked in modal:${modal}.`);
}

for (const reason of ["website-research", "ad-generation", "audio-generation", "audio-upload", "render"] as const) {
  const state = reduceCanvasInteractionState(idle, { type: "beginBusy", reason });
  assert.equal(getCanvasCanReroll(state), false, `Spacebar should be blocked in busy:${reason}.`);
}

const playing = reduceCanvasInteractionState(idle, { type: "playbackStarted" });
assert.equal(getCanvasCanReroll(playing), false, "Spacebar should be blocked while playback is playing.");

const dialogueModal = reduceCanvasInteractionState(idle, { type: "openModal", modal: "dialogue" });
const playingInDialogueModal = reduceCanvasInteractionState(dialogueModal, { type: "playbackStarted" });
assert.equal(playingInDialogueModal.uiStatus, "modal:dialogue", "Starting playback must not close the dialogue modal.");
assert.equal(playingInDialogueModal.playbackStatus, "playing", "Starting playback must update playback state.");

const pausedInDialogueModal = reduceCanvasInteractionState(playingInDialogueModal, { type: "playbackStopped" });
assert.equal(pausedInDialogueModal.uiStatus, "modal:dialogue", "Stopping playback must not close the dialogue modal.");
assert.equal(pausedInDialogueModal.playbackStatus, "paused", "Stopping playback must preserve modal state.");
assert.equal(getCanvasCanReroll(pausedInDialogueModal), false, "Modal still blocks reroll after playback stops.");

const reset = reduceCanvasInteractionState(playingInDialogueModal, { type: "interactionReset" });
assert.deepEqual(reset, idle, "Interaction reset must clear only transient UI/playback state.");

const createDir = join(process.cwd(), "app/create");
const createSources = readdirSync(createDir)
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .map((file) => ({
    file,
    source: readFileSync(join(createDir, file), "utf8"),
  }));

for (const { file, source } of createSources) {
  assert.ok(
    !source.includes("useCanvasInteractionStoreBase") && !source.includes("useCanvasInteractionStore("),
    `${file} must not import the raw canvas interaction store; use exported hooks/actions.`,
  );
  assert.ok(
    !/\bconst\s*\[\s*(?:selectedSlot|selectedPreviewSlot)\s*,[^\]]+\]\s*=\s*useState\b/.test(source),
    `${file} must not keep selected canvas slot in local useState.`,
  );
  assert.ok(
    !/\bconst\s*\[\s*(?:sceneLocks|canvasLocks|locks)\s*,[^\]]+\]\s*=\s*useState\b/.test(source),
    `${file} must not keep canvas locks in local useState.`,
  );
  assert.ok(
    !/\bconst\s*\[\s*(?:canvasMode|uiStatus|canvasUiStatus)\s*,[^\]]+\]\s*=\s*useState\b/.test(source),
    `${file} must not keep canvas UI status in local useState.`,
  );
}

const storeSource = readFileSync("features/create/canvasInteractionStore.ts", "utf8");
const keyboardSource = readFileSync("features/create/useCanvasKeyboard.ts", "utf8");
const previewChromeSource = readFileSync("app/create/CreatePreviewChrome.tsx", "utf8");
const createClientSource = readFileSync("app/create/CreateResearchClient.tsx", "utf8");
const storeImports = storeSource
  .split("\n")
  .filter((line) => line.startsWith("import "));

assert.deepEqual(storeImports, ['import { create } from "zustand";'], "Canvas interaction store must only import Zustand.");
assert.ok(
  keyboardSource.includes("getCanvasCanRerollNow()"),
  "Spacebar handler must ask the store at keypress time, not from stale React render state.",
);

for (const forbiddenStoreShape of [
  "selectedSlot",
  "locks:",
  "CanvasInteractionLocks",
  "slotSelected",
  "slotCleared",
  "slotLockToggled",
  "useSelectedCanvasSlot",
  "useCanvasLocks",
]) {
  assert.ok(!storeSource.includes(forbiddenStoreShape), `Canvas interaction store must not expose /create editor state: ${forbiddenStoreShape}`);
}

for (const forbiddenCreateBehavior of [
  "CreatePreviewSelectionOverlay",
  "PreviewSelectionOverlay",
  "data-preview-selectable-slot",
  "data-preview-background-color",
  "onChangePreviewSlotColor",
  "onChangePreviewBackgroundColor",
  "Spacebar rerolls the",
  "useSelectedCanvasSlot",
  "useCanvasLocks",
  "selectedPreviewSlot",
  "sceneLocks",
]) {
  assert.ok(!createClientSource.includes(forbiddenCreateBehavior), `/create must not keep mini-editor behavior: ${forbiddenCreateBehavior}`);
  assert.ok(!previewChromeSource.includes(forbiddenCreateBehavior), `/create preview chrome must not keep mini-editor behavior: ${forbiddenCreateBehavior}`);
}

assert.ok(
  !existsSync("app/create/CreatePreviewSelectionOverlay.tsx"),
  "/create must not ship a selection overlay; per-slot editing belongs in /builder.",
);
assert.ok(
  !previewChromeSource.includes('data-preview-audio-action="true"'),
  "/create canvas must not expose a canvas-level add-audio hover/action; audio lives in normal controls.",
);

for (const forbiddenStoreReference of [
  "convex/",
  "_generated",
  "AdScene",
  "scene/types",
  "renderJobs",
  "features/formats",
  "audio.url",
]) {
  assert.ok(
    !storeSource.includes(forbiddenStoreReference),
    `Canvas interaction store must not import or reference product/server data: ${forbiddenStoreReference}`,
  );
}

console.log("canvas-interaction-store tests passed");
