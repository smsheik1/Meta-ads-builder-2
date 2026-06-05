import type { ComponentType } from 'react';
import type { AdScene, AdSceneCreative, AdSceneLayoutElement } from '@/features/create/scene';

export type FormatEditTrayProps = {
  scene: AdScene;
  selectedElement: AdSceneLayoutElement | null;
  onClearSelection: () => void;
  onEditCreative: (
    creative: Partial<Pick<AdSceneCreative, 'headline' | 'headlineColor' | 'accentColor'>>,
    visualizer?: Partial<AdSceneCreative['visualizer']>,
  ) => void;
  onReplaceLogo: (logoUrl: string | null) => void;
  onToggleLock: (field: keyof AdScene['locks']) => void;
};

export type AdFormatModule = {
  id: 'visualizer';
  label: string;
  EditTray: ComponentType<FormatEditTrayProps>;
};
