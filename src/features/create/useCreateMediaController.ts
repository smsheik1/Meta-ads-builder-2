import { useEffect, useRef, useState } from 'react';
import { useEditorStore, type AdElement, type Caption } from '../../store';
import { deleteAudioItem, listAudioItems, saveAudioItem, type StoredAudioItem } from '../../lib/audio-library';
import { precomputeAudioAnalysisFromUrl, type AudioAnalysisData } from '../../lib/audio-analysis';
import { explainVoiceVisualizerPreset, getVoiceVisualizerPreset, type VoiceVisualizerPresetDecision } from '../../lib/visualizer-presets';
import { getMediaDurationSeconds } from './createExportMedia';
import type { AudioIntent } from './createSavedDesigns';

export const DEFAULT_AUDIO_URL = '/ai-dental-receptionist-audio.mp3';
export const DEFAULT_AUDIO_NAME = 'AI Dental Receptionist';

const CURRENT_AUDIO_STORAGE_KEY = 'wiggly_current_audio_v1';
const TRANSCRIPTION_BACKOFF_KEY = 'wiggly_transcription_429_until';
const TRANSCRIPTION_ERROR_BACKOFF_KEY = 'wiggly_transcription_error_until';

type CurrentAudioMemory = {
  id?: string;
  builtIn?: boolean;
  brandKey?: string | null;
};

export type AudioLibraryItem = {
  id: string;
  name: string;
  url: string;
  builtIn?: boolean;
  stored?: StoredAudioItem;
};

type RenderDurationCap = 30 | 60 | 'full';

type UseCreateMediaControllerParams = {
  appRoute: string;
  activeCreateBrandKeyInitial?: string | null;
  renderDurationCap: RenderDurationCap;
  primaryVisualizerElement?: AdElement | null;
  previewAudioAnalysis?: AudioAnalysisData | null;
  onPreviewAudioAnalysisChange: (analysis: AudioAnalysisData | null) => void;
  onClearGeneratedDialogueAudio: () => void;
  getGeneratedDialogueAudioUrl: () => string | null | undefined;
  onAudioPicked?: () => void;
};

type AudioSettingsSnapshot = {
  audioUrl?: string | null;
  audioFileName?: string;
  audioIntent?: AudioIntent;
  audioBrandKey?: string | null;
  audioAssetId?: string | null;
  createBrandKey?: string | null;
};

export const inferAudioMimeType = (url: string, fallback = 'audio/mpeg') => {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.m4a')) return 'audio/mp4';
  if (cleanUrl.endsWith('.wav')) return 'audio/wav';
  if (cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.oga')) return 'audio/ogg';
  if (cleanUrl.endsWith('.flac')) return 'audio/flac';
  if (cleanUrl.endsWith('.webm')) return 'audio/webm';
  if (cleanUrl.endsWith('.aac')) return 'audio/aac';
  return fallback;
};

const cleanCaptionText = (text: string) => text
  .replace(/\bchat\s*gp\b/gi, 'ChatGPT')
  .replace(/\bchat\s*gpt\b/gi, 'ChatGPT')
  .replace(/\bchatgp\b/gi, 'ChatGPT');

export const cleanCaptions = (captions: Caption[]) => captions.map((caption) => ({
  ...caption,
  text: cleanCaptionText(caption.text),
}));

export function useCreateMediaController({
  appRoute,
  renderDurationCap,
  primaryVisualizerElement,
  previewAudioAnalysis,
  onPreviewAudioAnalysisChange,
  onClearGeneratedDialogueAudio,
  getGeneratedDialogueAudioUrl,
  onAudioPicked,
}: UseCreateMediaControllerParams) {
  const [audioUrl, setAudioUrl] = useState<string | null>(DEFAULT_AUDIO_URL);
  const [audioFileName, setAudioFileName] = useState<string>(DEFAULT_AUDIO_NAME);
  const [audioIntent, setAudioIntent] = useState<AudioIntent>('default');
  const [audioBrandKey, setAudioBrandKey] = useState<string | null>(null);
  const [activeCreateBrandKey, setActiveCreateBrandKey] = useState<string | null>(null);
  const [currentAudioAssetId, setCurrentAudioAssetId] = useState<string | null>(null);
  const [storedAudioItems, setStoredAudioItems] = useState<StoredAudioItem[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioPresetSourceRef = useRef<string | null>(null);
  const audioAnalysisCacheRef = useRef<Map<string, AudioAnalysisData>>(new Map());

  const generatedAudioMatchesCreateBrand = Boolean(
    audioUrl
      && audioIntent === 'generated'
      && (
        activeCreateBrandKey
          ? audioBrandKey === activeCreateBrandKey
          : true
      )
  );
  const hasPlayableCreateAudio = Boolean(
    audioUrl
      && (audioIntent === 'uploaded' || generatedAudioMatchesCreateBrand)
  );
  const createAudioUrl = hasPlayableCreateAudio ? audioUrl : null;

  const rememberCurrentAudio = (item: Pick<AudioLibraryItem, 'id' | 'builtIn'> & { brandKey?: string | null }) => {
    try {
      localStorage.setItem(CURRENT_AUDIO_STORAGE_KEY, JSON.stringify({
        id: item.id,
        builtIn: Boolean(item.builtIn),
        brandKey: item.brandKey || null,
      }));
    } catch {
      // Ignore private browsing storage failures.
    }
  };

  const clearCreateAudioForNewBrand = () => {
    onClearGeneratedDialogueAudio();
    useEditorStore.getState().setCaptions([]);
    setAudioUrl(null);
    setAudioFileName('');
    setAudioIntent('default');
    setAudioBrandKey(null);
    setCurrentAudioAssetId(null);
  };

  const downloadCurrentAudio = async () => {
    if (!audioUrl) return;
    const response = await fetch(audioUrl);
    const blob = await response.blob();
    const extension = blob.type.includes('mpeg')
      ? 'mp3'
      : blob.type.includes('wav')
        ? 'wav'
        : blob.type.includes('mp4') || blob.type.includes('m4a')
          ? 'm4a'
          : 'mp3';
    const safeName = (audioFileName || 'wiggly-audio').replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'wiggly-audio';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    listAudioItems()
      .then((items) => {
        setStoredAudioItems(items);
        try {
          const saved = localStorage.getItem(CURRENT_AUDIO_STORAGE_KEY);
          if (!saved) return;
          const parsed = JSON.parse(saved) as CurrentAudioMemory;
          if (parsed.id === 'built-in-ai-dental-receptionist-audio') {
            onClearGeneratedDialogueAudio();
            setAudioUrl(DEFAULT_AUDIO_URL);
            setAudioFileName(DEFAULT_AUDIO_NAME);
            setAudioIntent('default');
            setAudioBrandKey(null);
            setCurrentAudioAssetId(null);
            return;
          }
          const stored = items.find((item) => item.id === parsed.id && item.status !== 'needs-reupload' && item.blob?.size > 0);
          if (!stored) return;
          onClearGeneratedDialogueAudio();
          setAudioUrl(URL.createObjectURL(stored.blob));
          setAudioFileName(stored.name);
          setAudioIntent(stored.kind === 'generated' ? 'generated' : 'uploaded');
          setAudioBrandKey(stored.kind === 'generated' ? stored.brandKey || parsed.brandKey || null : null);
          setCurrentAudioAssetId(stored.id);
        } catch (error) {
          console.error('Failed to restore current audio:', error);
        }
      })
      .catch((error) => console.error('Failed to load audio library:', error));
  }, []);

  const getAudioSignalStats = async (url: string) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioCtx();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      let sum = 0;
      let firstFiveSum = 0;
      let firstFiveCount = 0;
      let count = 0;
      let peak = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
        const data = audioBuffer.getChannelData(channel);
        const step = Math.max(1, Math.floor(data.length / 48000));
        const firstFiveLimit = Math.min(data.length, Math.floor(audioBuffer.sampleRate * 5));
        for (let index = 0; index < data.length; index += step) {
          const sample = data[index] || 0;
          const squared = sample * sample;
          sum += squared;
          count += 1;
          if (index < firstFiveLimit) {
            firstFiveSum += squared;
            firstFiveCount += 1;
          }
          peak = Math.max(peak, Math.abs(sample));
        }
      }
      return {
        duration: audioBuffer.duration,
        rms: Math.sqrt(sum / Math.max(1, count)),
        firstFiveRms: Math.sqrt(firstFiveSum / Math.max(1, firstFiveCount)),
        peak,
      };
    } finally {
      if (audioContext.state !== 'closed') {
        await audioContext.close();
      }
    }
  };

  const getAudioAnalysisSourceKey = (
    url: string | null | undefined,
    assetId?: string | null,
    fileName?: string | null,
  ) => {
    if (!url) return null;
    return assetId || fileName || url;
  };

  const applyAutoVisualizerPreset = (preset: Partial<AdElement>) => {
    useEditorStore.getState().setElements((currentElements) => currentElements.map((element) => (
      element.type === 'visualizer' && !element.locked
        ? { ...element, ...preset }
        : element
    )));
  };

  const logAutoVisualizerPreset = (
    sourceKey: string,
    stats: Awaited<ReturnType<typeof getAudioSignalStats>>,
    decision: VoiceVisualizerPresetDecision,
  ) => {
    const rms = stats.rms || 0;
    const firstFiveRms = stats.firstFiveRms || 0;
    const peak = stats.peak || 0;
    const crest = peak / Math.max(0.0001, Math.max(rms, firstFiveRms));
    console.info('[Wiggly visualizer auto-preset]', {
      source: sourceKey,
      preset: decision.presetId,
      reason: decision.reason,
      duration: Number(stats.duration.toFixed(2)),
      rms: Number(rms.toFixed(5)),
      firstFiveRms: Number(firstFiveRms.toFixed(5)),
      peak: Number(peak.toFixed(5)),
      crest: Number(crest.toFixed(2)),
    });
  };

  useEffect(() => {
    if (!audioUrl) return;

    const sourceKey = getAudioAnalysisSourceKey(audioUrl, currentAudioAssetId, audioFileName);
    if (!sourceKey || audioPresetSourceRef.current === sourceKey) return;

    let cancelled = false;
    const run = async () => {
      try {
        const stats = await getAudioSignalStats(audioUrl);
        if (cancelled) return;
        const decision = explainVoiceVisualizerPreset(stats);
        audioPresetSourceRef.current = sourceKey;
        logAutoVisualizerPreset(sourceKey, stats, decision);
        applyAutoVisualizerPreset(getVoiceVisualizerPreset(decision.presetId));
      } catch (error) {
        console.warn('Could not auto-tune visualizer for this audio; using balanced voice preset:', error);
        if (!cancelled) applyAutoVisualizerPreset(getVoiceVisualizerPreset('balanced-voice'));
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [audioUrl, audioFileName, currentAudioAssetId]);

  const getCachedAudioAnalysis = async (
    url: string | null | undefined,
    durationSeconds: number,
    smoothing: number,
    attack?: number,
    release?: number,
    existing?: AudioAnalysisData | null,
    sourceIdentity?: { assetId?: string | null; fileName?: string | null },
  ) => {
    const sourceKey = getAudioAnalysisSourceKey(url, sourceIdentity?.assetId, sourceIdentity?.fileName);
    if (!url || !sourceKey) return null;

    const roundedDuration = Number(durationSeconds.toFixed(3));
    const roundedSmoothing = Number(smoothing.toFixed(3));
    const roundedAttack = typeof attack === 'number' ? Number(attack.toFixed(3)) : 'auto';
    const roundedRelease = typeof release === 'number' ? Number(release.toFixed(3)) : 'auto';
    const cacheKey = `${sourceKey}|${roundedDuration}|${roundedSmoothing}|${roundedAttack}|${roundedRelease}`;
    const cached = audioAnalysisCacheRef.current.get(cacheKey);
    if (cached) return cached;

    if (
      existing &&
      existing.sourceKey === sourceKey &&
      existing.durationSeconds >= roundedDuration - 0.01 &&
      existing.fps === 60 &&
      Math.abs(existing.smoothing - roundedSmoothing) < 0.001
    ) {
      audioAnalysisCacheRef.current.set(cacheKey, existing);
      return existing;
    }

    const analysis = await precomputeAudioAnalysisFromUrl(url, {
      durationSeconds: roundedDuration,
      smoothing: roundedSmoothing,
      attack,
      release,
      sourceKey,
    });
    audioAnalysisCacheRef.current.set(cacheKey, analysis);
    return analysis;
  };

  useEffect(() => {
    if (!audioUrl) {
      onPreviewAudioAnalysisChange(null);
      return;
    }

    let cancelled = false;
    const smoothing = primaryVisualizerElement?.visualizerSmoothing ?? 0.8;
    const attack = primaryVisualizerElement?.visualizerAttack;
    const release = primaryVisualizerElement?.visualizerRelease;

    const run = async () => {
      try {
        const audioDuration = await getMediaDurationSeconds(audioUrl, 'audio');
        const cappedDuration = renderDurationCap === 'full'
          ? Math.min(Math.max(1, audioDuration || 60), 180)
          : Math.min(Math.max(1, audioDuration || renderDurationCap), renderDurationCap);
        const analysis = await getCachedAudioAnalysis(
          audioUrl,
          cappedDuration,
          smoothing,
          attack,
          release,
          previewAudioAnalysis,
          {
            assetId: currentAudioAssetId,
            fileName: audioFileName,
          },
        );
        if (!cancelled) onPreviewAudioAnalysisChange(analysis);
      } catch (error) {
        console.warn('Could not precompute preview audio analysis; preview will use live analyser fallback:', error);
        if (!cancelled) onPreviewAudioAnalysisChange(null);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [audioUrl, audioFileName, currentAudioAssetId, primaryVisualizerElement?.visualizerSmoothing, primaryVisualizerElement?.visualizerAttack, primaryVisualizerElement?.visualizerRelease, renderDurationCap]);

  const rememberAudioBlob = async (
    name: string,
    blob: Blob,
    source: StoredAudioItem['source'] = 'user-upload',
    brandKey?: string | null,
    captions?: Caption[]
  ) => {
    try {
      const item: StoredAudioItem = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `audio-${Date.now()}`,
        name,
        createdAt: Date.now(),
        blob,
        mimeType: blob.type || 'audio/mpeg',
        kind: source === 'voice-wizard' ? 'generated' : 'uploaded',
        source,
        brandKey: source === 'voice-wizard' ? brandKey || null : null,
        captions: source === 'voice-wizard' && captions ? cleanCaptions(captions) : undefined,
        status: 'ready',
      };
      const nextItems = await saveAudioItem(item);
      setStoredAudioItems(nextItems);
      const savedItem = nextItems[0] || null;
      setCurrentAudioAssetId(savedItem?.id ?? null);
      if (savedItem) {
        rememberCurrentAudio({ id: savedItem.id, builtIn: false, brandKey: source === 'voice-wizard' ? brandKey || null : null });
      }
      return savedItem;
    } catch (error) {
      console.error('Failed to save audio item:', error);
      return null;
    }
  };

  const rememberGeneratedVoiceAudio = async ({
    url,
    filename,
    blob,
    captions,
    brandKey,
  }: {
    url: string;
    filename: string;
    blob: Blob;
    captions: Caption[];
    brandKey?: string | null;
  }) => {
    const cleanedCaptions = cleanCaptions(captions);
    useEditorStore.getState().setCaptions(cleanedCaptions);
    setAudioUrl(url);
    setAudioFileName(filename);
    setAudioIntent('generated');
    setAudioBrandKey(brandKey || null);
    await rememberAudioBlob(filename, blob, 'voice-wizard', brandKey, cleanedCaptions);
  };

  const useAudioItem = (item: AudioLibraryItem) => {
    onClearGeneratedDialogueAudio();
    const nextUrl = item.stored ? URL.createObjectURL(item.stored.blob) : item.url;
    const selectedAudioBrandKey = item.stored?.kind === 'generated'
      ? activeCreateBrandKey || item.stored.brandKey || null
      : null;
    useEditorStore.getState().setCaptions(item.stored?.captions ? cleanCaptions(item.stored.captions) : []);
    setAudioUrl(nextUrl);
    setAudioFileName(item.name);
    setAudioIntent(item.stored?.kind === 'generated' ? 'generated' : item.stored ? 'uploaded' : 'default');
    setAudioBrandKey(selectedAudioBrandKey);
    setCurrentAudioAssetId(item.stored?.id ?? null);
    rememberCurrentAudio({
      ...item,
      brandKey: selectedAudioBrandKey,
    });
    onAudioPicked?.();
  };

  const updateCreateCaptions = (nextCaptions: Caption[]) => {
    const cleanedCaptions = cleanCaptions(nextCaptions);
    useEditorStore.getState().setCaptions(cleanedCaptions);
    if (!currentAudioAssetId) return;
    const storedAudio = storedAudioItems.find((item) => item.id === currentAudioAssetId);
    if (!storedAudio) return;
    const updatedAudio = { ...storedAudio, captions: cleanedCaptions };
    setStoredAudioItems((items) => items.map((item) => (
      item.id === currentAudioAssetId ? updatedAudio : item
    )));
    void saveAudioItem(updatedAudio)
      .then((items) => setStoredAudioItems(items))
      .catch((error) => console.error('Failed to save edited captions:', error));
  };

  const deleteStoredAudio = async (audioId: string) => {
    const nextItems = await deleteAudioItem(audioId);
    setStoredAudioItems(nextItems);
    if (currentAudioAssetId === audioId) {
      onClearGeneratedDialogueAudio();
      setAudioUrl(DEFAULT_AUDIO_URL);
      setAudioFileName(DEFAULT_AUDIO_NAME);
      setAudioIntent('default');
      setAudioBrandKey(null);
      setCurrentAudioAssetId(null);
      rememberCurrentAudio({ id: 'built-in-ai-dental-receptionist-audio', builtIn: true });
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onClearGeneratedDialogueAudio();
      useEditorStore.getState().setCaptions([]);
      setAudioUrl(url);
      setAudioFileName(file.name);
      setAudioIntent('uploaded');
      setAudioBrandKey(null);
      await rememberAudioBlob(file.name, file, 'user-upload');
    }
  };

  useEffect(() => {
    const transcriptionAudioUrl = appRoute === 'create' ? createAudioUrl : audioUrl;

    if (!transcriptionAudioUrl) {
      useEditorStore.getState().setCaptions([]);
      return;
    }

    if (currentAudioAssetId) {
      const currentStoredAudio = storedAudioItems.find((item) => item.id === currentAudioAssetId);
      if (currentStoredAudio?.captions?.length) {
        useEditorStore.getState().setCaptions(cleanCaptions(currentStoredAudio.captions));
        return;
      }
    }

    if (transcriptionAudioUrl === getGeneratedDialogueAudioUrl()) {
      return;
    }

    const cacheKey = `transcription_${transcriptionAudioUrl}`;
    const cachedCaptions = localStorage.getItem(cacheKey);
    if (cachedCaptions) {
      try {
        useEditorStore.getState().setCaptions(cleanCaptions(JSON.parse(cachedCaptions)));
        return;
      } catch (e) {}
    }

    const backoffUntil = Number(localStorage.getItem(TRANSCRIPTION_BACKOFF_KEY) || 0);
    if (backoffUntil && Date.now() < backoffUntil) {
      console.warn('AI temporarily at capacity, try again in 1 min.');
      return;
    }

    const errorBackoffUntil = Number(localStorage.getItem(TRANSCRIPTION_ERROR_BACKOFF_KEY) || 0);
    if (errorBackoffUntil && Date.now() < errorBackoffUntil) {
      console.warn('Skipping transcription during temporary error backoff.');
      return;
    }

    const transcribeUrl = async () => {
      try {
        setIsTranscribing(true);
        const audioRes = await fetch(transcriptionAudioUrl);
        const audioBlob = await audioRes.blob();
        if (audioBlob.size < 100) return;

        const file = new File([audioBlob], 'audio.mp3', { type: audioBlob.type || inferAudioMimeType(transcriptionAudioUrl) });
        const formData = new FormData();
        formData.append('audio', file);

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Transcription API error:', res.status, errorText);
          if (res.status === 429) {
            localStorage.setItem(TRANSCRIPTION_BACKOFF_KEY, String(Date.now() + 60 * 1000));
            return;
          }
          localStorage.setItem(TRANSCRIPTION_ERROR_BACKOFF_KEY, String(Date.now() + 60 * 1000));
          return;
        }

        const data = await res.json();
        const { setCaptions } = useEditorStore.getState();
        let newCaptions: any[] = [];

        if (data.results && data.results.utterances) {
          data.results.utterances.forEach((u: any) => {
            if (u.words && u.words.length > 0) {
              let currentStart = u.words[0].start;
              let text = '';
              for (let i = 0; i < u.words.length; i++) {
                const w = u.words[i];
                text += (w.punctuated_word || w.word) + ' ';
                if ((w.punctuated_word || w.word).match(/[.!?]$/)) {
                  newCaptions.push({
                    text: text.trim(),
                    start: currentStart,
                    end: w.end,
                    speaker: (u.speaker || 0) + 1
                  });
                  text = '';
                  if (i + 1 < u.words.length) {
                    currentStart = u.words[i + 1].start;
                  }
                }
              }
              if (text.trim().length > 0) {
                newCaptions.push({
                  text: text.trim(),
                  start: currentStart,
                  end: u.words[u.words.length - 1].end,
                  speaker: (u.speaker || 0) + 1
                });
              }
            } else {
              newCaptions.push({
                text: u.transcript || u.text || '',
                start: Number(u.start) || 0,
                end: Number(u.end) || 0,
                speaker: (Number(u.speaker) || 0) + 1
              });
            }
          });
        } else if (data.results?.channels?.[0]?.alternatives?.[0]?.words) {
          const words = data.results.channels[0].alternatives[0].words;
          if (words.length > 0) {
            let currentStart = words[0].start;
            let text = '';
            for (let i = 0; i < words.length; i++) {
              const w = words[i];
              text += (w.punctuated_word || w.word) + ' ';
              if ((w.punctuated_word || w.word)?.match(/[.!?]$/)) {
                newCaptions.push({ text: text.trim(), start: currentStart, end: w.end, speaker: 1 });
                text = '';
                if (i + 1 < words.length) {
                  currentStart = words[i + 1].start;
                }
              }
            }
            if (text.trim()) newCaptions.push({ text: text.trim(), start: currentStart, end: words[words.length - 1].end, speaker: 1 });
          }
        }

        const cleanedCaptions = cleanCaptions(newCaptions);
        setCaptions(cleanedCaptions);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cleanedCaptions));
        } catch (e) {
          console.error('Local storage error:', e);
        }
      } catch (err) {
        console.error('Transcription failed:', err);
      } finally {
        setIsTranscribing(false);
      }
    };

    transcribeUrl();
  }, [appRoute, audioUrl, createAudioUrl, currentAudioAssetId, storedAudioItems]);

  const applyAudioSettings = (settings: AudioSettingsSnapshot) => {
    setAudioUrl(settings.audioUrl ?? null);
    setAudioFileName(settings.audioFileName ?? '');
    setAudioIntent(settings.audioIntent ?? (settings.audioUrl ? 'uploaded' : 'default'));
    setAudioBrandKey(settings.audioBrandKey ?? null);
    setActiveCreateBrandKey(settings.createBrandKey ?? settings.audioBrandKey ?? null);
    setCurrentAudioAssetId(settings.audioAssetId ?? null);
  };

  const audioLibraryItems: AudioLibraryItem[] = [
    { id: 'built-in-ai-dental-receptionist-audio', name: DEFAULT_AUDIO_NAME, url: DEFAULT_AUDIO_URL, builtIn: true },
    ...storedAudioItems.map((item) => ({
      id: item.id,
      name: item.name,
      url: '',
      stored: item,
    })),
  ];
  const readyAudioLibraryItems = audioLibraryItems.filter((item) => item.builtIn || (item.stored?.status !== 'needs-reupload' && (item.stored?.blob?.size ?? 0) > 0));
  const currentAudioItem = readyAudioLibraryItems.find((item) => (
    item.stored ? item.id === currentAudioAssetId : !currentAudioAssetId && item.name === audioFileName
  ));

  const formatVoiceName = (name: string) => {
    const withoutExtension = name.replace(/\.[a-z0-9]+$/i, '');
    if (withoutExtension === DEFAULT_AUDIO_NAME) return withoutExtension;
    return withoutExtension
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Voice';
  };

  const getAudioItemLabel = (item: AudioLibraryItem) => {
    if (item.stored?.source === 'voice-wizard') return 'Made by Wiggly';
    if (item.builtIn) return 'Example';
    return 'Uploaded by you';
  };

  const isCurrentAudioItem = (item: AudioLibraryItem) => (
    item.stored ? item.id === currentAudioAssetId : !currentAudioAssetId && item.name === audioFileName
  );

  const createSavedVoiceOptions = readyAudioLibraryItems
    .filter((item) => item.stored)
    .map((item) => ({
      id: item.id,
      name: formatVoiceName(item.name),
      label: getAudioItemLabel(item),
      current: isCurrentAudioItem(item),
    }));

  const useCreateSavedVoice = (voiceId: string) => {
    const item = readyAudioLibraryItems.find((candidate) => candidate.id === voiceId);
    if (!item) return;
    useAudioItem(item);
  };

  return {
    activeCreateBrandKey,
    audioBrandKey,
    audioFileName,
    audioIntent,
    audioLibraryItems,
    audioUrl,
    createAudioUrl,
    createSavedVoiceOptions,
    currentAudioAssetId,
    currentAudioItem,
    downloadCurrentAudio,
    getAudioItemLabel,
    getCachedAudioAnalysis,
    handleAudioUpload,
    hasPlayableCreateAudio,
    isCurrentAudioItem,
    isTranscribing,
    readyAudioLibraryItems,
    rememberGeneratedVoiceAudio,
    setActiveCreateBrandKey,
    setAudioBrandKey,
    setAudioFileName,
    setAudioIntent,
    setAudioUrl,
    setCurrentAudioAssetId,
    storedAudioItems,
    useAudioItem,
    useCreateSavedVoice,
    clearCreateAudioForNewBrand,
    applyAudioSettings,
    updateCreateCaptions,
    deleteStoredAudio,
    formatVoiceName,
  };
}
