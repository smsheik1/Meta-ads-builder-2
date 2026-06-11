import { create } from "zustand";

// Canvas interaction only. Keep product data outside this store.
// Boundary: no Convex, scenes, render jobs, audio URLs, or format modules.
// Export custom hooks/actions only; /create components must not import the raw store.
export type CanvasInteractionSlot = "headline" | "visualizer" | "captions";
export type CanvasInteractionLockKey = "headline" | "subheadline" | "style" | "captionColor" | "audio";
export type CanvasInteractionLocks = Record<CanvasInteractionLockKey, boolean>;
export type CanvasInteractionBusyReason =
  | "website-research"
  | "ad-generation"
  | "audio-generation"
  | "audio-upload"
  | "render";
export type CanvasInteractionModal = "brand-dump" | "dialogue" | "captions";
export type CanvasInteractionUiStatus =
  | "idle"
  | `busy:${CanvasInteractionBusyReason}`
  | `modal:${CanvasInteractionModal}`;
export type CanvasPlaybackStatus = "paused" | "playing";

export type CanvasInteractionSnapshot = {
  uiStatus: CanvasInteractionUiStatus;
  playbackStatus: CanvasPlaybackStatus;
  selectedSlot: CanvasInteractionSlot | null;
  locks: CanvasInteractionLocks;
};

export type CanvasInteractionEvent =
  | { type: "openModal"; modal: CanvasInteractionModal }
  | { type: "closeModal"; modal?: CanvasInteractionModal }
  | { type: "beginBusy"; reason: CanvasInteractionBusyReason }
  | { type: "finishBusy" }
  | { type: "playbackStarted" }
  | { type: "playbackStopped" }
  | { type: "slotSelected"; slot: CanvasInteractionSlot }
  | { type: "slotCleared" }
  | { type: "slotLockToggled"; key: CanvasInteractionLockKey }
  | { type: "locksRestored"; locks: CanvasInteractionLocks }
  | { type: "interactionReset"; locks?: CanvasInteractionLocks };

type CanvasInteractionActions = {
  openModal: (modal: CanvasInteractionModal) => void;
  closeModal: (modal?: CanvasInteractionModal) => void;
  beginBusy: (reason: CanvasInteractionBusyReason) => void;
  finishBusy: () => void;
  playbackStarted: () => void;
  playbackStopped: () => void;
  slotSelected: (slot: CanvasInteractionSlot) => void;
  slotCleared: () => void;
  slotLockToggled: (key: CanvasInteractionLockKey) => void;
  locksRestored: (locks: CanvasInteractionLocks) => void;
  interactionReset: (options?: { locks?: CanvasInteractionLocks }) => void;
};

type CanvasInteractionState = CanvasInteractionSnapshot & {
  actions: CanvasInteractionActions;
};

export const createDefaultCanvasInteractionLocks = (): CanvasInteractionLocks => ({
  headline: false,
  subheadline: false,
  style: false,
  captionColor: false,
  audio: false,
});

export const createDefaultCanvasInteractionSnapshot = (): CanvasInteractionSnapshot => ({
  uiStatus: "idle",
  playbackStatus: "paused",
  selectedSlot: null,
  locks: createDefaultCanvasInteractionLocks(),
});

export function getCanvasCanReroll(state: Pick<CanvasInteractionSnapshot, "uiStatus" | "playbackStatus">) {
  return state.uiStatus === "idle" && state.playbackStatus === "paused";
}

function getBusyStatus(reason: CanvasInteractionBusyReason): CanvasInteractionUiStatus {
  return `busy:${reason}`;
}

function getModalStatus(modal: CanvasInteractionModal): CanvasInteractionUiStatus {
  return `modal:${modal}`;
}

export function reduceCanvasInteractionState(
  state: CanvasInteractionSnapshot,
  event: CanvasInteractionEvent,
): CanvasInteractionSnapshot {
  switch (event.type) {
    case "openModal":
      return {
        ...state,
        uiStatus: getModalStatus(event.modal),
      };
    case "closeModal":
      if (event.modal && state.uiStatus !== getModalStatus(event.modal)) return state;
      return {
        ...state,
        uiStatus: "idle",
      };
    case "beginBusy":
      return {
        ...state,
        uiStatus: getBusyStatus(event.reason),
      };
    case "finishBusy":
      return {
        ...state,
        uiStatus: "idle",
      };
    case "playbackStarted":
      return {
        ...state,
        playbackStatus: "playing",
      };
    case "playbackStopped":
      return {
        ...state,
        playbackStatus: "paused",
      };
    case "slotSelected":
      return {
        ...state,
        selectedSlot: event.slot,
      };
    case "slotCleared":
      return {
        ...state,
        selectedSlot: null,
      };
    case "slotLockToggled":
      return {
        ...state,
        locks: {
          ...state.locks,
          [event.key]: !state.locks[event.key],
        },
      };
    case "locksRestored":
      return {
        ...state,
        locks: event.locks,
      };
    case "interactionReset":
      return {
        ...createDefaultCanvasInteractionSnapshot(),
        locks: event.locks || createDefaultCanvasInteractionLocks(),
      };
    default:
      return state;
  }
}

const useCanvasInteractionStoreBase = create<CanvasInteractionState>()((set) => {
  const dispatch = (event: CanvasInteractionEvent) => {
    set((state) => reduceCanvasInteractionState(state, event));
  };

  return {
    ...createDefaultCanvasInteractionSnapshot(),
    actions: {
      openModal: (modal) => dispatch({ type: "openModal", modal }),
      closeModal: (modal) => dispatch({ type: "closeModal", modal }),
      beginBusy: (reason) => dispatch({ type: "beginBusy", reason }),
      finishBusy: () => dispatch({ type: "finishBusy" }),
      playbackStarted: () => dispatch({ type: "playbackStarted" }),
      playbackStopped: () => dispatch({ type: "playbackStopped" }),
      slotSelected: (slot) => dispatch({ type: "slotSelected", slot }),
      slotCleared: () => dispatch({ type: "slotCleared" }),
      slotLockToggled: (key) => dispatch({ type: "slotLockToggled", key }),
      locksRestored: (locks) => dispatch({ type: "locksRestored", locks }),
      interactionReset: (options) => dispatch({ type: "interactionReset", locks: options?.locks }),
    },
  };
});

export const useCanvasCanReroll = () => useCanvasInteractionStoreBase(getCanvasCanReroll);
export const useCanvasActions = () => useCanvasInteractionStoreBase((state) => state.actions);
export const useSelectedCanvasSlot = () => useCanvasInteractionStoreBase((state) => state.selectedSlot);
export const useCanvasLocks = () => useCanvasInteractionStoreBase((state) => state.locks);

export function getCanvasCanRerollNow() {
  return getCanvasCanReroll(useCanvasInteractionStoreBase.getState());
}
