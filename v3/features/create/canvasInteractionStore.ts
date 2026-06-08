import { create } from "zustand";

// Canvas interaction only. Keep product data outside this store.
// Product data belongs to Convex/page state; this store only owns temporary canvas UX state.
// Boundary: keep persisted data and product scene state out of this file.
export type CanvasInteractionMode = "idle" | "editing" | "generating" | "rerolling" | "playing";
export type CanvasInteractionSlot = "headline" | "visualizer" | "captions";
export type CanvasInteractionLockKey = "headline" | "subheadline" | "style" | "captionColor" | "audio";
export type CanvasInteractionLocks = Record<CanvasInteractionLockKey, boolean>;

export const createDefaultCanvasInteractionLocks = (): CanvasInteractionLocks => ({
  headline: false,
  subheadline: false,
  style: false,
  captionColor: false,
  audio: false,
});

type CanvasInteractionState = {
  mode: CanvasInteractionMode;
  selectedSlot: CanvasInteractionSlot | null;
  locks: CanvasInteractionLocks;
  setMode: (mode: CanvasInteractionMode) => void;
  selectSlot: (slot: CanvasInteractionSlot) => void;
  clearSelectedSlot: () => void;
  setLocks: (locks: CanvasInteractionLocks) => void;
  toggleLock: (key: CanvasInteractionLockKey) => void;
  resetInteraction: () => void;
};

export const useCanvasInteractionStore = create<CanvasInteractionState>()((set) => ({
  mode: "idle",
  selectedSlot: null,
  locks: createDefaultCanvasInteractionLocks(),
  setMode: (mode) => set({ mode }),
  selectSlot: (slot) => set({ selectedSlot: slot }),
  clearSelectedSlot: () => set({ selectedSlot: null }),
  setLocks: (locks) => set({ locks }),
  toggleLock: (key) => set((state) => ({
    locks: {
      ...state.locks,
      [key]: !state.locks[key],
    },
  })),
  resetInteraction: () => set({
    mode: "idle",
    selectedSlot: null,
    locks: createDefaultCanvasInteractionLocks(),
  }),
}));
