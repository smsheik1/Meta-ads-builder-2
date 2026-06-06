import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('renderers do not use fake demo captions when transcript captions are missing', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const canvasSource = fs.readFileSync(path.join(process.cwd(), 'src/components/CanvasEditor.tsx'), 'utf8');
  const remotionSource = fs.readFileSync(path.join(process.cwd(), 'src/remotion/RemotionAd.tsx'), 'utf8');
  const renderSurfaceSource = fs.readFileSync(path.join(process.cwd(), 'src/components/AdRenderSurface.tsx'), 'utf8');

  [appSource, canvasSource, remotionSource, renderSurfaceSource].forEach((source) => {
    expect(source).not.toContain('MOCK_CAPTIONS');
    expect(source).not.toContain('Are you missing calls?');
    expect(source).not.toContain('Never miss a lead again.');
  });

  expect(canvasSource).toContain('getActiveCaption(state.captions, currentTime)');
  expect(canvasSource).toContain('captionPreviewText');
  expect(canvasSource).toContain('const displayCaption = currentCaption || (!captionsLoading ? captionPreviewText : null);');
  expect(canvasSource).toContain('if (state.captions.length === 0) setCurrentCaption(null);');
  expect(canvasSource).toContain('displayCaption || (audioUrl ?');
  expect(canvasSource).toContain('pickVisibleColorOnLight');
  expect(canvasSource).toContain('el.captionSpeaker1Color');
  expect(canvasSource).toContain("captionsLoading ? 'Captions are loading' : ''");
  expect(canvasSource).not.toContain("playing ? 'Captions are loading'");
  expect(canvasSource).not.toContain('Captions unavailable');
  expect(appSource).toContain('const renderCaptions = captions;');
  expect(appSource).toContain('captionsLoading={isTranscribing}');
  expect(appSource).not.toContain('if (navigateToBuilder) setPlaying(false);\\n    useEditorStore.getState().setCaptions([]);');
  expect(appSource).toContain('inferAudioMimeType(transcriptionAudioUrl)');
  expect(remotionSource).toContain('<AdRenderSurface');
  expect(renderSurfaceSource).toContain('const activeCaptions = snapshot.captions;');
});

test('create ads require intentional audio for playback but allow silent download', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const createFlowSource = fs.readFileSync(path.join(process.cwd(), 'src/components/CreateFlow.tsx'), 'utf8');

  expect(appSource).toContain("type AudioIntent = 'default' | 'uploaded' | 'generated';");
  expect(appSource).toContain('const hasPlayableCreateAudio = Boolean(');
  expect(appSource).toContain("audioIntent === 'uploaded'");
  expect(appSource).toContain('generatedAudioMatchesCreateBrand');
  expect(appSource).toContain('audioUrl: snapshotAudioUrl');
  expect(appSource).toContain("setAudioIntent('uploaded')");
  expect(appSource).toContain("setAudioIntent('generated')");
  expect(appSource).toContain('clearCreateAudioForNewBrand();');
  expect(appSource).toContain('audioUrl={createAudioUrl}');
  expect(appSource).toContain('hasPlayableAudio={hasPlayableCreateAudio}');

  expect(createFlowSource).toContain('Add audio for this ad');
  expect(createFlowSource).toContain('!hasPlayableAudio');
  expect(createFlowSource).toContain('emptyCaptionAction={!hasPlayableAudio || !activeVariation ?');
  expect(createFlowSource).toContain('disabled={!activeVariation || !brandBrain || rendering}');
  expect(createFlowSource).toContain('disabled={!hasPlayableAudio}');
  expect(createFlowSource).toContain('emptyCaptionFallback=""');
  expect(createFlowSource).toContain('whitespace-nowrap');
  expect(createFlowSource).toContain('bg-white/95 px-5 py-3');
  expect(createFlowSource).toContain('shadow-[0_18px_44px_rgba(15,23,42,0.10)]');
  expect(createFlowSource).not.toContain('wiggly-audio-cta-pulse');
});
