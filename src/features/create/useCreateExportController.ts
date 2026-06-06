import { useEffect, useRef, useState } from 'react';
import type { GeneratedAdVariation } from '../../components/CreateFlow';
import type { AdScene } from '../../engine/ad-scene/scene';
import type { BrandBrain } from '../../lib/prompts/brand-brain';
import { useShareLink } from '../share/useShareLink';
import { ensureValidMp4Blob, getValidMp4Bytes } from './createExportMedia';
import type { SavedTemplate } from './createSavedDesigns';

export type ExportPhase = 'recording' | 'converting' | 'complete' | 'error';

export type ReadyExport = {
  url: string;
  blob: Blob;
  filename: string;
  snapshot: SavedTemplate | null;
  renderVersion: number;
  adScene?: AdScene | null;
};

type CreateExportControllerOptions = {
  appRoute: 'home' | 'builder' | 'share' | 'create';
  currentRenderVersion: number;
  createCurrentSnapshot: () => SavedTemplate;
  createRemotionSnapshot: (snapshot: SavedTemplate) => Promise<FormData>;
  currentCreateAdScene: AdScene | null;
  getCurrentLegacyCreateAdScene: (variation: GeneratedAdVariation, brandBrain: BrandBrain) => AdScene;
  onCurrentCreateAdScene: (scene: AdScene) => void;
  saveDownloadedAdToHistory: (snapshot: SavedTemplate, adScene?: AdScene | null) => void;
};

export const useCreateExportController = ({
  appRoute,
  currentRenderVersion,
  createCurrentSnapshot,
  createRemotionSnapshot,
  currentCreateAdScene,
  getCurrentLegacyCreateAdScene,
  onCurrentCreateAdScene,
  saveDownloadedAdToHistory,
}: CreateExportControllerOptions) => {
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState<ExportPhase>('recording');
  const [exportErrorMessage, setExportErrorMessage] = useState('');
  const [exportDownload, setExportDownload] = useState<ReadyExport | null>(null);
  const [exportLaunchAnimation, setExportLaunchAnimation] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'saving' | 'ready' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareIsLocalPreview, setShareIsLocalPreview] = useState(false);
  const exportCancelRef = useRef<(() => void) | null>(null);
  const savedExportHistoryIdRef = useRef<string | null>(null);

  const resetShareState = () => {
    setShareStatus('idle');
    setShareUrl('');
    setShareError('');
  };

  useEffect(() => {
    if (!exportDownload || exportDownload.renderVersion === currentRenderVersion) return;
    URL.revokeObjectURL(exportDownload.url);
    setExportDownload(null);
    setExportPhase('recording');
    resetShareState();
  }, [currentRenderVersion, exportDownload]);

  useEffect(() => {
    if (!rendering) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rendering]);

  const saveExportToHistoryOnce = (snapshot: SavedTemplate | null, adScene?: AdScene | null) => {
    if (!snapshot) return;
    if (savedExportHistoryIdRef.current === snapshot.id) return;
    savedExportHistoryIdRef.current = snapshot.id;
    void saveDownloadedAdToHistory(snapshot, adScene);
  };

  const tryRemotionExport = async (exportSnapshot: SavedTemplate, abortController: AbortController) => {
    setExportPhase('converting');
    setRenderProgress(10);
    const formData = await createRemotionSnapshot(exportSnapshot);
    setRenderProgress(25);

    const response = await fetch('/api/render-remotion', {
      method: 'POST',
      body: formData,
      signal: abortController.signal,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Remotion export failed');
    }

    setRenderProgress(92);
    const mp4Blob = await response.blob();
    await ensureValidMp4Blob(mp4Blob, 'Remotion export');

    const url = URL.createObjectURL(mp4Blob);
    const filename = `agent-enamel-${Date.now()}.mp4`;
    setExportDownload({
      url,
      blob: mp4Blob,
      filename,
      snapshot: exportSnapshot,
      renderVersion: currentRenderVersion,
      adScene: exportSnapshot.adScene || null,
    });
    setExportPhase('complete');
    setRenderProgress(100);
  };

  const downloadSimulatedVideo = async (
    createVariation?: GeneratedAdVariation | null,
    createBrandBrain?: BrandBrain | null,
  ) => {
    const exportSnapshot = createCurrentSnapshot();
    setExportLaunchAnimation(true);
    window.setTimeout(() => setExportLaunchAnimation(false), 650);
    setRendering(true);
    setRenderProgress(0);
    setExportErrorMessage('');
    setExportPhase('recording');
    savedExportHistoryIdRef.current = null;
    resetShareState();
    setExportDownload((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return null;
    });

    const remotionAbortController = new AbortController();
    exportCancelRef.current = () => {
      remotionAbortController.abort();
      setRendering(false);
      setRenderProgress(0);
      setExportPhase('recording');
      exportCancelRef.current = null;
    };

    try {
      if (appRoute === 'create' && currentCreateAdScene) {
        await tryRemotionExport({ ...exportSnapshot, adScene: currentCreateAdScene }, remotionAbortController);
        setRendering(false);
        exportCancelRef.current = null;
        return;
      }
      if (appRoute === 'create' && createVariation && createBrandBrain) {
        const scene = getCurrentLegacyCreateAdScene(createVariation, createBrandBrain);
        onCurrentCreateAdScene(scene);
        await tryRemotionExport({ ...exportSnapshot, adScene: scene }, remotionAbortController);
        setRendering(false);
        exportCancelRef.current = null;
        return;
      }
      await tryRemotionExport(exportSnapshot, remotionAbortController);
      setRendering(false);
      exportCancelRef.current = null;
    } catch (error) {
      if (remotionAbortController.signal.aborted) return;
      const message = error instanceof Error ? error.message : '';
      if (/too many/i.test(message)) {
        console.warn('Remotion export rate-limited:', error);
        setExportErrorMessage(message || 'Too many video exports. Please wait and try again later.');
        setExportPhase('error');
        setRendering(false);
        setRenderProgress(0);
        exportCancelRef.current = null;
        return;
      }
      console.error('Remotion export failed:', error);
      setExportErrorMessage(message || 'Remotion export failed.');
      setExportPhase('error');
      setRendering(false);
      setRenderProgress(0);
      exportCancelRef.current = null;
    }
  };

  const cancelExport = () => {
    exportCancelRef.current?.();
  };

  const dismissExportStatus = () => {
    if (exportDownload) URL.revokeObjectURL(exportDownload.url);
    setExportDownload(null);
    resetShareState();
    setExportErrorMessage('');
    setExportPhase('recording');
  };

  const downloadReadyExport = async () => {
    if (!exportDownload) return;

    let mp4Bytes: Uint8Array;
    try {
      mp4Bytes = await getValidMp4Bytes(exportDownload.blob, 'Ready export');
    } catch (error) {
      console.error('Blocked invalid MP4 download:', error);
      setExportPhase('error');
      alert('This video file had a problem. Please make the video again.');
      return;
    }

    const showSaveFilePicker = (window as any).showSaveFilePicker;

    if (typeof showSaveFilePicker === 'function') {
      try {
        const fileHandle = await showSaveFilePicker({
          suggestedName: exportDownload.filename,
          types: [
            {
              description: 'Video file',
              accept: { 'video/mp4': ['.mp4'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(mp4Bytes);
        await writable.close();
        saveExportToHistoryOnce(exportDownload.snapshot, exportDownload.adScene);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Native MP4 save failed, falling back to browser download:', error);
      }
    }

    try {
      const downloadUrl = URL.createObjectURL(new Blob([mp4Bytes], { type: 'video/mp4' }));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = exportDownload.filename;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    } catch (error) {
      console.warn('Browser MP4 download failed:', error);
      window.open(exportDownload.url, '_blank', 'noopener,noreferrer');
    }

    saveExportToHistoryOnce(exportDownload.snapshot, exportDownload.adScene);
  };

  const openReadyExport = async () => {
    if (!exportDownload) return;
    try {
      await ensureValidMp4Blob(exportDownload.blob, 'Ready export');
    } catch (error) {
      console.error('Blocked invalid MP4 open:', error);
      setExportPhase('error');
      alert('This video file had a problem. Please make the video again.');
      return;
    }
    window.open(exportDownload.url, '_blank', 'noopener,noreferrer');
    saveExportToHistoryOnce(exportDownload.snapshot, exportDownload.adScene);
  };

  const { createShareLink } = useShareLink({
    exportDownload,
    currentRenderVersion,
    ensureValidMp4Blob,
    saveExportToHistoryOnce,
    setShareStatus,
    setShareError,
    setShareIsLocalPreview,
    setShareUrl,
  });

  return {
    rendering,
    renderProgress,
    setRenderProgress,
    exportPhase,
    exportErrorMessage,
    exportDownload,
    exportLaunchAnimation,
    shareStatus,
    shareUrl,
    shareError,
    shareIsLocalPreview,
    cancelExport,
    createShareLink,
    dismissExportStatus,
    downloadReadyExport,
    downloadSimulatedVideo,
    openReadyExport,
  };
};
