'use client';

import type { AdPlatform, AdScene, AdSceneCreative, AdSceneCreativePatch, AdSceneLayoutElement } from './scene';
import { AdSceneCanvas } from '@/features/render/AdSceneCanvas';
import { visualizerFormat } from '@/features/formats/visualizer/visualizerFormat';
import { CanvasGuidesToggle } from './CanvasGuidesToggle';
import { GenerationFeedback } from './GenerationFeedback';
import { PlatformSelector } from './PlatformSelector';
import { SpacebarRerollPrompt } from './SpacebarRerollPrompt';
import type { GenerationFeedbackRating, GenerationFeedbackStatus } from './generationFeedbackPayload';

type CreateCanvasStageProps = {
  feedbackError: string;
  feedbackRating: GenerationFeedbackRating | null;
  feedbackStatus: GenerationFeedbackStatus;
  scene: AdScene;
  rerollTick: number;
  selectedElement: AdSceneLayoutElement | null;
  showGuides: boolean;
  onAddAudio: () => void;
  onClearSelection: () => void;
  onEditCreative: (
    creative: AdSceneCreativePatch,
    visualizer?: Partial<AdSceneCreative['visualizer']>,
  ) => void;
  onEditCaptions: () => void;
  onMoveElement: (element: AdSceneLayoutElement, x: number, y: number) => void;
  onPlatformChange: (platform: AdPlatform) => void;
  onRateGeneration: (rating: GenerationFeedbackRating) => void;
  onReplaceLogo: (logoUrl: string | null) => void;
  onReroll: () => void;
  onSelectElement: (element: AdSceneLayoutElement | null) => void;
  onToggleGuides: () => void;
  onToggleLock: (field: keyof AdScene['locks']) => void;
};

export function CreateCanvasStage({
  feedbackError,
  feedbackRating,
  feedbackStatus,
  scene,
  rerollTick,
  selectedElement,
  showGuides,
  onAddAudio,
  onClearSelection,
  onEditCreative,
  onEditCaptions,
  onMoveElement,
  onPlatformChange,
  onRateGeneration,
  onReplaceLogo,
  onReroll,
  onSelectElement,
  onToggleGuides,
  onToggleLock,
}: CreateCanvasStageProps) {
  const EditTray = visualizerFormat.EditTray;

  return (
    <section className="min-w-0">
      <AdSceneCanvas
        scene={scene}
        rerollTick={rerollTick}
        selectedElement={selectedElement}
        showGuides={showGuides}
        onAddAudio={onAddAudio}
        onEditCaptions={onEditCaptions}
        onMoveElement={onMoveElement}
        onSelectElement={onSelectElement}
        onToggleLock={onToggleLock}
      />
      <SpacebarRerollPrompt
        rerollTick={rerollTick}
        selectedElement={selectedElement}
        onReroll={onReroll}
      />
      <GenerationFeedback
        error={feedbackError}
        rating={feedbackRating}
        status={feedbackStatus}
        onRate={onRateGeneration}
      />
      <PlatformSelector platform={scene.platform} onPlatformChange={onPlatformChange} />
      <CanvasGuidesToggle showGuides={showGuides} onToggle={onToggleGuides} />
      <EditTray
        scene={scene}
        selectedElement={selectedElement}
        onClearSelection={onClearSelection}
        onEditCreative={onEditCreative}
        onReplaceLogo={onReplaceLogo}
        onToggleLock={onToggleLock}
      />
    </section>
  );
}
