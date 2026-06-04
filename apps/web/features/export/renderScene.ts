import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import type { AdScene } from '@/features/create/scene';
import {
  AD_SCENE_FPS,
  createDownloadFilename,
  createRenderSnapshot,
} from '@/features/render/adSceneRender';

let remotionBundlePromise: Promise<string> | null = null;

export const getRemotionEntryPoint = () => (
  path.join(process.cwd(), 'remotion-entry', 'index.ts')
);

export const getCreateV2RemotionBundle = () => {
  const entryPoint = getRemotionEntryPoint();

  if (process.env.NODE_ENV !== 'production') {
    return bundle({
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

export const renderAdSceneToMp4 = async (scene: AdScene) => {
  const snapshot = createRenderSnapshot(scene);
  const renderDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wiggly-create-v2-render-'));
  const outputPath = path.join(renderDir, createDownloadFilename(snapshot.scene));

  try {
    const serveUrl = await getCreateV2RemotionBundle();
    const inputProps = { scene: snapshot.scene };
    const compositions = await getCompositions(serveUrl, { inputProps });
    const composition = compositions.find((item) => item.id === snapshot.spec.compositionId);

    if (!composition) {
      throw new Error(`Remotion composition ${snapshot.spec.compositionId} was not found.`);
    }

    await renderMedia({
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
    });

    const file = await fs.readFile(outputPath);

    return {
      file,
      filename: path.basename(outputPath),
      snapshot,
    };
  } finally {
    await fs.rm(renderDir, { recursive: true, force: true });
  }
};
