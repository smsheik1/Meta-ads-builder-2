import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { getCompositions, makeCancelSignal, renderMedia } from '@remotion/renderer';
import type { AdScene } from '@/features/create/scene';
import {
  AD_SCENE_FPS,
  createDownloadFilename,
  createRenderSnapshot,
} from '@/features/render/adSceneRender';

let remotionBundlePromise: Promise<string> | null = null;

type RenderAdSceneOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export const getRemotionEntryPoint = () => (
  path.join(process.cwd(), 'remotion-entry', 'index.ts')
);

export const getCreateV2RemotionBundle = () => {
  const entryPoint = getRemotionEntryPoint();

  if (!remotionBundlePromise) {
    remotionBundlePromise = bundle({
      entryPoint,
      webpackOverride: (currentConfiguration) => ({
        ...currentConfiguration,
        resolve: {
          ...currentConfiguration.resolve,
          alias: {
            ...(currentConfiguration.resolve?.alias ?? {}),
            '@': process.cwd(),
          },
        },
      }),
    });
  }

  return remotionBundlePromise;
};

export const renderAdSceneToMp4 = async (
  scene: AdScene,
  options: RenderAdSceneOptions = {},
) => {
  const snapshot = createRenderSnapshot(scene);
  const timeoutMs = options.timeoutMs ?? 105_000;
  const renderDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wiggly-create-v2-render-'));
  const outputPath = path.join(renderDir, createDownloadFilename(snapshot.scene));
  const { cancel, cancelSignal } = makeCancelSignal();
  const deadline = Date.now() + timeoutMs;
  const timeout = windowlessSetTimeout(cancel, timeoutMs);
  const abortRender = () => cancel();

  options.signal?.addEventListener('abort', abortRender, { once: true });

  try {
    const serveUrl = await withRemainingTimeout(
      getCreateV2RemotionBundle(),
      deadline,
      'Remotion bundle timed out.',
    );
    const inputProps = { scene: snapshot.scene };
    const compositions = await withRemainingTimeout(
      getCompositions(serveUrl, { inputProps }),
      deadline,
      'Remotion composition lookup timed out.',
    );
    const composition = compositions.find((item) => item.id === snapshot.spec.compositionId);

    if (!composition) {
      throw new Error(`Remotion composition ${snapshot.spec.compositionId} was not found.`);
    }

    await withRemainingTimeout(
      renderMedia({
        serveUrl,
        codec: 'h264',
        composition: {
          ...composition,
          fps: AD_SCENE_FPS,
          width: snapshot.spec.width,
          height: snapshot.spec.height,
          durationInFrames: Math.max(1, Math.ceil((snapshot.durationMs / 1000) * AD_SCENE_FPS)),
        },
        inputProps,
        outputLocation: outputPath,
        overwrite: true,
        cancelSignal,
        timeoutInMilliseconds: 30_000,
      }),
      deadline,
      'Remotion render timed out.',
    );

    const file = await fs.readFile(outputPath);

    return {
      file,
      filename: path.basename(outputPath),
      snapshot,
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortRender);
    await fs.rm(renderDir, { recursive: true, force: true });
  }
};

const windowlessSetTimeout = (callback: () => void, ms: number) => (
  setTimeout(callback, ms)
);

const withRemainingTimeout = async <T>(
  promise: Promise<T>,
  deadline: number,
  message: string,
) => {
  const remainingMs = Math.max(1, deadline - Date.now());
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), remainingMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
