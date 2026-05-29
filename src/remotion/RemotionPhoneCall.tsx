import React from 'react';
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import type { PhoneCallSnapshot } from '../lib/export-snapshot';
import { PhoneCallScene, PHONE_CALL_SCENE_HEIGHT, PHONE_CALL_SCENE_WIDTH } from '../components/PhoneCallScene';

type RemotionPhoneCallProps = {
  snapshot: PhoneCallSnapshot;
  width: number;
  height: number;
};

export const RemotionPhoneCall = ({ snapshot, width, height }: RemotionPhoneCallProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const ringDuration = snapshot.settings.ringDurationSeconds;
  const ringFrames = Math.round(ringDuration * fps);

  return (
    <AbsoluteFill style={{ width, height, overflow: 'hidden', background: snapshot.settings.backgroundColor }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#f8fafc,#dbeafe)' }} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: PHONE_CALL_SCENE_WIDTH,
          height: PHONE_CALL_SCENE_HEIGHT,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <PhoneCallScene
          phoneNumber={snapshot.settings.phoneNumber}
          seconds={seconds}
          ringDurationSeconds={ringDuration}
        />
      </div>

      {snapshot.settings.ringAudioUrl && (
        <Sequence from={0} durationInFrames={ringFrames}>
          <Audio src={snapshot.settings.ringAudioUrl} />
        </Sequence>
      )}
      {snapshot.settings.audioUrl && (
        <Sequence from={ringFrames}>
          <Audio src={snapshot.settings.audioUrl} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
