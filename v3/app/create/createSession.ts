import {
  createDefaultCanvasInteractionLocks,
  type CanvasInteractionLocks,
} from "@/features/create/canvasInteractionStore";
import { cloneDialogueScript, type DialogueScript } from "@/features/dialogue/dialogueScripts";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import type { AdScene } from "@/features/scene/types";

const anonymousIdKey = "wiggly:v3:anonymous-id";
const createSessionStorageKey = "wiggly:v3:create-session";
const createSessionTtlMs = 1000 * 60 * 60 * 12;

export type CreateSessionSnapshot = {
  result: StoredWebsiteResearchResult | null;
  adScenes: AdScene[];
  selectedScene: AdScene | null;
  selectedSceneIndex: number;
  sceneLocks: CanvasInteractionLocks;
  rerollCount: number;
  adStatusNote: string;
  dialogueScripts: DialogueScript[];
  selectedDialogueIndex: number;
  savedAt: number;
};

export const getAnonymousId = () => {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(anonymousIdKey);
  if (existing) return existing;

  const next = window.crypto.randomUUID();
  window.localStorage.setItem(anonymousIdKey, next);
  return next;
};

const getCreateSessionStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const normalizePersistedLocks = (locks: Partial<CanvasInteractionLocks> | null | undefined): CanvasInteractionLocks => ({
  ...createDefaultCanvasInteractionLocks(),
  ...(locks || {}),
});

export const loadCreateSessionSnapshot = (): CreateSessionSnapshot | null => {
  const storage = getCreateSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(createSessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreateSessionSnapshot>;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > createSessionTtlMs) {
      storage.removeItem(createSessionStorageKey);
      return null;
    }

    const adScenes = Array.isArray(parsed.adScenes) ? parsed.adScenes : [];
    const selectedSceneIndex = Math.min(
      Math.max(0, Math.trunc(Number(parsed.selectedSceneIndex) || 0)),
      Math.max(0, adScenes.length - 1),
    );

    return {
      result: parsed.result || null,
      adScenes,
      selectedScene: parsed.selectedScene || adScenes[selectedSceneIndex] || null,
      selectedSceneIndex,
      sceneLocks: normalizePersistedLocks(parsed.sceneLocks),
      rerollCount: Math.max(0, Math.trunc(Number(parsed.rerollCount) || 0)),
      adStatusNote: typeof parsed.adStatusNote === "string" ? parsed.adStatusNote : "",
      dialogueScripts: Array.isArray(parsed.dialogueScripts)
        ? parsed.dialogueScripts.map((script) => cloneDialogueScript(script as DialogueScript))
        : [],
      selectedDialogueIndex: Math.max(0, Math.trunc(Number(parsed.selectedDialogueIndex) || 0)),
      savedAt: parsed.savedAt,
    };
  } catch {
    storage.removeItem(createSessionStorageKey);
    return null;
  }
};

export const saveCreateSessionSnapshot = (snapshot: Omit<CreateSessionSnapshot, "savedAt">) => {
  const storage = getCreateSessionStorage();
  if (!storage) return;

  try {
    if (!snapshot.result && !snapshot.adScenes.length) {
      storage.removeItem(createSessionStorageKey);
      return;
    }
    storage.setItem(createSessionStorageKey, JSON.stringify({
      ...snapshot,
      savedAt: Date.now(),
    }));
  } catch {
    // Session restore is a convenience; it should never break the create flow.
  }
};
