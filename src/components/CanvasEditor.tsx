import React, { useRef, useEffect, useState } from 'react';
import Moveable from 'react-moveable';
import Selecto from 'react-selecto';
import { useEditorStore, type AdElement } from '../store';
import gsap from 'gsap';
import { Image as ImageIcon, Lock, Unlock } from 'lucide-react';
import { getVisualizerBarCount, getVisualizerBars, normalizeVisualizerType } from '../lib/visualizer';
import { HeadlineSlot } from './HeadlineSlot';
import { AutoFitText } from './AutoFitText';
import { sanitizeRichText, stripRichText } from '../lib/rich-text';
import { isFeedPlatform, isVerticalPlatform, type PlatformType } from './PlatformFrame';
import { getActiveCaption, getDefaultLayoutOffsetX, getDefaultLayoutScaleY, getPlatformElementFrame } from '../lib/export-snapshot';
import { getRandomSeededHook } from '../lib/headline-pool';
import { getRandomAdStyleArchetype, pickRandom, type AdStyleArchetype } from '../lib/style-archetypes';
import { emitTutorialEvent } from './InteractiveTutorial';
import type { AudioAnalysisData } from '../lib/audio-analysis';
import { VOICE_VISUALIZER_PRESET } from '../lib/visualizer-presets';
import type { RerollFlashPayload, RerollFlashRole } from './CreateFlow';

const isEditableEventTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
};

const TransparentImage = ({ src, className, removeWhite }: { src: string, className: string, removeWhite?: boolean }) => {
  const [dataUrl, setDataUrl] = useState(src);

  useEffect(() => {
    let cancelled = false;
    if (!removeWhite) {
      setDataUrl(src);
      return () => {
        cancelled = true;
      };
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          // remove pure white or near white
          if (r > 240 && g > 240 && b > 240) {
            data[i+3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        if (!cancelled) setDataUrl(c.toDataURL('image/png'));
      } catch (e) {
        console.error('Failed to remove white background (CORS issue?)', e);
        if (!cancelled) setDataUrl(src);
      }
    };
    img.onerror = () => {
      if (!cancelled) setDataUrl(src);
    };
    img.src = src;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, removeWhite]);

  return <img src={dataUrl} className={className} draggable={false} alt="image layer" />;
};

interface CanvasEditorProps {
  platform: PlatformType;
  audioUrl: string | null;
  audioAnalysis?: AudioAnalysisData | null;
  captionsLoading?: boolean;
  playing: boolean;
  onPlaybackComplete?: () => void;
  accentColor: string;
  backgroundColor: string;
  bgMedia: {url: string, type: string} | null;
  bgShadow: boolean;
  bgShadowOpacity: number;
  introImage: string | null;
  introDuration: 0 | 1 | 2 | 3;
  introFeedCropY: number;
  introImageAspect: number | null;
  previewDurationCap: number | null;
  onRefreshBackgroundColor?: () => void;
  onApplyStyleArchetype?: (archetype: AdStyleArchetype) => void;
  rerollFlash?: RerollFlashPayload | null;
  readOnly?: boolean;
  disableSpaceReroll?: boolean;
  disableEmptySelectionSpaceReroll?: boolean;
}

const CAPTION_SPEAKER_COLORS: Record<number, string> = {
  1: '#00D6B8',
  2: '#6554FF',
};

const getIdleVisualizerHeight = (type: NonNullable<AdElement['visualizerType']>, index: number, total: number) => {
  if (type === 'bars-bottom') {
    return 26 + ((index * 17) % 46) + ((index % 3) * 4);
  }

  const center = (total - 1) / 2;
  const distance = Math.abs(index - center) / Math.max(center, 1);
  const centerWeightedHeight = type === 'waveform-strip'
    ? 24 + (1 - distance) * 58 + ((index % 3) * 7)
    : 22 + (1 - distance) * 58 + ((index % 5) * 3);

  return Math.min(92, centerWeightedHeight);
};

const SUBHEADS = [
  'AI answers the calls your team misses.',
  'Turn missed calls into booked patients.',
  'Your front desk, covered after hours.',
  'More booked appointments without more staff.',
  'Recover the calls that used to hit voicemail.',
];
const CTA_COPY = ['Book Demo', 'See It Live', 'Get Started', 'Try Wiggly', 'Watch Demo'];

const applyArchetypeToElement = (element: AdElement, archetype: AdStyleArchetype): AdElement => {
  if (element.locked) return element;

  if (element.type === 'visualizer') {
    return {
      ...element,
      styleArchetypeId: archetype.id,
      visualizerType: archetype.visualizerVariant.visualizerType,
      barColor: archetype.visualizerColor,
      barCount: archetype.visualizerVariant.barCount,
      visualizerSensitivity: archetype.visualizerVariant.sensitivity,
      visualizerHeight: archetype.visualizerVariant.height,
      ...VOICE_VISUALIZER_PRESET,
    };
  }

  if (element.type === 'text') {
    const isHeadline = element.componentRole === 'headline';
    return {
      ...element,
      styleArchetypeId: archetype.id,
      content: isHeadline ? getRandomSeededHook() : pickRandom(SUBHEADS, stripRichText(element.content || '')),
      color: isHeadline ? archetype.headlineColor : archetype.subheadlineColor,
      fontWeight: isHeadline ? archetype.headlineTreatment.fontWeight : pickRandom(['600', '700', '800'], String(element.fontWeight || '700')),
    };
  }

  if (element.type === 'caption') {
    return {
      ...element,
      styleArchetypeId: archetype.id,
      color: archetype.speaker1CaptionColor,
      captionSpeaker1Color: archetype.speaker1CaptionColor,
      captionSpeaker2Color: archetype.speaker2CaptionColor,
    };
  }

  if (element.type === 'button' && element.componentRole === 'cta') {
    return {
      ...element,
      styleArchetypeId: archetype.id,
      content: pickRandom(CTA_COPY, element.content),
      backgroundColor: archetype.ctaBackgroundColor,
      color: archetype.ctaTextColor,
    };
  }

  return element;
};

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ platform, audioUrl, audioAnalysis, captionsLoading = false, playing, onPlaybackComplete, accentColor, backgroundColor, bgMedia, bgShadow, bgShadowOpacity, introImage, introDuration, introFeedCropY, introImageAspect, previewDurationCap, onRefreshBackgroundColor, onApplyStyleArchetype, rerollFlash, readOnly = false, disableSpaceReroll = false, disableEmptySelectionSpaceReroll = false }) => {
  const { elements, selectedIds, selectElement, deselectAll, updateElement, commitHistory, showSafeZones, showRedGuides, captions } = useEditorStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const imageReplaceInputRef = useRef<HTMLInputElement>(null);
  const pendingImageReplaceIdRef = useRef<string | null>(null);
  const lockPulseTimeoutsRef = useRef<Record<string, number>>({});
  const feedPlatform = isFeedPlatform(platform);
  const verticalPlatform = isVerticalPlatform(platform);
  const layoutOffsetX = getDefaultLayoutOffsetX(platform);
  const layoutScaleY = getDefaultLayoutScaleY(platform);
  
  const [targets, setTargets] = useState<Array<HTMLElement | SVGElement>>([]);
  const [pulsingLockedIds, setPulsingLockedIds] = useState<Set<string>>(new Set());
  const [activeRerollFlash, setActiveRerollFlash] = useState<RerollFlashPayload | null>(null);

  const pulseLockedElements = (ids: string[]) => {
    if (ids.length === 0) return;
    setPulsingLockedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
    ids.forEach((id) => {
      if (lockPulseTimeoutsRef.current[id]) {
        window.clearTimeout(lockPulseTimeoutsRef.current[id]);
      }
      lockPulseTimeoutsRef.current[id] = window.setTimeout(() => {
        setPulsingLockedIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        delete lockPulseTimeoutsRef.current[id];
      }, 650);
    });
  };

  useEffect(() => () => {
    Object.values(lockPulseTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId as number));
  }, []);

  useEffect(() => {
    if (!rerollFlash) return;
    let timeoutId: number | undefined;
    let frameId: number | undefined;
    setActiveRerollFlash(null);
    frameId = window.requestAnimationFrame(() => {
      setActiveRerollFlash(rerollFlash);
      timeoutId = window.setTimeout(() => setActiveRerollFlash(null), 680);
    });
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [rerollFlash]);

  // Sync targets with selectedIds
  useEffect(() => {
    const newTargets = selectedIds.map(id => document.getElementById(`el-${id}`)).filter(Boolean) as HTMLElement[];
    setTargets(newTargets);
  }, [selectedIds, elements.length]); // depend on elements.length to re-attach when elements are added/removed

  // Keyboard shortcuts for z-index, undo/redo, nudging
  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const usesShortcutModifier = e.metaKey || e.ctrlKey;
      const isEditableTarget = isEditableEventTarget(e.target) || isEditableEventTarget(document.activeElement);

      if (usesShortcutModifier && key === 'z' && !isEditableTarget) {
        e.preventDefault();
        if (e.shiftKey) {
          useEditorStore.getState().redo();
        } else {
          useEditorStore.getState().undo();
        }
        return;
      }

      if (usesShortcutModifier && key === 'y' && !isEditableTarget) {
        e.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      // Ignore layout shortcuts while typing in inputs or editing text directly.
      if (isEditableTarget) {
        return;
      }

      if (e.code === 'Space' && !usesShortcutModifier && !disableSpaceReroll) {
        e.preventDefault();
        const state = useEditorStore.getState();
        const liveSelectedIds = state.selectedIds.filter(id => state.elements.some(element => element.id === id));
        const selectedSet = new Set(liveSelectedIds);
        const selectedElements = state.elements.filter(element => selectedSet.has(element.id));
        const shouldRerollEverything = selectedElements.length === 0;
        if (shouldRerollEverything && disableEmptySelectionSpaceReroll) return;
        const lockedSelectedIds = selectedElements.filter(element => element.locked).map(element => element.id);
        const rerollableSelectedIds = selectedElements.filter(element => !element.locked).map(element => element.id);

        if (!shouldRerollEverything && rerollableSelectedIds.length === 0) {
          pulseLockedElements(lockedSelectedIds);
          return;
        }

        const selectedRole = shouldRerollEverything ? undefined : selectedElements[0]?.componentRole;
        const currentArchetypeId = state.elements.find(element => element.styleArchetypeId)?.styleArchetypeId;
        const archetype = getRandomAdStyleArchetype(currentArchetypeId);
        let changed = false;
        const changedRoles = new Set<RerollFlashRole>();
        const nextElements = state.elements.map((element) => {
          if (!shouldRerollEverything && !rerollableSelectedIds.includes(element.id)) return element;
          const nextElement = applyArchetypeToElement(element, archetype);
          if (nextElement !== element) {
            changed = true;
            if (element.componentRole && element.componentRole !== 'image') changedRoles.add(element.componentRole);
          }
          return nextElement;
        });
        if (!changed) return;
        if (shouldRerollEverything) {
          onApplyStyleArchetype?.(archetype);
        }
        state.setElements(nextElements);
        state.commitHistory();
        if (changedRoles.size > 0) {
          setActiveRerollFlash({
            key: `canvas-${Date.now()}`,
            roles: Array.from(changedRoles),
          });
        }
        emitTutorialEvent({ type: 'space-reroll', role: selectedRole });
        return;
      }
      
      // Z-Order: Cmd + ] or Cmd + [
      if (usesShortcutModifier) {
        if (e.key === ']') {
          if (selectedIds.length === 1) useEditorStore.getState().bringForward(selectedIds[0]);
          e.preventDefault();
          return;
        }
        if (e.key === '[') {
          if (selectedIds.length === 1) useEditorStore.getState().sendBackward(selectedIds[0]);
          e.preventDefault();
          return;
        }
      }

      // Nudging with arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        let dx = 0; let dy = 0;
        if (e.key === 'ArrowUp') dy = -amount;
        if (e.key === 'ArrowDown') dy = amount;
        if (e.key === 'ArrowLeft') dx = -amount;
        if (e.key === 'ArrowRight') dx = amount;
        
        selectedIds.forEach(id => {
          const el = useEditorStore.getState().elements.find(el => el.id === id);
          if (el) {
            updateElement(id, { x: el.x + dx, y: el.y + dy });
          }
        });
        commitHistory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, onApplyStyleArchetype, readOnly, disableSpaceReroll, disableEmptySelectionSpaceReroll]);

  // Audio / Visualizer logic
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const reqAnimRef = useRef<number | null>(null);
  const barsRef = useRef<{ [id: string]: (HTMLDivElement | null)[] }>({});

  const [currentCaption, setCurrentCaption] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRef = useRef<HTMLDivElement | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);

  useEffect(() => {
    if (!editingId) return;
    requestAnimationFrame(() => {
      const editor = editingRef.current;
      if (!editor) return;
      const element = useEditorStore.getState().elements.find(el => el.id === editingId);
      editor.innerHTML = sanitizeRichText(element?.content || '');
      if (element) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const copy = stripRichText(element.content || '');
          const width = Number(element.width) - 8;
          const height = Number(element.height) - 4;
          const lineHeight = element.lineHeight || 1.12;
          const fontFamily = element.fontFamily || 'Inter, sans-serif';
          const fontWeight = element.fontWeight || '700';
          const fontStyle = element.fontStyle || 'normal';
          const wrapLines = (size: number) => {
            ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
            const lines: string[] = [];
            copy.split('\n').forEach((explicitLine) => {
              const words = explicitLine.trim().split(/\s+/).filter(Boolean);
              if (words.length === 0) {
                lines.push('');
                return;
              }
              let line = words[0];
              for (let i = 1; i < words.length; i++) {
                const candidate = `${line} ${words[i]}`;
                if (ctx.measureText(candidate).width <= width) line = candidate;
                else {
                  lines.push(line);
                  line = words[i];
                }
              }
              lines.push(line);
            });
            const widest = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
            return { widest, height: lines.length * size * lineHeight };
          };
          let low = 8;
          let high = 96;
          let best = low;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const measurement = wrapLines(mid);
            if (measurement.widest <= width && measurement.height <= height) {
              best = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
          editor.style.fontSize = `${best}px`;
        }
      }
      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, [editingId]);

  useEffect(() => {
    if (!audioUrl) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; 
    }

    if (audioRef.current && !sourceRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current!);
      analyserRef.current!.connect(audioContextRef.current.destination);
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    if (playing) {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      animateVisualizer();
    } else {
      audioRef.current.pause();
      setPlaybackTime(0);
      setCurrentCaption(null);
      setCurrentSpeaker(1);
      if (reqAnimRef.current) {
        cancelAnimationFrame(reqAnimRef.current);
      }
      Object.keys(barsRef.current).forEach((vId) => {
        const element = useEditorStore.getState().elements.find((item) => item.id === vId);
        const type = normalizeVisualizerType(element?.visualizerType);
        const total = getVisualizerBarCount(type, element?.barCount);
        barsRef.current[vId].forEach(bar => {
          if (!bar) return;
          if (bar instanceof HTMLCanvasElement) {
            bar.style.height = '';
            bar.style.opacity = '1';
            const ctx = bar.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, bar.width, bar.height);
            }
            return;
          }
          const index = Number(bar.dataset.barIndex || 0);
          gsap.killTweensOf(bar);
          bar.style.opacity = '';
          bar.style.height = `${getIdleVisualizerHeight(type, index, total)}%`;
        });
      });
    }

    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [playing]);

  const animateVisualizer = () => {
    if (!playing) return;
    
    const bufferLength = analyserRef.current?.frequencyBinCount ?? 0;
    const dataArray = new Uint8Array(bufferLength);
    
    const loop = () => {
      const state = useEditorStore.getState();
      
      const currentTime = audioRef.current?.currentTime || 0;
      const analysisFrame = audioAnalysis?.levels?.length
        ? Math.min(audioAnalysis.levels.length - 1, Math.max(0, Math.floor(currentTime * audioAnalysis.fps)))
        : null;
      const analysisLevel = analysisFrame !== null ? audioAnalysis?.levels[analysisFrame] ?? null : null;
      const analysisBands = analysisFrame !== null ? audioAnalysis?.bands?.[analysisFrame] ?? null : null;
      const frameIndex = analysisFrame ?? Math.floor(currentTime * 60);
      setPlaybackTime(currentTime);
      if (previewDurationCap && currentTime >= previewDurationCap) {
        audioRef.current?.pause();
        onPlaybackComplete?.();
        return;
      }
      const { caption: activeCaption, index: activeCaptionIndex } = getActiveCaption(state.captions, currentTime);
      let loopSpeaker: number | null = null;
      
      if (activeCaption) {
        setCurrentCaption(activeCaption.text);
        loopSpeaker = (activeCaptionIndex % 2) + 1;
        setCurrentSpeaker(loopSpeaker);
      } else {
        setCurrentCaption(null);
        loopSpeaker = Math.floor(currentTime / 1.5) % 2 === 0 ? 1 : 2;
      }
      
      const firstVis = state.elements.find(e => e.type === 'visualizer');
      // Update smoothing parameter from the element before fetching FFT data
      if (firstVis && analyserRef.current) {
        analyserRef.current.smoothingTimeConstant = firstVis.visualizerSmoothing ?? 0.8;
      }
      const shouldUseLiveAnalyser = analysisFrame === null && analyserRef.current;
      if (shouldUseLiveAnalyser) {
        analyserRef.current!.getByteFrequencyData(dataArray);
      }
      
      Object.keys(barsRef.current).forEach((vId) => {
        const el = state.elements.find(e => e.id === vId);
        if (!el) return;
        const type = normalizeVisualizerType(el.visualizerType);
        const barRefs = (barsRef.current[vId] || []).filter((ref): ref is HTMLDivElement => ref instanceof HTMLDivElement);
        if (barRefs.length === 0) return;

        const parentHeight = barRefs[0]?.parentElement?.clientHeight || 100;
        const fallbackBands = shouldUseLiveAnalyser
          ? Array.from({ length: 52 }, (_, index) => {
              const dataBins = Math.floor(bufferLength * 0.4);
              const dataIndex = Math.min(bufferLength - 1, 1 + Math.floor((index / 51) * dataBins));
              return (dataArray[dataIndex] || 0) / 255;
            })
          : null;
        const fallbackLevel = shouldUseLiveAnalyser && bufferLength > 0
          ? dataArray.slice(0, Math.max(1, Math.floor(bufferLength * 0.5))).reduce((sum, value) => sum + value, 0) / Math.max(1, Math.floor(bufferLength * 0.5)) / 255
          : null;
        const bars = getVisualizerBars({
          type,
          count: barRefs.length,
          frame: frameIndex,
          height: parentHeight,
          audioLevel: analysisLevel ?? fallbackLevel,
          frequencyBands: analysisBands ?? fallbackBands,
          currentSpeaker: loopSpeaker,
          splitSpeakers: el.visualizerSplitSpeakers,
          mirror: el.visualizerMirror,
          sensitivity: el.visualizerSensitivity ?? 1.5,
          heightScale: el.visualizerHeight ?? 0.9,
          baseline: el.visualizerBaseline ?? 4,
          gain: el.visualizerGain ?? 1,
          compression: el.visualizerCompression ?? 1,
          floor: el.visualizerFloor ?? 0,
          ceiling: el.visualizerCeiling ?? 1,
          curve: el.visualizerCurve ?? 'default',
          bandFocus: el.visualizerBandFocus ?? 'full',
          color: el.barColor || '#00ffcc',
        });

        barRefs.forEach((bar, index) => {
          const barFrame = bars[index];
          if (!barFrame) return;
          bar.style.backgroundColor = barFrame.color;
          bar.style.opacity = `${barFrame.opacity}`;
          gsap.to(bar, {
            height: barFrame.height,
            duration: 0.1,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
      });
      
      reqAnimRef.current = requestAnimationFrame(loop);
    };
    
    loop();
  };

  const setBarRef = (vId: string, el: HTMLDivElement | null, index: number, total: number) => {
    if (!barsRef.current[vId] || barsRef.current[vId].length !== total) {
      barsRef.current[vId] = new Array(total).fill(null);
    }
    barsRef.current[vId][index] = el;
  };

  const applyInlineTextCommand = (command: 'bold' | 'italic' | 'underline') => {
    document.execCommand(command);
  };

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (canvasRef.current) {
      setDimensions({ w: canvasRef.current.offsetWidth, h: canvasRef.current.offsetHeight });
    }
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [canvasRef.current]);

  const vGuidelines = dimensions.w > 0 ? [
    dimensions.w / 2, 
    0, 
    dimensions.w,
    showSafeZones ? dimensions.w * 0.06 : -1,
    showSafeZones ? dimensions.w * 0.94 : -1
  ].filter(v => v >= 0) : [];
  const hGuidelines = dimensions.h > 0 ? [
    dimensions.h / 2, 
    0, 
    dimensions.h, 
    showSafeZones ? dimensions.h * 0.14 : -1,
    showSafeZones ? dimensions.h * 0.65 : -1
  ].filter(v => v >= 0) : [];

  const introFadeDuration = 0.65;
  const introOpacity = introImage && playing && introDuration > 0
    ? playbackTime < introDuration
      ? 1
      : playbackTime < introDuration + introFadeDuration
        ? 1 - ((playbackTime - introDuration) / introFadeDuration)
        : 0
    : 0;
  const introIsSquareish = introImageAspect !== null && introImageAspect >= 0.9 && introImageAspect <= 1.1;

  const replaceImageElementFromFile = (elementId: string) => {
    pendingImageReplaceIdRef.current = elementId;
    if (imageReplaceInputRef.current) {
      imageReplaceInputRef.current.value = '';
      imageReplaceInputRef.current.click();
    }
  };

  const handleImageReplaceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const elementId = pendingImageReplaceIdRef.current;
    pendingImageReplaceIdRef.current = null;
    if (!file || !elementId || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      updateElement(elementId, {
        imageUrl: reader.result,
        removeWhite: false,
      });
      selectElement(elementId, false);
      commitHistory();
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't delete selected components while the user is editing text or a form field.
      if (isEditableEventTarget(e.target) || isEditableEventTarget(document.activeElement)) {
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        selectedIds.forEach(id => {
          useEditorStore.getState().removeElement(id);
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, readOnly]);

  return (
    <div 
      className="absolute inset-0 pointer-events-auto overflow-hidden" 
      style={{ backgroundColor }}
      ref={canvasRef}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
      data-tour="canvas"
      onClick={(e) => {
        if (e.detail === 3 && e.target === e.currentTarget) {
          e.preventDefault();
          onRefreshBackgroundColor?.();
        }
      }}
    >
      {!readOnly && (
        <input
          ref={imageReplaceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Replace selected image"
          onChange={handleImageReplaceFile}
        />
      )}
      {bgMedia && bgMedia.type === 'image' && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 z-0 pointer-events-none" 
          style={{ backgroundImage: `url(${bgMedia.url})` }}
        />
      )}
      
      {bgMedia && bgMedia.type === 'video' && (
        <video 
          src={bgMedia.url} 
          className="absolute inset-0 w-full h-full object-cover opacity-60 z-0 pointer-events-none"
          autoPlay 
          loop 
          muted 
          playsInline
        />
      )}

      {bgMedia && bgShadow && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0, 0, 0, ${bgShadowOpacity})` }}
        />
      )}

      {introImage && introOpacity > 0 && (
        <div
          className="absolute inset-0 z-50 overflow-hidden bg-black pointer-events-none"
          style={{ opacity: introOpacity }}
        >
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center blur-xl opacity-70"
            style={{
              backgroundImage: `url(${introImage})`,
              backgroundPosition: feedPlatform ? `50% ${introFeedCropY}%` : 'center',
            }}
          />
          <img
            src={introImage}
            className={`relative z-10 h-full w-full ${feedPlatform && !introIsSquareish ? 'object-cover object-top' : 'object-contain'}`}
            style={{ objectPosition: feedPlatform ? `50% ${introFeedCropY}%` : 'center' }}
            alt=""
          />
          {showSafeZones && feedPlatform && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="relative aspect-square w-full border border-white/85 bg-white/[0.035] shadow-[0_0_0_999px_rgba(15,23,42,0.22)]">
                <div className="absolute inset-x-0 top-0 border-t border-dashed border-white/85" />
                <div className="absolute inset-x-0 bottom-0 border-b border-dashed border-white/85" />
                <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-900 shadow-sm">
                  1:1 safe area
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <audio 
        ref={audioRef} 
        src={audioUrl || undefined}
        onEnded={onPlaybackComplete}
      />

      {showRedGuides && verticalPlatform && (
         <>
           <div className="absolute top-0 left-0 right-0 h-[14%] border-b-2 border-red-500/50 border-dashed pointer-events-none z-10 flex items-end justify-center pb-2 bg-red-500/5">
             <span className="text-[10px] font-bold text-red-500/70 uppercase text-center px-4">Avoid placing content here &mdash; covered by platform UI</span>
           </div>
           <div className="absolute top-[65%] bottom-0 left-0 right-0 border-t-2 border-red-500/50 border-dashed pointer-events-none z-10 flex items-start justify-center pt-2 bg-red-500/5">
             <span className="text-[10px] font-bold text-red-500/70 uppercase text-center px-4">Avoid placing content here &mdash; covered by platform UI</span>
           </div>
         </>
      )}

      {showSafeZones && feedPlatform && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="relative aspect-square w-full border border-indigo-500/45 bg-indigo-500/[0.035] shadow-[0_0_0_999px_rgba(15,23,42,0.08)]">
            <div className="absolute inset-x-0 top-0 border-t border-dashed border-indigo-500/55" />
            <div className="absolute inset-x-0 bottom-0 border-b border-dashed border-indigo-500/55" />
            <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-600 shadow-sm">
              1:1 safe area
            </span>
          </div>
        </div>
      )}

      {!readOnly && <Selecto
        dragContainer={canvasRef.current as any}
        selectableTargets={editingId ? [] : ['.element-node']}
        hitRate={0}
        selectByClick={true}
        selectFromInside={false}
        toggleContinueSelect={['shift']}
        dragCondition={(e: any) => {
          if (editingId) return false;
          const target = e.inputEvent.target;
          return !target.closest('.element-node') && !target.closest('.moveable-control-box');
        }}
        onSelectEnd={e => {
          const ids = e.selected.map(el => el.id.replace('el-', ''));
          useEditorStore.setState({ selectedIds: ids });
        }}
      />}

      {!readOnly && <Moveable
        ref={moveableRef}
        target={editingId ? [] : targets}
        draggable={true}
        resizable={true}
        rotatable={true}
        snappable={true}
        snapThreshold={5}
        isDisplaySnapDigit={true}
        snapGap={true}
        elementGuidelines={Array.from(document.querySelectorAll('.element-node'))}
        verticalGuidelines={vGuidelines}
        horizontalGuidelines={hGuidelines}
        throttleRotate={15}
        rotationPosition="top"
        
        onDragStart={e => {
            e.set([parseFloat(e.target.style.left || "0"), parseFloat(e.target.style.top || "0")]);
        }}
        onDrag={e => {
            e.target.style.left = `${e.beforeTranslate[0]}px`;
            e.target.style.top = `${e.beforeTranslate[1]}px`;
        }}
        onDragEnd={e => {
            if (e.isDrag) {
                const id = e.target.id.replace('el-', '');
                updateElement(id, {
                    x: parseFloat(e.target.style.left || '0') - layoutOffsetX,
                    y: parseFloat(e.target.style.top || '0') / layoutScaleY
                });
                commitHistory();
            }
        }}
        
        onDragGroupStart={e => {
            e.events.forEach(ev => {
                ev.set([parseFloat(ev.target.style.left || "0"), parseFloat(ev.target.style.top || "0")]);
            });
        }}
        onDragGroup={e => {
            e.events.forEach(ev => {
                ev.target.style.left = `${ev.beforeTranslate[0]}px`;
                ev.target.style.top = `${ev.beforeTranslate[1]}px`;
            });
        }}
        onDragGroupEnd={e => {
            if (e.isDrag) {
                e.targets.forEach(target => {
                    const id = target.id.replace('el-', '');
                    updateElement(id, {
                        x: parseFloat(target.style.left || '0') - layoutOffsetX,
                        y: parseFloat(target.style.top || '0') / layoutScaleY
                    });
                });
                commitHistory();
            }
        }}

        onResizeStart={e => {
            e.setOrigin(["%", "%"]);
            e.dragStart && e.dragStart.set([
                parseFloat(e.target.style.left || "0"),
                parseFloat(e.target.style.top || "0")
            ]);
        }}
        onResize={e => {
            e.target.style.width = `${e.width}px`;
            e.target.style.height = `${e.height}px`;
            e.target.style.left = `${e.drag.beforeTranslate[0]}px`;
            e.target.style.top = `${e.drag.beforeTranslate[1]}px`;
        }}
        onResizeEnd={e => {
            if (e.isDrag) {
                const id = e.target.id.replace('el-', '');
                updateElement(id, {
                    width: parseFloat(e.target.style.width || '0'),
                    height: parseFloat(e.target.style.height || '0') / layoutScaleY,
                    x: parseFloat(e.target.style.left || '0') - layoutOffsetX,
                    y: parseFloat(e.target.style.top || '0') / layoutScaleY
                });
                commitHistory();
            }
        }}

        onResizeGroupStart={e => {
            e.events.forEach(ev => {
                ev.setOrigin(["%", "%"]);
                ev.dragStart && ev.dragStart.set([
                    parseFloat(ev.target.style.left || "0"),
                    parseFloat(ev.target.style.top || "0")
                ]);
            });
        }}
        onResizeGroup={e => {
            e.events.forEach(ev => {
                ev.target.style.width = `${ev.width}px`;
                ev.target.style.height = `${ev.height}px`;
                ev.target.style.left = `${ev.drag.beforeTranslate[0]}px`;
                ev.target.style.top = `${ev.drag.beforeTranslate[1]}px`;
            });
        }}
        onResizeGroupEnd={e => {
            if (e.isDrag) {
                e.targets.forEach(target => {
                    const id = target.id.replace('el-', '');
                    updateElement(id, {
                        width: parseFloat(target.style.width || '0'),
                        height: parseFloat(target.style.height || '0') / layoutScaleY,
                        x: parseFloat(target.style.left || '0') - layoutOffsetX,
                        y: parseFloat(target.style.top || '0') / layoutScaleY
                    });
                });
                commitHistory();
            }
        }}

        onRotateStart={e => {
            e.set(parseFloat(e.target.style.transform.replace('rotate(', '').replace('deg)', '') || "0"));
        }}
        onRotate={e => {
            e.target.style.transform = `rotate(${e.beforeRotate}deg)`;
        }}
        onRotateEnd={e => {
            if (e.isDrag) {
                const id = e.target.id.replace('el-', '');
                const transform = e.target.style.transform;
                const match = transform.match(/rotate\(([\d.-]+)deg\)/);
                if (match) {
                    updateElement(id, { rotation: parseFloat(match[1]) });
                }
                commitHistory();
            }
        }}

        onRotateGroupStart={e => {
            e.events.forEach(ev => {
                ev.set(parseFloat(ev.target.style.transform.replace('rotate(', '').replace('deg)', '') || "0"));
            });
        }}
        onRotateGroup={e => {
            e.events.forEach(ev => {
                ev.target.style.transform = `rotate(${ev.beforeRotate}deg)`;
                // When rotating a group, position also changes around origin
                ev.target.style.left = `${ev.drag.beforeTranslate[0]}px`;
                ev.target.style.top = `${ev.drag.beforeTranslate[1]}px`;
            });
        }}
        onRotateGroupEnd={e => {
            if (e.isDrag) {
                e.targets.forEach(target => {
                    const id = target.id.replace('el-', '');
                    const transform = target.style.transform;
                    const match = transform.match(/rotate\(([\d.-]+)deg\)/);
                    if (match) {
                        updateElement(id, { rotation: parseFloat(match[1]) });
                    }
                    updateElement(id, {
                        x: parseFloat(target.style.left || '0') - layoutOffsetX,
                        y: parseFloat(target.style.top || '0') / layoutScaleY
                    });
                });
                commitHistory();
            }
        }}
      />}

      {elements.map((el) => {
        const frame = getPlatformElementFrame(el, platform);
        const feedSafeSquareTop = feedPlatform ? Math.max(0, (dimensions.h - dimensions.w) / 2) : 0;
        const feedSafeSquareBottom = feedSafeSquareTop + dimensions.w;
        const displayY = feedPlatform && el.type === 'caption' && dimensions.w > 0
          ? Math.min(frame.y, feedSafeSquareBottom - frame.height - 8)
          : frame.y;
        const captionMaxFontSize = platform === 'youtube' ? 86 : 64;
        const normalizedVisualizerType = normalizeVisualizerType(el.visualizerType);
        const showTextColorPicker = !editingId && el.type === 'text' && (el.componentRole === 'headline' || el.componentRole === 'subheadline');
        const showCaptionColorPicker = !editingId && el.type === 'caption';
        const hoverColorValue = showCaptionColorPicker ? (el.color || accentColor) : (el.color || '#111827');
        const hoverColorLabel = showCaptionColorPicker ? 'Caption color' : el.componentRole === 'subheadline' ? 'Sub-headline color' : 'Headline color';
        const textHasBackground = el.type === 'text' && Boolean(el.backgroundColor);
        const shouldFlash = Boolean(!el.locked && el.componentRole && activeRerollFlash?.roles.includes(el.componentRole));

        return (
          <div
            key={el.id}
            id={`el-${el.id}`}
            className={`absolute element-node group ${shouldFlash ? `wiggly-reroll-shine wiggly-reroll-shine-${el.componentRole}` : ''}`}
            onMouseDown={(e: React.MouseEvent) => {
              if (readOnly) return;
              if (editingId) return;
              if ((e.target as HTMLElement).closest('.moveable-control-box')) return;
              if (e.shiftKey) {
                 selectElement(el.id, true);
              } else if (!selectedIds.includes(el.id)) {
                 selectElement(el.id, false);
              }
              emitTutorialEvent({ type: 'element-selected', role: el.componentRole });
            }}
            onDoubleClick={(e) => {
               e.stopPropagation();
               if (readOnly) return;
               if (el.type === 'image') {
                  selectElement(el.id, false);
                  replaceImageElementFromFile(el.id);
                  return;
               }
               if (el.type === 'text' || el.type === 'button') {
                  selectElement(el.id, false);
                  setEditingId(el.id);
               }
            }}
            style={{ 
              left: frame.x + layoutOffsetX, 
              top: displayY * layoutScaleY, 
              width: frame.width, 
              height: frame.height * layoutScaleY, 
              transform: `rotate(${el.rotation || 0}deg)`,
              zIndex: el.zIndex 
            }}
            data-tour={el.componentRole}
          >
            {!readOnly && <button
              type="button"
              className={`wiggly-element-lock absolute right-1 top-1 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-xl transition duration-150 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/25 ${
                el.locked
                  ? `${playing ? 'opacity-15' : 'opacity-35'} border-slate-950 bg-slate-950 text-white shadow-slate-950/30 ring-2 ring-[#00D6B8]/70 hover:opacity-100 group-hover:opacity-100`
                  : 'border-slate-300 bg-white/95 text-slate-800 opacity-0 shadow-slate-950/20 hover:border-slate-950 hover:bg-white hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100'
              } ${pulsingLockedIds.has(el.id) ? 'scale-125 opacity-100 ring-4 ring-[#00D6B8]/80' : ''}`}
              title={el.locked ? 'Unlock this part' : `Lock ${el.componentRole || el.type} style`}
              aria-label={el.locked ? 'Unlock this part' : `Lock ${el.componentRole || el.type} style`}
              onPointerDown={(event) => {
                event.stopPropagation();
                updateElement(el.id, { locked: !el.locked });
                commitHistory();
                if (!el.locked) {
                  emitTutorialEvent({ type: 'element-locked', role: el.componentRole });
                }
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {el.locked ? <Lock className="h-6 w-6" strokeWidth={3} /> : <Unlock className="h-6 w-6" strokeWidth={2.5} />}
            </button>}
            {!readOnly && (showTextColorPicker || showCaptionColorPicker) && (
              <label
                className="pointer-events-auto absolute left-2 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 opacity-0 shadow-lg transition hover:bg-white group-hover:opacity-100 focus-within:opacity-100"
                title={hoverColorLabel}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <span
                  className="h-6 w-6 rounded-full border border-slate-200 shadow-inner"
                  style={{ backgroundColor: hoverColorValue }}
                />
                <input
                  type="color"
                  value={hoverColorValue}
                  onChange={(event) => {
                    const nextColor = event.target.value;
                    if (showCaptionColorPicker) {
                      updateElement(el.id, {
                        color: nextColor,
                        captionSpeaker1Color: nextColor,
                        captionSpeaker2Color: nextColor,
                      });
                      return;
                    }
                    updateElement(el.id, { color: nextColor });
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={hoverColorLabel}
                />
              </label>
            )}
            {/* TEXT */}
            {el.type === 'text' && (
              <div
                className={`w-full h-full flex items-center justify-center break-words ${editingId === el.id ? 'select-text' : 'select-none'}`}
                style={{
                  fontFamily: el.fontFamily,
                  fontSize: `${el.fontSize}px`,
                  fontWeight: el.fontWeight,
                  fontStyle: el.fontStyle,
                  textDecoration: el.textDecoration,
                  color: el.color,
                  textAlign: el.textAlign,
                  lineHeight: el.lineHeight,
                  backgroundColor: textHasBackground ? el.backgroundColor : undefined,
                  borderRadius: textHasBackground ? `${el.borderRadius || 0}px` : undefined,
                  boxSizing: 'border-box',
                  boxShadow: textHasBackground ? '0 12px 30px rgba(15,23,42,0.12)' : undefined,
                  padding: textHasBackground ? '10px 14px' : undefined,
                }}
              >
                {editingId === el.id ? (
                  <div
                    ref={editingRef}
                    className="w-full h-full cursor-text overflow-hidden px-1 outline-none select-text"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    style={{
                      color: el.color,
                      fontFamily: el.fontFamily,
                      fontWeight: el.fontWeight,
                      fontStyle: el.fontStyle,
                      textDecoration: el.textDecoration,
                      fontSize: `${el.fontSize}px`,
                      lineHeight: el.lineHeight || 1.12,
                      textAlign: el.textAlign || 'center',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      updateElement(el.id, { content: sanitizeRichText(e.currentTarget.innerHTML) });
                      commitHistory();
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                       if ((e.metaKey || e.ctrlKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
                          e.preventDefault();
                          const key = e.key.toLowerCase();
                          if (key === 'b') applyInlineTextCommand('bold');
                          if (key === 'i') applyInlineTextCommand('italic');
                          if (key === 'u') applyInlineTextCommand('underline');
                          return;
                       }
                       if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.blur();
                       }
                    }}
                  />
                ) : el.componentRole === 'headline' && !readOnly ? (
                  <HeadlineSlot niche="dental" elementId={el.id} />
                ) : (
                  <AutoFitText
                    className={textHasBackground ? 'w-full' : 'w-full px-1'}
                    minFontSize={8}
                    lineHeight={el.lineHeight || 1.12}
                    plainText={stripRichText(el.content || '')}
                    style={{
                      fontStyle: el.fontStyle,
                      textAlign: el.textAlign || 'center',
                      textDecoration: el.textDecoration,
                    }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: sanitizeRichText(el.content || '') }} />
                  </AutoFitText>
                )}
              </div>
            )}

            {/* BUTTON */}
            {el.type === 'button' && (
               <div className="w-full h-full flex items-center justify-center p-1">
                 <button 
                   className="w-full h-full leading-none truncate pointer-events-none uppercase tracking-widest shadow-xl flex items-center justify-center"
                   style={{
                     backgroundColor: el.backgroundColor,
                     color: el.color,
                     borderRadius: `${el.borderRadius}px`,
                     fontSize: `${el.fontSize}px`,
                     fontWeight: el.fontWeight,
                   }}
                 >
                   {editingId === el.id ? (
                      <input
                        className="w-full h-full bg-transparent border-none outline-none text-center pointer-events-auto"
                        autoFocus
                        defaultValue={el.content}
                        onBlur={(e) => {
                          updateElement(el.id, { content: e.target.value });
                          commitHistory();
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget.blur();
                           }
                        }}
                      />
                   ) : (
                      el.content
                   )}
                 </button>
               </div>
            )}

            {/* VISUALIZER */}
            {el.type === 'visualizer' && (
               <div
                 key={`${normalizedVisualizerType}-${el.barCount || 16}`}
                 className="relative w-full h-full flex items-center justify-center pointer-events-none"
               >
                 {normalizedVisualizerType === 'bars-bottom' && (
                    <div className="w-full h-full flex items-end justify-between gap-1">
                      {Array.from({ length: el.barCount || 16 }).map((_, i, bars) => {
                        return (
                          <div
                            key={i}
                            ref={barEl => setBarRef(el.id, barEl, i, el.barCount || 16)}
                            data-bar-index={i}
                            className={`flex-1 rounded-full ${playing ? '' : 'wiggly-idle-bar'}`}
                            style={{
                              animationDelay: playing ? undefined : `${i * 45}ms`,
                              backgroundColor: el.barColor || '#00ffcc',
                              height: `${playing ? (el.visualizerBaseline ?? 4) : getIdleVisualizerHeight(normalizedVisualizerType, i, bars.length)}${playing ? 'px' : '%'}`,
                              minWidth: '4px'
                            }}
                          />
                        );
                      })}
                    </div>
                 )}
                 {normalizedVisualizerType === 'bars-center' && (
                    <div className="w-full h-full flex items-center justify-between gap-1">
                      {Array.from({ length: el.barCount || 16 }).map((_, i, bars) => {
                        return (
                          <div
                            key={i}
                            ref={barEl => setBarRef(el.id, barEl, i, el.barCount || 16)}
                            data-bar-index={i}
                            className={`flex-1 rounded-full ${playing ? '' : 'wiggly-idle-bar'}`}
                            style={{
                              animationDelay: playing ? undefined : `${i * 45}ms`,
                              backgroundColor: el.visualizerSplitSpeakers && i >= Math.floor((el.barCount || 16) / 2) ? '#8b5cf6' : (el.barColor || '#00ffcc'),
                              height: `${playing ? (el.visualizerBaseline ?? 4) : getIdleVisualizerHeight(normalizedVisualizerType, i, bars.length)}${playing ? 'px' : '%'}`,
                              minWidth: '4px'
                            }}
                          />
                        );
                      })}
                    </div>
                 )}
                {normalizedVisualizerType === 'waveform-strip' && (
                  <div className="absolute inset-0 flex items-center justify-between gap-[2px]">
                    {Array.from({ length: getVisualizerBarCount(normalizedVisualizerType, el.barCount) }).map((_, i, bars) => {
                      return (
                        <div
                          key={i}
                          ref={barEl => setBarRef(el.id, barEl, i, getVisualizerBarCount(normalizedVisualizerType, el.barCount))}
                          data-bar-index={i}
                          className={`flex-1 rounded-full opacity-80 ${playing ? '' : 'wiggly-idle-bar wiggly-idle-bar-strong'}`}
                          style={{
                            animationDelay: playing ? undefined : `${i * 28}ms`,
                            backgroundColor: el.barColor || '#00ffcc',
                            height: `${playing ? (el.visualizerBaseline ?? 4) : getIdleVisualizerHeight(normalizedVisualizerType, i, bars.length)}${playing ? 'px' : '%'}`,
                            minWidth: '3px',
                          }}
                        />
                      );
                    })}
                  </div>
                )}
                 {!readOnly && <label
                   className="pointer-events-auto absolute left-2 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 opacity-0 shadow-lg transition hover:bg-white group-hover:opacity-100 focus-within:opacity-100"
                   title="Change visualizer color"
                   onMouseDown={(event) => event.stopPropagation()}
                   onClick={(event) => event.stopPropagation()}
                 >
                   <span
                     className="h-6 w-6 rounded-full border border-slate-200 shadow-inner"
                     style={{ backgroundColor: el.barColor || '#00ffcc' }}
                   />
                   <input
                     type="color"
                     value={el.barColor || '#00ffcc'}
                     onChange={(event) => updateElement(el.id, { barColor: event.target.value })}
                     className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                     aria-label="Visualizer color"
                   />
                 </label>}
               </div>
            )}

            {/* CAPTION */}
            {el.type === 'caption' && (
               <div className="w-full h-full flex items-center justify-center pointer-events-none">
                  <AutoFitText
                    className="px-2 text-center font-semibold"
                    minFontSize={8}
                    maxFontSize={captionMaxFontSize}
                    lineHeight={1.22}
                    fitPaddingX={18}
                    fitPaddingY={16}
                    style={{
                      color: currentCaption
                        ? (currentSpeaker === 2 ? el.captionSpeaker2Color : el.captionSpeaker1Color) || CAPTION_SPEAKER_COLORS[currentSpeaker] || el.color || accentColor
                        : (el.color || accentColor),
                      fontFamily: el.fontFamily || 'Inter, sans-serif',
                      fontWeight: el.fontWeight || 700,
                    }}
                  >
                    {currentCaption || (audioUrl ? (captionsLoading ? 'Captions are loading' : '') : 'Upload audio for captions')}
                  </AutoFitText>
               </div>
            )}

            {/* IMAGE */}
            {el.type === 'image' && (
               <div className="relative w-full h-full flex items-center justify-center pointer-events-none overflow-hidden" style={{ borderRadius: el.borderRadius, mixBlendMode: el.mixBlendMode as any }}>
                 {el.imageUrl ? (
                   <>
                     <TransparentImage src={el.imageUrl} className="w-full h-full object-contain" removeWhite={el.removeWhite} />
                     {el.imageShadow && (
                       <div
                         className="absolute inset-0 pointer-events-none"
                         style={{ backgroundColor: `rgba(0, 0, 0, ${el.imageShadowOpacity ?? 0.42})` }}
                       />
                     )}
                   </>
                 ) : (
                   <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                     <ImageIcon className="w-8 h-8 opacity-50" />
                   </div>
                 )}
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
