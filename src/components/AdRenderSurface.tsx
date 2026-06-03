import React from 'react';
import type { AdElement, Caption } from '../store';
import type { ExportSnapshot } from '../lib/export-snapshot';
import { getActiveCaption, getDefaultLayoutOffsetX, getDefaultLayoutScaleY, getEditorDimensions, getPlatformElementFrame } from '../lib/export-snapshot';
import { stripRichText } from '../lib/rich-text';
import { getVisualizerBarCount, getVisualizerBars, normalizeVisualizerType } from '../lib/visualizer';
import type { RerollFlashPayload } from './CreateFlow';

const CAPTION_SPEAKER_COLORS: Record<number, string> = {
  1: '#00D6B8',
  2: '#6554FF',
};

type RenderImageProps = {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

type RenderVideoProps = {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  playsInline?: boolean;
};

type ElementBox = ReturnType<typeof getElementBox>;

export type AdRenderSurfaceProps = {
  snapshot: ExportSnapshot;
  width: number;
  height: number;
  timeSeconds: number;
  audioLevels?: number[];
  audioBands?: number[][];
  rerollFlash?: RerollFlashPayload | null;
  ImageComponent?: React.ComponentType<RenderImageProps>;
  VideoComponent?: React.ComponentType<RenderVideoProps>;
  IntroImageComponent?: React.ComponentType<RenderImageProps>;
};

const DefaultImage = ({ src, alt = '', className, style }: RenderImageProps) => (
  <img src={src} alt={alt} className={className} style={style} draggable={false} />
);

const DefaultVideo = ({ src, className, style, muted = true, loop = true, autoPlay = true, playsInline = true }: RenderVideoProps) => (
  <video src={src} className={className} style={style} muted={muted} loop={loop} autoPlay={autoPlay} playsInline={playsInline} />
);

const isFeedPlatform = (platform: ExportSnapshot['settings']['platform']) => (
  platform === 'facebook-feed' || platform === 'instagram-feed' || platform === 'feed'
);

const mediaCoverStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

function getElementBox(element: AdElement, platform: ExportSnapshot['settings']['platform'], exportWidth: number) {
  const editorDimensions = getEditorDimensions(platform);
  const editorScale = exportWidth / editorDimensions.width;
  const canvasWidth = editorDimensions.width;
  const canvasHeight = editorDimensions.height;
  const frame = getPlatformElementFrame(element, platform);
  const rawWidth = frame.width;
  const rawHeight = frame.height;
  const offsetX = getDefaultLayoutOffsetX(platform);
  const scaleY = getDefaultLayoutScaleY(platform);
  const feedSafeSquareTop = isFeedPlatform(platform) ? Math.max(0, (canvasHeight - canvasWidth) / 2) : 0;
  const feedSafeSquareBottom = feedSafeSquareTop + canvasWidth;
  const y = isFeedPlatform(platform) && element.type === 'caption'
    ? Math.min(frame.y, feedSafeSquareBottom - rawHeight - 8)
    : frame.y;

  return {
    left: (frame.x + offsetX) * editorScale,
    top: y * scaleY * editorScale,
    width: rawWidth * editorScale,
    height: rawHeight * scaleY * editorScale,
    scale: editorScale,
  };
}

const textShadow = '0 3px 12px rgba(0,0,0,0.28)';

const estimateTextWidth = (text: string, fontSize: number, fontWeight: AdElement['fontWeight']) => {
  const weightMultiplier = Number(fontWeight || 400) >= 700 || `${fontWeight}`.toLowerCase().includes('bold') ? 1.06 : 1;
  const units = [...text].reduce((sum, char) => {
    if (char === ' ') return sum + 0.34;
    if ('.,:;!|'.includes(char)) return sum + 0.24;
    if ('ilI[]()/\\'.includes(char)) return sum + 0.34;
    if ('mwMW@#%&'.includes(char)) return sum + 0.9;
    if (/[A-Z]/.test(char)) return sum + 0.68;
    if (/[0-9]/.test(char)) return sum + 0.58;
    return sum + 0.54;
  }, 0);

  return units * fontSize * weightMultiplier;
};

const wrapTextForBox = (text: string, fontSize: number, maxWidth: number, fontWeight: AdElement['fontWeight']) => {
  const lines: string[] = [];
  text.split('\n').forEach((explicitLine) => {
    const words = explicitLine.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      return;
    }

    let line = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const candidate = `${line} ${words[index]}`;
      if (estimateTextWidth(candidate, fontSize, fontWeight) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = words[index];
      }
    }
    lines.push(line);
  });

  return lines;
};

const getFittedTextLayout = (element: AdElement, box: ElementBox) => {
  const content = stripRichText(element.content || '');
  const lineHeight = element.lineHeight || 1.12;
  const paddingX = element.backgroundColor ? 28 * box.scale : 8 * box.scale;
  const paddingY = element.backgroundColor ? 20 * box.scale : 4 * box.scale;
  const maxWidth = Math.max(20, box.width - paddingX);
  const maxHeight = Math.max(20, box.height - paddingY);
  let low = 8 * box.scale;
  let high = Math.max((element.fontSize || 16) * box.scale, 96 * box.scale);
  let bestSize = low;
  let bestLines = wrapTextForBox(content, low, maxWidth, element.fontWeight);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lines = wrapTextForBox(content, mid, maxWidth, element.fontWeight);
    const widest = lines.reduce((max, line) => Math.max(max, estimateTextWidth(line, mid, element.fontWeight)), 0);
    const height = lines.length * mid * lineHeight;

    if (widest <= maxWidth && height <= maxHeight) {
      bestSize = mid;
      bestLines = lines;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return { content, fontSize: bestSize, lines: bestLines, lineHeight };
};

const TextElement = ({ element, box }: { element: AdElement; box: ElementBox }) => {
  const layout = getFittedTextLayout(element, box);
  const content = stripRichText(element.content || '');
  const hasBackground = Boolean(element.backgroundColor);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        color: element.color || '#fff',
        fontFamily: element.fontFamily || 'Inter, sans-serif',
        fontSize: layout.fontSize,
        fontWeight: element.fontWeight || 'normal',
        fontStyle: element.fontStyle || 'normal',
        textDecoration: element.textDecoration || 'none',
        textAlign: element.textAlign || 'center',
        lineHeight: layout.lineHeight,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        background: hasBackground ? element.backgroundColor : undefined,
        borderRadius: hasBackground ? (element.borderRadius || 0) * box.scale : undefined,
        padding: hasBackground ? `${10 * box.scale}px ${14 * box.scale}px` : undefined,
        boxSizing: 'border-box',
        boxShadow: hasBackground ? `0 ${12 * box.scale}px ${30 * box.scale}px rgba(15,23,42,0.12)` : undefined,
      }}
    >
      {layout.lines.join('\n') || content}
    </div>
  );
};

const ButtonElement = ({ element, box }: { element: AdElement; box: ElementBox }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: (element.borderRadius || 8) * box.scale,
      background: element.backgroundColor || '#4f46e5',
      color: element.color || '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: element.fontFamily || 'Inter, sans-serif',
      fontSize: (element.fontSize || 18) * box.scale,
      fontWeight: element.fontWeight || 'bold',
      textTransform: 'uppercase',
      letterSpacing: 2,
    }}
  >
    {stripRichText(element.content || '')}
  </div>
);

const ImageElement = ({ element, ImageComponent }: { element: AdElement; ImageComponent: React.ComponentType<RenderImageProps> }) => (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: element.borderRadius || 0,
      mixBlendMode: element.mixBlendMode as React.CSSProperties['mixBlendMode'],
    }}
  >
    {element.imageUrl ? (
      <>
        <ImageComponent src={element.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {element.imageShadow && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(0, 0, 0, ${element.imageShadowOpacity ?? 0.42})`,
            }}
          />
        )}
      </>
    ) : null}
  </div>
);

const Waveform = ({
  element,
  box,
  frame,
  audioLevels,
  audioBands,
  currentSpeaker,
}: {
  element: AdElement;
  box: ElementBox;
  frame: number;
  audioLevels?: number[];
  audioBands?: number[][];
  currentSpeaker: number;
}) => {
  const type = normalizeVisualizerType(element.visualizerType);
  const count = getVisualizerBarCount(type, element.barCount);
  const color = element.barColor || '#00ffcc';
  const audioLevel = audioLevels?.length
    ? audioLevels[Math.min(audioLevels.length - 1, frame)] ?? 0
    : null;
  const frequencyBands = audioBands?.length
    ? audioBands[Math.min(audioBands.length - 1, frame)] ?? null
    : null;
  const bars = getVisualizerBars({
    type,
    count,
    frame,
    height: box.height,
    scale: box.scale,
    audioLevel,
    frequencyBands,
    currentSpeaker,
    splitSpeakers: element.visualizerSplitSpeakers,
    mirror: element.visualizerMirror,
    sensitivity: element.visualizerSensitivity ?? 1.5,
    heightScale: element.visualizerHeight ?? 0.9,
    baseline: element.visualizerBaseline ?? 4,
    gain: element.visualizerGain ?? 1,
    compression: element.visualizerCompression ?? 1,
    floor: element.visualizerFloor ?? 0,
    ceiling: element.visualizerCeiling ?? 1,
    curve: element.visualizerCurve ?? 'default',
    bandFocus: element.visualizerBandFocus ?? 'full',
    color,
  });

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: type === 'bars-bottom' ? 'flex-end' : 'center', gap: 4 * box.scale }}>
      {bars.map((bar, index) => {
        const halfCount = Math.floor(count / 2);
        const isLeftSpeakerSide = index < halfCount;
        return (
          <div
            key={index}
            style={{
              flex: 1,
              minWidth: type === 'waveform-strip' ? 2 : 4 * box.scale,
              height: bar.height,
              maxHeight: '100%',
              borderRadius: 999,
              background: element.visualizerSplitSpeakers && !isLeftSpeakerSide ? '#8b5cf6' : bar.color,
              opacity: bar.opacity,
            }}
          />
        );
      })}
    </div>
  );
};

const CaptionElement = ({ element, box, platform, captions, accentColor, timeSeconds }: { element: AdElement; box: ElementBox; platform: ExportSnapshot['settings']['platform']; captions: Caption[]; accentColor: string; timeSeconds: number }) => {
  const { caption, index } = getActiveCaption(captions, timeSeconds);
  if (!caption) return null;

  const hasTwoSpeakers = captions.some(activeCaption => activeCaption.speaker === 2);
  const speaker = hasTwoSpeakers ? caption.speaker : (index % 2) + 1;
  const captionColor = (speaker === 2 ? element.captionSpeaker2Color : element.captionSpeaker1Color) || CAPTION_SPEAKER_COLORS[speaker] || element.color || accentColor;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${16 * box.scale}px ${18 * box.scale}px`,
        color: captionColor,
        fontFamily: element.fontFamily || 'Inter, sans-serif',
        fontSize: (element.fontSize || (platform === 'youtube' ? 30 : 22)) * box.scale,
        fontWeight: element.fontWeight || 700,
        textAlign: 'center',
        lineHeight: 1.22,
        textShadow,
      }}
    >
      {caption.text}
    </div>
  );
};

export const AdRenderSurface = ({
  snapshot,
  width,
  height,
  timeSeconds,
  audioLevels,
  audioBands,
  rerollFlash = null,
  ImageComponent = DefaultImage,
  VideoComponent = DefaultVideo,
  IntroImageComponent = ImageComponent,
}: AdRenderSurfaceProps) => {
  const { settings } = snapshot;
  const frame = Math.max(0, Math.floor(timeSeconds * (snapshot.audioAnalysis?.fps || 60)));
  const activeAudioLevels = audioLevels || snapshot.audioAnalysis?.levels;
  const activeAudioBands = audioBands || snapshot.audioAnalysis?.bands;
  const sorted = [...snapshot.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const introFadeDuration = 0.65;
  const introOpacity = settings.introImage && settings.introDuration > 0 && timeSeconds < settings.introDuration + introFadeDuration
    ? timeSeconds < settings.introDuration ? 1 : 1 - ((timeSeconds - settings.introDuration) / introFadeDuration)
    : 0;
  const activeCaptions = snapshot.captions;
  const activeCaptionIndex = activeCaptions.findIndex(caption => timeSeconds >= caption.start && timeSeconds <= caption.end);
  const activeCaption = activeCaptionIndex >= 0 ? activeCaptions[activeCaptionIndex] : null;
  const hasTwoSpeakers = activeCaptions.some(caption => caption.speaker === 2);
  const currentSpeaker = activeCaption
    ? hasTwoSpeakers ? activeCaption.speaker : (activeCaptionIndex % 2) + 1
    : (Math.floor(timeSeconds / 1.5) % 2) + 1;

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: settings.bgColor }}>
      {settings.bgMedia?.url && settings.bgMedia.type === 'video' && (
        <VideoComponent src={settings.bgMedia.url} muted style={mediaCoverStyle} />
      )}
      {settings.bgMedia?.url && settings.bgMedia.type.startsWith('image') && (
        <ImageComponent src={settings.bgMedia.url} alt="" style={mediaCoverStyle} />
      )}
      {settings.bgMedia && settings.bgShadow && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${settings.bgShadowOpacity})` }} />
      )}

      {sorted.map((element) => {
        const box = getElementBox(element, settings.platform, width);
        const { scale: _renderScale, ...boxStyle } = box;
        const flashRole = element.componentRole && element.componentRole !== 'image' ? element.componentRole : null;
        const shouldFlash = Boolean(
          rerollFlash
            && flashRole
            && !element.locked
            && rerollFlash.roles.includes(flashRole)
        );
        return (
          <div
            key={element.id}
            className={shouldFlash && flashRole ? `wiggly-reroll-shine wiggly-reroll-shine-${flashRole}` : undefined}
            style={{
              position: 'absolute',
              ...boxStyle,
              transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
              transformOrigin: 'center',
            }}
          >
            {element.type === 'text' && <TextElement element={element} box={box} />}
            {element.type === 'button' && <ButtonElement element={element} box={box} />}
            {element.type === 'image' && <ImageElement element={element} ImageComponent={ImageComponent} />}
            {element.type === 'caption' && <CaptionElement element={element} box={box} platform={settings.platform} captions={snapshot.captions} accentColor={settings.accentColor} timeSeconds={timeSeconds} />}
            {element.type === 'visualizer' && <Waveform element={element} box={box} frame={frame} audioLevels={activeAudioLevels} audioBands={activeAudioBands} currentSpeaker={currentSpeaker} />}
          </div>
        );
      })}

      {settings.introImage && introOpacity > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: introOpacity, background: settings.bgColor }}>
          <IntroImageComponent src={settings.introImage} alt="" style={{ width: '100%', height: '100%', objectFit: isFeedPlatform(settings.platform) ? 'contain' : 'cover' }} />
        </div>
      )}
    </div>
  );
};
