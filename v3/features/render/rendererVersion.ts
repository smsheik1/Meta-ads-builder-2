export const defaultRendererVersion = "local-dev:render-contract-v2";

export const getClientRendererVersion = () => (
  process.env.NEXT_PUBLIC_RENDERER_VERSION || defaultRendererVersion
);

export const getWorkerRendererVersion = () => (
  process.env.RENDERER_VERSION ||
  process.env.NEXT_PUBLIC_RENDERER_VERSION ||
  defaultRendererVersion
);
