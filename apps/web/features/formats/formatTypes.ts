import type { ComponentType } from 'react';
import type { AdScene, AdSceneCreative, AdSceneCreativePatch, AdSceneLayoutElement } from '@/features/create/scene';

export type AdFormatId = 'visualizer' | 'meme' | 'text-message' | 'tweet' | 'conversation-card';

export type FormatEditTrayProps = {
  scene: AdScene;
  selectedElement: AdSceneLayoutElement | null;
  onClearSelection: () => void;
  onEditCreative: (
    creative: AdSceneCreativePatch,
    visualizer?: Partial<AdSceneCreative['visualizer']>,
  ) => void;
  onReplaceLogo: (logoUrl: string | null) => void;
  onToggleLock: (field: keyof AdScene['locks']) => void;
};

export type AdFormatModule = {
  id: AdFormatId;
  label: string;
  description: string;
  status: 'active';
  EditTray: ComponentType<FormatEditTrayProps>;
};

export type PlannedAdFormat = {
  id: AdFormatId;
  label: string;
  description: string;
  status: 'planned';
};

export type AdFormatDefinition = AdFormatModule | PlannedAdFormat;
