'use client';

import type { AdScene, AdSceneCreative, AdSceneLayoutElement } from './scene';
import { AdSceneCanvas } from '@/features/render/AdSceneCanvas';
import { visualizerFormat } from '@/features/formats/visualizer/visualizerFormat';
import { CanvasGuidesToggle } from './CanvasGuidesToggle';
import { SpacebarRerollPrompt } from './SpacebarRerollPrompt';

type CreateCanvasStageProps = {
  scene: AdScene;
  rerollTick: number;
  selectedElement: AdSceneLayoutElement | null;
  showGuides: boolean;
  onAddAudio: () => void;
  onClearSelection: () => void;
  onEditCreative: (
    creative: Partial<Pick<AdSceneCreative, 'headline' | 'headlineColor' | 'accentColor'>>,
    visualizer?: Partial<AdSceneCreative['visualizer']>,
  ) => void;
  onEditCaptions: () => void;
  onMoveElement: (element: AdSceneLayoutElement, x: number, y: number) => void;
  onReplaceLogo: (logoUrl: string | null) => void;
  onReroll: () => void;
  onSelectElement: (element: AdSceneLayoutElement | null) => void;
  onToggleGuides: () => void;
  onToggleLock: (field: keyof AdScene['locks']) => void;
};

export function CreateCanvasStage({
  scene,
  rerollTick,
  selectedElement,
  showGuides,
  onAddAudio,
  onClearSelection,
  onEditCreative,
  onEditCaptions,
  onMoveElement,
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
      <CanvasGuidesToggle showGuides={showGuides} onToggle={onToggleGuides} />
      <SpacebarRerollPrompt onReroll={onReroll} />
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
