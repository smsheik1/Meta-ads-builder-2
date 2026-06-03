import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PlatformFrame, type PlatformType } from '../components/PlatformFrame';
import type { SharePageRecord } from '../lib/share-pages';

const SHARE_PLATFORM_VALUES: PlatformType[] = ['facebook-feed', 'instagram-feed', 'reels', 'stories', 'youtube', 'vertical', 'feed'];

const getSharePlatformFromSearch = () => {
  if (typeof window === 'undefined') return null;
  const platformFromSearch = new URLSearchParams(window.location.search).get('p');
  if (!platformFromSearch) return null;
  return SHARE_PLATFORM_VALUES.includes(platformFromSearch as PlatformType) ? (platformFromSearch as PlatformType) : null;
};

const getShareTextFromSearch = (key: string) => {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key)?.trim() || '';
};

const normalizeShareUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return url.toString();
  } catch {
    return '';
  }
};

const inferSharePlatformFromVideo = (width: number, height: number): PlatformType | null => {
  if (!width || !height) return null;
  const aspectRatio = width / height;
  if (aspectRatio > 1.2) return 'youtube';
  if (aspectRatio < 0.7) return 'reels';
  return 'instagram-feed';
};

const getBrandInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'AD';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

export const ShareAdPage = ({
  record,
  loading,
  onOpenBuilder,
}: {
  record: SharePageRecord | null;
  loading: boolean;
  onOpenBuilder: () => void;
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [videoHasSound, setVideoHasSound] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [inferredSharePlatform, setInferredSharePlatform] = useState<PlatformType | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setVideoReady(false);
    setVideoHasSound(false);
    setVideoPlaying(false);
    setInferredSharePlatform(null);
    if (!record) {
      setVideoUrl('');
      return;
    }
    if (record.videoUrl) {
      setVideoUrl(record.videoUrl);
      return;
    }
    if (!record.videoBlob || record.videoBlob.size === 0) {
      setVideoUrl('');
      return;
    }
    const nextUrl = URL.createObjectURL(record.videoBlob);
    setVideoUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [record]);

  const playWithSound = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setVideoHasSound(true);
    try {
      await video.play();
      setVideoPlaying(true);
    } catch {
      // Browser policies may still block playback; the native click target remains.
    }
  };

  const stopShareVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    video.muted = true;
    setVideoPlaying(false);
    setVideoHasSound(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F4EA] px-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm font-black text-slate-700 shadow-xl">Loading Wiggly ad...</div>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F4EA] px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl">
          <p className="text-2xl font-black text-slate-950">This ad link is not on this device.</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">This first share-page prototype stores videos locally. Cloud links come next.</p>
          <button type="button" onClick={onOpenBuilder} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Open Wiggly
          </button>
        </div>
      </main>
    );
  }

  const sharePlatform = getSharePlatformFromSearch() || record.platform || inferredSharePlatform || 'instagram-feed';
  const shareCtaUrl = normalizeShareUrl(getShareTextFromSearch('u') || record.ctaUrl || '');
  const shareBrandLogo = getShareTextFromSearch('l') || record.brandLogo || '';
  const shareBrandName = record.businessName || record.brandName || 'Wiggly';
  const shareBrandInitials = getBrandInitials(shareBrandName);
  const shareHasAudio = getShareTextFromSearch('a') !== '0';

  return (
    <main className="min-h-screen bg-[#F7F4EA] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(280px,420px)_minmax(320px,1fr)] lg:items-center lg:justify-center">
        <section className="mx-auto w-full max-w-[420px]">
          <PlatformFrame
            platform={sharePlatform}
            theme="dark"
            brandName={shareBrandName}
            brandLogo={shareBrandLogo || null}
            caption={record.subhead || record.headline}
            metaCta={record.ctaText || 'Learn More'}
            metaCtaUrl={shareCtaUrl}
            overlayControls={videoUrl && videoReady && shareHasAudio ? (
              <>
                {!videoHasSound && (
                  <button
                    type="button"
                    onClick={playWithSound}
                    className="pointer-events-auto absolute inset-x-5 bottom-20 flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800"
                  >
                    Play with sound
                  </button>
                )}
                {videoHasSound && (
                  <button
                    type="button"
                    onClick={stopShareVideo}
                    className="pointer-events-auto absolute bottom-20 right-5 flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800"
                  >
                    {videoPlaying ? 'Stop' : 'Replay'}
                  </button>
                )}
              </>
            ) : null}
          >
            <div className="relative h-full w-full bg-[#FAFAF7]">
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    autoPlay
                    muted={!videoHasSound}
                    loop
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(event) => setInferredSharePlatform(inferSharePlatformFromVideo(event.currentTarget.videoWidth, event.currentTarget.videoHeight))}
                    onLoadedData={() => setVideoReady(true)}
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                    className={`h-full w-full bg-[#FAFAF7] object-contain transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {!videoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAF7] text-sm font-black text-slate-500">Loading video...</div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-black text-slate-500">Video unavailable</div>
              )}
            </div>
          </PlatformFrame>
        </section>

        <section className="mx-auto w-full max-w-[440px] space-y-5">
          <div
            className="overflow-hidden rounded-[2rem] border border-slate-200 p-6 shadow-xl shadow-slate-950/10"
            style={{ backgroundColor: record.backgroundColor || '#FAFAF7' }}
          >
            <div className="mb-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {shareBrandLogo ? (
                  <img src={shareBrandLogo} alt="" className="h-9 w-9 rounded-xl bg-white object-contain p-1.5 shadow-sm" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-[11px] font-black text-white shadow-sm">
                    {shareBrandInitials}
                  </span>
                )}
                <div>
                  <p className="text-sm font-black text-slate-950">{shareBrandName}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Wiggly Ad Page</p>
                </div>
              </div>
              <span className="h-3 w-16 rounded-full" style={{ backgroundColor: record.accentColor || '#00D6B8' }} />
            </div>
            <h1 className="text-3xl font-black leading-[0.98] tracking-normal text-slate-950 sm:text-4xl">{record.headline}</h1>
            {record.subhead && <p className="mt-5 text-base font-semibold leading-7 text-slate-600">{record.subhead}</p>}
          </div>

          {shareCtaUrl ? (
            <a
              href={shareCtaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800"
            >
              {record.ctaText || 'Learn More'}
              <ExternalLink className="h-5 w-5" />
            </a>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center text-sm font-black text-slate-500">
              {record.ctaText || 'Learn More'}
            </div>
          )}

          <a
            href="/create"
            className="text-sm font-black text-slate-500 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
          >
            Made with Wiggly
          </a>
        </section>
      </div>
    </main>
  );
};
