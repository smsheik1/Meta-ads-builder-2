import { create } from "zustand";

export type BuilderInteractionSnapshot = {
  selectedLayerId: string | null;
};

export type BuilderInteractionEvent =
  | { type: "selectionChanged"; layerId: string }
  | { type: "selectionCleared" }
  | { type: "interactionReset" };

type BuilderInteractionState = BuilderInteractionSnapshot & {
  actions: {
    selectionChanged: (layerId: string) => void;
    selectionCleared: () => void;
    interactionReset: () => void;
  };
};

export const createDefaultBuilderInteractionSnapshot = (): BuilderInteractionSnapshot => ({ selectedLayerId: null });

export function reduceBuilderInteraction(
  state: BuilderInteractionSnapshot,
  event: BuilderInteractionEvent,
): BuilderInteractionSnapshot {
  if (event.type === "selectionChanged") return { selectedLayerId: event.layerId };
  return createDefaultBuilderInteractionSnapshot();
}

const useBuilderInteractionStoreBase = create<BuilderInteractionState>()((set) => {
  const dispatch = (event: BuilderInteractionEvent) => set((state) => reduceBuilderInteraction(state, event));
  return {
    ...createDefaultBuilderInteractionSnapshot(),
    actions: {
      selectionChanged: (layerId) => dispatch({ type: "selectionChanged", layerId }),
      selectionCleared: () => dispatch({ type: "selectionCleared" }),
      interactionReset: () => dispatch({ type: "interactionReset" }),
    },
  };
});

export const useSelectedBuilderLayerId = () => useBuilderInteractionStoreBase((state) => state.selectedLayerId);
export const useBuilderInteractionActions = () => useBuilderInteractionStoreBase((state) => state.actions);
