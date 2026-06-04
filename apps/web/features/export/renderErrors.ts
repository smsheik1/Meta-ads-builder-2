const serverDetailPattern = /command failed|ffmpeg|ffprobe|invalid data|remotion-assets-dir|\/tmp\/|\\tmp\\/i;

export const getPublicRenderErrorMessage = (
  error: unknown,
  fallback = 'Video render failed. Try again in a moment.',
) => {
  const message = error instanceof Error ? error.message : '';

  if (serverDetailPattern.test(message)) {
    return 'Video render failed because the audio could not be read. Try making audio again, or download the design without audio.';
  }

  return fallback;
};
