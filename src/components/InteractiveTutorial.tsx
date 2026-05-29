import { useEffect, useRef } from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const WIGGLY_TUTORIAL_EVENT = 'wiggly:tutorial-event';
export const WIGGLY_TUTORIAL_SEEN_KEY = 'wiggly_interactive_tutorial_seen_v1';

export type TutorialEventDetail = {
  type: 'space-reroll' | 'element-locked' | 'element-selected' | 'play-clicked';
  role?: string;
};

export const emitTutorialEvent = (detail: TutorialEventDetail) => {
  window.dispatchEvent(new CustomEvent<TutorialEventDetail>(WIGGLY_TUTORIAL_EVENT, { detail }));
};

type TutorialStep = {
  id: string;
  element: string;
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left' | 'over';
  align?: 'start' | 'center' | 'end';
  waitFor?: TutorialEventDetail;
};

const steps: TutorialStep[] = [
  {
    id: 'welcome',
    element: '[data-tour="canvas"]',
    title: 'Start with a finished ad',
    description: 'Wiggly gives you a complete ad first. You just mutate it until it feels right.',
    side: 'right',
  },
  {
    id: 'space',
    element: '[data-tour="canvas"]',
    title: 'Press space to reroll',
    description: 'Tap the spacebar now. The ad will try a new finished-looking version.',
    side: 'right',
    waitFor: { type: 'space-reroll' },
  },
  {
    id: 'lock',
    element: '[data-tour="visualizer"]',
    title: 'Lock what you like',
    description: 'Hover over the visualizer and click the lock. Locked parts stay put.',
    side: 'left',
    waitFor: { type: 'element-locked', role: 'visualizer' },
  },
  {
    id: 'reroll-locked',
    element: '[data-tour="canvas"]',
    title: 'Reroll around the lock',
    description: 'Press space again. The locked visualizer should stay while the rest changes.',
    side: 'right',
    waitFor: { type: 'space-reroll' },
  },
  {
    id: 'select-headline',
    element: '[data-tour="headline"]',
    title: 'Select one part',
    description: 'Click the headline. When something is selected, space only rerolls that part.',
    side: 'right',
    waitFor: { type: 'element-selected', role: 'headline' },
  },
  {
    id: 'reroll-headline',
    element: '[data-tour="headline"]',
    title: 'Reroll only the headline',
    description: 'Press space one more time. Only the headline changes.',
    side: 'right',
    waitFor: { type: 'space-reroll', role: 'headline' },
  },
  {
    id: 'play',
    element: '[data-tour="play-button"]',
    title: 'Watch it move',
    description: 'Hit Play to preview the ad with audio and captions.',
    side: 'top',
    waitFor: { type: 'play-clicked' },
  },
  {
    id: 'done',
    element: '[data-tour="download-button"]',
    title: 'You are ready',
    description: 'That is the loop: reroll, lock, tweak, play. Download when it looks good.',
    side: 'top',
  },
];

const eventMatchesStep = (event: TutorialEventDetail, waitFor?: TutorialEventDetail) => {
  if (!waitFor) return false;
  if (event.type !== waitFor.type) return false;
  return !waitFor.role || event.role === waitFor.role;
};

export function InteractiveTutorial({ enabled, replayToken = 0 }: { enabled: boolean; replayToken?: number }) {
  const driverRef = useRef<Driver | null>(null);
  const stepIndexRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (localStorage.getItem(WIGGLY_TUTORIAL_SEEN_KEY) === '1') return;

    activeRef.current = true;
    const completeTutorial = () => {
      activeRef.current = false;
      localStorage.setItem(WIGGLY_TUTORIAL_SEEN_KEY, '1');
      driverRef.current?.destroy();
    };

    const showStep = (index: number) => {
      const step = steps[index];
      if (!step) {
        completeTutorial();
        return;
      }

      const target = document.querySelector(step.element);
      if (!target) {
        stepIndexRef.current = index + 1;
        window.setTimeout(() => showStep(stepIndexRef.current), 80);
        return;
      }

      const isLastStep = index === steps.length - 1;
      const isActionStep = Boolean(step.waitFor);
      driverRef.current?.highlight({
        element: step.element,
        disableActiveInteraction: false,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side ?? 'right',
          align: step.align ?? 'center',
          showButtons: isActionStep ? ['close'] : ['next', 'close'],
          nextBtnText: isLastStep ? 'Done' : 'Start',
          doneBtnText: 'Done',
          progressText: `${index + 1}/${steps.length}`,
          onNextClick: () => {
            if (isLastStep) {
              completeTutorial();
              return;
            }
            stepIndexRef.current = index + 1;
            showStep(stepIndexRef.current);
          },
        },
      });
    };

    driverRef.current = driver({
      allowClose: true,
      animate: true,
      disableActiveInteraction: false,
      overlayOpacity: 0.58,
      stagePadding: 8,
      stageRadius: 16,
      showProgress: true,
      popoverClass: 'wiggly-tour-popover',
      onCloseClick: completeTutorial,
      onDestroyed: () => {
        activeRef.current = false;
      },
    });

    const handleTutorialEvent = (event: Event) => {
      if (!activeRef.current) return;
      const detail = (event as CustomEvent<TutorialEventDetail>).detail;
      const step = steps[stepIndexRef.current];
      if (!eventMatchesStep(detail, step?.waitFor)) return;

      stepIndexRef.current += 1;
      window.setTimeout(() => showStep(stepIndexRef.current), 180);
    };

    window.addEventListener(WIGGLY_TUTORIAL_EVENT, handleTutorialEvent);
    const startTimer = window.setTimeout(() => showStep(0), 450);

    return () => {
      window.clearTimeout(startTimer);
      window.removeEventListener(WIGGLY_TUTORIAL_EVENT, handleTutorialEvent);
      driverRef.current?.destroy();
    };
  }, [enabled, replayToken]);

  return null;
}
