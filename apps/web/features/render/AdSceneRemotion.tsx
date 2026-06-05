import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AdScene } from '@/features/create/scene';
import {
  AD_SCENE_FPS,
  getActiveCaptionText,
  getHeadlineScale,
  getVisualizerBarHeight,
  isStoredSceneAudio,
} from './adSceneRender';
import { getRemotionLayoutStyle } from './adSceneLayout';

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
  const headlineSize = (isVertical ? 94 : 74) * getHeadlineScale(scene.creative.headline);
  const contentTop = isVertical ? 150 : 118;
  const contentLeft = isVertical ? 80 : 120;
  const contentRight = isVertical ? 80 : 120;
  const contentBottom = isVertical ? 220 : 150;
  const contentWidth = width - contentLeft - contentRight;
  const contentHeight = height - contentTop - contentBottom;
  const contentBounds = { width: contentWidth, height: contentHeight };
  const avatarUrl = scene.brand.logoUrl || scene.brand.faviconUrl;
  const visualizerBarCount = scene.creative.visualizer.barCount ?? 21;

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
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 }}
            />
          ) : (
            scene.brand.name.slice(0, 2).toUpperCase()
          )}
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
          top: contentTop,
          left: contentLeft,
          width: contentWidth,
          height: contentHeight,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            ...getRemotionLayoutStyle(scene, 'brand', contentBounds),
            display: 'grid',
            placeItems: 'center',
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
            ...getRemotionLayoutStyle(scene, 'headline', contentBounds),
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            fontSize: headlineSize,
            lineHeight: 1.02,
            letterSpacing: 0,
            color: scene.creative.headlineColor || '#07111f',
            overflowWrap: 'break-word',
          }}
        >
          {scene.creative.headline}
        </div>
        <div
          style={{
            ...getRemotionLayoutStyle(scene, 'visualizer', contentBounds),
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {Array.from({ length: visualizerBarCount }).map((_, index) => (
            <div
              key={index}
              style={{
                width: 22,
                height: getVisualizerBarHeight(index, visualizerBarCount, currentTimeMs, 146),
                borderRadius: 999,
                backgroundColor: scene.creative.visualizer.color,
              }}
            />
          ))}
        </div>
        {!hasAudio ? (
          <div
            style={{
              ...getRemotionLayoutStyle(scene, 'caption', contentBounds),
              display: 'grid',
              placeItems: 'center',
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
              ...getRemotionLayoutStyle(scene, 'caption', contentBounds),
              display: 'grid',
              placeItems: 'center',
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
