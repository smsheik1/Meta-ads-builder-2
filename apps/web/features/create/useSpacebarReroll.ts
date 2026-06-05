import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { AdScene } from './scene';
import type { AdSceneAction } from './sceneReducer';
import { createCreativeReroll } from './creativeReroll';

type SpacebarRerollOptions = {
  scene: AdScene;
  dispatch: Dispatch<AdSceneAction>;
  onReroll?: () => void;
};

export const shouldIgnoreSpacebarRerollElement = (
  tagName: string,
  isContentEditable = false,
  role: string | null = null,
) => (
  isContentEditable ||
  role === 'textbox' ||
  ['input', 'textarea', 'select', 'button'].includes(tagName.toLowerCase())
);

export const shouldIgnoreSpacebarRerollTarget = (target: EventTarget | null) => {
  if (typeof HTMLElement === 'undefined') return false;
  if (!(target instanceof HTMLElement)) return false;

  return shouldIgnoreSpacebarRerollElement(
    target.tagName,
    target.isContentEditable,
    target.getAttribute('role'),
  );
};

export const useSpacebarReroll = ({ scene, dispatch, onReroll }: SpacebarRerollOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (shouldIgnoreSpacebarRerollTarget(event.target)) return;

      event.preventDefault();
      dispatch({
        type: 'rerollCreative',
        creative: createCreativeReroll(scene),
      });
      onReroll?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, onReroll, scene]);
};
