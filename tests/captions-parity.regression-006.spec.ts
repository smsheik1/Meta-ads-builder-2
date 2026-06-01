import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('renderers do not use fake demo captions when transcript captions are missing', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const canvasSource = fs.readFileSync(path.join(process.cwd(), 'src/components/CanvasEditor.tsx'), 'utf8');
  const remotionSource = fs.readFileSync(path.join(process.cwd(), 'src/remotion/RemotionAd.tsx'), 'utf8');

  [appSource, canvasSource, remotionSource].forEach((source) => {
    expect(source).not.toContain('MOCK_CAPTIONS');
    expect(source).not.toContain('Are you missing calls?');
    expect(source).not.toContain('Never miss a lead again.');
  });

  expect(canvasSource).toContain('getActiveCaption(state.captions, currentTime)');
  expect(canvasSource).toContain("captionsLoading ? 'Captions are loading' : ''");
  expect(canvasSource).not.toContain("playing ? 'Captions are loading'");
  expect(canvasSource).not.toContain('Captions unavailable');
  expect(appSource).toContain('const renderCaptions = captions;');
  expect(appSource).toContain('captionsLoading={isTranscribing}');
  expect(appSource).toContain('inferAudioMimeType(audioUrl)');
  expect(remotionSource).toContain('const activeCaptions = snapshot.captions;');
});
