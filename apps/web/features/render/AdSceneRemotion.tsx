import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AdScene } from '@/features/create/scene';
import {
  AD_SCENE_FPS,
  getActiveCaptionText,
  getVisualizerBarHeight,
  isStoredSceneAudio,
} from './adSceneRender';

export type AdSceneRemotionProps = {
  scene: AdScene;
};

export function AdSceneRemotion({ scene }: AdSceneRemotionProps) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const currentTimeMs = Math.round((frame / (fps || AD_SCENE_FPS)) * 1000);
  const hasAudio = isStoredSceneAudio(scene);
  const activeCaption = hasAudio ? getActiveCaptionText(scene.audio, currentTimeMs) : '';
  const isVertical = height > width;
  const headlineSize = isVertical ? 94 : 74;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.creative.backgroundColor,
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#07111f',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: isVertical ? 150 : 118,
          backgroundColor: '#000',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          padding: '0 52px',
          gap: 24,
        }}
      >
        {hasAudio && scene.audio.url && (
          <Audio src={scene.audio.url} />
        )}
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            background: '#fff',
            color: '#07111f',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            fontSize: 24,
          }}
        >
          {scene.brand.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 28, lineHeight: 1 }}>
            {scene.brand.name}
          </div>
          <div style={{ marginTop: 8, fontSize: 20, opacity: 0.72 }}>
            Sponsored
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: isVertical ? '150px 80px 220px' : '118px 120px 150px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          gap: isVertical ? 56 : 36,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: 0,
            textTransform: 'uppercase',
          }}
        >
          {scene.brand.name}
        </div>
        <div
          style={{
            maxWidth: isVertical ? 780 : 920,
            fontWeight: 900,
            fontSize: headlineSize,
            lineHeight: 1.02,
            letterSpacing: 0,
          }}
        >
          {scene.creative.headline}
        </div>
        <div
          style={{
            height: 170,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {Array.from({ length: 33 }).map((_, index) => (
            <div
              key={index}
              style={{
                width: 22,
                height: getVisualizerBarHeight(index, 33, currentTimeMs, 146),
                borderRadius: 999,
                backgroundColor: scene.creative.visualizer.color,
              }}
            />
          ))}
        </div>
        {!hasAudio ? (
          <div
            style={{
              borderRadius: 999,
              backgroundColor: '#fff',
              color: '#475569',
              padding: '24px 34px',
              fontWeight: 900,
              fontSize: 30,
              boxShadow: '0 28px 70px rgba(15, 23, 42, 0.14)',
            }}
          >
            Add audio for this ad
          </div>
        ) : activeCaption ? (
          <div
            style={{
              maxWidth: 760,
              color: '#475569',
              fontWeight: 900,
              fontSize: 34,
              lineHeight: 1.16,
            }}
          >
            {activeCaption}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}
