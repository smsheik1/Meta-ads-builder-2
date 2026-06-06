import { getAdSceneLayout, type AdScene, type AdSceneLayoutElement } from '@/features/engine/scene';

export const layoutLockForElement = (scene: AdScene, element: AdSceneLayoutElement) => {
  if (element === 'brand') return scene.locks.logo;
  if (element === 'headline') return scene.locks.headline;
  if (element === 'visualizer') return scene.locks.visualizer;
  return scene.locks.audio;
};

export const getLayoutBox = (scene: AdScene, element: AdSceneLayoutElement) => (
  getAdSceneLayout(scene)[element]
);

export const getCanvasLayoutStyle = (scene: AdScene, element: AdSceneLayoutElement) => {
  const box = getLayoutBox(scene, element);

  return {
    position: 'absolute' as const,
    left: `${(box.x - box.width / 2) * 100}%`,
    top: `${(box.y - box.height / 2) * 100}%`,
    width: `${box.width * 100}%`,
    height: `${box.height * 100}%`,
  };
};

export const getRemotionLayoutStyle = (
  scene: AdScene,
  element: AdSceneLayoutElement,
  bounds: { width: number; height: number },
) => {
  const box = getLayoutBox(scene, element);

  return {
    position: 'absolute' as const,
    left: (box.x - box.width / 2) * bounds.width,
    top: (box.y - box.height / 2) * bounds.height,
    width: box.width * bounds.width,
    height: box.height * bounds.height,
  };
};
