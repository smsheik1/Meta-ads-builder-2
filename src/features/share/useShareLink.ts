import { useCallback } from 'react';
import { createShareSlug, saveHostedSharePage } from '../../lib/share-pages';
import type { AdScene } from '../../engine/ad-scene/scene';
import { buildShareMetadataFromAdScene, buildShareMetadataFromSnapshot, type ShareMetadataSnapshot } from './shareMetadata';

export type ShareLinkStatus = 'idle' | 'saving' | 'ready' | 'error';

type ReadyShareExport<TSnapshot extends ShareMetadataSnapshot> = {
  blob: Blob;
  snapshot: TSnapshot | null;
  renderVersion: number;
  adScene?: AdScene | null;
};

type UseShareLinkArgs<TSnapshot extends ShareMetadataSnapshot> = {
  exportDownload: ReadyShareExport<TSnapshot> | null;
  currentRenderVersion: number;
  ensureValidMp4Blob: (blob: Blob, label: string) => Promise<void>;
  saveExportToHistoryOnce: (snapshot: TSnapshot) => void;
  setShareStatus: (status: ShareLinkStatus) => void;
  setShareError: (message: string) => void;
  setShareIsLocalPreview: (isLocalPreview: boolean) => void;
  setShareUrl: (url: string) => void;
};

export const useShareLink = <TSnapshot extends ShareMetadataSnapshot>({
  exportDownload,
  currentRenderVersion,
  ensureValidMp4Blob,
  saveExportToHistoryOnce,
  setShareStatus,
  setShareError,
  setShareIsLocalPreview,
  setShareUrl,
}: UseShareLinkArgs<TSnapshot>) => {
  const createShareLink = useCallback(async () => {
    if (!exportDownload) return;
    if (exportDownload.renderVersion !== currentRenderVersion) {
      setShareStatus('error');
      setShareError('This video was made with an older renderer. Make the video again, then create the share link.');
      return;
    }
    if (!exportDownload.snapshot && !exportDownload.adScene) {
      setShareStatus('error');
      setShareError('Make the video again before creating a share link.');
      return;
    }

    setShareStatus('saving');
    setShareError('');
      setShareIsLocalPreview(false);
    try {
      await ensureValidMp4Blob(exportDownload.blob, 'Ready export');
      const metadata = exportDownload.adScene
        ? buildShareMetadataFromAdScene(exportDownload.adScene)
        : buildShareMetadataFromSnapshot(exportDownload.snapshot as TSnapshot);
      const record = await saveHostedSharePage({
        slug: createShareSlug(metadata.headline),
        videoBlob: exportDownload.blob,
        videoMimeType: exportDownload.blob.type || 'video/mp4',
        scene: exportDownload.adScene || null,
        ...metadata,
      });
      const shareSearch = new URLSearchParams();
      if (metadata.platform) {
        shareSearch.set('p', metadata.platform);
      }
      if (metadata.ctaUrl) {
        shareSearch.set('u', metadata.ctaUrl);
      }
      if (metadata.brandLogo && metadata.brandLogo.length < 1500) {
        shareSearch.set('l', metadata.brandLogo);
      }
      const hasAudio = exportDownload.adScene
        ? exportDownload.adScene.audio.status !== 'none'
        : Boolean(exportDownload.snapshot?.settings.audioUrl);
      shareSearch.set('a', hasAudio ? '1' : '0');
      const nextUrl = `${window.location.origin}/s/${record.slug}${shareSearch.toString() ? `?${shareSearch.toString()}` : ''}`;
      setShareUrl(nextUrl);
      setShareIsLocalPreview(!record.videoUrl);
      setShareStatus('ready');
      if (exportDownload.snapshot) saveExportToHistoryOnce(exportDownload.snapshot);
      try {
        await navigator.clipboard?.writeText(nextUrl);
      } catch {
        // Clipboard is a convenience; the link still shows in the UI.
      }
    } catch (error: any) {
      setShareStatus('error');
      setShareError(error.message || 'Could not create share link.');
    }
  }, [
    currentRenderVersion,
    ensureValidMp4Blob,
    exportDownload,
    saveExportToHistoryOnce,
    setShareError,
    setShareIsLocalPreview,
    setShareStatus,
    setShareUrl,
  ]);

  return { createShareLink };
};
