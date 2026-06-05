import { useEffect } from 'react';

type SpacebarRerollOptions = {
  onReroll: () => void;
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

export const useSpacebarReroll = ({ onReroll }: SpacebarRerollOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.code !== 'Space') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (shouldIgnoreSpacebarRerollTarget(event.target)) return;

      event.preventDefault();
      onReroll();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReroll]);
};
