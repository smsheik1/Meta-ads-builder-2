import React from 'react';
import { Composition } from 'remotion';
import { EXPORT_FPS, type ExportSnapshot, type RenderSnapshot } from '../lib/export-snapshot';
import { RemotionAd } from './RemotionAd';

type RemotionRootProps = {
  snapshot: RenderSnapshot;
  width: number;
  height: number;
  durationSeconds: number;
  audioLevels?: number[];
  audioBands?: number[][];
};

const defaultSnapshot: ExportSnapshot = {
  id: 'default',
  name: 'Default',
  elements: [],
  captions: [],
  settings: {
    visualizerColor: '#00ffcc',
    accentColor: '#6554FF',
    bgColor: '#ffffff',
    platform: 'instagram-feed',
    bgMedia: null,
    bgShadow: false,
    bgShadowOpacity: 0,
    introImage: null,
    introDuration: 0,
    introFeedCropY: 50,
    audioUrl: null,
    renderDurationCap: 30,
  },
};

export const RemotionRoot = ({
  snapshot = defaultSnapshot,
  width = 1080,
  height = 1350,
  durationSeconds = 30,
  audioLevels,
  audioBands,
}: Partial<RemotionRootProps>) => {
  return (
    <Composition
      id="AdRender"
      component={RemotionAd}
      fps={EXPORT_FPS}
      width={width}
      height={height}
      durationInFrames={Math.max(1, Math.ceil(durationSeconds * EXPORT_FPS))}
      defaultProps={{
        snapshot,
        width,
        height,
        durationSeconds,
        audioLevels,
        audioBands,
      }}
    />
  );
};
