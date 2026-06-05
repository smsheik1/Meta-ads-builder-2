import type { AdScene } from './scene';
import type { RenderSceneTicketResponse } from './apiResponses';

const RENDER_DOWNLOAD_TIMEOUT_MS = 60_000;

export const requestRenderSceneDownload = async (scene: AdScene) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), RENDER_DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch('/api/render-scene-ticket', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scene }),
      signal: controller.signal,
    });
    const payload = await response.json() as RenderSceneTicketResponse;

    if (!response.ok || !payload.downloadUrl) {
      throw new Error(payload.error || 'Video download failed.');
    }

    return `${window.location.origin}${payload.downloadUrl}`;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Video render took too long. Try Download video again.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};
