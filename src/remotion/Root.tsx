import React from 'react';
import { Composition } from 'remotion';
import { EXPORT_FPS, isPhoneCallSnapshot, PHONE_CALL_EXPORT_DIMENSIONS, type ExportSnapshot, type PhoneCallSnapshot, type RenderSnapshot } from '../lib/export-snapshot';
import { RemotionAd } from './RemotionAd';
import { RemotionPhoneCall } from './RemotionPhoneCall';

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

const defaultPhoneCallSnapshot: PhoneCallSnapshot = {
  kind: 'phone-call',
  id: 'default-phone-call',
  name: 'Phone Call',
  durationSeconds: 12,
  settings: {
    phoneNumber: '5551234567',
    audioUrl: null,
    ringAudioUrl: null,
    ringDurationSeconds: 2,
    backgroundColor: '#f8fafc',
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
  const phoneSnapshot = isPhoneCallSnapshot(snapshot) ? snapshot : defaultPhoneCallSnapshot;
  const adSnapshot = isPhoneCallSnapshot(snapshot) ? defaultSnapshot : snapshot;
  const phoneWidth = isPhoneCallSnapshot(snapshot) ? width : PHONE_CALL_EXPORT_DIMENSIONS.width;
  const phoneHeight = isPhoneCallSnapshot(snapshot) ? height : PHONE_CALL_EXPORT_DIMENSIONS.height;

  return (
    <>
      <Composition
        id="AdRender"
        component={RemotionAd}
        fps={EXPORT_FPS}
        width={width}
        height={height}
        durationInFrames={Math.max(1, Math.ceil(durationSeconds * EXPORT_FPS))}
        defaultProps={{
          snapshot: adSnapshot,
          width,
          height,
          durationSeconds,
          audioLevels,
          audioBands,
        }}
      />
      <Composition
        id="PhoneCallRender"
        component={RemotionPhoneCall}
        fps={EXPORT_FPS}
        width={phoneWidth}
        height={phoneHeight}
        durationInFrames={Math.max(1, Math.ceil(durationSeconds * EXPORT_FPS))}
        defaultProps={{
          snapshot: phoneSnapshot,
          width: phoneWidth,
          height: phoneHeight,
        }}
      />
    </>
  );
};
