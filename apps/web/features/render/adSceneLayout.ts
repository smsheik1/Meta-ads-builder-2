import { getAdSceneLayout, type AdScene, type AdSceneLayoutElement } from '@/features/create/scene';

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
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.width * 100}%`,
    minHeight: `${box.height * 100}%`,
    transform: 'translate(-50%, -50%)',
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
    left: box.x * bounds.width,
    top: box.y * bounds.height,
    width: box.width * bounds.width,
    minHeight: box.height * bounds.height,
    transform: 'translate(-50%, -50%)',
  };
};
