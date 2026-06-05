import type { CreateSceneResponse } from './apiResponses';

type CreateSceneRequestInput = {
  adModel: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  websiteUrl: string;
};

const DEFAULT_CREATE_SCENE_TIMEOUT_MS = 38_000;
const CREATE_SCENE_TIMEOUT_MESSAGE = 'Website research took too long. Try again, or use a more specific page from the same brand.';

const isAbortError = (error: unknown) => (
  error instanceof Error && (error.name === 'AbortError' || /aborted/i.test(error.message))
);

export const requestCreateScene = async ({
  adModel,
  fetcher = fetch,
  timeoutMs = DEFAULT_CREATE_SCENE_TIMEOUT_MS,
  websiteUrl,
}: CreateSceneRequestInput): Promise<CreateSceneResponse> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher('/api/create-scene', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ websiteUrl, adModel }),
      signal: controller.signal,
    });
    const payload = await response.json() as CreateSceneResponse;

    if (!response.ok) {
      throw new Error(payload.error || 'Something broke while researching that website.');
    }

    return payload;
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(CREATE_SCENE_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};
