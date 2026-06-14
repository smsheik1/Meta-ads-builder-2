import type { AdScene } from "../scene/types";

export type SceneLocks = {
  audio: boolean;
};

export function createDefaultSceneLocks(): SceneLocks {
  return {
    audio: false,
  };
}

export function getNextSceneIndex(currentIndex: number, sceneCount: number): number {
  if (sceneCount <= 0) return -1;

  const safeCurrentIndex = Number.isFinite(currentIndex)
    ? Math.max(0, Math.trunc(currentIndex))
    : 0;

  return (safeCurrentIndex + 1) % sceneCount;
}

export function applySceneLocks(currentScene: AdScene, nextScene: AdScene, locks: SceneLocks): AdScene {
  return {
    ...nextScene,
    audio: locks.audio ? currentScene.audio : nextScene.audio,
  };
}

export function rerollScene(
  scenes: AdScene[],
  selectedScene: AdScene | null,
  selectedIndex: number,
  locks: SceneLocks,
): { scene: AdScene | null; index: number } {
  if (!scenes.length) {
    return { scene: null, index: -1 };
  }

  const currentIndex = selectedIndex >= 0 && selectedIndex < scenes.length ? selectedIndex : 0;
  const currentScene = selectedScene || scenes[currentIndex] || scenes[0];
  const nextIndex = getNextSceneIndex(currentIndex, scenes.length);
  const nextScene = scenes[nextIndex];

  if (!currentScene || !nextScene) {
    return { scene: null, index: -1 };
  }

  return {
    scene: applySceneLocks(currentScene, nextScene, locks),
    index: nextIndex,
  };
}
