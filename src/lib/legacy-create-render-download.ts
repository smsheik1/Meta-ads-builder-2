import { cloneAdScene, type AdScene } from '../../apps/web/features/create/scene';
import {
  createLegacyCreateAdScene,
  type LegacyCreateAdSceneInput,
} from './legacy-create-ad-scene';

type Fetcher = typeof fetch;

export type LegacyCreateRenderDownload = {
  scene: AdScene;
  blob: Blob;
  filename: string;
  downloadUrl: string;
};

export type LegacyCreateRenderDownloadInput = LegacyCreateAdSceneInput & {
  signal?: AbortSignal;
  fetcher?: Fetcher;
  validateMp4Blob: (blob: Blob, label: string) => Promise<void>;
};

export type AdSceneRenderDownloadInput = {
  scene: AdScene;
  signal?: AbortSignal;
  fetcher?: Fetcher;
  validateMp4Blob: (blob: Blob, label: string) => Promise<void>;
};

type RenderTicketResponse = {
  ticketId?: string;
  filename?: string;
  downloadUrl?: string;
  error?: string;
};

const isBrowserOnlyAsset = (url: string) => (
  url.startsWith('blob:') ||
  url.startsWith('data:') ||
  url.startsWith('/')
);

const absoluteUrl = (url: string) => {
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(url, origin).href;
};

const uploadExtensionForBlob = (field: string, url: string, blob: Blob) => {
  const mimeType = blob.type.toLowerCase();
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('mp4')) return field === 'audio' ? 'm4a' : 'mp4';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('webm')) return 'webm';

  try {
    const extension = new URL(absoluteUrl(url)).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    if (extension) return extension === 'jpeg' ? 'jpg' : extension;
  } catch {
    // Data URLs and blob URLs rarely expose a useful extension.
  }

  return field === 'audio' ? 'mp3' : 'png';
};

const appendSceneAsset = async (
  formData: FormData,
  field: 'audio' | 'brandLogo' | 'brandFavicon',
  url: string | null | undefined,
  applyUrl: (nextUrl: string | null) => void,
  fetcher: Fetcher,
) => {
  if (!url) return;

  if (!isBrowserOnlyAsset(url)) {
    applyUrl(absoluteUrl(url));
    return;
  }

  const response = await fetcher(absoluteUrl(url));
  if (!response.ok) {
    throw new Error(`Could not read ${field} before rendering.`);
  }

  const blob = await response.blob();
  const extension = uploadExtensionForBlob(field, url, blob);
  formData.append(field, blob, `${field}.${extension}`);
  applyUrl(null);
};

const fetchJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  return payload as T;
};

export const requestAdSceneRenderDownload = async (
  input: AdSceneRenderDownloadInput,
): Promise<LegacyCreateRenderDownload> => {
  const fetcher = input.fetcher || fetch;
  const scene = cloneAdScene(input.scene);
  const formData = new FormData();

  await appendSceneAsset(
    formData,
    'audio',
    scene.audio.url,
    (url) => {
      scene.audio = { ...scene.audio, url };
    },
    fetcher,
  );
  await appendSceneAsset(
    formData,
    'brandLogo',
    scene.brand.logoUrl,
    (url) => {
      scene.brand = { ...scene.brand, logoUrl: url };
    },
    fetcher,
  );
  await appendSceneAsset(
    formData,
    'brandFavicon',
    scene.brand.faviconUrl,
    (url) => {
      scene.brand = { ...scene.brand, faviconUrl: url };
    },
    fetcher,
  );

  formData.append('scene', JSON.stringify(scene));

  const ticketResponse = await fetcher('/api/render-scene-ticket', {
    method: 'POST',
    body: formData,
    signal: input.signal,
  });
  const ticket = await fetchJson<RenderTicketResponse>(ticketResponse);

  if (!ticketResponse.ok) {
    throw new Error(ticket.error || 'Could not prepare video download.');
  }

  if (!ticket.downloadUrl) {
    throw new Error('Render ticket did not include a download URL.');
  }

  const downloadUrl = absoluteUrl(ticket.downloadUrl);
  const videoResponse = await fetcher(downloadUrl, { signal: input.signal });
  if (!videoResponse.ok) {
    const payload = await fetchJson<RenderTicketResponse>(videoResponse);
    throw new Error(payload.error || 'Prepared video download failed.');
  }

  const blob = await videoResponse.blob();
  await input.validateMp4Blob(blob, 'AdScene render');

  return {
    scene,
    blob,
    filename: ticket.filename || `${scene.id}.mp4`,
    downloadUrl,
  };
};

export const requestLegacyCreateRenderDownload = async (
  input: LegacyCreateRenderDownloadInput,
): Promise<LegacyCreateRenderDownload> => (
  requestAdSceneRenderDownload({
    scene: createLegacyCreateAdScene(input),
    signal: input.signal,
    fetcher: input.fetcher,
    validateMp4Blob: input.validateMp4Blob,
  })
);
