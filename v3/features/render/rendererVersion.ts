import type { AdFormatId } from "../scene/types";

const renderFormatSupport: Record<AdFormatId, true> = {
  visualizer: true,
  meme: true,
  "were-sorry": true,
  "video-meme": true,
  jingle: true,
};

export const defaultRendererVersion = `local-dev:${Object.keys(renderFormatSupport).join(",")}`;

export const getClientRendererVersion = () => (
  process.env.NEXT_PUBLIC_RENDERER_VERSION || defaultRendererVersion
);

export const getWorkerRendererVersion = () => (
  process.env.RENDERER_VERSION ||
  process.env.NEXT_PUBLIC_RENDERER_VERSION ||
  defaultRendererVersion
);
