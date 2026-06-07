import { BookmarkPlus, Download, Loader2, Play, Square } from 'lucide-react';
import type { AudioAnalysisData } from '../../../lib/audio-analysis';
import type { AdStyleArchetype } from '../../../lib/style-archetypes';
import { CanvasEditor } from '../../../components/CanvasEditor';
import { PlatformFrame, type PlatformType } from '../../../components/PlatformFrame';
import type { IntroDuration } from '../createSavedDesigns';

type CreatePreviewStageProps = {
  platform: PlatformType;
  platformTheme: 'light' | 'dark';
  brandName: string;
  brandLogo: string | null;
  caption: string;
  autoCta: string;
  bgColor: string;
  bgMedia: { url: string; type: string } | null;
  bgShadow: boolean;
  bgShadowOpacity: number;
  introImage: string | null;
  introDuration: IntroDuration;
  introFeedCropY: number;
  introImageAspect: number | null;
  previewDurationCap: number | null;
  audioUrl: string | null;
  previewAudioAnalysis: AudioAnalysisData | null;
  isTranscribing: boolean;
  accentColor: string;
  playing: boolean;
  spaceRemixCueVisible: boolean;
  rendering: boolean;
  exportLaunchAnimation: boolean;
  hasPlayableCreateAudio: boolean;
  onPlaybackComplete: () => void;
  onRefreshBackgroundColor: () => void;
  onApplyStyleArchetype: (archetype: AdStyleArchetype) => void;
  onDownloadVideo: () => void;
  onTogglePlayback: () => void;
  onSaveDesign: () => void;
  onPlatformChange: (platform: PlatformType) => void;
};

export const CreatePreviewStage = ({
  platform,
  platformTheme,
  brandName,
  brandLogo,
  caption,
  autoCta,
  bgColor,
  bgMedia,
  bgShadow,
  bgShadowOpacity,
  introImage,
  introDuration,
  introFeedCropY,
  introImageAspect,
  previewDurationCap,
  audioUrl,
  previewAudioAnalysis,
  isTranscribing,
  accentColor,
  playing,
  spaceRemixCueVisible,
  rendering,
  exportLaunchAnimation,
  hasPlayableCreateAudio,
  onPlaybackComplete,
  onRefreshBackgroundColor,
  onApplyStyleArchetype,
  onDownloadVideo,
  onTogglePlayback,
  onSaveDesign,
  onPlatformChange,
}: CreatePreviewStageProps) => (
  <div className="wiggly-studio flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-5">
    <div className={`wiggly-stage-card relative w-full ${platform === 'youtube' ? 'max-w-[640px]' : 'max-w-[420px]'}`}>
      <PlatformFrame
        platform={platform}
        theme={platformTheme}
        brandName={brandName}
        brandLogo={brandLogo}
        caption={caption}
        metaCta={autoCta}
      >
        <CanvasEditor
          platform={platform}
          backgroundColor={bgColor}
          bgMedia={bgMedia}
          bgShadow={bgShadow}
          bgShadowOpacity={bgShadowOpacity}
          introImage={introImage}
          introDuration={introDuration}
          introFeedCropY={introFeedCropY}
          introImageAspect={introImageAspect}
          previewDurationCap={previewDurationCap}
          audioUrl={audioUrl}
          audioAnalysis={previewAudioAnalysis}
          captionsLoading={isTranscribing}
          accentColor={accentColor}
          playing={playing}
          onPlaybackComplete={onPlaybackComplete}
          onRefreshBackgroundColor={onRefreshBackgroundColor}
          onApplyStyleArchetype={onApplyStyleArchetype}
        />
      </PlatformFrame>
    </div>

    <div className="wiggly-toolbar mt-4 flex flex-col items-center gap-2">
      <div
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black shadow-sm transition-all duration-500 ${
          spaceRemixCueVisible
            ? 'translate-y-0 border-indigo-100 bg-white text-slate-900 opacity-100'
            : 'pointer-events-none -translate-y-1 border-transparent bg-white/0 text-slate-400 opacity-0'
        }`}
        aria-hidden={!spaceRemixCueVisible}
      >
        <span className="rounded-md bg-slate-950 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">Space</span>
        <span>remix the ad</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={onDownloadVideo}
          disabled={rendering}
          data-tour="download-button"
          className={`wiggly-primary-action flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${exportLaunchAnimation ? 'wiggly-primary-action-launching' : ''}`}
        >
          {rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {rendering ? 'Making Video' : 'Download Video'}
        </button>
        <button
          onClick={onTogglePlayback}
          disabled={!hasPlayableCreateAudio}
          data-tour="play-button"
          className={`wiggly-secondary-action flex items-center gap-2 self-start px-4 py-2 text-sm font-semibold ${
            !hasPlayableCreateAudio
              ? 'cursor-not-allowed opacity-45'
              : ''
          }`}
        >
          {playing ? (
            <><Square className="w-4 h-4 text-red-400" /> Stop</>
          ) : (
            <><Play className="w-4 h-4 fill-current text-indigo-500" /> Play</>
          )}
        </button>
        <button
          type="button"
          onClick={onSaveDesign}
          className="wiggly-secondary-action flex items-center gap-2 self-start px-4 py-2 text-sm font-semibold"
        >
          <BookmarkPlus className="h-4 w-4 text-indigo-500" />
          Save Design
        </button>
        <label className="wiggly-secondary-action flex items-center gap-2 self-start px-3 py-2 text-sm font-semibold">
          <span className="text-slate-500">Preview</span>
          <select
            value={platform}
            onChange={(event) => onPlatformChange(event.target.value as PlatformType)}
            className="bg-transparent text-sm font-bold text-slate-900 outline-none"
            aria-label="Choose preview"
          >
            <option value="facebook-feed">FB Feed</option>
            <option value="instagram-feed">IG Feed</option>
            <option value="reels">Reels</option>
            <option value="stories">Stories</option>
            <option value="youtube">YouTube</option>
          </select>
        </label>
      </div>
    </div>
  </div>
);
