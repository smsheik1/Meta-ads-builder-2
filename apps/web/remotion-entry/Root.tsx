import { Composition } from 'remotion';
import { ogToolScene } from '@/features/create/fixtures';
import { AD_SCENE_FPS, AD_SCENE_RENDER_SPECS, DEFAULT_SCENE_DURATION_MS } from '@/features/render/adSceneRender';
import { AdSceneRemotion, type AdSceneRemotionProps } from '@/features/render/AdSceneRemotion';

const defaultProps = {
  scene: ogToolScene,
} satisfies AdSceneRemotionProps;

const renderCompositions = Array.from(
  new Map(Object.values(AD_SCENE_RENDER_SPECS).map((spec) => [spec.compositionId, spec])).values(),
);

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="AdSceneFixture"
        component={AdSceneRemotion}
        durationInFrames={Math.ceil((DEFAULT_SCENE_DURATION_MS / 1000) * AD_SCENE_FPS)}
        fps={AD_SCENE_FPS}
        width={AD_SCENE_RENDER_SPECS['instagram-feed'].width}
        height={AD_SCENE_RENDER_SPECS['instagram-feed'].height}
        defaultProps={defaultProps}
      />
      {renderCompositions.map((spec) => (
        <Composition
          key={spec.compositionId}
          id={spec.compositionId}
          component={AdSceneRemotion}
          durationInFrames={Math.ceil((DEFAULT_SCENE_DURATION_MS / 1000) * AD_SCENE_FPS)}
          fps={AD_SCENE_FPS}
          width={spec.width}
          height={spec.height}
          defaultProps={defaultProps}
        />
      ))}
    </>
  );
}
