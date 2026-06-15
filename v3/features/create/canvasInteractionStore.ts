import { create } from "zustand";

// Canvas interaction only. Keep product data outside this store.
// Boundary: no Convex, scenes, render jobs, audio URLs, or format modules.
// Export custom hooks/actions only; /create components must not import the raw store.
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
export type CanvasInteractionPanel = "text" | "style" | "format";

export type CanvasInteractionSnapshot = {
  uiStatus: CanvasInteractionUiStatus;
  playbackStatus: CanvasPlaybackStatus;
  activePanel: CanvasInteractionPanel | null;
};

export type CanvasInteractionEvent =
  | { type: "openModal"; modal: CanvasInteractionModal }
  | { type: "closeModal"; modal?: CanvasInteractionModal }
  | { type: "openPanel"; panel: CanvasInteractionPanel }
  | { type: "closePanel"; panel?: CanvasInteractionPanel }
  | { type: "beginBusy"; reason: CanvasInteractionBusyReason }
  | { type: "finishBusy" }
  | { type: "playbackStarted" }
  | { type: "playbackStopped" }
  | { type: "interactionReset" };

type CanvasInteractionActions = {
  openModal: (modal: CanvasInteractionModal) => void;
  closeModal: (modal?: CanvasInteractionModal) => void;
  openPanel: (panel: CanvasInteractionPanel) => void;
  closePanel: (panel?: CanvasInteractionPanel) => void;
  beginBusy: (reason: CanvasInteractionBusyReason) => void;
  finishBusy: () => void;
  playbackStarted: () => void;
  playbackStopped: () => void;
  interactionReset: () => void;
};

type CanvasInteractionState = CanvasInteractionSnapshot & {
  actions: CanvasInteractionActions;
};

export const createDefaultCanvasInteractionSnapshot = (): CanvasInteractionSnapshot => ({
  uiStatus: "idle",
  playbackStatus: "paused",
  activePanel: null,
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
    case "openPanel":
      return {
        ...state,
        activePanel: event.panel,
      };
    case "closePanel":
      if (event.panel && state.activePanel !== event.panel) return state;
      return {
        ...state,
        activePanel: null,
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
    case "interactionReset":
      return createDefaultCanvasInteractionSnapshot();
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
      openPanel: (panel) => dispatch({ type: "openPanel", panel }),
      closePanel: (panel) => dispatch({ type: "closePanel", panel }),
      beginBusy: (reason) => dispatch({ type: "beginBusy", reason }),
      finishBusy: () => dispatch({ type: "finishBusy" }),
      playbackStarted: () => dispatch({ type: "playbackStarted" }),
      playbackStopped: () => dispatch({ type: "playbackStopped" }),
      interactionReset: () => dispatch({ type: "interactionReset" }),
    },
  };
});

export const useCanvasCanReroll = () => useCanvasInteractionStoreBase(getCanvasCanReroll);
export const useCanvasActions = () => useCanvasInteractionStoreBase((state) => state.actions);
export const useActiveCanvasPanel = () => useCanvasInteractionStoreBase((state) => state.activePanel);

export function getCanvasCanRerollNow() {
  return getCanvasCanReroll(useCanvasInteractionStoreBase.getState());
}
