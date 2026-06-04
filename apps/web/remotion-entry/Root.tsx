import { Composition } from 'remotion';
import { ogToolScene } from '@/features/create/fixtures';
import { AdSceneRemotion, type AdSceneRemotionProps } from '@/features/render/AdSceneRemotion';

const defaultProps = {
  scene: ogToolScene,
} satisfies AdSceneRemotionProps;

export function RemotionRoot() {
  return (
    <Composition
      id="AdSceneFixture"
      component={AdSceneRemotion}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={defaultProps}
    />
  );
}
