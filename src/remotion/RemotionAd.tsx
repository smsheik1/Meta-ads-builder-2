import React from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, Img, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion';
import { AdRenderSurface } from '../components/AdRenderSurface';
import type { ExportSnapshot } from '../lib/export-snapshot';

type RemotionAdProps = {
  snapshot: ExportSnapshot;
  width: number;
  height: number;
  durationSeconds: number;
  audioLevels?: number[];
  audioBands?: number[][];
};
const RemotionImage = ({ src, alt = '', className, style }: { src: string; alt?: string; className?: string; style?: React.CSSProperties }) => (
  <Img src={src} alt={alt} className={className} style={style} />
);

const RemotionVideo = ({ src, style }: { src: string; style?: React.CSSProperties }) => (
  <OffthreadVideo src={src} muted style={style} />
);

const BlockingIntroImage = ({ src, style }: { src: string; style?: React.CSSProperties }) => {
  const [handle] = React.useState(() => delayRender('Loading intro image for frame zero', { timeoutInMilliseconds: 30000 }));

  React.useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };

    const image = new Image();
    image.onload = () => {
      const decodePromise = image.decode ? image.decode() : Promise.resolve();
      decodePromise.then(finish).catch(finish);
    };
    image.onerror = finish;
    image.src = src;

    return finish;
  }, [handle, src]);

  return <img src={src} decoding="sync" style={style} alt="" />;
};

export const RemotionAd = ({ snapshot, width, height, audioLevels, audioBands }: RemotionAdProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeSeconds = frame / fps;

  return (
    <AbsoluteFill style={{ width, height, overflow: 'hidden', background: snapshot.settings.bgColor }}>
      <AdRenderSurface
        snapshot={snapshot}
        width={width}
        height={height}
        timeSeconds={timeSeconds}
        audioLevels={audioLevels}
        audioBands={audioBands}
        ImageComponent={RemotionImage}
        VideoComponent={RemotionVideo}
        IntroImageComponent={BlockingIntroImage}
      />
      {snapshot.settings.audioUrl && <Audio src={snapshot.settings.audioUrl} />}
    </AbsoluteFill>
  );
};
